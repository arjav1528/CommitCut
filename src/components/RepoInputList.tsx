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
              className="flex-1 rounded-xl px-3 py-2 text-sm transition-colors"
              style={{
                background: "#0b1020",
                border: `1.5px solid ${errors[i] ? "var(--coral)" : "var(--border)"}`,
                color: "var(--text)",
              }}
            />
            <button
              onClick={() => remove(i)}
              aria-label={`Remove repository ${i + 1}`}
              disabled={repos.length === 1}
              className="p-2 rounded-lg transition-opacity"
              style={{
                color: "var(--muted)",
                opacity: repos.length === 1 ? 0.3 : 0.6,
                cursor: repos.length === 1 ? "not-allowed" : "pointer",
              }}
              onMouseEnter={(e) =>
                repos.length > 1 &&
                ((e.currentTarget as HTMLButtonElement).style.opacity = "1")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.opacity =
                  repos.length === 1 ? "0.3" : "0.6")
              }
            >
              <Trash2 size={16} />
            </button>
          </div>
          {errors[i] && (
            <p className="text-xs ml-7" style={{ color: "var(--coral)" }}>
              ✖ {errors[i]}
            </p>
          )}
        </div>
      ))}

      <button
        onClick={add}
        className="flex items-center gap-1.5 self-start rounded-full px-3 py-1.5 text-sm transition-all mt-1"
        style={{
          border: "1.5px solid var(--border)",
          color: "var(--muted)",
          background: "transparent",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--violet)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--violet)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
        }}
      >
        <Plus size={14} />
        Add repository
      </button>
    </div>
  );
}
