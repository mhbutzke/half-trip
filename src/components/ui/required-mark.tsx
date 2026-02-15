/**
 * RequiredMark component
 * 
 * Displays a consistent visual indicator (*) for required form fields.
 * Improves accessibility with proper aria attributes.
 */

interface RequiredMarkProps {
  className?: string;
}

export function RequiredMark({ className }: RequiredMarkProps = {}) {
  return (
    <span className={className ?? 'text-destructive'} aria-hidden="true">
      {' '}*
    </span>
  );
}
