"use client";

import { useState } from "react";
import { Trash2, Plus } from "lucide-react";

interface Props {
  repos: string[];
  onChange: (repos: string[]) => void;
  errors: Record<number, string>;
}

const GITHUB_RE = /^https:\/\/github\.com\/[^/]+\/[^/]+(\/.*)?$|^github\.com\/[^/]+\/[^/]+/;

const SUBPATH_RE = /\/(tree|blob|commits|issues|pulls|releases|actions|discussions)(\/.*)?$/;

export function normalizeGitHubUrl(raw: string): string {
  let s = raw.trim();
  // Auto-prefix bare github.com/... with https://
  if (/^github\.com\//i.test(s)) s = "https://" + s;
  // Downgrade http:// to https://
  if (s.startsWith("http://")) s = "https://" + s.slice(7);
  // Strip .git suffix
  s = s.replace(/\.git$/, "");
  // Strip known subpaths and everything after
  s = s.replace(SUBPATH_RE, "");
  // Strip trailing slashes
  s = s.replace(/\/+$/, "");
  return s;
}

export function validateRepo(url: string): string | null {
  if (!url.trim()) return "Required";
  if (!GITHUB_RE.test(url.trim())) return "Must be a github.com/owner/repo URL";
  return null;
}

function GithubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
    </svg>
  );
}

export function RepoInputList({ repos, onChange, errors }: Props) {
  const [focusIdx, setFocusIdx] = useState<number | null>(null);

  function update(index: number, value: string) {
    const next = [...repos];
    next[index] = normalizeGitHubUrl(value);
    onChange(next);
  }

  function remove(index: number) {
    onChange(repos.filter((_, i) => i !== index));
  }

  function add() {
    onChange([...repos, ""]);
  }

  return (
    <div className="flex flex-col gap-2">
      {repos.map((repo, i) => {
        const isFocused = focusIdx === i;
        const hasError = !!errors[i];
        const borderColor = hasError
          ? "var(--coral)"
          : isFocused
          ? "var(--accent)"
          : "var(--ink)";
        const shadowColor = hasError
          ? "rgba(214,72,58,0.18)"
          : isFocused
          ? "rgba(107,76,255,0.18)"
          : "transparent";

        return (
          <div key={i} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span
                className="text-xs w-5 text-right flex-none"
                style={{ color: "var(--muted)", fontFamily: "var(--font-geist-mono)" }}
              >
                {i + 1}
              </span>
              <div
                className="flex items-center flex-1 overflow-hidden"
                style={{
                  background: "#fff",
                  border: `2px solid ${borderColor}`,
                  borderRadius: 10,
                  transition: "border-color 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease",
                  boxShadow: isFocused
                    ? `2px 2px 0 0 ${shadowColor}, 0 0 0 3px ${shadowColor}`
                    : hasError
                    ? `0 0 0 3px ${shadowColor}`
                    : "none",
                  transform: isFocused ? "translateY(-1px)" : "none",
                }}
              >
                <span
                  style={{
                    padding: "0 8px 0 10px",
                    color: isFocused ? "var(--accent)" : "var(--muted)",
                    transition: "color 0.15s ease",
                    display: "flex",
                    alignItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <GithubIcon />
                </span>
                <span
                  style={{
                    width: 1,
                    height: 18,
                    background: isFocused ? "rgba(107,76,255,0.3)" : "rgba(0,0,0,0.12)",
                    flexShrink: 0,
                    transition: "background 0.15s ease",
                  }}
                />
                <input
                  type="url"
                  placeholder="github.com/owner/repo"
                  value={repo}
                  onChange={(e) => update(i, e.target.value)}
                  onFocus={() => setFocusIdx(i)}
                  onBlur={() => { setFocusIdx(null); update(i, repos[i]); }}
                  aria-label={`Repository ${i + 1} URL`}
                  className="flex-1 text-sm"
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: "8px 10px",
                    color: "var(--ink)",
                    fontFamily: "Kalam, ui-sans-serif, sans-serif",
                    outline: "none",
                    fontSize: 14,
                  }}
                />
              </div>
              <button
                onClick={() => remove(i)}
                aria-label={`Remove repository ${i + 1}`}
                disabled={repos.length === 1}
                className="p-2 rounded-lg transition-opacity"
                style={{
                  color: "var(--ink)",
                  opacity: repos.length === 1 ? 0.25 : 0.7,
                  cursor: repos.length === 1 ? "not-allowed" : "pointer",
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
            {errors[i] && (
              <p className="text-xs ml-7" style={{ color: "var(--coral)", fontFamily: "Kalam, ui-sans-serif, sans-serif" }}>
                ✖ {errors[i]}
              </p>
            )}
          </div>
        );
      })}

      <button
        onClick={add}
        className="flex items-center gap-1.5 self-start mt-1"
        style={{
          border: "2px solid var(--ink)",
          borderRadius: 999,
          padding: "3px 10px",
          background: "transparent",
          color: "var(--muted)",
          fontSize: 13,
          fontFamily: "Kalam, ui-sans-serif, sans-serif",
          cursor: "pointer",
        }}
      >
        <Plus size={14} />
        Add repository
      </button>
    </div>
  );
}
