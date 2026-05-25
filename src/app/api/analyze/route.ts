import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cloneAndAnalyze } from "@/lib/cloner";
import { aggregateEntries } from "@/lib/aggregator";
import { scoreContributors } from "@/lib/scorer";
import { AnalyzeResponse, AnalyzeError } from "@/lib/types";

const MAX_REPOS = 5;

function isValidDate(s: string): boolean {
  const d = new Date(s);
  return !isNaN(d.getTime()) && s === d.toISOString().slice(0, 10);
}

const schema = z.object({
  repoUrls: z
    .array(
      z.string()
        .url("must be a valid URL")
        .regex(/^https:\/\/github\.com\/[^/]+\/[^/]+/, "must be an https://github.com repo URL")
    )
    .min(1, "at least one repo required")
    .max(MAX_REPOS, `maximum ${MAX_REPOS} repos per request`),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "use YYYY-MM-DD format")
    .refine(isValidDate, "invalid date")
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "use YYYY-MM-DD format")
    .refine(isValidDate, "invalid date")
    .optional(),
  prizeAmount: z.number().positive().finite().optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<AnalyzeError>(
      { error: "Invalid JSON body", code: "UNKNOWN" },
      { status: 400 }
    );
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<AnalyzeError>(
      { error: parsed.error.issues[0].message, code: "INVALID_REPO" },
      { status: 400 }
    );
  }

  const { repoUrls, startDate, endDate, prizeAmount } = parsed.data;

  try {
    const allEntries = await Promise.all(
      repoUrls.map((url) => cloneAndAnalyze(url, startDate, endDate))
    );

    const merged = aggregateEntries(allEntries);
    const { contributors, timeline } = scoreContributors(merged, prizeAmount);

    if (contributors.length === 0) {
      return NextResponse.json<AnalyzeError>(
        {
          error: `No commits found in the specified range across ${repoUrls.length} repo(s).`,
          code: "NO_COMMITS",
        },
        { status: 404 }
      );
    }

    const response: AnalyzeResponse = {
      contributors,
      totalCommits: merged.length,
      repoCount: repoUrls.length,
      dateRange: { start: startDate ?? "", end: endDate ?? "" },
      timeline,
    };

    return NextResponse.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[analyze] error:", message);

    const isGitMissing = message.includes("git binary not found");
    const isCloneError =
      isGitMissing ||
      message.includes("not found") ||
      message.includes("Repository not found") ||
      message.includes("authentication") ||
      message.includes("fatal:") ||
      message.includes("timed out") ||
      message.includes("spawn") ||
      message.includes("ENOENT");

    return NextResponse.json<AnalyzeError>(
      {
        error: isGitMissing
          ? "Server is missing the git binary. Contact support."
          : isCloneError
          ? "Could not clone one or more repos. Make sure they are public and the URL is correct."
          : "Analysis failed. Please try again.",
        code: isCloneError ? "CLONE_FAILED" : "UNKNOWN",
      },
      { status: 500 }
    );
  }
}

// Allow up to 300s on platforms that support it (Vercel Pro / Railway / Render)
export const maxDuration = 300;
