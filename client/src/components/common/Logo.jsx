export function Logo({ className = 'h-7 w-7' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} role="img" aria-label="Habit Tracker logo">
      <circle cx="12" cy="12" r="11" className="fill-accent-500" />
      <path
        d="m6.5 12.5 3.5 3.5L18 8"
        fill="none"
        stroke="var(--color-base-50)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
