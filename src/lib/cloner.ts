import { simpleGit } from "simple-git";
import * as os from "os";
import * as path from "path";
import * as fs from "fs/promises";
import { parseGitLogOutput, CommitEntry } from "./gitLog";

export async function cloneAndAnalyze(
  repoUrl: string,
  startDate: string,
  endDate: string
): Promise<CommitEntry[]> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "commitcut-"));
  try {
    const git = simpleGit();
    // Shallow clone since startDate — fetches commits+blobs in range only
    await git.clone(repoUrl, tmpDir, [
      `--shallow-since=${startDate}`,
      "--no-single-branch",
      "--quiet",
    ]);

    const repoGit = simpleGit(tmpDir);

    const logOutput = await repoGit.raw([
      "log",
      "--all",
      "--numstat",
      "--no-merges",
      `--after=${startDate}`,
      `--before=${endDate} 23:59:59`,
      `--pretty=format:COMMIT|%H|%ae|%an|%cs`,
      "--diff-filter=AM",
    ]);

    const entries = parseGitLogOutput(logOutput);
    return entries.map(e => ({ ...e, repoUrl }));
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}
