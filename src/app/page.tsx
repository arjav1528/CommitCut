"use client";

import { useState, useCallback } from "react";
import { Logo } from "@/components/Logo";
import { RepoInputList, validateRepo } from "@/components/RepoInputList";
import { LoadingState } from "@/components/LoadingState";
import { ContributionChart } from "@/components/ContributionChart";
import { ResultsTable } from "@/components/ResultsTable";
import { HowItWorksDrawer } from "@/components/HowItWorksDrawer";
import { AnalyzeResponse, AnalyzeError } from "@/lib/types";

type AppState = "input" | "loading" | "results" | "error";

const CURRENCIES = ["USD", "EUR", "GBP", "INR", "JPY", "CAD", "AUD"];

function buildSummaryChip(repos: string[], start: string, end: string, prize?: number) {
  const repoCount = `${repos.length} repo${repos.length > 1 ? "s" : ""}`;
  const dateRange = start && end ? `${start} → ${end}` : "";
  const prizeStr = prize ? ` · $${prize.toLocaleString()}` : "";
  return [repoCount, dateRange, prizeStr].filter(Boolean).join(" · ");
}

function buildMarkdown(response: AnalyzeResponse, currency: string): string {
  const rows = response.contributors.map(
    (c) =>
      `| ${c.name} | ${c.email} | ${c.commits} | +${c.linesAdded} | -${c.linesDeleted} | ${c.percentage}% |${c.prizeShare !== undefined ? ` ${currency} ${c.prizeShare.toFixed(2)} |` : ""}`
  );
  const hasP = response.contributors[0]?.prizeShare !== undefined;
  const header = `| Name | Email | Commits | +Lines | -Lines | Share |${hasP ? " Prize |" : ""}`;
  const sep = `|------|-------|---------|--------|--------|-------|${hasP ? "-------|" : ""}`;
  return [header, sep, ...rows].join("\n");
}

function buildCsv(response: AnalyzeResponse, currency: string): string {
  const hasP = response.contributors[0]?.prizeShare !== undefined;
  const header = ["Name", "Email", "Commits", "+Lines", "-Lines", "Share %", hasP ? `${currency}` : ""]
    .filter(Boolean)
    .join(",");
  const rows = response.contributors.map((c) =>
    [c.name, c.email, c.commits, c.linesAdded, c.linesDeleted, c.percentage, hasP ? c.prizeShare?.toFixed(2) ?? "" : ""]
      .filter((_, i) => !(i === 6 && !hasP))
      .join(",")
  );
  return [header, ...rows].join("\n");
}

export default function Home() {
  const [state, setState] = useState<AppState>("input");
  const [repos, setRepos] = useState<string[]>([""]);
  const [repoErrors, setRepoErrors] = useState<Record<number, string>>({});
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [prizeAmount, setPrizeAmount] = useState<string>("");
  const [currency, setCurrency] = useState("USD");
  const [results, setResults] = useState<AnalyzeResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [errorCode, setErrorCode] = useState<AnalyzeError["code"] | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const validate = useCallback(() => {
    const errors: Record<number, string> = {};
    repos.forEach((r, i) => {
      const err = validateRepo(r);
      if (err) errors[i] = err;
    });
    setRepoErrors(errors);
    return Object.keys(errors).length === 0 && !!startDate && !!endDate;
  }, [repos, startDate, endDate]);

  async function handleSubmit() {
    if (!validate()) return;
    setState("loading");
    setErrorMsg("");
    setErrorCode(null);

    try {
      const body = {
        repoUrls: repos.map((r) => (r.startsWith("http") ? r : `https://${r}`)),
        startDate,
        endDate,
        prizeAmount: prizeAmount ? parseFloat(prizeAmount) : undefined,
        currency,
      };

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        const err = data as AnalyzeError;
        setErrorMsg(err.error);
        setErrorCode(err.code);
        setState("error");
        return;
      }

      setResults(data as AnalyzeResponse);
      setState("results");
    } catch {
      setErrorMsg("Network error — please try again.");
      setErrorCode("UNKNOWN");
      setState("error");
    }
  }

  function handleEdit() {
    setState("input");
    setResults(null);
  }

  function copyMarkdown() {
    if (!results) return;
    navigator.clipboard.writeText(buildMarkdown(results, currency));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function exportCsv() {
    if (!results) return;
    const csv = buildCsv(results, currency);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "commitcut-results.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const hasErrors = Object.keys(repoErrors).length > 0;
  const canSubmit = repos.every((r) => r.trim()) && !!startDate && !!endDate && !hasErrors;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--bg)" }}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 max-w-3xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <Logo size={36} />
          <div>
            <div
              className="font-bold text-xl leading-none"
              style={{ color: "var(--text)" }}
            >
              Commit
              <span style={{ color: "var(--violet)" }}>Cut</span>
            </div>
            <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              Split the prize by what you actually committed.
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center px-4 pb-16 pt-4">
        <div className="w-full max-w-2xl flex flex-col gap-6">

          {/* INPUT STATE */}
          {(state === "input" || state === "error") && (
            <div
              className="rounded-2xl p-6 flex flex-col gap-6"
              style={{
                background: "var(--card)",
                border: "1.5px solid var(--border)",
                backdropFilter: "blur(8px)",
              }}
            >
              {/* Repos */}
              <div>
                <label className="block text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                  Repositories
                </label>
                <RepoInputList
                  repos={repos}
                  onChange={(r) => { setRepos(r); setRepoErrors({}); }}
                  errors={repoErrors}
                />
              </div>

              {/* Date range */}
              <div>
                <label className="block text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                  Date range
                </label>
                <div className="flex gap-3">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    aria-label="Start date"
                    className="flex-1 rounded-xl px-3 py-2 text-sm"
                    style={{
                      background: "#0b1020",
                      border: "1.5px solid var(--border)",
                      color: "var(--text)",
                      colorScheme: "dark",
                    }}
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    aria-label="End date"
                    className="flex-1 rounded-xl px-3 py-2 text-sm"
                    style={{
                      background: "#0b1020",
                      border: "1.5px solid var(--border)",
                      color: "var(--text)",
                      colorScheme: "dark",
                    }}
                  />
                </div>
              </div>

              {/* Prize */}
              <div>
                <label className="block text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                  Prize amount{" "}
                  <span className="normal-case font-normal">(optional)</span>
                </label>
                <div className="flex gap-3">
                  <div
                    className="flex items-center flex-1 rounded-xl overflow-hidden"
                    style={{ border: "1.5px solid var(--border)", background: "#0b1020" }}
                  >
                    <span className="px-3 text-sm" style={{ color: "var(--muted)" }}>$</span>
                    <input
                      type="number"
                      min={0}
                      placeholder="0.00"
                      value={prizeAmount}
                      onChange={(e) => setPrizeAmount(e.target.value)}
                      aria-label="Prize amount"
                      className="flex-1 py-2 pr-3 text-sm bg-transparent"
                      style={{ color: "var(--text)", outline: "none" }}
                    />
                  </div>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    aria-label="Currency"
                    className="rounded-xl px-3 py-2 text-sm"
                    style={{
                      background: "#0b1020",
                      border: "1.5px solid var(--border)",
                      color: "var(--text)",
                      minWidth: 80,
                    }}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Error banner */}
              {state === "error" && errorCode !== "NO_COMMITS" && (
                <div
                  className="rounded-xl px-4 py-3 text-sm"
                  style={{
                    background: "rgba(248,113,113,0.08)",
                    border: "1.5px dashed var(--coral)",
                    color: "var(--coral)",
                  }}
                >
                  {errorMsg}
                  {errorCode === "CLONE_FAILED" && (
                    <span style={{ color: "var(--muted)" }}>
                      {" "}Make sure the repo is public and the URL is valid.
                    </span>
                  )}
                </div>
              )}

              {/* No commits error */}
              {state === "error" && errorCode === "NO_COMMITS" && (
                <div
                  className="rounded-xl px-4 py-4 flex flex-col gap-2 items-center text-center text-sm"
                  style={{
                    background: "rgba(248,113,113,0.08)",
                    border: "1.5px dashed var(--coral)",
                  }}
                >
                  <div style={{ fontSize: 32 }}>✂</div>
                  <div className="font-semibold" style={{ color: "var(--text)" }}>
                    Nothing to cut.
                  </div>
                  <div style={{ color: "var(--muted)" }}>{errorMsg}</div>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>
                    Tip: try widening your date range.
                  </div>
                </div>
              )}

              {/* CTA */}
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="rounded-full px-6 py-3 font-bold text-base transition-all"
                style={{
                  background: canSubmit
                    ? "linear-gradient(135deg, var(--violet), #5a7cff)"
                    : "var(--border)",
                  color: canSubmit ? "#fff" : "var(--muted)",
                  cursor: canSubmit ? "pointer" : "not-allowed",
                  boxShadow: canSubmit ? "0 0 20px rgba(124,92,255,0.3)" : "none",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (canSubmit) {
                    (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 24px rgba(124,92,255,0.45)";
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = canSubmit ? "0 0 20px rgba(124,92,255,0.3)" : "none";
                }}
              >
                {!canSubmit && hasErrors
                  ? `✂ Fix ${Object.keys(repoErrors).length} error${Object.keys(repoErrors).length > 1 ? "s" : ""} first`
                  : "✂ Cut the Prize"}
              </button>
            </div>
          )}

          {/* LOADING STATE */}
          {state === "loading" && (
            <LoadingState
              summary={buildSummaryChip(repos, startDate, endDate, prizeAmount ? parseFloat(prizeAmount) : undefined)}
              onEdit={handleEdit}
            />
          )}

          {/* RESULTS STATE */}
          {state === "results" && results && (
            <div className="slide-up flex flex-col gap-5">
              {/* Header row */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h1
                    className="text-2xl font-bold leading-tight"
                    style={{ color: "var(--text)" }}
                  >
                    Here&apos;s the cut
                    {results.contributors[0]?.prizeShare !== undefined && (
                      <span style={{ color: "var(--violet)" }}>
                        {" "}· {currency} {(prizeAmount ? parseFloat(prizeAmount) : 0).toLocaleString()}
                      </span>
                    )}
                  </h1>
                  <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
                    {results.totalCommits} commits across {results.repoCount} repo{results.repoCount > 1 ? "s" : ""} · {results.dateRange.start} → {results.dateRange.end}
                  </p>
                </div>
                <button
                  onClick={handleEdit}
                  className="text-sm rounded-lg px-3 py-1.5 transition-colors"
                  style={{
                    border: "1.5px solid var(--border)",
                    color: "var(--muted)",
                    background: "transparent",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--violet)";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--violet)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
                  }}
                >
                  ✎ New analysis
                </button>
              </div>

              {/* Chart */}
              <div
                className="rounded-2xl p-5"
                style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}
              >
                <ContributionChart contributors={results.contributors} />
              </div>

              {/* Table */}
              <ResultsTable contributors={results.contributors} currency={currency} />

              {/* Actions */}
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={copyMarkdown}
                  className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors"
                  style={{
                    border: "1.5px solid var(--border)",
                    color: copied ? "var(--mint)" : "var(--text)",
                    background: "var(--card)",
                    borderColor: copied ? "var(--mint)" : "var(--border)",
                  }}
                >
                  {copied ? "✓ Copied!" : "⧉ Copy markdown"}
                </button>
                <button
                  onClick={exportCsv}
                  className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors"
                  style={{
                    border: "1.5px solid var(--border)",
                    color: "var(--text)",
                    background: "var(--card)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--mint)";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--mint)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--text)";
                  }}
                >
                  ⤓ Export CSV
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer
        className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap text-xs"
        style={{
          borderTop: "1px solid var(--border)",
          color: "var(--muted)",
          maxWidth: "none",
        }}
      >
        <span>
          Score = 50% lines added + 25% lines deleted + 25% commits. Merge commits, lock files, and generated assets ignored.
        </span>
        <button
          onClick={() => setDrawerOpen(true)}
          className="underline transition-colors"
          style={{ color: "var(--muted)" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--violet)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--muted)")}
        >
          How it works
        </button>
      </footer>

      <HowItWorksDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
