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
}

export interface AnalyzeResponse {
  contributors: ContributorStats[];
  totalCommits: number;
  repoCount: number;
  dateRange: { start: string; end: string };
}

export interface AnalyzeError {
  error: string;
  code: "NO_COMMITS" | "INVALID_REPO" | "CLONE_FAILED" | "UNKNOWN";
}
