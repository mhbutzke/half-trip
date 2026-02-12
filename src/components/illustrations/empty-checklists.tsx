export function EmptyChecklistsIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Paper */}
      <rect
        x="18"
        y="8"
        width="44"
        height="64"
        rx="4"
        className="stroke-primary/60"
        strokeWidth="2"
      />
      {/* Checkbox 1 - checked */}
      <rect
        x="26"
        y="22"
        width="10"
        height="10"
        rx="2"
        className="stroke-primary/60"
        strokeWidth="2"
      />
      <path
        d="M28 27l2 2 4-4"
        className="stroke-primary/60"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="42"
        y1="27"
        x2="54"
        y2="27"
        className="stroke-muted-foreground/40"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Checkbox 2 - checked */}
      <rect
        x="26"
        y="38"
        width="10"
        height="10"
        rx="2"
        className="stroke-primary/60"
        strokeWidth="2"
      />
      <path
        d="M28 43l2 2 4-4"
        className="stroke-primary/60"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="42"
        y1="43"
        x2="50"
        y2="43"
        className="stroke-muted-foreground/40"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Checkbox 3 - empty */}
      <rect
        x="26"
        y="54"
        width="10"
        height="10"
        rx="2"
        className="stroke-muted-foreground/40"
        strokeWidth="2"
      />
      <line
        x1="42"
        y1="59"
        x2="52"
        y2="59"
        className="stroke-muted-foreground/40"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
