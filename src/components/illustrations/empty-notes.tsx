export function EmptyNotesIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Notebook body */}
      <rect
        x="20"
        y="8"
        width="44"
        height="64"
        rx="4"
        className="stroke-primary/60"
        strokeWidth="2"
      />
      {/* Spine rings */}
      <circle cx="20" cy="20" r="3" className="stroke-muted-foreground/40" strokeWidth="1.5" />
      <circle cx="20" cy="36" r="3" className="stroke-muted-foreground/40" strokeWidth="1.5" />
      <circle cx="20" cy="52" r="3" className="stroke-muted-foreground/40" strokeWidth="1.5" />
      {/* Lines */}
      <line
        x1="30"
        y1="24"
        x2="56"
        y2="24"
        className="stroke-muted-foreground/40"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="30"
        y1="32"
        x2="52"
        y2="32"
        className="stroke-muted-foreground/40"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="30"
        y1="40"
        x2="54"
        y2="40"
        className="stroke-muted-foreground/40"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="30"
        y1="48"
        x2="48"
        y2="48"
        className="stroke-muted-foreground/40"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Pencil */}
      <line
        x1="52"
        y1="58"
        x2="62"
        y2="48"
        className="stroke-primary/60"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="50"
        y1="60"
        x2="52"
        y2="58"
        className="stroke-primary/60"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
