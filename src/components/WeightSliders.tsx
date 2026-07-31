"use client";

export interface WeightState {
  linesAdded: number;
  linesDeleted: number;
  commits: number;
  complexity: number;
  churn: number;
  survival: number;
}

interface Props {
  weights: WeightState;
  onChange: (w: WeightState) => void;
}

interface SliderRowProps {
  label: string;
  color: string;
  value: number;
  pct: number;
  onInput: (v: number) => void;
}

function SliderRow({ label, color, value, pct, onInput }: SliderRowProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: 90,
          fontFamily: "Kalam, ui-sans-serif, sans-serif",
          fontSize: 13,
          color: "var(--ink)",
          flexShrink: 0,
        }}
      >
        {label}
      </div>
      <div style={{ flex: 1, position: "relative" }}>
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onInput(parseInt(e.target.value, 10))}
          style={{
            width: "100%",
            accentColor: color,
            cursor: "pointer",
            height: 4,
          }}
          aria-label={label}
        />
      </div>
      <div
        style={{
          width: 44,
          textAlign: "right",
          fontFamily: "var(--font-caveat), Caveat, cursive",
          fontWeight: 700,
          fontSize: 15,
          color,
          flexShrink: 0,
        }}
      >
        {pct}%
      </div>
    </div>
  );
}

export function WeightSliders({ weights, onChange }: Props) {
  const total =
    weights.linesAdded +
    weights.linesDeleted +
    weights.commits +
    weights.complexity +
    weights.churn +
    weights.survival || 1;

  const pct = (v: number) => Math.round((v / total) * 100);
  const pctAdded = pct(weights.linesAdded);
  const pctDeleted = pct(weights.linesDeleted);
  const pctCommits = pct(weights.commits);
  const pctComplexity = pct(weights.complexity);
  const pctChurn = pct(weights.churn);
  const pctSurvival = pct(weights.survival);

  return (
    <div
      style={{
        background: "var(--paper-2)",
        border: "2px solid var(--ink)",
        borderRadius: "18px 22px 16px 20px / 20px 16px 22px 18px",
        boxShadow: "4px 5px 0 0 rgba(0,0,0,.85)",
        padding: "14px 18px",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-caveat), Caveat, cursive",
          fontWeight: 700,
          fontSize: 17,
          color: "var(--ink)",
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 8,
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
          }}
        />
        Scoring weights
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <SliderRow
          label="Lines added"
          color="var(--mint)"
          value={weights.linesAdded}
          pct={pctAdded}
          onInput={(v) => onChange({ ...weights, linesAdded: v })}
        />
        <SliderRow
          label="Lines deleted"
          color="var(--coral)"
          value={weights.linesDeleted}
          pct={pctDeleted}
          onInput={(v) => onChange({ ...weights, linesDeleted: v })}
        />
        <SliderRow
          label="Commits"
          color="var(--accent)"
          value={weights.commits}
          pct={pctCommits}
          onInput={(v) => onChange({ ...weights, commits: v })}
        />
        <div
          style={{
            height: 1,
            background: "var(--ink)",
            opacity: 0.12,
            margin: "2px 0",
          }}
        />
        <SliderRow
          label="Complexity"
          color="#c07c3a"
          value={weights.complexity}
          pct={pctComplexity}
          onInput={(v) => onChange({ ...weights, complexity: v })}
        />
        <SliderRow
          label="Churn"
          color="#8b5cf6"
          value={weights.churn}
          pct={pctChurn}
          onInput={(v) => onChange({ ...weights, churn: v })}
        />
        <SliderRow
          label="Survival"
          color="#0ea5e9"
          value={weights.survival}
          pct={pctSurvival}
          onInput={(v) => onChange({ ...weights, survival: v })}
        />
      </div>
      <div
        style={{
          marginTop: 10,
          fontSize: 11,
          color: "var(--muted)",
          fontFamily: "Kalam, ui-sans-serif, sans-serif",
        }}
      >
        Percentages shown are normalized proportions. Drag to re-score live.
        Complexity, Churn, Survival default to 0 — enable when available.
      </div>
    </div>
  );
}
