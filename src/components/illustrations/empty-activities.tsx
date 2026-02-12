export function EmptyActivitiesIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Compass outer circle */}
      <circle cx="40" cy="40" r="28" className="stroke-primary/60" strokeWidth="2" />
      {/* Inner circle */}
      <circle cx="40" cy="40" r="3" className="fill-primary/60" />
      {/* North needle */}
      <path d="M40 37L36 20h8L40 37z" className="fill-primary/60" />
      {/* South needle */}
      <path d="M40 43L36 60h8L40 43z" className="fill-muted-foreground/40" />
      {/* Cardinal marks */}
      <text
        x="40"
        y="18"
        textAnchor="middle"
        className="fill-primary/60"
        fontSize="8"
        fontWeight="bold"
      >
        N
      </text>
      <text x="40" y="74" textAnchor="middle" className="fill-muted-foreground/40" fontSize="8">
        S
      </text>
      <text x="10" y="44" textAnchor="middle" className="fill-muted-foreground/40" fontSize="8">
        O
      </text>
      <text x="70" y="44" textAnchor="middle" className="fill-muted-foreground/40" fontSize="8">
        L
      </text>
    </svg>
  );
}
