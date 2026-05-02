"use client";

type Props = {
  state?: "idle" | "working" | "done";
  size?: number;
  className?: string;
};

/**
 * Friendly AI mechanic mascot. Clean, flat illustration — not childish.
 * States change eye/tool expression.
 */
export function Mascot({ state = "idle", size = 120, className = "" }: Props) {
  return (
    <div
      className={`inline-block ${state === "idle" ? "animate-float-slow" : ""} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 160 160" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
        {/* soft halo */}
        <circle cx="80" cy="80" r="70" fill="#e0efff" opacity="0.55" />
        <circle cx="80" cy="80" r="54" fill="#ffffff" />

        {/* shoulders / coveralls */}
        <path
          d="M32 140 C 40 112, 60 100, 80 100 C 100 100, 120 112, 128 140 Z"
          fill="#006dcc"
        />
        <rect x="74" y="104" width="12" height="12" rx="2" fill="#0b3e70" />

        {/* head */}
        <circle cx="80" cy="76" r="30" fill="#f4d7b3" />

        {/* cap */}
        <path
          d="M50 70 C 52 52, 70 44, 80 44 C 92 44, 108 52, 110 70 Z"
          fill="#0b3e70"
        />
        <rect x="50" y="68" width="60" height="6" rx="3" fill="#082749" />
        <circle cx="80" cy="56" r="4" fill="#7cc5ff" />

        {/* hair sides */}
        <path d="M52 74 q2 8 6 12" stroke="#3a2a1a" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M108 74 q-2 8 -6 12" stroke="#3a2a1a" strokeWidth="2" fill="none" strokeLinecap="round" />

        {/* eyes */}
        {state === "working" ? (
          <>
            <path d="M66 80 q4 -4 8 0" stroke="#0a1929" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M86 80 q4 -4 8 0" stroke="#0a1929" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="70" cy="80" r="2.5" fill="#0a1929" />
            <circle cx="90" cy="80" r="2.5" fill="#0a1929" />
          </>
        )}

        {/* smile */}
        <path
          d={state === "done" ? "M70 92 q10 10 20 0" : "M70 92 q10 6 20 0"}
          stroke="#0a1929"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />

        {/* wrench */}
        <g transform="translate(112 96) rotate(25)">
          <rect x="0" y="0" width="26" height="6" rx="2" fill="#9ca3af" />
          <path
            d="M26 -2 h6 a4 4 0 0 1 4 4 v6 a4 4 0 0 1 -4 4 h-6 z"
            fill="#9ca3af"
          />
          <circle cx="30" cy="5" r="2" fill="#ffffff" />
        </g>

        {/* AI spark */}
        <g transform="translate(36 40)">
          <path
            d="M6 0 L8 4 L12 6 L8 8 L6 12 L4 8 L0 6 L4 4 Z"
            fill="#0b8af0"
          />
        </g>
      </svg>
    </div>
  );
}
