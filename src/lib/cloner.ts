import { CommitEntry } from "./gitLog";
import { shouldIgnoreFile } from "./filter";

const MAX_LINE_COUNT = 1_000_000;

function parseOwnerRepo(repoUrl: string): { owner: string; repo: string } {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) throw new Error("Invalid GitHub URL");
  return { owner: match[1], repo: match[2] };
}

async function ghFetch(path: string): Promise<Response> {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "CommitCut/1.0",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (res.status === 404) throw new Error("Repository not found");
  if (res.status === 403 || res.status === 429) throw new Error("GitHub API rate limit exceeded. Add a GITHUB_TOKEN env var to increase limits.");
  if (!res.ok) throw new Error(`GitHub API error ${res.status}`);
  return res;
}

interface GHCommitListItem {
  sha: string;
  commit: { author: { name: string; email: string; date: string } };
  parents: { sha: string }[];
}

interface GHCommitDetail {
  sha: string;
  commit: { author: { name: string; email: string; date: string } };
  stats: { additions: number; deletions: number };
  files: { filename: string; additions: number; deletions: number; status: string }[];
}

async function fetchAllCommitShas(
  owner: string,
  repo: string,
  startDate?: string,
  endDate?: string
): Promise<GHCommitListItem[]> {
  const all: GHCommitListItem[] = [];
  let page = 1;
  while (true) {
    let qs = `per_page=100&page=${page}`;
    if (startDate) qs += `&since=${startDate}T00:00:00Z`;
    if (endDate) qs += `&until=${endDate}T23:59:59Z`;
    const res = await ghFetch(`/repos/${owner}/${repo}/commits?${qs}`);
    const items: GHCommitListItem[] = await res.json();
    if (!items.length) break;
    all.push(...items);
    if (items.length < 100) break;
    page++;
  }
  // Exclude merge commits (2+ parents)
  return all.filter((c) => c.parents.length < 2);
}

async function fetchCommitDetail(owner: string, repo: string, sha: string): Promise<GHCommitDetail> {
  const res = await ghFetch(`/repos/${owner}/${repo}/commits/${sha}`);
  return res.json();
}

async function runInBatches<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  batchSize: number
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    results.push(...(await Promise.all(batch.map(fn))));
  }
  return results;
}

export async function cloneAndAnalyze(
  repoUrl: string,
  startDate?: string,
  endDate?: string
): Promise<CommitEntry[]> {
  if (!repoUrl.startsWith("https://github.com/")) {
    throw new Error("Only https://github.com URLs are allowed");
  }

  const { owner, repo } = parseOwnerRepo(repoUrl);

  const commits = await fetchAllCommitShas(owner, repo, startDate, endDate);

  const details = await runInBatches(
    commits,
    (c) => fetchCommitDetail(owner, repo, c.sha),
    10
  );

  return details.map((d): CommitEntry => {
    let linesAdded = 0;
    let linesDeleted = 0;
    for (const file of d.files ?? []) {
      if (file.status === "added" || file.status === "modified") {
        if (!shouldIgnoreFile(file.filename)) {
          linesAdded = Math.min(linesAdded + (file.additions ?? 0), MAX_LINE_COUNT);
          linesDeleted = Math.min(linesDeleted + (file.deletions ?? 0), MAX_LINE_COUNT);
        }
      }
    }
    return {
      hash: d.sha,
      authorEmail: d.commit.author.email.trim().toLowerCase(),
      authorName: d.commit.author.name.trim(),
      date: d.commit.author.date.slice(0, 10),
      linesAdded,
      linesDeleted,
      repoUrl,
    };
  });
}
