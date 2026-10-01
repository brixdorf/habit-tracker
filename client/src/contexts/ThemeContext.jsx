import { createContext, useContext, useEffect, useLayoutEffect, useState, useCallback, useRef } from 'react';

const ThemeContext = createContext(null);

// Holds 'light' or 'dark' only when the user picked one; no entry means follow the device.
// index.html reads the same key to set the theme before the app loads.
export const THEME_STORAGE_KEY = 'habit-tracker-theme-preference';
// The previous version saved whatever theme was showing on first load, so that value
// says nothing about what the user chose and would stop the app following the device.
const LEGACY_STORAGE_KEY = 'habit-tracker-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

const opposite = (theme) => (theme === 'dark' ? 'light' : 'dark');

function readPreference() {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // storage can be unavailable (e.g. blocked site data); just follow the device
  }
  return 'system';
}

function savePreference(preference) {
  try {
    if (preference === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // not remembering the choice is fine
  }
}

export function ThemeProvider({ children }) {
  // preference is 'system', 'light', or 'dark'; theme is what is actually shown.
  const [preference, setPreference] = useState(readPreference);
  const [systemTheme, setSystemTheme] = useState(() =>
    window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
  );
  // The fixed theme the current cycle started with, so the cycle runs
  // System -> that theme -> the other theme -> System.
  const cycleStart = useRef(preference === 'system' ? null : preference);

  useEffect(() => {
    const query = window.matchMedia(DARK_QUERY);
    const handleChange = (e) => setSystemTheme(e.matches ? 'dark' : 'light');
    query.addEventListener('change', handleChange);
    setSystemTheme(query.matches ? 'dark' : 'light');
    return () => query.removeEventListener('change', handleChange);
  }, []);

  const theme = preference === 'system' ? systemTheme : preference;

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    savePreference(preference);
  }, [preference]);

  const toggleTheme = useCallback(() => {
    let next;
    if (preference === 'system') {
      // Start with the theme that isn't showing, so the first click always changes something.
      next = opposite(systemTheme);
      cycleStart.current = next;
    } else if (preference === cycleStart.current) {
      next = opposite(preference);
    } else {
      next = 'system';
    }
    setPreference(next);
  }, [preference, systemTheme]);

  return (
    <ThemeContext.Provider value={{ theme, preference, toggleTheme }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
