'use client';

import { useTheme } from '@/lib/theme/useTheme';

/**
 * Puts the remembered theme on the page everywhere, including the surfaces that
 * carry no switch of their own — sign in most of all, since that is where a person
 * lands after signing out and their choice should still be in force.
 *
 * Renders nothing; the switch itself lives in the signed-in sidebar
 * (`@/components/theme/ThemeSwitch`), which is the only writer.
 */
export function ThemeApplier() {
  useTheme();
  return null;
}
