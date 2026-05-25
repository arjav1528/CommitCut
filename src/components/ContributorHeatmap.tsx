"use client";

interface Props {
  commitDates: string[];
  startDate: string;
  endDate: string;
}

const MAX_WEEKS = 26;
const CELL = 9;
const GAP = 2;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getMonday(dateStr: string): Date {
  const d = new Date(dateStr + "T00:00:00Z");
  const day = d.getUTCDay(); // 0 = Sun
  const diff = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function cellColor(count: number): string {
  if (count === 0) return "rgba(0,0,0,0.07)";
  if (count === 1) return "rgba(107,76,255,0.25)";
  if (count <= 3) return "rgba(107,76,255,0.5)";
  if (count <= 5) return "rgba(107,76,255,0.75)";
  return "#6b4cff";
}

export function ContributorHeatmap({ commitDates, startDate, endDate }: Props) {
  // Build date → count map
  const countMap = new Map<string, number>();
  for (const d of commitDates) {
    countMap.set(d, (countMap.get(d) ?? 0) + 1);
  }

  // Determine the grid window
  const endMonday = getMonday(endDate);
  // end week: week containing endDate
  const endWeekStart = endMonday;
  // go back MAX_WEEKS - 1 weeks
  const gridStart = addDays(endWeekStart, -(MAX_WEEKS - 1) * 7);

  // Clamp to startDate if startDate is later than gridStart
  const startMonday = getMonday(startDate);
  const effectiveStart = startMonday > gridStart ? startMonday : gridStart;

  // Collect weeks
  const weeks: string[][] = []; // weeks[col][row=0..6] = YYYY-MM-DD or ""
  let weekStart = new Date(effectiveStart);
  while (weekStart <= endWeekStart) {
    const week: string[] = [];
    for (let d = 0; d < 7; d++) {
      const day = addDays(weekStart, d);
      const ymd = toYMD(day);
      // Only show if within [startDate, endDate]
      if (ymd >= startDate && ymd <= endDate) {
        week.push(ymd);
      } else {
        week.push("");
      }
    }
    weeks.push(week);
    weekStart = addDays(weekStart, 7);
  }

  const totalWidth = weeks.length * (CELL + GAP) - GAP;
  const totalHeight = 7 * (CELL + GAP) - GAP;

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
        {/* Day labels */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: GAP,
            paddingTop: 0,
          }}
        >
          {DAYS.map((day, i) => (
            <div
              key={day}
              style={{
                height: CELL,
                fontSize: 8,
                fontFamily: "Kalam, ui-sans-serif, sans-serif",
                color: "var(--muted)",
                lineHeight: `${CELL}px`,
                opacity: i % 2 === 0 ? 1 : 0,
                userSelect: "none",
              }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div
          style={{
            display: "flex",
            gap: GAP,
            overflowX: "auto",
          }}
        >
          {weeks.map((week, wIdx) => (
            <div
              key={wIdx}
              style={{ display: "flex", flexDirection: "column", gap: GAP }}
            >
              {week.map((dateStr, dIdx) => {
                const count = dateStr ? (countMap.get(dateStr) ?? 0) : 0;
                return (
                  <div
                    key={dIdx}
                    title={dateStr ? `${dateStr}: ${count} commit${count !== 1 ? "s" : ""}` : undefined}
                    style={{
                      width: CELL,
                      height: CELL,
                      borderRadius: 2,
                      background: dateStr ? cellColor(count) : "transparent",
                      border: dateStr ? "1px solid rgba(0,0,0,0.08)" : "none",
                      flexShrink: 0,
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          marginTop: 6,
          fontFamily: "Kalam, ui-sans-serif, sans-serif",
          fontSize: 10,
          color: "var(--muted)",
        }}
      >
        <span>Less</span>
        {[0, 1, 2, 4, 6].map((n) => (
          <div
            key={n}
            style={{
              width: CELL,
              height: CELL,
              borderRadius: 2,
              background: cellColor(n),
              border: "1px solid rgba(0,0,0,0.08)",
              flexShrink: 0,
            }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
