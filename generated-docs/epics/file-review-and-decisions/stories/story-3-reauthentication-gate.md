# Story 3 — Re-authentication before a decision

**Slug:** `story-3-reauthentication-gate`
**Route:** `null`
**Target file:** `web/src/components/auth/ReauthGate.tsx`
**Page action:** `create_new`
**Roles:** Approver
**Requirement IDs:** FNFR1
**Infrastructure only:** true

## Plain summary

*(Under the hood — verified by step 4.)* Before a decision is committed, the person confirms who
they are. This step builds that confirmation once, so the single-transaction and whole-file
decision paths that follow both use it rather than each growing their own.

## Summary

Builds the re-authentication gate that stories 4 and 5 wrap their decision commits in. FNFR1 and
`project.md`'s NFR-base-7 both require re-authentication before an approve-class action; **no
artboard in the design shows such a step, and no endpoint in the Authentication API performs
one** — see Resolved design choices, which is where the substance of this story lives.

The gate is a single wrapper exposing one way to run a guarded action: it holds the confirmation
state, renders the confirmation prompt over the existing dialog primitive, and invokes the action
it guards only after a successful confirmation. It composes the existing sign-in machinery rather
than duplicating it — `lib/api/auth.ts`'s `login`, the `lib/validation/schemas.ts` password
schema, and the session from `lib/auth/session.tsx`.

Built before the decision stories rather than retrofitted after them, so neither decision path
ever ships an unguarded commit. It has no user-observable surface of its own until story 4 wires a
decision to it, which is why it carries no manual checks — story 4's checklist exercises it.

## Acceptance criteria

| ID | Criterion | Coverage |
|---|---|---|
| AC-1 | An action wrapped by the gate does not reach the service until the person has confirmed who they are. | vitest |
| AC-2 | A confirmation that is refused leaves the action unperformed and says so, without recording anything. | vitest |
| AC-3 | A successful confirmation lets the action through, and the action that runs is the one that was guarded. | vitest |
| AC-4 | Once confirmed, further decisions in the same review pass through without asking again, until the confirmation goes stale. | vitest |
| AC-5 | Confirming does not disturb the signed-in session — the person is not signed out and is not sent back to sign-in. | vitest |

**Plus 2 technical checks the agents verify automatically** — that the guarded action is never
invoked on a refused or abandoned confirmation; and that both the single-transaction and
whole-file paths go through this one wrapper rather than each holding their own copy of the check.

## Resolved design choices

- **There is no re-authentication endpoint, so confirmation re-uses sign-in.**
  `documentation/Authentication_API.yaml` exposes exactly four operations —
  `/v1/auth/login`, `/v1/auth/logout`, `/v1/auth/userinfo` and `/v1/health`. Nothing verifies a
  password without also establishing a session. The gate therefore confirms by submitting the
  person's password to `POST /v1/auth/login`, which re-mints the same session cookie as a side
  effect. It is the only password check available. **AC-5 exists precisely to prove that side
  effect is harmless** — that the re-mint does not sign the person out or bounce them to sign-in
  mid-decision. If the backend later adds a verify endpoint, this module is the only thing that
  changes. Carried on the epic's assumptions.
- **Confirming covers the review, not every click.** The requirement says re-authentication is
  required "before an approve-class action". Read literally, deciding twenty rows means twenty
  password prompts, and a person facing that will reach for `Approve all` to avoid it — which
  makes the control *less* safe, not more. The confirmation therefore holds for the rest of that
  file's review and goes stale on the same terms as the existing idle-session timer, so it can
  never outlive the session it belongs to. Whole-file actions are always inside a confirmed
  review because they are guarded by the same gate.
- **The prompt is designed here, because the design does not contain one.** None of the eight
  artboards show a step-up prompt. It is built as a dialog consistent with the existing reject and
  confirm dialogs — same primitive, same button placement, same focus behaviour — rather than as a
  new pattern.

## Manual test checklist

*(None — this step has no surface of its own. Step 4's checks exercise it.)*
