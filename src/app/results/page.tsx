"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { LoadingState } from "@/components/LoadingState";
import { ContributionChart } from "@/components/ContributionChart";
import { ResultsTable } from "@/components/ResultsTable";
import { PodiumView } from "@/components/PodiumView";
import { WeightSliders, WeightState } from "@/components/WeightSliders";
import { Confetti } from "@/components/Confetti";
import { AnalyzeResponse, AnalyzeError, ContributorStats } from "@/lib/types";
import { CommitGraph } from "@/components/CommitGraph";

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
  const wSum = weights.linesAdded + weights.linesDeleted + weights.commits || 1;
  const wn = {
    linesAdded: weights.linesAdded / wSum,
    linesDeleted: weights.linesDeleted / wSum,
    commits: weights.commits / wSum,
  };
  const scored = active.map((c) => ({
    ...c,
    rawScore:
      wn.linesAdded * (c.linesAdded / maxAdded) +
      wn.linesDeleted * (c.linesDeleted / maxDeleted) +
      wn.commits * (c.commits / maxCommits),
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

function buildMarkdown(contributors: ContributorStats[], currency: string): string {
  const hasP = contributors[0]?.prizeShare !== undefined;
  const header = `| Name | Email | Commits | +Lines | -Lines | Share |${hasP ? " Prize |" : ""}`;
  const sep = `|------|-------|---------|--------|--------|-------|${hasP ? "-------|" : ""}`;
  const rows = contributors.map(
    (c) =>
      `| ${c.name} | ${c.email} | ${c.commits} | +${c.linesAdded} | -${c.linesDeleted} | ${c.percentage}% |${c.prizeShare !== undefined ? ` ${currency} ${c.prizeShare.toFixed(2)} |` : ""}`
  );
  return [header, sep, ...rows].join("\n");
}

function buildCsv(contributors: ContributorStats[], currency: string): string {
  const hasP = contributors[0]?.prizeShare !== undefined;
  const header = ["Name", "Email", "Commits", "+Lines", "-Lines", "Share %", hasP ? currency : ""]
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

  // Params parsed from URL
  const [repoUrls, setRepoUrls] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [prizeParam, setPrizeParam] = useState<string>("");
  const [currency, setCurrency] = useState("USD");

  // UI state
  const [pageState, setPageState] = useState<PageState>("loading");
  const [results, setResults] = useState<AnalyzeResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [errorCode, setErrorCode] = useState<AnalyzeError["code"] | null>(null);
  const [weights, setWeights] = useState<WeightState>({ linesAdded: 50, linesDeleted: 25, commits: 25 });
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
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
    const curr = params.get("currency") ?? "USD";

    const repos = reposRaw.split(",").filter(Boolean);

    if (!repos.length || !start || !end) {
      router.replace("/");
      return;
    }

    setRepoUrls(repos);
    setStartDate(start);
    setEndDate(end);
    setPrizeParam(prize);
    setCurrency(curr);

    fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repoUrls: repos,
        startDate: start,
        endDate: end,
        prizeAmount: prize ? parseFloat(prize) : undefined,
        currency: curr,
      }),
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
        setResults(data as AnalyzeResponse);
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
    return clientReScore(results.contributors, weights, excluded, prizeNum);
  }, [results, weights, excluded, prizeNum]);

  function copyMarkdown() {
    if (!displayContributors.length) return;
    navigator.clipboard.writeText(buildMarkdown(displayContributors, currency));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function exportCsv() {
    if (!displayContributors.length) return;
    const csv = buildCsv(displayContributors, currency);
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

  const summaryChip = `${repoUrls.length} repo${repoUrls.length !== 1 ? "s" : ""} · ${startDate} → ${endDate}${prizeNum ? ` · $${prizeNum.toLocaleString()}` : ""}`;

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
                        {" "}· {currency} {(prizeNum ?? 0).toLocaleString()}
                      </span>
                    )}
                  </h1>
                  <p className="text-sm mt-0.5" style={{ color: "var(--muted)", fontFamily: "Kalam, ui-sans-serif, sans-serif" }}>
                    {results.totalCommits} commits across {results.repoCount} repo{results.repoCount > 1 ? "s" : ""} · {results.dateRange.start} → {results.dateRange.end}
                    {excluded.size > 0 && ` · ${excluded.size} excluded`}
                  </p>
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
                <PodiumView contributors={displayContributors} currency={currency} />
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
                  currency={currency}
                  excluded={excluded}
                  onExclude={(email) => setExcluded((prev) => new Set([...prev, email]))}
                  startDate={results.dateRange.start}
                  endDate={results.dateRange.end}
                />
              </div>

              {/* Restore excluded */}
              {excluded.size > 0 && (
                <div style={{ textAlign: "center" }}>
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

      <footer
        className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap text-xs"
        style={{
          borderTop: "1px solid var(--ink)",
          color: "var(--muted)",
          fontFamily: "Kalam, ui-sans-serif, sans-serif",
        }}
      >
        <span>
          Score = 50% lines added + 25% lines deleted + 25% commits. Adjust with sliders above.
        </span>
        <button
          onClick={() => router.push("/")}
          style={{ color: "var(--muted)", fontFamily: "Kalam, ui-sans-serif, sans-serif", cursor: "pointer", background: "none", border: "none", textDecoration: "underline" }}
        >
          ← Home
        </button>
      </footer>
    </div>
  );
}
