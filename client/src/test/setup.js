import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { act, cleanup } from '@testing-library/react';

// jsdom has no matchMedia. This fake models the device's light/dark setting, which
// tests can flip with setSystemDark() to simulate the user changing it.
let systemDark = false;
const listeners = new Set();

window.matchMedia = (query) => {
  const isDarkQuery = query.includes('prefers-color-scheme: dark');
  return {
    media: query,
    get matches() {
      return isDarkQuery ? systemDark : false;
    },
    addEventListener(type, listener) {
      if (isDarkQuery && type === 'change') listeners.add(listener);
    },
    removeEventListener(type, listener) {
      listeners.delete(listener);
    },
  };
};

export function setSystemDark(dark) {
  systemDark = dark;
  act(() => {
    for (const listener of [...listeners]) listener({ matches: dark, media: '(prefers-color-scheme: dark)' });
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
  systemDark = false;
  document.documentElement.classList.remove('dark');
});
