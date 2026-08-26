import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Vitest's 5s default is a poor fit for interaction-heavy integration tests:
    // `userEvent` typing costs ~15ms per character under jsdom, so a test that
    // fills a form several times (e.g. the five refusals a lockout needs) spends
    // seconds on keystrokes alone and times out under parallel worker load while
    // passing in isolation. A timeout still catches a genuinely hung test — it
    // just no longer fails honest ones for being long.
    testTimeout: 20_000,
    include: [
      'src/**/__tests__/**/*.[jt]s?(x)',
      'src/**/?(*.)+(test).[jt]s?(x)',
    ],
    // `__tests__/helpers/` holds shared mock-data factories imported BY tests, not
    // test suites themselves — excluding them keeps Vitest from failing on the
    // "No test suite found" error for a helper-only module.
    exclude: [
      'node_modules/',
      '**/*.spec.[jt]s',
      'src/**/__tests__/helpers/**',
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx,ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.stories.{js,jsx,ts,tsx}',
        'src/**/__tests__/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
