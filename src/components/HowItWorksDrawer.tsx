"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function HowItWorksDrawer({ open, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.35)" }}
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        role="dialog"
        aria-label="How CommitCut works"
        aria-modal="true"
        className="fixed top-0 right-0 h-full z-50 flex flex-col gap-6 p-6 overflow-y-auto transition-transform duration-300"
        style={{
          width: "min(400px, 100vw)",
          background: "var(--paper-2)",
          borderLeft: "2px solid var(--ink)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          fontFamily: "Kalam, ui-sans-serif, sans-serif",
        }}
      >
        <div className="flex items-center justify-between">
          <h2
            style={{
              color: "var(--ink)",
              fontFamily: "var(--font-caveat), Caveat, cursive",
              fontWeight: 700,
              fontSize: 22,
            }}
          >
            How it works
          </h2>
          <button
            onClick={onClose}
            aria-label="Close drawer"
            className="p-1 rounded-lg transition-colors"
            style={{ color: "var(--ink)", cursor: "pointer" }}
          >
            <X size={18} />
          </button>
        </div>

        <section className="flex flex-col gap-4 text-sm" style={{ color: "var(--muted)", lineHeight: 1.7 }}>
          <div>
            <h3
              style={{
                fontFamily: "var(--font-caveat), Caveat, cursive",
                fontWeight: 700,
                fontSize: 18,
                color: "var(--ink)",
                marginBottom: 6,
              }}
            >
              Scoring formula
            </h3>
            <div
              style={{
                background: "#fff",
                border: "2px solid var(--ink)",
                borderRadius: 14,
                padding: 14,
                fontFamily: "var(--font-geist-mono)",
                fontSize: 13,
                color: "var(--ink)",
              }}
            >
              <span style={{ color: "var(--accent)" }}>score</span> ={" "}
              <span style={{ color: "var(--mint)" }}>0.5</span> × lines_added
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;+ <span style={{ color: "var(--mint)" }}>0.25</span> × lines_deleted
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;+ <span style={{ color: "var(--mint)" }}>0.25</span> × commits
            </div>
            <p className="mt-2">
              Each component is normalized to [0–1] across all contributors before weighting, so raw scale differences don&apos;t skew results.
            </p>
          </div>

          <div>
            <h3
              style={{
                fontFamily: "var(--font-caveat), Caveat, cursive",
                fontWeight: 700,
                fontSize: 18,
                color: "var(--ink)",
                marginBottom: 6,
              }}
            >
              What&apos;s ignored
            </h3>
            <ul className="flex flex-col gap-1 list-disc list-inside">
              <li>Merge commits (no real work)</li>
              <li>
                Lock files:{" "}
                <code
                  className="text-xs px-1 rounded"
                  style={{ background: "#fff", border: "1px solid var(--ink)", color: "var(--coral)" }}
                >
                  package-lock.json
                </code>
                ,{" "}
                <code
                  className="text-xs px-1 rounded"
                  style={{ background: "#fff", border: "1px solid var(--ink)", color: "var(--coral)" }}
                >
                  yarn.lock
                </code>
                , etc.
              </li>
              <li>Minified files (*.min.js, *.min.css)</li>
              <li>Binary and image files</li>
              <li>
                Generated dirs:{" "}
                <code className="text-xs px-1 rounded" style={{ background: "#fff", border: "1px solid var(--ink)", color: "var(--coral)" }}>node_modules/</code>,{" "}
                <code className="text-xs px-1 rounded" style={{ background: "#fff", border: "1px solid var(--ink)", color: "var(--coral)" }}>dist/</code>,{" "}
                <code className="text-xs px-1 rounded" style={{ background: "#fff", border: "1px solid var(--ink)", color: "var(--coral)" }}>.next/</code>
              </li>
            </ul>
          </div>

          <div>
            <h3
              style={{
                fontFamily: "var(--font-caveat), Caveat, cursive",
                fontWeight: 700,
                fontSize: 18,
                color: "var(--ink)",
                marginBottom: 6,
              }}
            >
              Identity
            </h3>
            <p>
              Contributors are identified by their git author email. If the same person used different emails across repos, they&apos;ll appear as separate contributors. Make sure your team uses consistent git config.
            </p>
          </div>

          <div>
            <h3
              style={{
                fontFamily: "var(--font-caveat), Caveat, cursive",
                fontWeight: 700,
                fontSize: 18,
                color: "var(--ink)",
                marginBottom: 6,
              }}
            >
              Privacy
            </h3>
            <p>
              CommitCut only analyzes public repositories. Repos are cloned temporarily to a server-side temp directory and deleted immediately after analysis.
            </p>
          </div>
        </section>
      </aside>
    </>
  );
}
