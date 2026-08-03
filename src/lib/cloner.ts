import ignore, { Ignore } from "ignore";
import { CommitEntry } from "./gitLog";
import { shouldIgnoreFile } from "./filter";
import { complexityOfPatch } from "./complexity";

const MAX_LINE_COUNT = 1_000_000;

function parseOwnerRepo(repoUrl: string): { owner: string; repo: string } {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) throw new Error("Invalid GitHub URL");
  return { owner: match[1], repo: match[2] };
}

async function ghFetch(path: string, userToken?: string): Promise<Response> {
  const token = userToken ?? process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "CommitCut/1.0",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (res.status === 404) {
    if (!token) throw new Error("PRIVATE_REPO");
    throw new Error("Repository not found");
  }
  if (res.status === 401) throw new Error("PRIVATE_REPO");
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
  commit: { author: { name: string; email: string; date: string }; message: string };
  stats: { additions: number; deletions: number };
  files: { filename: string; additions: number; deletions: number; status: string; patch?: string }[];
}

function parseCoAuthors(message: string): { name: string; email: string }[] {
  return message
    .split("\n")
    .flatMap((line) => {
      const m = line.match(/^Co-authored-by:\s*(.+?)\s*<([^>]+)>\s*$/i);
      return m ? [{ name: m[1].trim(), email: m[2].trim().toLowerCase() }] : [];
    });
}

async function fetchAllCommitShas(
  owner: string,
  repo: string,
  startDate?: string,
  endDate?: string,
  userToken?: string
): Promise<GHCommitListItem[]> {
  const all: GHCommitListItem[] = [];
  let page = 1;
  while (true) {
    let qs = `per_page=100&page=${page}`;
    if (startDate) qs += `&since=${startDate}T00:00:00Z`;
    if (endDate) qs += `&until=${endDate}T23:59:59Z`;
    const res = await ghFetch(`/repos/${owner}/${repo}/commits?${qs}`, userToken);
    const items: GHCommitListItem[] = await res.json();
    if (!items.length) break;
    all.push(...items);
    if (items.length < 100) break;
    page++;
  }
  // Exclude merge commits (2+ parents)
  return all.filter((c) => c.parents.length < 2);
}

async function fetchCommitDetail(owner: string, repo: string, sha: string, userToken?: string): Promise<GHCommitDetail> {
  const res = await ghFetch(`/repos/${owner}/${repo}/commits/${sha}`, userToken);
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

// Wrapper around Ignore.ignores() that never throws on edge-case paths
function safeIgnores(ig: Ignore, path: string): boolean {
  if (!path || path.startsWith("/")) return false;
  try {
    return ig.ignores(path);
  } catch {
    return false;
  }
}

// Fetch all .gitignore files in the repo (root + all subdirectories) and return
// a compiled Ignore instance. Runs in parallel; silently degrades on any failure.
async function fetchGitignoreRules(
  owner: string,
  repo: string,
  userToken?: string
): Promise<Ignore> {
  const ig = ignore();
  try {
    // Single tree fetch gives us every path in the repo
    const treeRes = await ghFetch(
      `/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`,
      userToken
    );
    const treeData = (await treeRes.json()) as {
      tree?: { path: string; type: string }[];
    };

    const gitignoreItems = (treeData.tree ?? []).filter(
      (item) => item.type === "blob" && item.path.endsWith(".gitignore")
    );

    // Fetch each .gitignore file in parallel (cap at 30 for safety)
    await Promise.all(
      gitignoreItems.slice(0, 30).map(async (item) => {
        try {
          const res = await ghFetch(
            `/repos/${owner}/${repo}/contents/${item.path}`,
            userToken
          );
          const data = (await res.json()) as { content?: string; encoding?: string };
          if (data.content && data.encoding === "base64") {
            // GitHub embeds newlines in base64 — strip them before decoding
            const content = Buffer.from(data.content.replace(/\s/g, ""), "base64").toString("utf-8");
            const dir = item.path.includes("/")
              ? item.path.slice(0, item.path.lastIndexOf("/"))
              : "";
            const rules = content
              .split("\n")
              .map((l) => l.trim())
              .filter((l) => l && !l.startsWith("#"));

            if (dir) {
              // Prefix each rule with the subdirectory so it matches relative to root
              ig.add(
                rules.map((r) =>
                  r.startsWith("!") ? `!${dir}/${r.slice(1)}` : `${dir}/${r}`
                )
              );
            } else {
              ig.add(rules);
            }
          }
        } catch {
          // individual file fetch failed — skip
        }
      })
    );
  } catch {
    // tree fetch failed — proceed with no gitignore rules
  }
  return ig;
}

async function fetchDefaultBranch(owner: string, repo: string, userToken?: string): Promise<string> {
  const res = await ghFetch(`/repos/${owner}/${repo}`, userToken);
  const data = await res.json() as { default_branch?: string };
  return data.default_branch ?? "main";
}

interface BlameRange {
  startingLine: number;
  endingLine: number;
  commit: { author: { email: string } };
}

// Fetch blame for up to `files` paths in one GraphQL call using field aliases.
// Returns: file path → array of { email, lines } for each blame range.
async function fetchBlameForFiles(
  owner: string,
  repo: string,
  branch: string,
  files: string[],
  token: string
): Promise<Map<string, { email: string; lines: number }[]>> {
  const result = new Map<string, { email: string; lines: number }[]>();
  const BATCH = 25;

  for (let i = 0; i < files.length; i += BATCH) {
    const batch = files.slice(i, i + BATCH);

    const fields = batch
      .map((f, idx) => {
        const path = f.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
        return `f${idx}: blame(path: "${path}") {
          ranges { startingLine endingLine commit { author { email } } }
        }`;
      })
      .join("\n");

    const query = `{ repository(owner: "${owner}", name: "${repo}") {
      ref(qualifiedName: "${branch}") {
        target { ... on Commit { ${fields} } }
      }
    }}`;

    let data: unknown;
    try {
      const res = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "User-Agent": "CommitCut/1.0",
        },
        body: JSON.stringify({ query }),
      });
      if (!res.ok) continue;
      data = await res.json();
    } catch {
      continue;
    }

    const target = (data as { data?: { repository?: { ref?: { target?: Record<string, { ranges: BlameRange[] }> } } } })
      ?.data?.repository?.ref?.target;
    if (!target) continue;

    batch.forEach((file, idx) => {
      const blameData = target[`f${idx}`];
      if (!blameData?.ranges) return;
      result.set(
        file,
        blameData.ranges.map((r) => ({
          email: (r.commit?.author?.email ?? "").toLowerCase(),
          lines: r.endingLine - r.startingLine + 1,
        }))
      );
    });
  }

  return result;
}

export async function fetchSurvivalAcrossRepos(
  repoUrls: string[],
  allEntries: CommitEntry[][],
  userToken?: string
): Promise<Map<string, { linesAlive: number; linesTotal: number }>> {
  const token = userToken ?? process.env.GITHUB_TOKEN;
  const survivalMap = new Map<string, { linesAlive: number; linesTotal: number }>();
  if (!token) return survivalMap; // GraphQL requires auth

  const perRepoResults = await Promise.all(
    repoUrls.map(async (url, i) => {
      const entries = allEntries[i];
      if (!entries.length) return null;

      const { owner, repo } = parseOwnerRepo(url);
      const uniqueFiles = [...new Set(entries.flatMap((e) => e.filesChanged ?? []))];
      if (!uniqueFiles.length) return null;

      try {
        const branch = await fetchDefaultBranch(owner, repo, userToken);
        const blameMap = await fetchBlameForFiles(owner, repo, branch, uniqueFiles, token);

        const linesAliveByEmail = new Map<string, number>();
        for (const ranges of blameMap.values()) {
          for (const { email, lines } of ranges) {
            if (email) linesAliveByEmail.set(email, (linesAliveByEmail.get(email) ?? 0) + lines);
          }
        }

        const linesTotalByEmail = new Map<string, number>();
        for (const e of entries) {
          const em = e.authorEmail;
          linesTotalByEmail.set(em, (linesTotalByEmail.get(em) ?? 0) + e.linesAdded);
        }

        return { linesAliveByEmail, linesTotalByEmail };
      } catch {
        return null;
      }
    })
  );

  for (const result of perRepoResults) {
    if (!result) continue;
    const { linesAliveByEmail, linesTotalByEmail } = result;
    for (const [email, total] of linesTotalByEmail) {
      const alive = linesAliveByEmail.get(email) ?? 0;
      const existing = survivalMap.get(email);
      if (existing) {
        existing.linesAlive += alive;
        existing.linesTotal += total;
      } else {
        survivalMap.set(email, { linesAlive: alive, linesTotal: total });
      }
    }
  }

  return survivalMap;
}

export async function cloneAndAnalyze(
  repoUrl: string,
  startDate?: string,
  endDate?: string,
  userToken?: string
): Promise<CommitEntry[]> {
  if (!repoUrl.startsWith("https://github.com/")) {
    throw new Error("Only https://github.com URLs are allowed");
  }

  const { owner, repo } = parseOwnerRepo(repoUrl);

  // Fetch commit list and gitignore rules in parallel
  const [commits, ig] = await Promise.all([
    fetchAllCommitShas(owner, repo, startDate, endDate, userToken),
    fetchGitignoreRules(owner, repo, userToken),
  ]);

  const details = await runInBatches(
    commits,
    (c) => fetchCommitDetail(owner, repo, c.sha, userToken),
    25
  );

  return details.flatMap((d): CommitEntry[] => {
    let totalAdded = 0;
    let totalDeleted = 0;
    const codeFiles = (d.files ?? []).filter(
      (f) =>
        (f.status === "added" || f.status === "modified") &&
        !shouldIgnoreFile(f.filename) &&
        !safeIgnores(ig, f.filename)
    );
    for (const file of codeFiles) {
      totalAdded = Math.min(totalAdded + (file.additions ?? 0), MAX_LINE_COUNT);
      totalDeleted = Math.min(totalDeleted + (file.deletions ?? 0), MAX_LINE_COUNT);
    }

    const fileComplexities = codeFiles
      .map((f) => complexityOfPatch(f.patch))
      .filter((c): c is number => c !== undefined);
    const complexity =
      fileComplexities.length > 0
        ? fileComplexities.reduce((a, b) => a + b, 0) / fileComplexities.length
        : undefined;

    const coAuthors = parseCoAuthors(d.commit.message ?? "");
    const allAuthors = [
      { name: d.commit.author.name.trim(), email: d.commit.author.email.trim().toLowerCase() },
      ...coAuthors,
    ];
    // Split lines equally; each author gets 1 commit credit
    const share = allAuthors.length;
    const filesChanged = codeFiles.map((f) => f.filename);
    const date = d.commit.author.date.slice(0, 10);

    return allAuthors.map((author) => ({
      hash: d.sha,
      authorEmail: author.email,
      authorName: author.name,
      date,
      linesAdded: Math.round(totalAdded / share),
      linesDeleted: Math.round(totalDeleted / share),
      repoUrl,
      complexity,
      filesChanged,
    }));
  });
}
