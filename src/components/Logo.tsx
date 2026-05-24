"use client";

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 86 86"
      fill="none"
      aria-label="CommitCut logo"
    >
      <circle cx="43" cy="43" r="34" stroke="#1b1b1b" strokeWidth="3" fill="#eee7d8" />
      <path
        d="M43 43 L43 9 A34 34 0 0 1 73 60 Z"
        fill="#6b4cff"
        stroke="#1b1b1b"
        strokeWidth="2.5"
      />
      <circle cx="43" cy="43" r="10" fill="#1f9d6b" stroke="#1b1b1b" strokeWidth="2.5" />
    </svg>
  );
}
