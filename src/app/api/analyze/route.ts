import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cloneAndAnalyze } from "@/lib/cloner";
import { aggregateEntries } from "@/lib/aggregator";
import { scoreContributors } from "@/lib/scorer";
import { AnalyzeResponse, AnalyzeError } from "@/lib/types";

const schema = z.object({
  repoUrls: z
    .array(z.string().url().regex(/github\.com\/[^/]+\/[^/]+/, "must be a github.com repo URL"))
    .min(1, "at least one repo required"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use YYYY-MM-DD format"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use YYYY-MM-DD format"),
  prizeAmount: z.number().positive().optional(),
  currency: z.string().optional(),
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
          error: `No commits found between ${startDate} and ${endDate} across ${repoUrls.length} repo(s).`,
          code: "NO_COMMITS",
        },
        { status: 404 }
      );
    }

    const response: AnalyzeResponse = {
      contributors,
      totalCommits: merged.length,
      repoCount: repoUrls.length,
      dateRange: { start: startDate, end: endDate },
      timeline,
    };

    return NextResponse.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const isCloneError =
      message.includes("not found") ||
      message.includes("Repository not found") ||
      message.includes("authentication") ||
      message.includes("fatal:");

    return NextResponse.json<AnalyzeError>(
      {
        error: isCloneError
          ? "Could not clone one or more repos. Make sure they are public and the URL is correct."
          : "Analysis failed. Please try again.",
        code: isCloneError ? "CLONE_FAILED" : "UNKNOWN",
      },
      { status: 500 }
    );
  }
}
