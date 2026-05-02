type Props = {
  className?: string;
  size?: number;
};

/**
 * VeltrixDrive logo — clean V mark in a rounded square + wordmark.
 * Renders crisply at any size; no glyph stacking issues.
 */
export function Logo({ className = "", size = 28 }: Props) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        className="shrink-0"
      >
        <defs>
          <linearGradient id="vlx-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0b8af0" />
            <stop offset="100%" stopColor="#006dcc" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="32" height="32" rx="8" fill="url(#vlx-grad)" />
        {/* clean V mark */}
        <path
          d="M9 9 L16 23 L23 9"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* small accent dot */}
        <circle cx="23.5" cy="9" r="1.6" fill="white" />
      </svg>
      <span className="font-display text-[1.05rem] font-extrabold tracking-tight text-ink-900 leading-none">
        VeltrixDrive
      </span>
    </div>
  );
}
