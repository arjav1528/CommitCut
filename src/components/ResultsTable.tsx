"use client";

import { ContributorStats } from "@/lib/types";

interface Props {
  contributors: ContributorStats[];
  currency?: string;
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const hue = name.charCodeAt(0) * 40;
  return (
    <div
      className="rounded-full flex items-center justify-center text-xs font-bold flex-none"
      style={{
        width: 28,
        height: 28,
        background: `hsl(${hue}, 60%, 25%)`,
        border: "1.5px solid var(--border)",
        color: `hsl(${hue}, 80%, 80%)`,
        fontFamily: "var(--font-geist-mono)",
      }}
    >
      {initials}
    </div>
  );
}

export function ResultsTable({ contributors, currency = "USD" }: Props) {
  const hasPrize = contributors.some((c) => c.prizeShare !== undefined);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: "1.5px solid var(--border)" }}
    >
      {/* Header */}
      <div
        className="grid text-xs font-semibold px-4 py-2"
        style={{
          background: "var(--card)",
          color: "var(--muted)",
          gridTemplateColumns: hasPrize
            ? "1fr 80px 90px 90px 60px 80px"
            : "1fr 80px 90px 90px 60px",
          fontFamily: "var(--font-geist-mono)",
        }}
      >
        <span>Contributor</span>
        <span className="text-right">Commits</span>
        <span className="text-right" style={{ color: "var(--mint)" }}>+Lines</span>
        <span className="text-right" style={{ color: "var(--coral)" }}>-Lines</span>
        <span className="text-right">Share</span>
        {hasPrize && <span className="text-right">{currency}</span>}
      </div>

      {contributors.map((c, i) => (
        <div
          key={c.email}
          className="grid items-center px-4 py-3 text-sm"
          style={{
            gridTemplateColumns: hasPrize
              ? "1fr 80px 90px 90px 60px 80px"
              : "1fr 80px 90px 90px 60px",
            borderTop: "1px solid var(--border)",
            background: i === 0 ? "rgba(255,216,74,0.06)" : "transparent",
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Avatar name={c.name} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm" style={{ color: i === 0 ? "var(--hi)" : "var(--text)" }}>
                  {c.name}
                </span>
                {i === 0 && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full flex-none"
                    style={{
                      background: "rgba(255,216,74,0.15)",
                      color: "var(--hi)",
                      border: "1px solid rgba(255,216,74,0.3)",
                      fontSize: "10px",
                    }}
                  >
                    ★ Top
                  </span>
                )}
              </div>
              <div
                className="text-xs truncate"
                style={{ color: "var(--muted)", fontFamily: "var(--font-geist-mono)" }}
              >
                {c.email}
              </div>
            </div>
          </div>

          <span
            className="text-right"
            style={{ fontFamily: "var(--font-geist-mono)", color: "var(--text)" }}
          >
            {c.commits}
          </span>
          <span
            className="text-right"
            style={{ fontFamily: "var(--font-geist-mono)", color: "var(--mint)" }}
          >
            +{c.linesAdded.toLocaleString()}
          </span>
          <span
            className="text-right"
            style={{ fontFamily: "var(--font-geist-mono)", color: "var(--coral)" }}
          >
            -{c.linesDeleted.toLocaleString()}
          </span>
          <span
            className="text-right font-bold"
            style={{ fontFamily: "var(--font-geist-mono)", color: "var(--violet)" }}
          >
            {c.percentage}%
          </span>
          {hasPrize && (
            <span
              className="text-right font-semibold"
              style={{ fontFamily: "var(--font-geist-mono)", color: "var(--text)" }}
            >
              ${c.prizeShare?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
