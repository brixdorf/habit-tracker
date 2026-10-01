import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from './ThemeContext.jsx';
import { ThemeToggle } from '../components/common/ThemeToggle.jsx';
import { setSystemDark } from '../test/setup.js';

const isDark = () => document.documentElement.classList.contains('dark');

function renderToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>
  );
}

const toggle = () => screen.getByRole('button', { name: /theme/i });

describe('system theme', () => {
  it('follows the device setting by default', () => {
    setSystemDark(true);
    renderToggle();
    expect(isDark()).toBe(true);
    expect(toggle()).toHaveAccessibleName(/system/i);
  });

  it('switches live when the device setting changes while the app is open', () => {
    renderToggle();
    expect(isDark()).toBe(false);

    setSystemDark(true);
    expect(isDark()).toBe(true);

    setSystemDark(false);
    expect(isDark()).toBe(false);
  });

  it('does not let a theme saved automatically by the old version pin the app', () => {
    // The previous version wrote whatever theme was showing on first load.
    localStorage.setItem('habit-tracker-theme', 'dark');
    renderToggle();
    expect(isDark()).toBe(false);

    setSystemDark(true);
    expect(isDark()).toBe(true);
  });

  it('lets the user pick a fixed theme and go back to following the device', async () => {
    const user = userEvent.setup();
    renderToggle();
    expect(isDark()).toBe(false);

    // From System, the first click always visibly flips the theme.
    await user.click(toggle());
    expect(isDark()).toBe(true);
    expect(toggle()).toHaveAccessibleName(/dark/i);

    // A fixed choice ignores the device.
    setSystemDark(false);
    expect(isDark()).toBe(true);

    await user.click(toggle());
    expect(isDark()).toBe(false);
    expect(toggle()).toHaveAccessibleName(/light/i);
    setSystemDark(true);
    expect(isDark()).toBe(false);

    // Third click returns to following the device, which is now dark.
    await user.click(toggle());
    expect(toggle()).toHaveAccessibleName(/system/i);
    expect(isDark()).toBe(true);
    setSystemDark(false);
    expect(isDark()).toBe(false);
  });

  it('remembers the choice across reloads', async () => {
    const user = userEvent.setup();
    const { unmount } = renderToggle();
    await user.click(toggle());
    expect(isDark()).toBe(true);
    unmount();
    document.documentElement.classList.remove('dark');

    renderToggle();
    expect(isDark()).toBe(true);
    expect(toggle()).toHaveAccessibleName(/dark/i);
  });
});
