const IGNORED_FILENAMES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "npm-shrinkwrap.json",
  "Cargo.lock",
  "Gemfile.lock",
  "composer.lock",
  "Pipfile.lock",
  "poetry.lock",
  "go.sum",
]);

const IGNORED_EXTENSIONS = new Set([
  ".min.js",
  ".min.css",
  ".map",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".ico",
  ".pdf",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".mp4",
  ".mp3",
  ".zip",
  ".tar",
  ".gz",
  ".bin",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
]);

const IGNORED_PATH_PREFIXES = [
  "node_modules/",
  "dist/",
  "build/",
  ".next/",
  "out/",
  "vendor/",
  ".vendor/",
  "coverage/",
  "__pycache__/",
  ".venv/",
  "venv/",
];

export function shouldIgnoreFile(filePath: string): boolean {
  const parts = filePath.split("/");
  const filename = parts[parts.length - 1];

  if (IGNORED_FILENAMES.has(filename)) return true;

  for (const prefix of IGNORED_PATH_PREFIXES) {
    if (filePath.startsWith(prefix) || filePath.includes("/" + prefix))
      return true;
  }

  for (const ext of IGNORED_EXTENSIONS) {
    if (filename.endsWith(ext)) return true;
  }

  return false;
}
