'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';

import {
  applyTheme,
  currentTheme,
  serverTheme,
  storeTheme,
  subscribeToTheme,
} from '@/lib/theme/theme';

import type { Theme } from '@/lib/theme/theme';

/**
 * Reads the remembered theme and puts it on the page.
 *
 * The remembered choice lives in storage — a system outside React — so it is read
 * with `useSyncExternalStore`, whose server snapshot is the plain default. That is
 * what keeps the hydrating render identical to the markup the server produced (the
 * server cannot see this browser's storage) while still settling on the person's
 * own choice immediately afterwards. The cost is unchanged: someone who chose dark
 * sees one light frame on a full page load.
 *
 * Putting the class on the document is the one thing that genuinely belongs in an
 * effect — React telling an external system about the value it just rendered.
 */
export function useTheme(): {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
} {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    currentTheme,
    serverTheme,
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Writing the choice notifies the store, which re-renders every reader — this
  // hook holds no copy of the value to keep in step.
  const setTheme = useCallback((next: Theme) => {
    storeTheme(next);
  }, []);

  return { theme, isDark: theme === 'dark', setTheme };
}
