import { simpleGit } from "simple-git";
import * as os from "os";
import * as path from "path";
import * as fs from "fs/promises";
import { parseGitLogOutput, CommitEntry } from "./gitLog";

export async function cloneAndAnalyze(
  repoUrl: string,
  startDate?: string,
  endDate?: string
): Promise<CommitEntry[]> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "commitcut-"));
  try {
    const git = simpleGit();
    const cloneArgs = ["--no-single-branch", "--quiet"];
    // Shallow clone only when a start date is given — all-time requires full clone
    if (startDate) cloneArgs.unshift(`--shallow-since=${startDate}`);
    await git.clone(repoUrl, tmpDir, cloneArgs);

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
