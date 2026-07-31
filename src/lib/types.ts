export interface AnalyzeRequest {
  repoUrls: string[];
  startDate: string;
  endDate: string;
  prizeAmount?: number;
}

export interface ContributorStats {
  name: string;
  email: string;
  commits: number;
  linesAdded: number;
  linesDeleted: number;
  rawScore: number;
  percentage: number;
  prizeShare?: number;
  githubUsername?: string;
  githubAvatarUrl?: string;
  repoBreakdown?: Record<string, { commits: number; linesAdded: number; linesDeleted: number }>;
  commitDates?: string[]; // YYYY-MM-DD strings
  avgComplexity?: number; // avg cyclomatic complexity across contributor's commits
  churnScore?: number;    // avg file-touch frequency for files this contributor modified
  survivalRate?: number;  // fraction of added lines still alive in HEAD blame (0–1)
  linesAlive?: number;    // absolute surviving line count from blame
}

export interface AnalyzeResponse {
  contributors: ContributorStats[];
  totalCommits: number;
  repoCount: number;
  dateRange: { start: string; end: string };
  timeline: { date: string; count: number }[]; // daily commit counts across ALL contributors, sorted by date
}

export interface AnalyzeError {
  error: string;
  code: "NO_COMMITS" | "INVALID_REPO" | "CLONE_FAILED" | "PRIVATE_REPO" | "UNKNOWN";
}
