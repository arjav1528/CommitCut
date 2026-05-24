import { CommitEntry } from "./gitLog";
import { ContributorStats } from "./types";

interface RawTotals {
  commits: number;
  linesAdded: number;
  linesDeleted: number;
}

function normalize(value: number, max: number): number {
  return max === 0 ? 0 : value / max;
}

export function scoreContributors(
  entries: CommitEntry[],
  prizeAmount?: number
): ContributorStats[] {
  const map = new Map<string, RawTotals & { name: string }>();

  for (const entry of entries) {
    const key = entry.authorEmail;
    const existing = map.get(key);
    if (existing) {
      existing.commits += 1;
      existing.linesAdded += entry.linesAdded;
      existing.linesDeleted += entry.linesDeleted;
    } else {
      map.set(key, {
        name: entry.authorName,
        commits: 1,
        linesAdded: entry.linesAdded,
        linesDeleted: entry.linesDeleted,
      });
    }
  }

  if (map.size === 0) return [];

  const contributors = Array.from(map.entries()).map(([email, data]) => ({
    email,
    ...data,
  }));

  const maxCommits = Math.max(...contributors.map((c) => c.commits));
  const maxAdded = Math.max(...contributors.map((c) => c.linesAdded));
  const maxDeleted = Math.max(...contributors.map((c) => c.linesDeleted));

  const scored = contributors.map((c) => ({
    ...c,
    rawScore:
      0.5 * normalize(c.linesAdded, maxAdded) +
      0.25 * normalize(c.linesDeleted, maxDeleted) +
      0.25 * normalize(c.commits, maxCommits),
  }));

  const totalScore = scored.reduce((sum, c) => sum + c.rawScore, 0);

  return scored
    .map((c) => {
      const percentage =
        totalScore === 0 ? 0 : Math.round((c.rawScore / totalScore) * 1000) / 10;
      return {
        name: c.name,
        email: c.email,
        commits: c.commits,
        linesAdded: c.linesAdded,
        linesDeleted: c.linesDeleted,
        rawScore: c.rawScore,
        percentage,
        prizeShare:
          prizeAmount !== undefined
            ? Math.round((c.rawScore / totalScore) * prizeAmount * 100) / 100
            : undefined,
      } satisfies ContributorStats;
    })
    .sort((a, b) => b.percentage - a.percentage);
}
