"use client";

import { useEffect, useState } from "react";

const PHASES = [
  "Cloning repos…",
  "Parsing commits…",
  "Scoring contributors…",
  "Calculating cuts…",
];

interface Props {
  summary: string;
  onEdit: () => void;
}

export function LoadingState({ summary, onEdit }: Props) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhase((p) => Math.min(p + 1, PHASES.length - 1));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="rounded-2xl p-6 flex flex-col gap-5"
      style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}
    >
      {/* Summary chip */}
      <div className="flex items-center justify-between gap-3">
        <div
          className="flex items-center gap-2 rounded-full px-3 py-1 text-sm"
          style={{ background: "var(--border)", color: "var(--text)" }}
        >
          <span>{summary}</span>
        </div>
        <button
          onClick={onEdit}
          className="text-xs transition-colors"
          style={{ color: "var(--muted)" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--violet)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--muted)")}
        >
          ✎ edit
        </button>
      </div>

      <div style={{ color: "var(--text)", fontSize: "22px", fontWeight: 700 }}>
        Cutting the prize…
      </div>

      {/* Skeleton rows */}
      <div className="flex flex-col gap-3">
        {[88, 65, 45, 30].map((w, i) => (
          <div key={i} className="flex items-center gap-3">
            <div
              className="shimmer rounded-full flex-none"
              style={{ width: 28, height: 28 }}
            />
            <div
              className="shimmer rounded-lg flex-1"
              style={{ height: 14, width: `${w}%` }}
            />
            <div
              className="shimmer rounded-lg flex-none"
              style={{ height: 14, width: 44 }}
            />
          </div>
        ))}
      </div>

      {/* Status line */}
      <div className="flex items-center gap-2 mt-1">
        <span
          className="rounded-full flex-none"
          style={{ width: 6, height: 6, background: "var(--violet)", display: "inline-block" }}
        />
        <span
          className="text-sm transition-all"
          style={{ color: "var(--muted)", fontFamily: "var(--font-geist-mono)" }}
        >
          {PHASES[phase]}
        </span>
      </div>
    </div>
  );
}
