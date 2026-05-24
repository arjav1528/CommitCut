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
    // Shallow clone with blobless filter for speed
    await git.clone(repoUrl, tmpDir, [
      "--filter=blob:none",
      "--no-checkout",
      "--quiet",
    ]);

    const repoGit = simpleGit(tmpDir);

    // Fetch full history (needed for log)
    await repoGit.fetch(["--unshallow", "--quiet"]).catch(() => {
      // already full depth — ignore
    });

    const logOutput = await repoGit.raw([
      "log",
      "--numstat",
      "--no-merges",
      `--since=${startDate}`,
      `--until=${endDate} 23:59:59`,
      `--pretty=format:COMMIT|%H|%ae|%an`,
      "--diff-filter=AM",
    ]);

    return parseGitLogOutput(logOutput);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}
