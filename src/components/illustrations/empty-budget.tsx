export function EmptyBudgetIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Pie chart - segment 1 */}
      <path
        d="M40 40L40 12A28 28 0 0 1 64.2 54z"
        className="fill-primary/20 stroke-primary/60"
        strokeWidth="2"
      />
      {/* Pie chart - segment 2 */}
      <path
        d="M40 40L64.2 54A28 28 0 0 1 20 62z"
        className="fill-muted-foreground/10 stroke-muted-foreground/40"
        strokeWidth="2"
      />
      {/* Pie chart - segment 3 */}
      <path
        d="M40 40L20 62A28 28 0 0 1 40 12z"
        className="fill-primary/10 stroke-primary/40"
        strokeWidth="2"
      />
      {/* Center dot */}
      <circle cx="40" cy="40" r="3" className="fill-background stroke-primary/60" strokeWidth="2" />
    </svg>
  );
}
