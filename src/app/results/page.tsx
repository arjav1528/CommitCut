"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { Logo } from "@/components/Logo";
import { LoadingState } from "@/components/LoadingState";
import { ContributionChart } from "@/components/ContributionChart";
import { ResultsTable } from "@/components/ResultsTable";
import { PodiumView } from "@/components/PodiumView";
import { WeightSliders, WeightState } from "@/components/WeightSliders";
import { Confetti } from "@/components/Confetti";
import { AnalyzeResponse, AnalyzeError, ContributorStats } from "@/lib/types";
import { CommitGraph } from "@/components/CommitGraph";

// mergeMap: absorbed email → canonical email
// Absorbed contributor's stats fold into the canonical row.
function applyMerges(
  contributors: ContributorStats[],
  mergeMap: Map<string, string>
): ContributorStats[] {
  if (mergeMap.size === 0) return contributors;

  // Build canonical set first (all non-absorbed rows, deep-cloned)
  const canonicalMap = new Map<string, ContributorStats>();
  for (const c of contributors) {
    if (!mergeMap.has(c.email)) {
      canonicalMap.set(c.email, { ...c, repoBreakdown: c.repoBreakdown ? { ...c.repoBreakdown } : undefined });
    }
  }

  // Fold absorbed rows into their canonical target
  for (const c of contributors) {
    const targetEmail = mergeMap.get(c.email);
    if (!targetEmail) continue;
    const target = canonicalMap.get(targetEmail);
    if (!target) continue;

    target.commits += c.commits;
    target.linesAdded += c.linesAdded;
    target.linesDeleted += c.linesDeleted;
    if (c.commitDates) target.commitDates = [...(target.commitDates ?? []), ...c.commitDates];
    if (c.repoBreakdown) {
      target.repoBreakdown = target.repoBreakdown ?? {};
      for (const [repo, s] of Object.entries(c.repoBreakdown)) {
        if (target.repoBreakdown[repo]) {
          target.repoBreakdown[repo] = {
            commits: target.repoBreakdown[repo].commits + s.commits,
            linesAdded: target.repoBreakdown[repo].linesAdded + s.linesAdded,
            linesDeleted: target.repoBreakdown[repo].linesDeleted + s.linesDeleted,
          };
        } else {
          target.repoBreakdown[repo] = { ...s };
        }
      }
    }
    // Average quality metrics from both sides
    if (c.avgComplexity !== undefined)
      target.avgComplexity = target.avgComplexity !== undefined
        ? (target.avgComplexity + c.avgComplexity) / 2 : c.avgComplexity;
    if (c.churnScore !== undefined)
      target.churnScore = target.churnScore !== undefined
        ? (target.churnScore + c.churnScore) / 2 : c.churnScore;
    if (c.survivalRate !== undefined)
      target.survivalRate = target.survivalRate !== undefined
        ? (target.survivalRate + c.survivalRate) / 2 : c.survivalRate;
    if (c.linesAlive !== undefined)
      target.linesAlive = (target.linesAlive ?? 0) + c.linesAlive;
  }

  return Array.from(canonicalMap.values());
}

function clientReScore(
  contributors: ContributorStats[],
  weights: WeightState,
  excluded: Set<string>,
  prizeTotal?: number
): ContributorStats[] {
  const active = contributors.filter((c) => !excluded.has(c.email));
  if (active.length === 0) return [];
  const maxAdded = Math.max(...active.map((c) => c.linesAdded), 1);
  const maxDeleted = Math.max(...active.map((c) => c.linesDeleted), 1);
  const maxCommits = Math.max(...active.map((c) => c.commits), 1);
  const maxComplexity = Math.max(...active.map((c) => c.avgComplexity ?? 0), 1);
  const maxChurn = Math.max(...active.map((c) => c.churnScore ?? 0), 1);
  const wSum =
    weights.linesAdded + weights.linesDeleted + weights.commits +
    weights.complexity + weights.churn + weights.survival || 1;
  const wn = {
    linesAdded:  weights.linesAdded  / wSum,
    linesDeleted: weights.linesDeleted / wSum,
    commits:     weights.commits     / wSum,
    complexity:  weights.complexity  / wSum,
    churn:       weights.churn       / wSum,
    survival:    weights.survival    / wSum,
  };
  const scored = active.map((c) => ({
    ...c,
    rawScore:
      wn.linesAdded  * (c.linesAdded  / maxAdded)   +
      wn.linesDeleted * (c.linesDeleted / maxDeleted) +
      wn.commits     * (c.commits     / maxCommits)  +
      wn.complexity  * ((c.avgComplexity ?? 0) / maxComplexity) +
      wn.churn       * ((c.churnScore  ?? 0) / maxChurn) +
      wn.survival    * (c.survivalRate ?? 0),
  }));
  const totalRaw = scored.reduce((s, c) => s + c.rawScore, 0);
  return scored
    .map((c) => ({
      ...c,
      percentage: totalRaw === 0 ? 0 : Math.round((c.rawScore / totalRaw) * 1000) / 10,
      prizeShare:
        prizeTotal !== undefined && totalRaw > 0
          ? Math.round((c.rawScore / totalRaw) * prizeTotal * 100) / 100
          : undefined,
    }))
    .sort((a, b) => b.percentage - a.percentage);
}

function buildMarkdown(contributors: ContributorStats[]): string {
  const hasP = contributors[0]?.prizeShare !== undefined;
  const header = `| Name | Email | Commits | +Lines | -Lines | Share |${hasP ? " Prize |" : ""}`;
  const sep = `|------|-------|---------|--------|--------|-------|${hasP ? "-------|" : ""}`;
  const rows = contributors.map(
    (c) =>
      `| ${c.name} | ${c.email} | ${c.commits} | +${c.linesAdded} | -${c.linesDeleted} | ${c.percentage}% |${c.prizeShare !== undefined ? ` ${c.prizeShare.toFixed(2)} |` : ""}`
  );
  return [header, sep, ...rows].join("\n");
}

function buildCsv(contributors: ContributorStats[]): string {
  const hasP = contributors[0]?.prizeShare !== undefined;
  const header = ["Name", "Email", "Commits", "+Lines", "-Lines", "Share %", hasP ? "Prize" : ""]
    .filter(Boolean)
    .join(",");
  const rows = contributors.map((c) =>
    [c.name, c.email, c.commits, c.linesAdded, c.linesDeleted, c.percentage, hasP ? (c.prizeShare?.toFixed(2) ?? "") : ""]
      .filter((_, i) => !(i === 6 && !hasP))
      .join(",")
  );
  return [header, ...rows].join("\n");
}

type PageState = "loading" | "results" | "error";

export default function ResultsPage() {
  const router = useRouter();
  const { data: session } = useSession();

  // Params parsed from URL
  const [repoUrls, setRepoUrls] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [prizeParam, setPrizeParam] = useState<string>("");

  // UI state
  const [pageState, setPageState] = useState<PageState>("loading");
  const [results, setResults] = useState<AnalyzeResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [errorCode, setErrorCode] = useState<AnalyzeError["code"] | null>(null);
  const [weights, setWeights] = useState<WeightState>({
    linesAdded: 50, linesDeleted: 25, commits: 25,
    complexity: 0, churn: 0, survival: 0,
  });
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  // mergeMap: absorbed email → canonical email (client-side identity resolution)
  const [mergeMap, setMergeMap] = useState<Map<string, string>>(new Map());
  const [confettiActive, setConfettiActive] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // Parse URL params and kick off fetch
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reposRaw = params.get("repos") ?? "";
    const start = params.get("start") ?? "";
    const end = params.get("end") ?? "";
    const prize = params.get("prize") ?? "";

    const repos = reposRaw.split(",").filter(Boolean);

    if (!repos.length) {
      router.replace("/");
      return;
    }

    setRepoUrls(repos);
    setStartDate(start);
    setEndDate(end);
    setPrizeParam(prize);

    const body: Record<string, unknown> = { repoUrls: repos };
    if (start) body.startDate = start;
    if (end) body.endDate = end;
    if (prize) body.prizeAmount = parseFloat(prize);

    fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          const err = data as AnalyzeError;
          setErrorMsg(err.error);
          setErrorCode(err.code);
          setPageState("error");
          return;
        }
        const res = data as AnalyzeResponse;
        setResults(res);
        // Auto-exclude detected bots so they don't pollute the score
        const botEmails = res.contributors.filter((c) => c.isBot).map((c) => c.email);
        if (botEmails.length) setExcluded(new Set(botEmails));
        setPageState("results");
        setConfettiActive(true);
        setTimeout(() => setConfettiActive(false), 3000);
      })
      .catch(() => {
        setErrorMsg("Network error — please try again.");
        setErrorCode("UNKNOWN");
        setPageState("error");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prizeNum = prizeParam ? parseFloat(prizeParam) : undefined;

  const displayContributors = useMemo(() => {
    if (!results) return [];
    const merged = applyMerges(results.contributors, mergeMap);
    return clientReScore(merged, weights, excluded, prizeNum);
  }, [results, weights, excluded, prizeNum, mergeMap]);

  function mergeContributors(absorbedEmail: string, canonicalEmail: string) {
    setMergeMap((prev) => {
      const next = new Map(prev);
      next.set(absorbedEmail, canonicalEmail);
      return next;
    });
  }

  function unmergeAll() {
    setMergeMap(new Map());
  }

  function copyMarkdown() {
    if (!displayContributors.length) return;
    navigator.clipboard.writeText(buildMarkdown(displayContributors));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function exportCsv() {
    if (!displayContributors.length) return;
    const csv = buildCsv(displayContributors);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "commitcut-results.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function shareUrl() {
    navigator.clipboard.writeText(window.location.href);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  }

  const summaryChip = `${repoUrls.length} repo${repoUrls.length !== 1 ? "s" : ""} · ${startDate} → ${endDate}${prizeNum ? ` · ${prizeNum.toLocaleString()}` : ""}`;

  const btnBase: React.CSSProperties = {
    border: "2px solid var(--ink)",
    borderRadius: 999,
    padding: "3px 12px",
    background: "transparent",
    fontFamily: "Kalam, ui-sans-serif, sans-serif",
    fontSize: 13,
    cursor: "pointer",
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--paper)" }}>
      <Confetti active={confettiActive} />

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto w-full">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-3"
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          <Logo size={36} />
          <div
            style={{
              fontFamily: "var(--font-caveat), Caveat, cursive",
              fontWeight: 700,
              fontSize: 22,
              color: "var(--ink)",
              lineHeight: 1,
            }}
          >
            Commit<span style={{ color: "var(--accent)" }}>Cut</span>
          </div>
        </button>
        {pageState === "results" && (
          <button
            onClick={() => router.push("/")}
            style={{ ...btnBase, color: "var(--muted)" }}
          >
            ✎ New analysis
          </button>
        )}
      </header>

      <main className="flex-1 flex flex-col items-center px-4 pb-16 pt-0">
        <div className="w-full max-w-5xl flex flex-col gap-6">

          {/* LOADING */}
          {pageState === "loading" && (
            <LoadingState summary={summaryChip} onEdit={() => router.push("/")} />
          )}

          {/* ERROR */}
          {pageState === "error" && (
            <div className="slide-up flex flex-col items-center gap-6 pt-8">
              {errorCode === "NO_COMMITS" ? (
                <>
                  <div className="shake">
                    <svg width="80" height="60" viewBox="0 0 80 60">
                      <line x1="5" y1="30" x2="75" y2="30" stroke="#1b1b1b" strokeWidth="2" strokeDasharray="3 3"/>
                      <circle cx="40" cy="30" r="10" fill="#fff" stroke="#d6483a" strokeWidth="2.5"/>
                      <line x1="33" y1="23" x2="47" y2="37" stroke="#d6483a" strokeWidth="2.5"/>
                    </svg>
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-caveat), Caveat, cursive",
                      fontWeight: 700,
                      fontSize: 28,
                      color: "var(--ink)",
                      textAlign: "center",
                    }}
                  >
                    Nothing to cut.
                  </div>
                  <div style={{ fontSize: 13, color: "var(--muted)", fontFamily: "Kalam, ui-sans-serif, sans-serif", textAlign: "center", maxWidth: 320 }}>
                    No commits found between {startDate} and {endDate} across {repoUrls.length} repo{repoUrls.length !== 1 ? "s" : ""}.
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "Kalam, ui-sans-serif, sans-serif" }}>
                    Tip: most hackathons run over a weekend — try Fri → Sun
                  </div>
                </>
              ) : errorCode === "PRIVATE_REPO" ? (
                <div className="flex flex-col items-center gap-4">
                  <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                    <rect x="12" y="28" width="40" height="28" rx="4" fill="var(--paper-2)" stroke="var(--ink)" strokeWidth="2.5"/>
                    <path d="M20 28v-8a12 12 0 0 1 24 0v8" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round"/>
                    <circle cx="32" cy="42" r="4" fill="var(--accent)"/>
                    <line x1="32" y1="46" x2="32" y2="50" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                  <div
                    style={{
                      fontFamily: "var(--font-caveat), Caveat, cursive",
                      fontWeight: 700,
                      fontSize: 26,
                      color: "var(--ink)",
                      textAlign: "center",
                    }}
                  >
                    Private repo
                  </div>
                  <div style={{ fontSize: 13, color: "var(--muted)", fontFamily: "Kalam, ui-sans-serif, sans-serif", textAlign: "center", maxWidth: 320 }}>
                    {session
                      ? "Your GitHub account doesn't have access to this repo. Make sure you're a collaborator or organization member."
                      : "Connect your GitHub account to analyze private repositories."}
                  </div>
                  {!session && (
                    <button
                      onClick={() => signIn("github", { callbackUrl: window.location.href })}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        background: "var(--ink)",
                        color: "var(--paper)",
                        border: "2px solid var(--ink)",
                        borderRadius: 999,
                        padding: "10px 22px",
                        fontSize: 15,
                        fontFamily: "Kalam, ui-sans-serif, sans-serif",
                        fontWeight: 700,
                        boxShadow: "2px 2px 0 0 rgba(0,0,0,.85)",
                        cursor: "pointer",
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                      </svg>
                      Connect GitHub
                    </button>
                  )}
                </div>
              ) : (
                <div
                  className="rounded-xl px-4 py-3 text-sm"
                  style={{
                    background: "var(--paper-2)",
                    border: "2px dashed var(--coral)",
                    color: "var(--coral)",
                    fontFamily: "Kalam, ui-sans-serif, sans-serif",
                    maxWidth: 480,
                    width: "100%",
                  }}
                >
                  {errorMsg}
                  {errorCode === "CLONE_FAILED" && (
                    <span style={{ color: "var(--muted)" }}>
                      {" "}Make sure the repo is public and the URL is correct.
                    </span>
                  )}
                </div>
              )}
              <button
                onClick={() => router.push("/")}
                style={{
                  ...btnBase,
                  color: "var(--ink)",
                  padding: "8px 20px",
                  fontSize: 15,
                  boxShadow: "2px 2px 0 0 rgba(0,0,0,.85)",
                }}
              >
                ← Back to form
              </button>
            </div>
          )}

          {/* RESULTS */}
          {pageState === "results" && results && (
            <div className="slide-up flex flex-col gap-5">
              {/* Header row */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h1
                    style={{
                      color: "var(--ink)",
                      fontFamily: "var(--font-caveat), Caveat, cursive",
                      fontWeight: 700,
                      fontSize: 28,
                      margin: 0,
                    }}
                  >
                    Here&apos;s the cut
                    {displayContributors[0]?.prizeShare !== undefined && (
                      <span style={{ color: "var(--accent)" }}>
                        {" "}· {(prizeNum ?? 0).toLocaleString()}
                      </span>
                    )}
                  </h1>
                  <p className="text-sm mt-0.5" style={{ color: "var(--muted)", fontFamily: "Kalam, ui-sans-serif, sans-serif" }}>
                    {results.totalCommits} commits across {results.repoCount} repo{results.repoCount > 1 ? "s" : ""}{results.dateRange.start ? ` · ${results.dateRange.start} → ${results.dateRange.end}` : " · all time"}
                    {excluded.size > 0 && ` · ${excluded.size} excluded`}
                  </p>
                  {(() => {
                    const botCount = results.contributors.filter((c) => c.isBot && excluded.has(c.email)).length;
                    if (!botCount) return null;
                    return (
                      <p style={{ fontSize: 11, color: "var(--muted)", fontFamily: "Kalam, ui-sans-serif, sans-serif", marginTop: 2 }}>
                        {botCount} bot account{botCount > 1 ? "s" : ""} auto-excluded
                        {" · "}
                        <button
                          onClick={() => setExcluded((prev) => {
                            const next = new Set(prev);
                            results.contributors.filter((c) => c.isBot).forEach((c) => next.delete(c.email));
                            return next;
                          })}
                          style={{ color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontFamily: "Kalam, ui-sans-serif, sans-serif", fontSize: 11, padding: 0, textDecoration: "underline" }}
                        >
                          restore
                        </button>
                      </p>
                    );
                  })()}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={shareUrl} style={{ ...btnBase, color: shareCopied ? "var(--mint)" : "var(--ink)" }}>
                    {shareCopied ? "✓ Copied!" : "🔗 Share"}
                  </button>
                </div>
              </div>

              {/* Commit timeline graph */}
              <div className="row-in" style={{ animationDelay: "0s" }}>
                <CommitGraph
                  timeline={results.timeline}
                  contributors={displayContributors}
                  startDate={results.dateRange.start}
                  endDate={results.dateRange.end}
                />
              </div>

              {/* Podium */}
              <div
                className="row-in"
                style={{
                  background: "var(--paper-2)",
                  border: "2px solid var(--ink)",
                  borderRadius: "18px 22px 16px 20px / 20px 16px 22px 18px",
                  boxShadow: "4px 5px 0 0 rgba(0,0,0,.85)",
                  overflow: "hidden",
                  animationDelay: "0.05s",
                }}
              >
                <PodiumView contributors={displayContributors} />
              </div>

              {/* Weight sliders */}
              <div className="row-in" style={{ animationDelay: "0.10s" }}>
                <WeightSliders weights={weights} onChange={setWeights} />
              </div>

              {/* Chart */}
              <div
                className="row-in"
                style={{
                  background: "var(--paper-2)",
                  border: "2px solid var(--ink)",
                  borderRadius: "18px 22px 16px 20px / 20px 16px 22px 18px",
                  boxShadow: "4px 5px 0 0 rgba(0,0,0,.85)",
                  padding: 20,
                  animationDelay: "0.13s",
                }}
              >
                <ContributionChart contributors={displayContributors} />
              </div>

              {/* Table */}
              <div className="row-in" style={{ animationDelay: "0.15s" }}>
                <ResultsTable
                  contributors={displayContributors}
                  excluded={excluded}
                  onExclude={(email) => setExcluded((prev) => new Set([...prev, email]))}
                  startDate={results.dateRange.start}
                  endDate={results.dateRange.end}
                  mergeMap={mergeMap}
                  onMerge={mergeContributors}
                />
              </div>

              {/* Restore / unmerge actions */}
              {(excluded.size > 0 || mergeMap.size > 0) && (
                <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                  {excluded.size > 0 && (
                    <button
                      onClick={() => setExcluded(new Set())}
                      style={{
                        border: "2px dashed var(--muted)",
                        borderRadius: 999,
                        padding: "3px 12px",
                        fontSize: 12,
                        fontFamily: "Kalam, ui-sans-serif, sans-serif",
                        background: "transparent",
                        color: "var(--muted)",
                        cursor: "pointer",
                      }}
                    >
                      ↩ Restore {excluded.size} excluded
                    </button>
                  )}
                  {mergeMap.size > 0 && (
                    <button
                      onClick={unmergeAll}
                      style={{
                        border: "2px dashed var(--muted)",
                        borderRadius: 999,
                        padding: "3px 12px",
                        fontSize: 12,
                        fontFamily: "Kalam, ui-sans-serif, sans-serif",
                        background: "transparent",
                        color: "var(--muted)",
                        cursor: "pointer",
                      }}
                    >
                      ↩ Unmerge {mergeMap.size} merge{mergeMap.size > 1 ? "s" : ""}
                    </button>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 flex-wrap row-in" style={{ animationDelay: "0.2s" }}>
                <button
                  onClick={copyMarkdown}
                  style={{ ...btnBase, color: copied ? "var(--mint)" : "var(--ink)" }}
                >
                  {copied ? "✓ Copied!" : "⧉ Copy markdown"}
                </button>
                <button onClick={exportCsv} style={{ ...btnBase, color: "var(--ink)" }}>
                  ⤓ Export CSV
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Made with love */}
      <div
        style={{
          textAlign: "center",
          padding: "12px 16px",
          fontFamily: "Kalam, ui-sans-serif, sans-serif",
          fontSize: 13,
          color: "var(--muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
        }}
      >
        <span>made with ♥ by arjav1528</span>
        <span style={{ opacity: 0.3 }}>·</span>
        <a
          href="https://github.com/arjav1528/CommitCut"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "var(--ink)",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontWeight: 700,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
          </svg>
          Open source
        </a>
      </div>

      <footer
        className="px-6 py-4 flex flex-col gap-2 text-xs"
        style={{
          borderTop: "1px solid var(--ink)",
          color: "var(--muted)",
          fontFamily: "Kalam, ui-sans-serif, sans-serif",
        }}
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <span>
            Score = 50% lines added + 25% lines deleted + 25% commits. Adjust with sliders above.
          </span>
          <button
            onClick={() => router.push("/")}
            style={{ color: "var(--muted)", fontFamily: "Kalam, ui-sans-serif, sans-serif", cursor: "pointer", background: "none", border: "none", textDecoration: "underline" }}
          >
            ← Home
          </button>
        </div>
      </footer>
    </div>
  );
}
