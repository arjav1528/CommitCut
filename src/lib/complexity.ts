/**
 * Cyclomatic complexity estimator for unified diff patches.
 *
 * Formula: CC = (number of decision points in added lines) + 1
 * Decision points counted: if, while, for, case, catch, &&, ||, ternary ?
 * Operates on raw text of + lines — language-agnostic, no AST needed.
 * Returns undefined when no patch data is available (large diffs truncated
 * by GitHub, binary files) so callers can distinguish "no data" from CC=1.
 */

const DECISION_PATTERNS: RegExp[] = [
  /\bif\s*\(/g,
  /\bwhile\s*\(/g,
  /\bfor\s*[\s(]/g,
  /\bcase\b/g,
  /\bcatch\s*[\s({]/g,
  /&&/g,
  /\|\|/g,
  /\?(?!\?|\.)/g, // ternary — exclude ?? (nullish) and ?. (optional chain)
];

export function complexityOfPatch(patch: string | undefined | null): number | undefined {
  if (!patch) return undefined;

  const addedCode = patch
    .split("\n")
    .filter((l) => l.startsWith("+") && !l.startsWith("+++"))
    .map((l) => l.slice(1))
    .join("\n");

  if (!addedCode.trim()) return undefined;

  let count = 1;
  for (const re of DECISION_PATTERNS) {
    count += (addedCode.match(re) ?? []).length;
  }
  return count;
}
