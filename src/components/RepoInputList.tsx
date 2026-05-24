"use client";

import { Trash2, Plus } from "lucide-react";

interface Props {
  repos: string[];
  onChange: (repos: string[]) => void;
  errors: Record<number, string>;
}

const GITHUB_RE = /^https?:\/\/github\.com\/[^/]+\/[^/]+(\/.*)?$|^github\.com\/[^/]+\/[^/]+/;

export function validateRepo(url: string): string | null {
  if (!url.trim()) return "Required";
  if (!GITHUB_RE.test(url.trim())) return "Must be a github.com/owner/repo URL";
  return null;
}

export function RepoInputList({ repos, onChange, errors }: Props) {
  function update(index: number, value: string) {
    const next = [...repos];
    next[index] = value;
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
      {repos.map((repo, i) => (
        <div key={i} className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span
              className="text-xs w-5 text-right flex-none"
              style={{ color: "var(--muted)", fontFamily: "var(--font-geist-mono)" }}
            >
              {i + 1}
            </span>
            <input
              type="url"
              placeholder="github.com/owner/repo"
              value={repo}
              onChange={(e) => update(i, e.target.value)}
              aria-label={`Repository ${i + 1} URL`}
              className="flex-1 text-sm transition-colors"
              style={{
                background: "#fff",
                border: `2px solid ${errors[i] ? "var(--coral)" : "var(--ink)"}`,
                borderRadius: 10,
                padding: "7px 10px",
                color: "var(--ink)",
                fontFamily: "Kalam, ui-sans-serif, sans-serif",
                outline: "none",
              }}
            />
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
      ))}

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
