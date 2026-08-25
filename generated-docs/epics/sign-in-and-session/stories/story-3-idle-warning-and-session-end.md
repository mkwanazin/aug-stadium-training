# Story 3 — Idle warning and session end

**Slug:** `story-3-idle-warning-and-session-end`
**Route:** `/files`
**Target file:** `web/src/app/(app)/layout.tsx`
**Page action:** `modify_existing`
**Roles:** All Roles
**Requirement IDs:** R14, R15, R16
**Infrastructure only:** false

## Plain summary

If you walk away, the app warns you a minute before it signs you out, and lets you carry on with
one click. If you don't come back it returns you to sign-in and explains why. A session also ends
eight hours after it began, however busy you have been.

## Summary

Adds idle and absolute session lifecycle to the signed-in shell. Activity resets a 15-minute idle
window; at 14 minutes a warning dialog appears counting down the final 60 seconds with a "Stay
signed in" action, and on expiry the session is ended and the user returned to sign-in with an
explanation of why. Independently, an 8-hour absolute cap ends the session regardless of activity.
Implements `project.md` NFR-base-7; the dialog is a composed Shadcn primitive following the
six-state interaction contract and honours `prefers-reduced-motion`.

## Acceptance criteria

| ID | Criterion | Coverage |
|---|---|---|
| AC-1 | After 14 minutes without activity a warning appears, counting down the 60 seconds left before sign-out and naming what will happen. | playwright |
| AC-2 | Choosing to stay signed in — or simply resuming work before the warning appears — clears the warning and starts the idle period over. | playwright |
| AC-3 | If the warning is left alone, the session ends at the 15-minute mark and the person is returned to sign-in with an explanation that inactivity ended it. | playwright |
| AC-4 | Eight hours after signing in the session ends however active the person has been, and the next screen they open returns them to sign-in. | playwright |
| AC-5 | The warning takes keyboard focus when it appears, can be answered with the keyboard alone, and returns focus to where the person was. | vitest |

## Resolved design choices

None for this story.

## Manual test checklist

- Sign in and leave the app untouched for 14 minutes → a warning appears counting down 60 seconds
- Choose "Stay signed in" → the warning closes and you carry straight on
- Let the countdown run to zero → you're returned to sign-in with an explanation that the session ended through inactivity
- Type or move the mouse before the 14 minutes are up → the clock starts over and no warning appears
- Answer the warning using only the keyboard → focus lands on the warning when it opens and returns to where you were
- Leave a session open past eight hours (or ask us to shorten the limit for a test) → the next screen you open sends you back to sign-in
