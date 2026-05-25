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

const seclabelStyle: React.CSSProperties = {
  fontFamily: "var(--font-caveat), Caveat, cursive",
  fontWeight: 700,
  fontSize: 20,
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: "var(--ink)",
  marginBottom: 10,
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={seclabelStyle}>
      <span
        style={{
          display: "inline-block",
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: "var(--accent)",
          border: "2px solid var(--ink)",
          flexShrink: 0,
        }}
      />
      {children}
    </div>
  );
}

function IsometricIllo() {
  return (
    <svg viewBox="0 0 220 160" width="100%" height="160">
      <defs>
        <pattern id="dots" width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="#1b1b1b" opacity=".3"/>
        </pattern>
      </defs>
      <rect x="0" y="0" width="220" height="160" fill="url(#dots)"/>
      <g transform="translate(20 90) skewX(-25)">
        <rect className="bar-grow bar-grow-1" x="0"   y="-30" width="40" height="30" fill="#6b4cff" stroke="#1b1b1b" strokeWidth="2"/>
        <rect className="bar-grow bar-grow-2" x="44"  y="-50" width="40" height="50" fill="#1f9d6b" stroke="#1b1b1b" strokeWidth="2"/>
        <rect className="bar-grow bar-grow-3" x="88"  y="-22" width="40" height="22" fill="#ffd84a" stroke="#1b1b1b" strokeWidth="2"/>
        <rect className="bar-grow bar-grow-4" x="132" y="-40" width="40" height="40" fill="#fff"    stroke="#1b1b1b" strokeWidth="2"/>
      </g>
      <line className="dash-draw" x1="0" y1="40" x2="220" y2="60" stroke="#d6483a" strokeWidth="2.5" strokeDasharray="6 4"/>
      <circle cx="110" cy="50" r="6" fill="#fff" stroke="#1b1b1b" strokeWidth="2"/>
      <circle cx="118" cy="50" r="6" fill="#fff" stroke="#1b1b1b" strokeWidth="2"/>
    </svg>
  );
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

  const showPreview = !!(startDate && endDate && repos.some((r) => r.trim()));
  const dayCount = startDate && endDate
    ? Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000)
    : 0;
  const filledRepos = repos.filter((r) => r.trim());
  const prizeNum = prizeAmount ? parseFloat(prizeAmount) : 0;

  const inputStyle: React.CSSProperties = {
    background: "#fff",
    border: "2px solid var(--ink)",
    borderRadius: 10,
    color: "var(--muted)",
    padding: "7px 10px",
    fontSize: 14,
    fontFamily: "Kalam, ui-sans-serif, sans-serif",
  };

  const formCard = (
    <div
      className="flex flex-col gap-6"
      style={{
        background: "var(--paper-2)",
        border: "2px solid var(--ink)",
        borderRadius: "18px 22px 16px 20px / 20px 16px 22px 18px",
        boxShadow: "4px 5px 0 0 rgba(0,0,0,.85)",
        padding: 24,
      }}
    >
      {/* Inner grid when preview is active */}
      <div
        style={
          showPreview
            ? { display: "grid", gridTemplateColumns: "1.4fr 0.9fr", gap: 12 }
            : {}
        }
      >
        {/* Form fields column */}
        <div className="flex flex-col gap-6">
          {/* Repos */}
          <div>
            <SectionLabel>Repositories</SectionLabel>
            <RepoInputList
              repos={repos}
              onChange={(r) => { setRepos(r); setRepoErrors({}); }}
              errors={repoErrors}
            />
          </div>

          {/* Date range */}
          <div>
            <SectionLabel>Date range</SectionLabel>
            <div className="flex gap-3">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                aria-label="Start date"
                className="flex-1"
                style={{ ...inputStyle, colorScheme: "light" }}
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                aria-label="End date"
                className="flex-1"
                style={{ ...inputStyle, colorScheme: "light" }}
              />
            </div>
          </div>

          {/* Prize */}
          <div>
            <SectionLabel>
              Prize{" "}
              <span style={{ fontWeight: 400, fontSize: 15, color: "var(--muted)" }}>(optional)</span>
            </SectionLabel>
            <div className="flex gap-3">
              <div
                className="flex items-center flex-1 overflow-hidden"
                style={{
                  border: "2px solid var(--ink)",
                  borderRadius: 10,
                  background: "#fff",
                }}
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
                  style={{ color: "var(--ink)", outline: "none", fontFamily: "Kalam, ui-sans-serif, sans-serif" }}
                />
              </div>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                aria-label="Currency"
                style={{
                  ...inputStyle,
                  minWidth: 80,
                  color: "var(--ink)",
                }}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Preview rail */}
        {showPreview && (
          <div
            className="rail-enter"
            style={{
              background: "var(--paper)",
              border: "2px dashed var(--ink)",
              borderRadius: 12,
              padding: 10,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-caveat), Caveat, cursive",
                fontWeight: 700,
                fontSize: 16,
                color: "var(--ink)",
              }}
            >
              Summary
            </div>
            <div style={{ fontSize: 13, fontFamily: "Kalam, ui-sans-serif, sans-serif", color: "var(--ink)" }}>
              {filledRepos.length} repo{filledRepos.length !== 1 ? "s" : ""}
            </div>
            <div style={{ fontSize: 13, fontFamily: "Kalam, ui-sans-serif, sans-serif", color: "var(--ink)" }}>
              {dayCount} day{dayCount !== 1 ? "s" : ""}
            </div>
            {prizeNum > 0 && (
              <div style={{ fontSize: 13, fontFamily: "Kalam, ui-sans-serif, sans-serif", color: "var(--ink)" }}>
                ${prizeNum.toLocaleString()} total
              </div>
            )}
            <div
              style={{
                borderTop: "1px dashed var(--ink)",
                marginTop: 4,
                paddingTop: 4,
              }}
            />
            <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "Kalam, ui-sans-serif, sans-serif" }}>
              Per-person if equal:
            </div>
            {prizeNum > 0 && filledRepos.length > 0 && (
              <div style={{ fontSize: 13, fontFamily: "Kalam, ui-sans-serif, sans-serif", color: "var(--ink)", fontWeight: 700 }}>
                ${(prizeNum / filledRepos.length).toFixed(0)} × {filledRepos.length}
              </div>
            )}
            <div style={{ fontSize: 10, color: "var(--muted)", fontFamily: "Kalam, ui-sans-serif, sans-serif", marginTop: 2 }}>
              actual split after analysis
            </div>
          </div>
        )}
      </div>

      {/* Error banner — non-NO_COMMITS */}
      {state === "error" && errorCode !== "NO_COMMITS" && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{
            background: "var(--paper)",
            border: "2px dashed var(--coral)",
            color: "var(--coral)",
            fontFamily: "Kalam, ui-sans-serif, sans-serif",
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

      {/* No commits error — centered empty state */}
      {state === "error" && errorCode === "NO_COMMITS" && (
        <div
          className="flex flex-col gap-3 items-center text-center"
          style={{ padding: "12px 0" }}
        >
          <div
            key={errorMsg}
            className="shake"
          >
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
              fontSize: 26,
              color: "var(--ink)",
            }}
          >
            Nothing to cut.
          </div>
          <div
            style={{
              fontSize: 13,
              color: "var(--muted)",
              fontFamily: "Kalam, ui-sans-serif, sans-serif",
              maxWidth: 320,
            }}
          >
            No commits found between {startDate} and {endDate} across {repos.length} repo{repos.length !== 1 ? "s" : ""}.
          </div>
          <div className="flex gap-3 flex-wrap justify-center" style={{ marginTop: 4 }}>
            <button
              onClick={() => { setStartDate(""); setEndDate(""); }}
              style={{
                border: "2px solid var(--ink)",
                borderRadius: 999,
                padding: "5px 14px",
                fontSize: 13,
                fontFamily: "Kalam, ui-sans-serif, sans-serif",
                background: "transparent",
                color: "var(--ink)",
                cursor: "pointer",
              }}
            >
              ↔ Widen dates
            </button>
            <button
              onClick={() => {
                setState("input");
                setTimeout(() => {
                  const el = document.querySelector<HTMLInputElement>('input[placeholder]');
                  if (el) el.focus();
                }, 50);
              }}
              style={{
                border: "2px solid var(--ink)",
                borderRadius: 999,
                padding: "5px 14px",
                fontSize: 13,
                fontFamily: "Kalam, ui-sans-serif, sans-serif",
                background: "transparent",
                color: "var(--ink)",
                cursor: "pointer",
              }}
            >
              ✎ Change repos
            </button>
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--muted)",
              fontFamily: "Kalam, ui-sans-serif, sans-serif",
              marginTop: 2,
            }}
          >
            Tip: most hackathons run over a weekend — try Fri → Sun
          </div>
        </div>
      )}

      {/* CTA */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full"
        style={{
          background: canSubmit ? "var(--ink)" : "var(--muted)",
          color: "var(--paper)",
          border: "2px solid var(--ink)",
          borderRadius: 999,
          padding: "12px 18px",
          fontSize: 16,
          fontFamily: "Kalam, ui-sans-serif, sans-serif",
          fontWeight: 700,
          boxShadow: canSubmit ? "2px 2px 0 0 rgba(0,0,0,.85)" : "none",
          cursor: canSubmit ? "pointer" : "not-allowed",
          transition: "all 0.15s ease",
        }}
      >
        {!canSubmit && hasErrors
          ? `✂ Fix ${Object.keys(repoErrors).length} error${Object.keys(repoErrors).length > 1 ? "s" : ""} first`
          : "✂ Cut the Prize"}
      </button>
    </div>
  );

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--paper)" }}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-3">
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
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center px-4 pb-16 pt-0">
        <div className="w-full max-w-5xl flex flex-col gap-6">

          {/* INPUT / ERROR STATE — Split hero layout */}
          {(state === "input" || state === "error") && (
            <div className="md:grid md:grid-cols-2 gap-8 items-start flex flex-col">
              {/* LEFT — hero copy + illustration */}
              <div className="hero-enter flex flex-col gap-4 pt-4">
                <h1
                  style={{
                    fontFamily: "var(--font-caveat), Caveat, cursive",
                    fontWeight: 700,
                    fontSize: 38,
                    color: "var(--ink)",
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                >
                  Split the prize by what you actually{" "}
                  <span
                    style={{
                      textDecoration: "underline wavy var(--accent)",
                      textUnderlineOffset: 4,
                    }}
                  >
                    committed
                  </span>
                  .
                </h1>
                <p
                  style={{
                    fontFamily: "Kalam, ui-sans-serif, sans-serif",
                    fontSize: 15,
                    color: "var(--muted)",
                    margin: 0,
                  }}
                >
                  Paste repos. Pick dates. Get the cut.
                </p>
                <IsometricIllo />
              </div>

              {/* RIGHT — form card */}
              <div className="form-enter">
                {formCard}
              </div>
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
                    style={{
                      color: "var(--ink)",
                      fontFamily: "var(--font-caveat), Caveat, cursive",
                      fontSize: 28,
                    }}
                  >
                    Here&apos;s the cut
                    {results.contributors[0]?.prizeShare !== undefined && (
                      <span style={{ color: "var(--accent)" }}>
                        {" "}· {currency} {(prizeAmount ? parseFloat(prizeAmount) : 0).toLocaleString()}
                      </span>
                    )}
                  </h1>
                  <p className="text-sm mt-0.5" style={{ color: "var(--muted)", fontFamily: "Kalam, ui-sans-serif, sans-serif" }}>
                    {results.totalCommits} commits across {results.repoCount} repo{results.repoCount > 1 ? "s" : ""} · {results.dateRange.start} → {results.dateRange.end}
                  </p>
                </div>
                <button
                  onClick={handleEdit}
                  className="text-sm"
                  style={{
                    border: "2px solid var(--ink)",
                    borderRadius: 999,
                    padding: "3px 10px",
                    color: "var(--muted)",
                    background: "transparent",
                    fontFamily: "Kalam, ui-sans-serif, sans-serif",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  ✎ New analysis
                </button>
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
                  animationDelay: "0s",
                }}
              >
                <ContributionChart contributors={results.contributors} />
              </div>

              {/* Table rows staggered */}
              <div
                className="row-in"
                style={{ animationDelay: "0.07s" }}
              >
                <ResultsTable contributors={results.contributors} currency={currency} />
              </div>

              {/* Actions */}
              <div className="flex gap-3 flex-wrap row-in" style={{ animationDelay: "0.14s" }}>
                <button
                  onClick={copyMarkdown}
                  className="flex items-center gap-2"
                  style={{
                    border: "2px solid var(--ink)",
                    borderRadius: 999,
                    padding: "3px 12px",
                    color: copied ? "var(--mint)" : "var(--ink)",
                    background: "transparent",
                    fontFamily: "Kalam, ui-sans-serif, sans-serif",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  {copied ? "✓ Copied!" : "⧉ Copy markdown"}
                </button>
                <button
                  onClick={exportCsv}
                  className="flex items-center gap-2"
                  style={{
                    border: "2px solid var(--ink)",
                    borderRadius: 999,
                    padding: "3px 12px",
                    color: "var(--ink)",
                    background: "transparent",
                    fontFamily: "Kalam, ui-sans-serif, sans-serif",
                    fontSize: 13,
                    cursor: "pointer",
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
          borderTop: "1px solid var(--ink)",
          color: "var(--muted)",
          fontFamily: "Kalam, ui-sans-serif, sans-serif",
        }}
      >
        <span>
          Score = 50% lines added + 25% lines deleted + 25% commits. Merge commits, lock files, and generated assets ignored.
        </span>
        <button
          onClick={() => setDrawerOpen(true)}
          className="underline"
          style={{ color: "var(--muted)", fontFamily: "Kalam, ui-sans-serif, sans-serif", cursor: "pointer" }}
        >
          How it works
        </button>
      </footer>

      <HowItWorksDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
