"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { RepoInputList, validateRepo } from "@/components/RepoInputList";
import { HowItWorksDrawer } from "@/components/HowItWorksDrawer";
import { DateRangePicker } from "@/components/DateRangePicker";

const DEMO = {
  repos: ["https://github.com/arjav1528/MongoLite"],
  start: "2008-01-01",
  end: new Date().toISOString().slice(0, 10),
  prize: "1000",
};

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
  const router = useRouter();
  const [repos, setRepos] = useState<string[]>([""]);
  const [repoErrors, setRepoErrors] = useState<Record<number, string>>({});
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [prizeAmount, setPrizeAmount] = useState<string>("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [allTime, setAllTime] = useState(false);

  function loadDemo() {
    setRepos(DEMO.repos);
    setStartDate("");
    setEndDate("");
    setAllTime(true);
    setPrizeAmount(DEMO.prize);
    setRepoErrors({});
  }

  const validate = useCallback(() => {
    const errors: Record<number, string> = {};
    repos.forEach((r, i) => {
      const err = validateRepo(r);
      if (err) errors[i] = err;
    });
    setRepoErrors(errors);
    return Object.keys(errors).length === 0 && (allTime || (!!startDate && !!endDate));
  }, [repos, startDate, endDate, allTime]);

  function handleSubmit() {
    if (!validate()) return;
    const filledRepos = repos
      .filter((r) => r.trim())
      .map((r) => (r.startsWith("http") ? r : `https://${r}`));
    const params = new URLSearchParams();
    params.set("repos", filledRepos.join(","));
    if (!allTime) {
      params.set("start", startDate);
      params.set("end", endDate);
    }
    if (prizeAmount) params.set("prize", prizeAmount);
    router.push(`/results?${params.toString()}`);
  }

  const hasErrors = Object.keys(repoErrors).length > 0;
  const canSubmit = repos.every((r) => r.trim()) && (allTime || (!!startDate && !!endDate)) && !hasErrors;

  const showPreview = !!(  (allTime || (startDate && endDate)) && repos.some((r) => r.trim()));
  const dayCount =
    startDate && endDate && !allTime
      ? Math.round(
          (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000
        )
      : null;
  const filledRepos = repos.filter((r) => r.trim());
  const prizeNum = prizeAmount ? parseFloat(prizeAmount) : 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--paper)" }}>
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
          <div className="md:grid md:grid-cols-2 gap-8 items-start flex flex-col items-center md:items-start">
            {/* LEFT — hero */}
            <div className="hero-enter flex flex-col gap-4 pt-4 w-full items-center md:items-start text-center md:text-left">
              <h1
                style={{
                  fontFamily: "var(--font-caveat), Caveat, cursive",
                  fontWeight: 700,
                  fontSize: 38,
                  color: "var(--ink)",
                  margin: 0,
                  lineHeight: 1.2,
                  textAlign: "inherit",
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
              <button
                onClick={loadDemo}
                style={{
                  border: "2px dashed var(--ink)",
                  borderRadius: 999,
                  padding: "6px 16px",
                  background: "rgba(107,76,255,0.06)",
                  color: "var(--accent)",
                  fontFamily: "Kalam, ui-sans-serif, sans-serif",
                  fontSize: 14,
                  cursor: "pointer",
                  fontWeight: 700,
                  alignSelf: "center",
                }}
              >
                ✦ Try a demo
              </button>
              <IsometricIllo />
            </div>

            {/* RIGHT — form */}
            <div className="form-enter w-full">
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
                    <DateRangePicker
                      startDate={startDate}
                      endDate={endDate}
                      allTime={allTime}
                      onStartChange={setStartDate}
                      onEndChange={setEndDate}
                      onAllTimeChange={setAllTime}
                    />
                  </div>

                  {/* Prize */}
                  <div>
                    <SectionLabel>
                      Prize{" "}
                      <span style={{ fontWeight: 400, fontSize: 15, color: "var(--muted)" }}>
                        (optional)
                      </span>
                    </SectionLabel>
                    <div
                      style={{
                        border: "2px solid var(--ink)",
                        borderRadius: 10,
                        background: "#fff",
                      }}
                    >
                      <input
                        type="number"
                        min={0}
                        placeholder="0.00"
                        value={prizeAmount}
                        onChange={(e) => setPrizeAmount(e.target.value)}
                        aria-label="Prize amount"
                        className="w-full py-2 px-3 text-sm bg-transparent"
                        style={{
                          color: "var(--ink)",
                          outline: "none",
                          fontFamily: "Kalam, ui-sans-serif, sans-serif",
                        }}
                      />
                    </div>
                  </div>

                  {/* Preview rail — below inputs on all sizes */}
                  {showPreview && (
                    <div
                      className="rail-enter"
                      style={{
                        background: "var(--paper)",
                        border: "2px dashed var(--ink)",
                        borderRadius: 12,
                        padding: 10,
                        display: "flex",
                        flexDirection: "row",
                        flexWrap: "wrap",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "var(--font-caveat), Caveat, cursive",
                          fontWeight: 700,
                          fontSize: 16,
                          color: "var(--ink)",
                          width: "100%",
                        }}
                      >
                        Summary
                      </div>
                      <div style={{ fontSize: 13, fontFamily: "Kalam, ui-sans-serif, sans-serif", color: "var(--ink)" }}>
                        {filledRepos.length} repo{filledRepos.length !== 1 ? "s" : ""}
                      </div>
                      <div style={{ fontSize: 13, fontFamily: "Kalam, ui-sans-serif, sans-serif", color: "var(--ink)" }}>
                        {allTime ? "All time" : dayCount !== null ? `${dayCount} day${dayCount !== 1 ? "s" : ""}` : ""}
                      </div>
                      {prizeNum > 0 && (
                        <div style={{ fontSize: 13, fontFamily: "Kalam, ui-sans-serif, sans-serif", color: "var(--ink)" }}>
                          {prizeNum.toLocaleString()} total
                        </div>
                      )}
                      {prizeNum > 0 && filledRepos.length > 0 && (
                        <div style={{ fontSize: 13, fontFamily: "Kalam, ui-sans-serif, sans-serif", color: "var(--accent)", fontWeight: 700 }}>
                          {(prizeNum / filledRepos.length).toFixed(0)} × {filledRepos.length} equal split
                        </div>
                      )}
                    </div>
                  )}
                </div>

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
            </div>
          </div>
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

      {/* Footer */}
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
            Score = 50% lines added + 25% lines deleted + 25% commits. Merge commits, lock files, and generated assets ignored.
          </span>
          <button
            onClick={() => setDrawerOpen(true)}
            className="underline"
            style={{ color: "var(--muted)", fontFamily: "Kalam, ui-sans-serif, sans-serif", cursor: "pointer" }}
          >
            How it works
          </button>
        </div>
      </footer>

      <HowItWorksDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
