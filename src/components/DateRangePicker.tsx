"use client";

import { useState, useRef, useEffect } from "react";
import { DayPicker, DateRange } from "react-day-picker";
import { format, isValid } from "date-fns";

interface Props {
  startDate: string;
  endDate: string;
  allTime: boolean;
  onStartChange: (d: string) => void;
  onEndChange: (d: string) => void;
  onAllTimeChange: (v: boolean) => void;
}

const CAL_CSS = `
  .rdp-root {
    --rdp-accent-color: var(--accent);
    --rdp-accent-background-color: rgba(107,76,255,0.12);
    font-family: "Kalam", ui-sans-serif, sans-serif;
    font-size: 14px;
    color: var(--ink);
  }
  .rdp-month_caption {
    font-family: var(--font-caveat, Caveat, cursive);
    font-weight: 700;
    font-size: 18px;
    color: var(--ink);
    text-align: center;
    padding: 0 0 8px 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .rdp-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 4px 8px;
  }
  .rdp-nav button {
    background: transparent;
    border: 2px solid var(--ink);
    border-radius: 8px;
    width: 28px; height: 28px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    color: var(--ink);
    font-size: 13px;
    box-shadow: 2px 2px 0 0 rgba(0,0,0,0.5);
    transition: transform 0.1s ease;
  }
  .rdp-nav button:hover { transform: translate(-1px,-1px); box-shadow: 3px 3px 0 0 rgba(0,0,0,0.5); }
  .rdp-weekdays { display: flex; }
  .rdp-weekday {
    width: 36px; height: 28px;
    display: flex; align-items: center; justify-content: center;
    font-family: var(--font-caveat, Caveat, cursive);
    font-weight: 700;
    font-size: 13px;
    color: var(--muted);
  }
  .rdp-weeks { display: flex; flex-direction: column; gap: 2px; }
  .rdp-week { display: flex; }
  .rdp-day { width: 36px; height: 36px; padding: 0; position: relative; }
  .rdp-day_button {
    width: 100%; height: 100%;
    background: transparent;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-family: "Kalam", ui-sans-serif, sans-serif;
    font-size: 13px;
    color: var(--ink);
    transition: background 0.1s ease, color 0.1s ease;
    position: relative;
    z-index: 1;
  }
  .rdp-day_button:hover { background: rgba(107,76,255,0.15); }
  .rdp-selected .rdp-day_button {
    background: var(--accent);
    color: #fff;
    border-radius: 50%;
    font-weight: 700;
    box-shadow: 2px 2px 0 0 rgba(0,0,0,0.5);
  }
  .rdp-range_middle .rdp-day_button {
    background: rgba(107,76,255,0.12);
    color: var(--ink);
    border-radius: 0;
    box-shadow: none;
  }
  .rdp-range_start .rdp-day_button,
  .rdp-range_end .rdp-day_button {
    background: var(--accent);
    color: #fff;
    border-radius: 50%;
    font-weight: 700;
    box-shadow: 2px 2px 0 0 rgba(0,0,0,0.5);
  }
  .rdp-day[data-outside] .rdp-day_button { opacity: 0.3; }
  .rdp-today .rdp-day_button {
    font-weight: 700;
    text-decoration: underline wavy var(--accent);
    text-underline-offset: 3px;
  }
  .rdp-disabled .rdp-day_button { opacity: 0.2; cursor: not-allowed; }
  .rdp-month { padding: 0; }
`;

function formatDisplay(start: string, end: string): string {
  const s = start ? format(new Date(start), "MMM d, yyyy") : "";
  const e = end ? format(new Date(end), "MMM d, yyyy") : "";
  if (s && e) return `${s} → ${e}`;
  if (s) return `${s} → ?`;
  return "";
}

export function DateRangePicker({ startDate, endDate, allTime, onStartChange, onEndChange, onAllTimeChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected: DateRange | undefined =
    startDate
      ? {
          from: new Date(startDate),
          to: endDate ? new Date(endDate) : undefined,
        }
      : undefined;

  function handleSelect(range: DateRange | undefined) {
    onAllTimeChange(false);
    if (!range) {
      onStartChange("");
      onEndChange("");
      return;
    }
    onStartChange(range.from ? format(range.from, "yyyy-MM-dd") : "");
    onEndChange(range.to ? format(range.to, "yyyy-MM-dd") : "");
  }

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  const hasValue = allTime || !!(startDate || endDate);
  const display = allTime ? "All time" : formatDisplay(startDate, endDate);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          background: "#fff",
          border: `2px solid ${open ? "var(--accent)" : "var(--ink)"}`,
          borderRadius: 10,
          padding: "10px 14px",
          textAlign: "left",
          fontFamily: "Kalam, ui-sans-serif, sans-serif",
          fontSize: 14,
          color: hasValue ? "var(--ink)" : "var(--muted)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          transition: "border-color 0.15s ease",
          boxShadow: open ? "2px 2px 0 0 rgba(107,76,255,0.3)" : "none",
        }}
        aria-label="Pick date range"
        aria-expanded={open}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>📅</span>
          {hasValue ? display : "Pick date range"}
        </span>
        <span
          style={{
            fontSize: 10,
            color: "var(--muted)",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.2s ease",
          }}
        >
          ▼
        </span>
      </button>

      {/* Calendar popover */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            zIndex: 100,
            background: "var(--paper-2)",
            border: "2px solid var(--ink)",
            borderRadius: "14px 18px 14px 16px / 16px 14px 18px 14px",
            boxShadow: "4px 5px 0 0 rgba(0,0,0,0.85)",
            padding: 16,
            animation: "rail-enter 0.18s ease",
            minWidth: 280,
          }}
        >
          <style>{CAL_CSS}</style>
          <button
            onClick={() => {
              onAllTimeChange(true);
              onStartChange("");
              onEndChange("");
              setOpen(false);
            }}
            style={{
              width: "100%",
              marginBottom: 10,
              background: allTime ? "var(--accent)" : "transparent",
              border: `2px solid ${allTime ? "var(--accent)" : "var(--ink)"}`,
              borderRadius: 8,
              padding: "5px 0",
              fontSize: 13,
              fontFamily: "Kalam, ui-sans-serif, sans-serif",
              color: allTime ? "#fff" : "var(--ink)",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            ∞ All time
          </button>
          <DayPicker
            mode="range"
            selected={allTime ? undefined : selected}
            onSelect={handleSelect}
            defaultMonth={selected?.from ?? new Date()}
            numberOfMonths={1}
            showOutsideDays
          />
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {(allTime || (startDate && endDate)) && (
              <button
                onClick={() => setOpen(false)}
                style={{
                  flex: 1,
                  background: "var(--accent)",
                  border: "2px solid var(--ink)",
                  borderRadius: 8,
                  padding: "5px 0",
                  fontSize: 13,
                  fontFamily: "Kalam, ui-sans-serif, sans-serif",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 700,
                  boxShadow: "2px 2px 0 0 rgba(0,0,0,0.5)",
                }}
              >
                ✓ Done
              </button>
            )}
            {hasValue && (
              <button
                onClick={() => { onAllTimeChange(false); onStartChange(""); onEndChange(""); }}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "2px dashed var(--ink)",
                  borderRadius: 8,
                  padding: "4px 0",
                  fontSize: 12,
                  fontFamily: "Kalam, ui-sans-serif, sans-serif",
                  color: "var(--muted)",
                  cursor: "pointer",
                }}
              >
                ✕ clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
