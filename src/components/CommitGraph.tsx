"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { ContributorStats } from "@/lib/types";

interface Props {
  timeline: { date: string; count: number }[];
  contributors: ContributorStats[];
  startDate: string;
  endDate: string;
}

function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(b).getTime() - new Date(a).getTime()) / 86400000
  );
}

function getISOWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  // ISO week: get Monday of the week
  const day = d.getUTCDay(); // 0=Sun
  const diff = (day + 6) % 7; // days since Monday
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - diff);
  return monday.toISOString().slice(0, 10);
}

function groupByWeek(
  timeline: { date: string; count: number }[]
): { label: string; count: number; weekStart: string }[] {
  const weekMap = new Map<string, number>();
  for (const { date, count } of timeline) {
    const wk = getISOWeekKey(date);
    weekMap.set(wk, (weekMap.get(wk) ?? 0) + count);
  }
  const weeks = Array.from(weekMap.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );
  return weeks.map(([weekStart, count], i) => ({
    label: `Wk ${i + 1}`,
    count,
    weekStart,
  }));
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

interface TooltipPayloadEntry {
  value: number;
  payload: { date?: string; weekStart?: string; label?: string };
}

function CustomTooltip({
  active,
  payload,
  isWeekly,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
  isWeekly: boolean;
}) {
  if (!active || !payload || !payload.length) return null;
  const count = payload[0].value;
  const entry = payload[0].payload;
  const dateLabel = isWeekly
    ? `Week of ${entry.weekStart ?? ""}`
    : (entry.date ?? "");

  return (
    <div
      style={{
        background: "var(--paper)",
        border: "2px solid var(--ink)",
        borderRadius: 8,
        padding: "6px 12px",
        fontFamily: "Kalam, ui-sans-serif, sans-serif",
        fontSize: 13,
        color: "var(--ink)",
        boxShadow: "2px 2px 0 0 rgba(0,0,0,0.7)",
      }}
    >
      <div style={{ fontWeight: 700 }}>{dateLabel}</div>
      <div>{count} commit{count !== 1 ? "s" : ""}</div>
    </div>
  );
}

export function CommitGraph({ timeline, startDate, endDate }: Props) {
  const rangeDays = daysBetween(startDate, endDate);
  const isWeekly = rangeDays > 60;

  const chartData: { label: string; count: number; date?: string; weekStart?: string }[] = isWeekly
    ? groupByWeek(timeline)
    : timeline.map((d) => ({ count: d.count, date: d.date, label: formatDayLabel(d.date) }));

  return (
    <div
      style={{
        background: "var(--paper-2)",
        border: "2px solid var(--ink)",
        borderRadius: "18px 22px 16px 20px / 20px 16px 22px 18px",
        boxShadow: "4px 5px 0 0 rgba(0,0,0,.85)",
        padding: 20,
      }}
    >
      {/* Title */}
      <div
        style={{
          fontFamily: "var(--font-caveat), Caveat, cursive",
          fontWeight: 700,
          fontSize: 20,
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "var(--ink)",
          marginBottom: 14,
        }}
      >
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
        Commit timeline
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <BarChart
          data={chartData}
          margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
          barCategoryGap="30%"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(0,0,0,0.07)"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{
              fontFamily: "Kalam, ui-sans-serif, sans-serif",
              fontSize: 11,
              fill: "var(--muted)",
            }}
            axisLine={{ stroke: "var(--ink)", strokeWidth: 1.5 }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            allowDecimals={false}
            tick={{
              fontFamily: "Kalam, ui-sans-serif, sans-serif",
              fontSize: 11,
              fill: "var(--muted)",
            }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={
              <CustomTooltip isWeekly={isWeekly} />
            }
            cursor={{ fill: "rgba(107,76,255,0.08)" }}
          />
          <Bar
            dataKey="count"
            fill="var(--accent)"
            radius={[4, 4, 0, 0]}
            stroke="var(--ink)"
            strokeWidth={1}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
