'use client';

import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/lib/theme/useTheme';

const LABEL_ID = 'theme-switch-label';

/**
 * The sidebar's light/dark control — the person's own choice, remembered, and
 * overriding whatever their device prefers (design digest §Your Decisions).
 *
 * Named by a visible `aria-labelledby` target rather than an invisible
 * `aria-label`, so the label a screen reader announces is the label everyone else
 * reads.
 */
export function ThemeSwitch() {
  const { isDark, setTheme } = useTheme();

  return (
    <div className="flex items-center justify-between gap-2">
      <span
        id={LABEL_ID}
        className="text-muted-foreground text-xs font-semibold"
      >
        Dark theme
      </span>
      <Switch
        id="theme-switch"
        aria-labelledby={LABEL_ID}
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
      />
    </div>
  );
}
