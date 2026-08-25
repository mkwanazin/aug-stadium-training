/**
 * Light / dark theme — stored choice and how it reaches the page.
 *
 * The person gets an explicit switch in the sidebar rather than the application
 * silently following the device setting (design digest §Your Decisions, "Light and
 * dark — people get a switch in the sidebar"). The stored choice therefore
 * OVERRIDES the device preference, which is why nothing here reads
 * `prefers-color-scheme`.
 *
 * The applied theme is a `dark` class on the document element — the contract
 * `web/src/app/globals.css` already declares with
 * `@custom-variant dark (&:is(.dark *))`, against a full `.dark` token block. No
 * component knows about themes; they use the semantic tokens and follow.
 */

export type Theme = 'light' | 'dark';

/** The design's own default (digest §Palette & Typography: "default `light`"). */
export const DEFAULT_THEME: Theme = 'light';

export const THEME_STORAGE_KEY = 'pim.theme';

const DARK_CLASS = 'dark';

const isTheme = (value: unknown): value is Theme =>
  value === 'light' || value === 'dark';

/** Storage is unavailable during server rendering, and blocked in some browsers. */
function storage(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage;
}

/** The remembered choice, or `null` when the person has never made one. */
export function readStoredTheme(): Theme | null {
  const stored = storage()?.getItem(THEME_STORAGE_KEY);
  return isTheme(stored) ? stored : null;
}

/** Remembers the choice so it survives the next load. */
export function storeTheme(theme: Theme): void {
  storage()?.setItem(THEME_STORAGE_KEY, theme);
  for (const listener of listeners) listener();
}

/** Puts the theme on the page. */
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle(DARK_CLASS, theme === 'dark');
}

/* -------------------------------------------------------------------------- *
 * The remembered choice as an external store
 *
 * Storage is a system outside React, so React reads it with
 * `useSyncExternalStore` (see `@/lib/theme/useTheme`) rather than copying it into
 * state from an effect. That keeps the value derived at render time — no cascading
 * render to correct an initial guess — and picks up a change made in another tab.
 * -------------------------------------------------------------------------- */

type ThemeListener = () => void;

const listeners = new Set<ThemeListener>();

/** The theme in force in this browser: the person's choice, else the default. */
export function currentTheme(): Theme {
  return readStoredTheme() ?? DEFAULT_THEME;
}

/**
 * What the server rendered. It cannot read this browser's storage, so it is always
 * the default — returning it as the hydration snapshot is what keeps the first
 * client render identical to the server's markup.
 */
export function serverTheme(): Theme {
  return DEFAULT_THEME;
}

/** Notified when the choice changes here, or in another tab. */
export function subscribeToTheme(listener: ThemeListener): () => void {
  listeners.add(listener);

  const onStorage = (event: StorageEvent) => {
    // `key === null` is a whole-storage clear, which also drops the choice.
    if (event.key === null || event.key === THEME_STORAGE_KEY) listener();
  };
  window.addEventListener('storage', onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}
