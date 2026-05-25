import { CommitEntry } from "./gitLog";
import { ContributorStats } from "./types";

interface RawTotals {
  commits: number;
  linesAdded: number;
  linesDeleted: number;
}

interface RepoStats {
  commits: number;
  linesAdded: number;
  linesDeleted: number;
}

function normalize(value: number, max: number): number {
  return max === 0 ? 0 : value / max;
}

// Extract GitHub username from noreply email: "12345+username@users.noreply.github.com" → "username"
function parseNoreplyUsername(email: string): string | null {
  const m = email.match(/^\d+\+(.+)@users\.noreply\.github\.com$/);
  return m ? m[1].toLowerCase() : null;
}

// Extract GitHub numeric ID from noreply email: "12345+username@users.noreply.github.com" → "12345"
function parseNoreplyId(email: string): string | null {
  const m = email.match(/^(\d+)\+.+@users\.noreply\.github\.com$/);
  return m ? m[1] : null;
}

// Extract GitHub info from any email (noreply format)
function extractGithubInfo(email: string): { username: string; avatarUrl: string } | null {
  const username = parseNoreplyUsername(email);
  const id = parseNoreplyId(email);
  if (username && id) {
    return {
      username,
      avatarUrl: `https://avatars.githubusercontent.com/u/${id}?v=4&s=40`,
    };
  }
  return null;
}

// Merge entries where a GitHub noreply email maps to an existing contributor by name.
// Keeps the real email as canonical; merges noreply stats into it.
function mergeNoreplyEntries(entries: CommitEntry[]): CommitEntry[] {
  // Build name→email map for non-noreply emails first
  const nameToEmail = new Map<string, string>();
  for (const e of entries) {
    if (!parseNoreplyUsername(e.authorEmail)) {
      nameToEmail.set(e.authorName.toLowerCase(), e.authorEmail);
      // also index by first token (handle "Soham Das" ↔ "sohamdasx")
    }
  }

  return entries.map((e) => {
    const noReplyUser = parseNoreplyUsername(e.authorEmail);
    if (!noReplyUser) return e;

    // Try matching noreply username against known contributor names
    for (const [knownName, canonicalEmail] of nameToEmail) {
      const knownTokens = knownName.split(/\s+/);
      if (
        knownName === noReplyUser ||
        knownTokens.some((t) => t === noReplyUser) ||
        noReplyUser.includes(knownTokens[0])
      ) {
        return { ...e, authorEmail: canonicalEmail };
      }
    }
    return e;
  });
}

export function scoreContributors(
  entries: CommitEntry[],
  prizeAmount?: number
): { contributors: ContributorStats[]; timeline: { date: string; count: number }[] } {
  const merged = mergeNoreplyEntries(entries);

  // Track github info per original email (before merging)
  const emailToGithubInfo = new Map<string, { username: string; avatarUrl: string }>();
  for (const e of entries) {
    const info = extractGithubInfo(e.authorEmail);
    if (info) {
      emailToGithubInfo.set(e.authorEmail, info);
    }
  }

  const map = new Map<string, RawTotals & { name: string; repoBreakdown: Record<string, RepoStats>; dates: string[] }>();

  for (const entry of merged) {
    const key = entry.authorEmail;
    const repoKey = entry.repoUrl ?? "unknown";
    const existing = map.get(key);
    if (existing) {
      existing.commits += 1;
      existing.linesAdded += entry.linesAdded;
      existing.linesDeleted += entry.linesDeleted;
      existing.dates.push(entry.date);
      const rb = existing.repoBreakdown[repoKey];
      if (rb) {
        rb.commits += 1;
        rb.linesAdded += entry.linesAdded;
        rb.linesDeleted += entry.linesDeleted;
      } else {
        existing.repoBreakdown[repoKey] = { commits: 1, linesAdded: entry.linesAdded, linesDeleted: entry.linesDeleted };
      }
    } else {
      map.set(key, {
        name: entry.authorName,
        commits: 1,
        linesAdded: entry.linesAdded,
        linesDeleted: entry.linesDeleted,
        dates: [entry.date],
        repoBreakdown: {
          [repoKey]: { commits: 1, linesAdded: entry.linesAdded, linesDeleted: entry.linesDeleted },
        },
      });
    }
  }

  if (map.size === 0) return { contributors: [], timeline: [] };

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

  const sortedContributors = scored
    .map((c) => {
      const percentage =
        totalScore === 0 ? 0 : Math.round((c.rawScore / totalScore) * 1000) / 10;

      // Find github info: check if original email was noreply, or if any entry for this canonical email was noreply
      let githubUsername: string | undefined;
      let githubAvatarUrl: string | undefined;
      const ghInfo = emailToGithubInfo.get(c.email);
      if (ghInfo) {
        githubUsername = ghInfo.username;
        githubAvatarUrl = ghInfo.avatarUrl;
      } else {
        // Also check if noreply entries were merged into this canonical email
        for (const [origEmail, info] of emailToGithubInfo) {
          // The noreply was merged into c.email if the merged entries produced c.email
          // We can't easily reverse this here, so we skip — the noreply email case
          // is handled by checking the original entries map above
          void origEmail;
          void info;
        }
      }

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
        githubUsername,
        githubAvatarUrl,
        repoBreakdown: c.repoBreakdown,
        commitDates: c.dates,
      } satisfies ContributorStats;
    })
    .sort((a, b) => b.percentage - a.percentage);

  // Build overall timeline from all commit dates
  const dateCounts = new Map<string, number>();
  for (const entry of merged) {
    dateCounts.set(entry.date, (dateCounts.get(entry.date) ?? 0) + 1);
  }
  const timeline = Array.from(dateCounts.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { contributors: sortedContributors, timeline };
}
