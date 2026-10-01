import { useTheme } from '../../contexts/ThemeContext.jsx';

const LABELS = { system: 'System', light: 'Light', dark: 'Dark' };

export function ThemeToggle() {
  const { theme, preference, toggleTheme } = useTheme();
  const label = `Theme: ${LABELS[preference]}`;
  const description =
    preference === 'system' ? `${label} (following your device, currently ${theme})` : label;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={`${description}. Click to change.`}
      className="flex h-9 w-9 items-center justify-center rounded-md border border-base-300 text-base-600 transition hover:bg-base-200 dark:border-base-700 dark:text-base-300 dark:hover:bg-base-800"
    >
      {preference === 'system' ? (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <path d="M8 20h8M12 16v4" />
        </svg>
      ) : preference === 'light' ? (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
        </svg>
      )}
    </button>
  );
}
