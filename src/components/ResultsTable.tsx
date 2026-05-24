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
  return (
    <div
      className="rounded-full flex items-center justify-center text-xs font-bold flex-none"
      style={{
        width: 28,
        height: 28,
        background: "var(--paper-2)",
        border: "2px solid var(--ink)",
        color: "var(--ink)",
        fontFamily: "Kalam, ui-sans-serif, sans-serif",
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
      className="overflow-hidden"
      style={{
        border: "2px solid var(--ink)",
        borderRadius: "18px 22px 16px 20px / 20px 16px 22px 18px",
        boxShadow: "4px 5px 0 0 rgba(0,0,0,.85)",
      }}
    >
      {/* Header */}
      <div
        className="grid text-xs font-semibold px-4 py-2"
        style={{
          background: "var(--paper-2)",
          color: "var(--muted)",
          gridTemplateColumns: hasPrize
            ? "1fr 80px 90px 90px 60px 80px"
            : "1fr 80px 90px 90px 60px",
          fontFamily: "var(--font-caveat), Caveat, cursive",
          fontSize: 15,
          borderBottom: "2px solid var(--ink)",
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
            borderTop: i > 0 ? "1px dashed var(--ink)" : undefined,
            background: i === 0 ? "rgba(255,216,74,0.18)" : "transparent",
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Avatar name={c.name} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className="truncate text-sm"
                  style={{
                    color: "var(--ink)",
                    fontFamily: "Kalam, ui-sans-serif, sans-serif",
                    fontWeight: i === 0 ? 700 : 400,
                  }}
                >
                  {c.name}
                </span>
                {i === 0 && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full flex-none"
                    style={{
                      background: "var(--hi)",
                      color: "var(--ink)",
                      border: "1.5px solid var(--ink)",
                      fontSize: "10px",
                      fontFamily: "var(--font-caveat), Caveat, cursive",
                      fontWeight: 700,
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
            style={{ fontFamily: "Kalam, ui-sans-serif, sans-serif", color: "var(--ink)" }}
          >
            {c.commits}
          </span>
          <span
            className="text-right"
            style={{ fontFamily: "Kalam, ui-sans-serif, sans-serif", color: "var(--mint)" }}
          >
            +{c.linesAdded.toLocaleString()}
          </span>
          <span
            className="text-right"
            style={{ fontFamily: "Kalam, ui-sans-serif, sans-serif", color: "var(--coral)" }}
          >
            -{c.linesDeleted.toLocaleString()}
          </span>
          <span
            className="text-right font-bold"
            style={{ fontFamily: "Kalam, ui-sans-serif, sans-serif", color: "var(--accent)" }}
          >
            {c.percentage}%
          </span>
          {hasPrize && (
            <span
              className="text-right font-semibold"
              style={{ fontFamily: "Kalam, ui-sans-serif, sans-serif", color: "var(--ink)" }}
            >
              ${c.prizeShare?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
