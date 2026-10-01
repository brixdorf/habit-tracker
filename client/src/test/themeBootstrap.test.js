import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { THEME_STORAGE_KEY } from '../contexts/ThemeContext.jsx';
import { setSystemDark } from './setup.js';

// Runs the inline script from index.html that sets the theme before the app loads.
function runBootstrapScript() {
  const html = fs.readFileSync(path.resolve(__dirname, '../../index.html'), 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  new Function(script)();
}

const isDark = () => document.documentElement.classList.contains('dark');

describe('index.html theme bootstrap', () => {
  it('reads the same storage key as the app', () => {
    const html = fs.readFileSync(path.resolve(__dirname, '../../index.html'), 'utf8');
    expect(html).toContain(`'${THEME_STORAGE_KEY}'`);
  });

  it('follows the device when nothing is saved', () => {
    setSystemDark(true);
    runBootstrapScript();
    expect(isDark()).toBe(true);
  });

  it('stays light on a light device', () => {
    runBootstrapScript();
    expect(isDark()).toBe(false);
  });

  it('uses a saved fixed choice over the device', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    setSystemDark(true);
    runBootstrapScript();
    expect(isDark()).toBe(false);

    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    setSystemDark(false);
    runBootstrapScript();
    expect(isDark()).toBe(true);
  });
});
