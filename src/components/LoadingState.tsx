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
      className="flex flex-col gap-5"
      style={{
        background: "var(--paper-2)",
        border: "2px solid var(--ink)",
        borderRadius: "18px 22px 16px 20px / 20px 16px 22px 18px",
        boxShadow: "4px 5px 0 0 rgba(0,0,0,.85)",
        padding: 24,
      }}
    >
      {/* Summary chip */}
      <div className="flex items-center justify-between gap-3">
        <div
          className="flex items-center gap-2 rounded-full px-3 py-1 text-sm"
          style={{
            background: "var(--ink)",
            color: "var(--paper)",
            fontFamily: "Kalam, ui-sans-serif, sans-serif",
          }}
        >
          <span>{summary}</span>
        </div>
        <button
          onClick={onEdit}
          className="text-xs"
          style={{
            color: "var(--muted)",
            fontFamily: "Kalam, ui-sans-serif, sans-serif",
            cursor: "pointer",
            border: "2px solid var(--ink)",
            borderRadius: 999,
            padding: "2px 8px",
            background: "transparent",
          }}
        >
          ✎ edit
        </button>
      </div>

      <div
        style={{
          color: "var(--ink)",
          fontSize: "22px",
          fontWeight: 700,
          fontFamily: "var(--font-caveat), Caveat, cursive",
        }}
      >
        Cutting the prize…
      </div>

      {/* Skeleton rows */}
      <div className="flex flex-col gap-3">
        {[88, 65, 45, 30].map((w, i) => (
          <div key={i} className="flex items-center gap-3">
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "var(--ink)",
                opacity: 0.35,
                flexShrink: 0,
              }}
            />
            <div
              style={{
                height: 8,
                width: `${w}%`,
                background: "var(--ink)",
                opacity: 0.35,
                borderRadius: 4,
                flex: 1,
              }}
            />
            <div
              style={{
                height: 8,
                width: 44,
                background: "var(--ink)",
                opacity: 0.35,
                borderRadius: 4,
                flexShrink: 0,
              }}
            />
          </div>
        ))}
      </div>

      {/* Status line */}
      <div className="flex items-center gap-2 mt-1">
        <span
          style={{
            width: 6,
            height: 6,
            background: "var(--accent)",
            borderRadius: "50%",
            border: "1.5px solid var(--ink)",
            display: "inline-block",
            flexShrink: 0,
          }}
        />
        <span
          className="text-sm transition-all"
          style={{ color: "var(--muted)", fontFamily: "Kalam, ui-sans-serif, sans-serif" }}
        >
          {PHASES[phase]}
        </span>
      </div>
    </div>
  );
}
