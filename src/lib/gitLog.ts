import { shouldIgnoreFile } from "./filter";

export interface CommitEntry {
  hash: string;
  authorEmail: string;
  authorName: string;
  linesAdded: number;
  linesDeleted: number;
  date: string; // YYYY-MM-DD
  repoUrl?: string;
}

const COMMIT_HEADER = /^COMMIT\|([^|]+)\|([^|]+)\|([^|]+)\|(.+)$/;
const NUMSTAT_LINE = /^(\d+|-)\t(\d+|-)\t(.+)$/;

export function parseGitLogOutput(output: string): CommitEntry[] {
  const entries: CommitEntry[] = [];
  let current: CommitEntry | null = null;

  for (const line of output.split("\n")) {
    const headerMatch = line.match(COMMIT_HEADER);
    if (headerMatch) {
      if (current) entries.push(current);
      current = {
        hash: headerMatch[1],
        authorEmail: headerMatch[2].trim().toLowerCase(),
        authorName: headerMatch[3].trim(),
        date: headerMatch[4].trim(),
        linesAdded: 0,
        linesDeleted: 0,
      };
      continue;
    }

    if (!current) continue;

    const numstatMatch = line.match(NUMSTAT_LINE);
    if (numstatMatch) {
      const added = numstatMatch[1];
      const deleted = numstatMatch[2];
      const file = numstatMatch[3];

      // "-" means binary file — skip
      if (added === "-" || deleted === "-") continue;
      if (shouldIgnoreFile(file)) continue;

      current.linesAdded += parseInt(added, 10);
      current.linesDeleted += parseInt(deleted, 10);
    }
  }

  if (current) entries.push(current);
  return entries;
}
