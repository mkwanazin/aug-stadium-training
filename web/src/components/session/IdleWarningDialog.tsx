'use client';

import { useRef } from 'react';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/** Copy this warning owns. Voice: careful custodian (brief R20). */
const COPY = {
  title: 'You are about to be signed out',
  body: 'This session has been idle, so it is about to end and return you to sign in. Nothing you have already recorded is affected.',
  countdownLead: 'Signing out in',
  stay: 'Stay signed in',
} as const;

interface IdleWarningDialogProps {
  /**
   * Whole seconds left before the session ends, or `null` when there is nothing
   * to warn about. The manager owns the clock; this component only shows it.
   */
  secondsLeft: number | null;
  /** The person is still here and wants to carry on. */
  onStaySignedIn: () => void;
}

/**
 * The interruptive warning that an idle session is about to end (brief R16 /
 * NT-06), composed from the Shadcn AlertDialog.
 *
 * An alert dialog rather than a plain dialog on purpose: it interrupts, it takes
 * focus, and it demands an answer. Two behaviours follow from that and are
 * deliberate:
 *
 *  - **Ordinary activity does not close it.** Once it is open, only the explicit
 *    "Stay signed in" action — or the countdown running out — ends it. A stray
 *    keystroke or mouse movement must not silently dismiss a security warning,
 *    so Escape and a click outside are both refused too. Activity BEFORE the
 *    warning appears resets the idle window as normal (story clarifications).
 *  - **"Stay signed in" is the dialog's cancel action.** It cancels the
 *    sign-out, and Radix gives the cancel action focus when an alert dialog
 *    opens — so the keyboard user lands on the way out (AC-5).
 *
 * Motion: the enter/exit animation is neutralised for anyone who asks for
 * reduced motion by the `prefers-reduced-motion` block in
 * `web/src/app/globals.css`, which applies to every animated surface rather than
 * being re-stated per component.
 */
export function IdleWarningDialog({
  secondsLeft,
  onStaySignedIn,
}: IdleWarningDialogProps) {
  const isOpen = secondsLeft !== null;

  /** Where focus was when the warning interrupted, so it can be put back. */
  const returnFocusTo = useRef<HTMLElement | null>(null);

  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(open) => {
        // The only route to `false` is the cancel action: Escape and outside
        // clicks are refused below, so a close here means the person answered.
        if (!open) onStaySignedIn();
      }}
    >
      <AlertDialogContent
        size="sm"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onOpenAutoFocus={() => {
          // Read before Radix moves focus into the warning, so the control the
          // person was last using is known (AC-5). Not prevented: the dialog's
          // own handler still gives focus to "Stay signed in".
          const active = document.activeElement;
          returnFocusTo.current = active instanceof HTMLElement ? active : null;
        }}
        onCloseAutoFocus={(event) => {
          // Radix returns focus to the control that OPENED the dialog. This one
          // has no such control — it opens itself off a clock — so left alone,
          // focus would land nowhere and a keyboard user would be stranded at
          // the top of the page. Put it back where they were instead.
          event.preventDefault();
          returnFocusTo.current?.focus();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{COPY.title}</AlertDialogTitle>
          <AlertDialogDescription>{COPY.body}</AlertDialogDescription>
        </AlertDialogHeader>

        {/*
          `role="timer"` names this as a running count, and holds the number
          alone so the value it reports is unambiguous. ARIA gives a timer an
          implicit `aria-live="off"`, which is what we want: a screen reader
          announces the warning once, on focus, instead of reading a new number
          out loud every second.
        */}
        <p className="text-muted-foreground text-sm">
          {COPY.countdownLead}{' '}
          <span role="timer" className="text-foreground font-semibold">
            {secondsLeft ?? 0}
          </span>{' '}
          {secondsLeft === 1 ? 'second' : 'seconds'}.
        </p>

        <AlertDialogFooter>
          {/*
            `col-span-2` as well as `w-full`: the footer lays a `size="sm"` dialog
            out as a two-column grid for the usual cancel/confirm pair, so a lone
            action left to `w-full` fills one column — half the dialog — rather
            than the width the design gives it. This warning has one action.
          */}
          <AlertDialogCancel variant="default" className="col-span-2 w-full">
            {COPY.stay}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
