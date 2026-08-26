/**
 * The sidebar's destinations, in the order the design lists them (digest §Received
 * files → Navigation): the primary group, then an `Administration` group.
 *
 * Each destination names the PERMISSION that reveals it, not a role — so an
 * account holding several roles sees the union of what they permit, and an account
 * holding a role this project grants nothing to sees none of them. The grants
 * themselves live in `@/lib/auth/permissions`.
 *
 * Deliberately absent: `Users and roles`, which the design's sidebar lists under
 * Administration. User and role administration is de-scoped from the whole build
 * (brief §Out of Scope / BR6), so the entry is offered to nobody — including the
 * Approver, who would otherwise own it.
 */

import type { Permission } from '@/lib/auth/permissions';

export interface NavDestination {
  /** The link's visible text, and its accessible name. */
  label: string;
  href: string;
  permission: Permission;
}

export interface NavGroup {
  /** Section heading; absent for the leading, unheaded group. */
  heading?: string;
  destinations: readonly NavDestination[];
}

export const NAV_GROUPS: readonly NavGroup[] = [
  {
    destinations: [
      { label: 'Received files', href: '/files', permission: 'files.view' },
      { label: 'Upload a file', href: '/upload', permission: 'files.upload' },
      {
        label: 'Import activity',
        href: '/import-activity',
        permission: 'imports.report',
      },
    ],
  },
  {
    heading: 'Administration',
    destinations: [
      {
        // Seeing this destination is a VIEW permission both roles hold, not the
        // Approver's administer permission (user decision 2026-08-26, project.md
        // §Roles & Permissions / digest §Your Decisions). The design files File
        // settings under `Administration`, which is why it was first built
        // Approver-only; the grouping is presentation, not the gate. Changing
        // what is configured stays `fileSettings.administer`, which the
        // `file-settings-administration` epic gates its actions on.
        label: 'File settings',
        href: '/file-settings',
        permission: 'fileSettings.view',
      },
    ],
  },
];
