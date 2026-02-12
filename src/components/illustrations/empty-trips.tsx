export function EmptyTripsIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Suitcase body */}
      <rect
        x="16"
        y="28"
        width="48"
        height="36"
        rx="4"
        className="stroke-primary/60"
        strokeWidth="2"
      />
      {/* Handle */}
      <path
        d="M30 28V20a6 6 0 0 1 6-6h8a6 6 0 0 1 6 6v8"
        className="stroke-primary/60"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Middle strap */}
      <line
        x1="40"
        y1="28"
        x2="40"
        y2="64"
        className="stroke-muted-foreground/40"
        strokeWidth="2"
      />
      {/* Wheels */}
      <circle cx="28" cy="68" r="3" className="fill-muted-foreground/40" />
      <circle cx="52" cy="68" r="3" className="fill-muted-foreground/40" />
    </svg>
  );
}
