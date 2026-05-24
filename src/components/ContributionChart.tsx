"use client";

import { ContributorStats } from "@/lib/types";

interface Props {
  contributors: ContributorStats[];
}

export function ContributionChart({ contributors }: Props) {
  return (
    <div className="flex flex-col gap-3" role="img" aria-label="Contribution bar chart">
      {contributors.map((c, i) => {
        return (
          <div key={c.email} className="flex items-center gap-3">
            <span
              className="text-sm text-right flex-none truncate"
              style={{
                width: "80px",
                color: i === 0 ? "var(--ink)" : "var(--muted)",
                fontFamily: "Kalam, ui-sans-serif, sans-serif",
                fontSize: "13px",
                fontWeight: i === 0 ? 700 : 400,
              }}
              title={c.name}
            >
              @{c.name.split(" ")[0].toLowerCase()}
            </span>
            <div
              className="relative flex-1 overflow-hidden"
              style={{
                height: 16,
                border: "2px solid var(--ink)",
                borderRadius: 8,
                background: "#fff",
              }}
            >
              <div
                className="bar-animate absolute left-0 top-0 bottom-0"
                style={{
                  width: `${c.percentage}%`,
                  background: "repeating-linear-gradient(45deg, var(--accent) 0 6px, #8b73ff 6px 12px)",
                  borderRight: "2px solid var(--ink)",
                }}
              />
            </div>
            <span
              className="text-sm font-bold flex-none text-right"
              style={{
                width: "44px",
                fontFamily: "Kalam, ui-sans-serif, sans-serif",
                color: i === 0 ? "var(--ink)" : "var(--muted)",
                fontSize: "13px",
                fontWeight: 700,
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
