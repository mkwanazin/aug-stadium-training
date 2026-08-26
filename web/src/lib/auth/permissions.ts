/**
 * Role permissions — the one place that answers "may this account do that?".
 *
 * The check is deliberately a PERMISSION TEST against the roles an account
 * actually holds, never a two-way `isApprover ? … : …` branch:
 *
 *  - an account may hold BOTH roles, and must then get the union of what each
 *    permits — a branch can only ever produce one side;
 *  - an account may hold a role this project grants nothing to (the auth API's
 *    own `RoleRead` example is `Viewer`), and must then be granted nothing — a
 *    branch would fall through to the Importer side and hand it the lot.
 *
 * Both cases are real: the role set is not closed at two (brief §Notes & Caveats,
 * "Role set may exceed two"). Every later epic gates on this module rather than
 * re-deriving the rule.
 *
 * Source of the grants below: `documentation/requirements-application.md` §6.5,
 * carried into the epic brief as BR5 (Importer) and BR6 (Approver), plus the
 * 2026-08-26 user decision on `File settings` recorded in project.md §Roles &
 * Permissions and the design digest §Your Decisions.
 */

import type { UserInfoRead } from '@/types/auth';

/**
 * Role names EXACTLY as the Authentication API spells them — verified live against
 * `GET /v1/auth/userinfo` on 2026-08-26 and tabled in project.md §Roles &
 * Permissions. The importer role is `File Importer`, WITH THE SPACE.
 *
 * `documentation/requirements-application.md` §6.5 calls that role "Importer" and
 * intake copied the prose spelling here, so the grant table matched a name the
 * backend never returns: every genuine importer account held no permission at all
 * and was shown the permission-denied panel over an empty menu.
 *
 * One verified name per role — no alias lists and no fuzzy matching. Comparison is
 * case-insensitive (see `normalise`) and otherwise exact, so the next name change
 * fails loudly here instead of being absorbed by a spelling that happens to be
 * tolerated.
 */
export const ROLE_IMPORTER = 'File Importer';
export const ROLE_APPROVER = 'Approver';

/**
 * A distinct thing a role may do. Extend this union — and the grant table below
 * — as later epics introduce actions; never add a second copy of the check.
 */
export type Permission =
  | 'files.view'
  | 'files.upload'
  | 'imports.report'
  | 'fileSettings.view'
  | 'fileSettings.administer';

/**
 * Which roles hold which permission. An account holding ANY of the listed roles
 * has the permission; an account holding none of them does not.
 *
 * `fileSettings` is deliberately TWO permissions, not one:
 *  - `fileSettings.view` — reaching the destination and reading what is configured.
 *    Both roles hold it, per the 2026-08-26 user decision: an Importer may see the
 *    `File settings` destination and its screens even though §6.5 gives it only read
 *    access to the record. This is what the menu entry and that route's guard test.
 *  - `fileSettings.administer` — changing what is configured. Approver only, per
 *    §6.5. The `file-settings-administration` epic gates its create/edit/delete
 *    actions on THIS one; adding the Importer to it instead of splitting would have
 *    silently handed that epic an administer grant nobody asked for.
 *
 * Deliberately absent: user and role administration. It is de-scoped from the
 * whole build (brief §Out of Scope / BR6), so there is no permission to grant and
 * no "Users and roles" destination for any role.
 */
const GRANTS: Record<Permission, readonly string[]> = {
  'files.view': [ROLE_IMPORTER, ROLE_APPROVER],
  'files.upload': [ROLE_IMPORTER],
  'imports.report': [ROLE_IMPORTER, ROLE_APPROVER],
  'fileSettings.view': [ROLE_IMPORTER, ROLE_APPROVER],
  'fileSettings.administer': [ROLE_APPROVER],
};

/** Role names compare case-insensitively; everything else about them is verbatim. */
const normalise = (roleName: string): string => roleName.trim().toLowerCase();

/**
 * The role names an account holds, exactly as the API spelt them — they are shown
 * to the person, so they are never re-cased or re-worded here.
 *
 * `Roles[]` is authoritative. `RolesString` is only consulted when `Roles` is
 * absent, because the spec never states how it joins several roles (it only ever
 * shows a single-role example), so splitting it is a guess of last resort.
 */
export function roleNamesOf(userInfo: UserInfoRead): string[] {
  const fromRoles = (userInfo.Roles ?? [])
    .map((role) => role.Name?.trim())
    .filter((name): name is string => Boolean(name));

  if (fromRoles.length > 0) {
    return fromRoles;
  }

  return (userInfo.RolesString ?? '')
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
}

/** True when any of the roles held is one of `permitted`. */
export function holdsAnyRole(
  rolesHeld: readonly string[],
  permitted: readonly string[],
): boolean {
  const held = new Set(rolesHeld.map(normalise));
  return permitted.some((role) => held.has(normalise(role)));
}

/** True when the roles held grant `permission`. */
export function hasPermission(
  rolesHeld: readonly string[],
  permission: Permission,
): boolean {
  return holdsAnyRole(rolesHeld, GRANTS[permission]);
}

/**
 * The roles that grant `permission` — what a route-level guard names when it has
 * to tell a person which role would open the surface.
 *
 * Read from the same grant table as `hasPermission`, so a surface's guard and the
 * menu entry that leads to it can never disagree about who is let in.
 */
export function rolesGranting(permission: Permission): readonly string[] {
  return GRANTS[permission];
}
