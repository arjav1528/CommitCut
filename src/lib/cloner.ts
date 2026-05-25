import { simpleGit } from "simple-git";
import { execFile } from "child_process";
import { promisify } from "util";
import * as os from "os";
import * as path from "path";
import * as fs from "fs/promises";
import { parseGitLogOutput, CommitEntry } from "./gitLog";

const execFileAsync = promisify(execFile);

async function checkGitAvailable(): Promise<void> {
  try {
    await execFileAsync("git", ["--version"]);
  } catch {
    throw new Error("git binary not found in PATH — cannot run on this platform");
  }
}

const CLONE_TIMEOUT_MS = 60_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

export async function cloneAndAnalyze(
  repoUrl: string,
  startDate?: string,
  endDate?: string
): Promise<CommitEntry[]> {
  // Enforce HTTPS — reject any non-https URL at runtime
  if (!repoUrl.startsWith("https://github.com/")) {
    throw new Error("Only https://github.com URLs are allowed");
  }

  await checkGitAvailable();

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "commitcut-"));
  try {
    const git = simpleGit();
    const cloneArgs = ["--no-single-branch", "--quiet"];
    // Shallow clone only when a start date is given — all-time requires full clone
    if (startDate) cloneArgs.unshift(`--shallow-since=${startDate}`);
    await withTimeout(
      git.clone(repoUrl, tmpDir, cloneArgs),
      CLONE_TIMEOUT_MS,
      `clone ${repoUrl}`
    );

    const repoGit = simpleGit(tmpDir);

    const logArgs = [
      "log",
      "--all",
      "--numstat",
      "--no-merges",
      `--pretty=format:COMMIT|%H|%ae|%an|%cs`,
      "--diff-filter=AM",
    ];
    if (startDate) logArgs.push(`--after=${startDate}`);
    if (endDate) logArgs.push(`--before=${endDate} 23:59:59`);

    const logOutput = await repoGit.raw(logArgs);

    const entries = parseGitLogOutput(logOutput);
    return entries.map(e => ({ ...e, repoUrl }));
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}
