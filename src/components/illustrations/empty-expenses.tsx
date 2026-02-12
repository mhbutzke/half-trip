export function EmptyExpensesIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Wallet body */}
      <rect
        x="12"
        y="24"
        width="48"
        height="36"
        rx="4"
        className="stroke-primary/60"
        strokeWidth="2"
      />
      {/* Wallet flap */}
      <path d="M12 32h48" className="stroke-primary/60" strokeWidth="2" />
      {/* Clasp */}
      <rect
        x="48"
        y="36"
        width="12"
        height="12"
        rx="6"
        className="stroke-muted-foreground/40"
        strokeWidth="2"
      />
      {/* Coin 1 */}
      <circle cx="66" cy="56" r="7" className="stroke-primary/60" strokeWidth="2" />
      <text
        x="66"
        y="60"
        textAnchor="middle"
        className="fill-primary/60"
        fontSize="10"
        fontWeight="bold"
      >
        $
      </text>
      {/* Coin 2 */}
      <circle cx="58" cy="64" r="5" className="stroke-muted-foreground/40" strokeWidth="1.5" />
    </svg>
  );
}
