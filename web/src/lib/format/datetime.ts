/**
 * Date/time formatting for the application.
 *
 * Every timestamp is presented in South African time (SAST, GMT+2) regardless of
 * where the viewer is — project.md §Compliance, and the design's "Times in South
 * African time (GMT+2)" copy. The time zone is therefore fixed here rather than
 * read from the browser.
 */
export const SAST_TIME_ZONE = 'Africa/Johannesburg';

const clockTimeFormatter = new Intl.DateTimeFormat('en-ZA', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: SAST_TIME_ZONE,
});

/** A wall-clock time in SAST, 24-hour, e.g. `09:45`. */
export function formatClockTime(value: Date): string {
  return clockTimeFormatter.format(value);
}
