export interface AnalyzeRequest {
  repoUrls: string[];
  startDate: string;
  endDate: string;
  prizeAmount?: number;
  currency?: string;
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
  code: "NO_COMMITS" | "INVALID_REPO" | "CLONE_FAILED" | "UNKNOWN";
}
