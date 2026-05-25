"use client";

import { useEffect, useState } from "react";
import { ContributorStats } from "@/lib/types";
import { ContributorHeatmap } from "@/components/ContributorHeatmap";

interface Props {
  contributors: ContributorStats[];
  currency?: string;
  excluded: Set<string>;
  onExclude: (email: string) => void;
  startDate: string;
  endDate: string;
}

function useCountUp(target: number, duration = 700): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }
    const startTime = performance.now();
    let rafId: number;

    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        setValue(target);
      }
    }

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration]);

  return value;
}

function Avatar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl?: string;
}) {
  const [imgError, setImgError] = useState(false);

  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        width={28}
        height={28}
        onError={() => setImgError(true)}
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          border: "2px solid var(--ink)",
          objectFit: "cover",
          flexShrink: 0,
        }}
      />
    );
  }

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

function PrizeCell({ value, currency }: { value: number; currency: string }) {
  const animated = useCountUp(value, 700);
  return (
    <span
      className="text-right font-semibold"
      style={{ fontFamily: "Kalam, ui-sans-serif, sans-serif", color: "var(--ink)" }}
    >
      {currency} {animated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  );
}

function RepoBreakdown({
  breakdown,
}: {
  breakdown: Record<string, { commits: number; linesAdded: number; linesDeleted: number }>;
}) {
  const entries = Object.entries(breakdown).sort((a, b) => b[1].commits - a[1].commits);
  if (entries.length === 0) return null;

  return (
    <div
      style={{
        marginTop: 4,
        display: "flex",
        flexDirection: "column",
        gap: 3,
        paddingLeft: 4,
        borderLeft: "2px dashed var(--ink)",
      }}
    >
      {entries.map(([repoUrl, stats]) => {
        // Extract short repo name from URL
        const shortName = repoUrl.replace(/^https?:\/\/(github\.com\/)?/, "").replace(/\.git$/, "");
        return (
          <div
            key={repoUrl}
            style={{
              fontSize: 11,
              fontFamily: "Kalam, ui-sans-serif, sans-serif",
              color: "var(--muted)",
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
            }}
          >
            <span style={{ color: "var(--ink)", fontWeight: 600 }}>{shortName}</span>
            <span>{stats.commits}c</span>
            <span style={{ color: "var(--mint)" }}>+{stats.linesAdded}</span>
            <span style={{ color: "var(--coral)" }}>-{stats.linesDeleted}</span>
          </div>
        );
      })}
    </div>
  );
}

function TableRow({
  c,
  i,
  hasPrize,
  currency,
  onExclude,
  startDate,
  endDate,
}: {
  c: ContributorStats;
  i: number;
  hasPrize: boolean;
  currency: string;
  onExclude: (email: string) => void;
  startDate: string;
  endDate: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasBreakdown = c.repoBreakdown && Object.keys(c.repoBreakdown).length > 1;

  return (
    <div
      className="px-4 py-3 text-sm"
      style={{
        borderTop: i > 0 ? "1px dashed var(--ink)" : undefined,
        background: i === 0 ? "rgba(255,216,74,0.18)" : "transparent",
      }}
    >
      <div
        className="grid items-center"
        style={{
          gridTemplateColumns: hasPrize
            ? "1fr 80px 90px 90px 60px 160px 28px"
            : "1fr 80px 90px 90px 60px 28px",
        }}
      >
        {/* Contributor column */}
        <div className="flex items-start gap-2 min-w-0">
          <Avatar name={c.name} avatarUrl={c.githubAvatarUrl} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
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
              {hasBreakdown && (
                <button
                  onClick={() => setExpanded((p) => !p)}
                  aria-label={expanded ? "Collapse repo breakdown" : "Expand repo breakdown"}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 10,
                    color: "var(--muted)",
                    padding: "1px 4px",
                    fontFamily: "Kalam, ui-sans-serif, sans-serif",
                  }}
                >
                  {expanded ? "▼" : "▶"} repos
                </button>
              )}
            </div>
            <div
              className="text-xs truncate"
              style={{ color: "var(--muted)", fontFamily: "var(--font-geist-mono)" }}
            >
              {c.email}
            </div>
            {/* Mini progress bar */}
            <div
              style={{
                marginTop: 3,
                height: 4,
                width: 60,
                background: "var(--paper-2)",
                border: "1px solid var(--ink)",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${c.percentage}%`,
                  background: i === 0 ? "var(--hi)" : "var(--accent)",
                  borderRadius: 4,
                }}
              />
            </div>
            {/* Repo breakdown */}
            {expanded && c.repoBreakdown && (
              <RepoBreakdown breakdown={c.repoBreakdown} />
            )}
            {/* Contributor heatmap */}
            {expanded && c.commitDates && c.commitDates.length > 0 && (
              <ContributorHeatmap
                commitDates={c.commitDates}
                startDate={startDate}
                endDate={endDate}
              />
            )}
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
        {hasPrize && c.prizeShare !== undefined && (
          <PrizeCell value={c.prizeShare} currency={currency} />
        )}
        {hasPrize && c.prizeShare === undefined && (
          <span />
        )}

        {/* Exclude button */}
        <button
          onClick={() => onExclude(c.email)}
          aria-label={`Exclude ${c.name}`}
          title={`Exclude ${c.name}`}
          style={{
            background: "none",
            border: "1.5px solid var(--muted)",
            borderRadius: "50%",
            width: 22,
            height: 22,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--muted)",
            fontSize: 12,
            fontFamily: "Kalam, ui-sans-serif, sans-serif",
            padding: 0,
            flexShrink: 0,
            transition: "border-color 0.15s, color 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--coral)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--coral)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--muted)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

export function ResultsTable({ contributors, currency = "USD", excluded, onExclude, startDate, endDate }: Props) {
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
            ? "1fr 80px 90px 90px 60px 160px 28px"
            : "1fr 80px 90px 90px 60px 28px",
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
        <span />
      </div>

      {contributors.filter(c => !excluded.has(c.email)).map((c, i) => (
        <TableRow
          key={c.email}
          c={c}
          i={i}
          hasPrize={hasPrize}
          currency={currency}
          onExclude={onExclude}
          startDate={startDate}
          endDate={endDate}
        />
      ))}

      {/* Excluded contributors — greyed out footer */}
      {Array.from(excluded).filter(email => contributors.find(c => c.email === email)).length > 0 && (
        <div
          style={{
            borderTop: "2px dashed var(--ink)",
            padding: "8px 16px",
            background: "var(--paper)",
            fontSize: 12,
            color: "var(--muted)",
            fontFamily: "Kalam, ui-sans-serif, sans-serif",
          }}
        >
          <span style={{ fontWeight: 600 }}>Excluded: </span>
          {Array.from(excluded)
            .map(email => contributors.find(c => c.email === email)?.name ?? email)
            .join(", ")}
        </div>
      )}
    </div>
  );
}
