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
      <circle cx="43" cy="43" r="34" stroke="#e8e6f0" strokeWidth="3" fill="#131a2e" />
      <path
        d="M43 43 L43 9 A34 34 0 0 1 73 60 Z"
        fill="#7c5cff"
        stroke="#e8e6f0"
        strokeWidth="2.5"
      />
      <circle cx="43" cy="43" r="10" fill="#34d399" stroke="#e8e6f0" strokeWidth="2.5" />
    </svg>
  );
}
