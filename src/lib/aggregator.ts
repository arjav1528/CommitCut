import { CommitEntry } from "./gitLog";

export function aggregateEntries(allEntries: CommitEntry[][]): CommitEntry[] {
  return allEntries.flat();
}
