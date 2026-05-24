"use client";

import { ContributorStats } from "@/lib/types";

interface Props {
  contributors: ContributorStats[];
}

const GRADIENT_STOPS = [
  "#7c5cff",
  "#6b6cff",
  "#5a7cff",
  "#34d399",
];

export function ContributionChart({ contributors }: Props) {
  return (
    <div className="flex flex-col gap-3" role="img" aria-label="Contribution bar chart">
      {contributors.map((c, i) => {
        const color = GRADIENT_STOPS[Math.min(i, GRADIENT_STOPS.length - 1)];
        return (
          <div key={c.email} className="flex items-center gap-3">
            <span
              className="text-sm text-right flex-none truncate"
              style={{
                width: "80px",
                color: i === 0 ? "var(--hi)" : "var(--text)",
                fontFamily: "var(--font-geist-mono)",
                fontSize: "13px",
              }}
              title={c.name}
            >
              @{c.name.split(" ")[0].toLowerCase()}
            </span>
            <div
              className="relative flex-1 rounded-full overflow-hidden"
              style={{
                height: "18px",
                background: "var(--border)",
              }}
            >
              <div
                className="bar-animate absolute left-0 top-0 bottom-0 rounded-full"
                style={{
                  width: `${c.percentage}%`,
                  background: `linear-gradient(90deg, ${color}, ${i === 0 ? "#34d399" : color}cc)`,
                }}
              />
            </div>
            <span
              className="text-sm font-bold flex-none text-right"
              style={{
                width: "44px",
                fontFamily: "var(--font-geist-mono)",
                color: i === 0 ? "var(--hi)" : "var(--text)",
                fontSize: "13px",
              }}
            >
              {c.percentage}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
