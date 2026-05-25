"use client";

import { useEffect, useState } from "react";
import { ContributorStats } from "@/lib/types";

interface Props {
  contributors: ContributorStats[];
  currency?: string;
}

function useCountUp(target: number, duration = 800): number {
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
      // Ease out cubic
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
  size = 56,
}: {
  name: string;
  avatarUrl?: string;
  size?: number;
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
        width={size}
        height={size}
        onError={() => setImgError(true)}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          border: "2.5px solid var(--ink)",
          objectFit: "cover",
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: "2.5px solid var(--ink)",
        background: "var(--paper-2)",
        color: "var(--ink)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Kalam, ui-sans-serif, sans-serif",
        fontWeight: 700,
        fontSize: size * 0.35,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

interface PodiumCardProps {
  contributor: ContributorStats;
  rank: 1 | 2 | 3;
  currency: string;
}

const RANK_CONFIG = {
  1: {
    height: 80,
    color: "#ffd84a",
    label: "🥇",
    cardScale: 1,
    order: 2,
  },
  2: {
    height: 56,
    color: "#d8d8d8",
    label: "🥈",
    cardScale: 0.96,
    order: 1,
  },
  3: {
    height: 40,
    color: "#e0b070",
    label: "🥉",
    cardScale: 0.92,
    order: 3,
  },
};

function PodiumCard({ contributor: c, rank, currency }: PodiumCardProps) {
  const cfg = RANK_CONFIG[rank];
  const animatedPrize = useCountUp(c.prizeShare ?? 0, 900);
  const animatedPct = useCountUp(c.percentage, 700);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        order: cfg.order,
        transform: `scale(${cfg.cardScale})`,
        transformOrigin: "bottom center",
      }}
    >
      {/* Card */}
      <div
        style={{
          background: rank === 1 ? "rgba(255,216,74,0.18)" : "var(--paper-2)",
          border: "2px solid var(--ink)",
          borderRadius: "18px 22px 16px 20px / 20px 16px 22px 18px",
          boxShadow: rank === 1 ? "4px 5px 0 0 rgba(0,0,0,.85)" : "3px 4px 0 0 rgba(0,0,0,.7)",
          padding: "14px 16px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          minWidth: 120,
          maxWidth: 160,
          position: "relative",
        }}
      >
        {/* Rank badge */}
        <div
          style={{
            position: "absolute",
            top: -12,
            right: -8,
            fontSize: 22,
            lineHeight: 1,
          }}
        >
          {cfg.label}
        </div>

        <Avatar name={c.name} avatarUrl={c.githubAvatarUrl} size={rank === 1 ? 56 : 44} />

        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontFamily: "var(--font-caveat), Caveat, cursive",
              fontWeight: 700,
              fontSize: rank === 1 ? 18 : 15,
              color: "var(--ink)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: 120,
            }}
            title={c.name}
          >
            {c.name}
          </div>
          <div
            style={{
              fontFamily: "Kalam, ui-sans-serif, sans-serif",
              fontSize: 13,
              color: "var(--accent)",
              fontWeight: 700,
            }}
          >
            {animatedPct.toFixed(1)}%
          </div>
          {c.prizeShare !== undefined && (
            <div
              style={{
                fontFamily: "Kalam, ui-sans-serif, sans-serif",
                fontSize: 13,
                color: "var(--ink)",
                fontWeight: 600,
                marginTop: 2,
              }}
            >
              {currency} {animatedPrize.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          )}
        </div>
      </div>

      {/* Pedestal */}
      <div
        style={{
          width: "100%",
          height: cfg.height,
          background: cfg.color,
          border: "2px solid var(--ink)",
          borderTop: "none",
          borderRadius: "0 0 8px 8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-caveat), Caveat, cursive",
          fontWeight: 700,
          fontSize: 28,
          color: "rgba(0,0,0,0.4)",
        }}
      >
        {rank}
      </div>
    </div>
  );
}

export function PodiumView({ contributors, currency = "USD" }: Props) {
  const top3 = contributors.slice(0, 3);
  if (top3.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-end",
        gap: 12,
        padding: "20px 16px 0",
      }}
    >
      {top3.map((c, i) => (
        <PodiumCard
          key={c.email}
          contributor={c}
          rank={(i + 1) as 1 | 2 | 3}
          currency={currency}
        />
      ))}
    </div>
  );
}
