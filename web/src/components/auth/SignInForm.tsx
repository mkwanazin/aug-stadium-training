'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { StatusBanner } from '@/components/feedback/StatusBanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login } from '@/lib/api/auth';
import { isAPIErrorWithStatus } from '@/lib/api/errors';
import { markSessionStart } from '@/lib/auth/session-lifetime';
import { formatClockTime } from '@/lib/format/datetime';

import type { FormEvent } from 'react';

/**
 * The sign-in form. A client component on purpose: the login request is issued
 * from the BROWSER through the shared API client, so the `Set-Cookie` on the
 * response is stored by the browser as a first-party cookie for this origin
 * (`web/next.config.ts` rewrites `/v1/auth/*` on to the Authentication API).
 * A Server Action would put the fetch on the Node side, where the cookie would
 * have to be re-issued by hand.
 */

/** Where a signed-in person lands (Received files — built in a later story). */
const POST_SIGN_IN_ROUTE = '/files';

/**
 * How long the success banner is on screen before the redirect. Long enough to be
 * read and announced, short enough not to feel like a stall.
 */
const REDIRECT_DELAY_MS = 1200;

/**
 * Consecutive refusals against the same address before the account is treated as
 * locked, and for how long — the rate-limit defaults in
 * .claude/policies/bff-auth-pattern.md (Rule 3), and the five-attempt rule stated
 * in the design's own sign-in footer copy.
 *
 * Counted in the browser because `documentation/Authentication_API.yaml`
 * documents no locked-account status or body: a 401 is returned whether the
 * account is refused or locked (brief §Notes & Caveats). This is presentation of
 * a limit, not enforcement of one — the backend remains the security control, and
 * confirming how it reports lockout is carried as an unverified assumption on the
 * epic.
 */
const REFUSALS_BEFORE_LOCKOUT = 5;
const LOCKOUT_MINUTES = 15;

/** Copy this screen owns. Voice: careful custodian (brief R20). */
const COPY = {
  emailLabel: 'Email address',
  emailPlaceholder: 'name@pimcapitalgroup.com',
  emailRequired: 'An email address is required.',
  passwordLabel: 'Password',
  passwordPlaceholder: '••••••••••',
  passwordRequired: 'A password is required.',
  requiredLegend: '* Required',
  submit: 'Sign in',
  heading: 'Sign in',
  subHeading: 'Use the email address and password you already hold.',
  footerHint:
    'Accounts are created by an administrator — there is no self-registration. After five refused attempts the account is locked for a period.',
  incompleteLead: 'Username and password are required.',
  refusedLead: 'Those credentials were not accepted.',
  errorFollowUp: 'Check the details and try again.',
  lockedLead: 'This account is locked.',
  unavailableLead: 'Sign in could not be completed.',
  unavailableFollowUp:
    'The service did not respond. Check your connection and try again.',
  successLead: 'Signed in.',
  successFollowUp: 'Taking you to your files…',
} as const;

type Outcome =
  | { kind: 'incomplete' }
  | { kind: 'refused' }
  | { kind: 'locked'; availableAgainAt: string }
  | { kind: 'unavailable' }
  | { kind: 'success' };

interface FieldErrors {
  email?: string;
  password?: string;
}

/** Same person, however they capitalised their address. */
const identityOf = (email: string): string => email.trim().toLowerCase();

export function SignInForm() {
  const router = useRouter();

  /**
   * The credential fields are uncontrolled: their values live in the DOM and are
   * read on blur and on submit. Nothing about a keystroke changes what is on
   * screen (R10 — nothing reports while the person is still typing), so keeping
   * them in React state would re-render the form for no visible reason.
   */
  const emailInput = useRef<HTMLInputElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  /** Which fields currently carry a message on screen. */
  const reportedFields = useRef({ email: false, password: false });
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** Consecutive refusals, and who they were against. */
  const refusals = useRef({ identity: '', count: 0 });
  /** The account currently held locked, and until when. */
  const lockout = useRef<{ identity: string; until: Date } | null>(null);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    },
    [],
  );

  /**
   * Field checks report when the field is left, never while the person is still
   * typing (brief R10 / UI-03).
   */
  const reportOnBlur = (field: keyof FieldErrors, value: string) => {
    const message =
      value.trim() === ''
        ? field === 'email'
          ? COPY.emailRequired
          : COPY.passwordRequired
        : undefined;
    reportedFields.current[field] = message !== undefined;
    setFieldErrors((current) => ({ ...current, [field]: message }));
  };

  /**
   * A field's message is withdrawn the moment the person starts correcting it.
   * Guarded by a ref so an ordinary keystroke — the overwhelming majority — does
   * no React work at all.
   */
  const clearFieldError = (field: keyof FieldErrors) => {
    if (!reportedFields.current[field]) return;
    reportedFields.current[field] = false;
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const lockAccount = (identity: string): Outcome => {
    const until = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
    lockout.current = { identity, until };
    return { kind: 'locked', availableAgainAt: formatClockTime(until) };
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const email = emailInput.current?.value ?? '';
    const password = passwordInput.current?.value ?? '';

    const errors: FieldErrors = {
      email: email.trim() === '' ? COPY.emailRequired : undefined,
      password: password === '' ? COPY.passwordRequired : undefined,
    };
    reportedFields.current = {
      email: errors.email !== undefined,
      password: errors.password !== undefined,
    };
    setFieldErrors(errors);

    // An incomplete submission is reported without authenticating (brief R3).
    if (errors.email || errors.password) {
      setOutcome({ kind: 'incomplete' });
      return;
    }

    const identity = identityOf(email);

    const held = lockout.current;
    if (held && held.identity === identity) {
      // Still inside the window: say so rather than spending an attempt.
      if (held.until.getTime() > Date.now()) {
        setOutcome({
          kind: 'locked',
          availableAgainAt: formatClockTime(held.until),
        });
        return;
      }
      // The window has passed — the account starts again with a clean count.
      lockout.current = null;
      refusals.current = { identity: '', count: 0 };
    }

    setIsSubmitting(true);
    try {
      await login({ Username: email.trim(), Password: password });
      // The 8-hour absolute cap is measured from this moment (NFR-base-7), and
      // this is the only place that knows it — the session cookie is opaque and
      // `userinfo` does not say when the session was issued.
      markSessionStart();
      refusals.current = { identity: '', count: 0 };
      lockout.current = null;
      setOutcome({ kind: 'success' });
      // Submitting stays true through the redirect below, so the button stays
      // disabled: the session already exists, and a second click during the
      // banner's dwell would spend another login attempt and overwrite this ref
      // — orphaning the timer already scheduled, which then fires unclearable.
      redirectTimer.current = setTimeout(() => {
        router.push(POST_SIGN_IN_ROUTE);
      }, REDIRECT_DELAY_MS);
    } catch (error) {
      // Nothing was established, so the form is theirs to use again.
      setIsSubmitting(false);

      if (!isAPIErrorWithStatus(error, 401)) {
        setOutcome({ kind: 'unavailable' });
        return;
      }

      const count =
        refusals.current.identity === identity ? refusals.current.count + 1 : 1;
      refusals.current = { identity, count };

      setOutcome(
        count >= REFUSALS_BEFORE_LOCKOUT
          ? lockAccount(identity)
          : { kind: 'refused' },
      );
    }
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl">{COPY.heading}</h2>
        <p className="text-muted-foreground text-sm">{COPY.subHeading}</p>
      </div>

      {outcome ? <OutcomeBanner outcome={outcome} /> : null}

      {/* noValidate: the messages below are ours, not the browser's bubbles. */}
      <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="sign-in-email" className="gap-1">
            {COPY.emailLabel}
            <span aria-hidden="true" className="text-primary">
              *
            </span>
          </Label>
          <Input
            id="sign-in-email"
            name="username"
            type="email"
            autoComplete="email"
            placeholder={COPY.emailPlaceholder}
            required
            ref={emailInput}
            aria-invalid={fieldErrors.email ? true : undefined}
            aria-describedby={
              fieldErrors.email ? 'sign-in-email-error' : undefined
            }
            onChange={() => clearFieldError('email')}
            onBlur={(event) => reportOnBlur('email', event.target.value)}
          />
          {fieldErrors.email ? (
            <p id="sign-in-email-error" className="text-destructive text-sm">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="sign-in-password" className="gap-1">
            {COPY.passwordLabel}
            <span aria-hidden="true" className="text-primary">
              *
            </span>
          </Label>
          <Input
            id="sign-in-password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder={COPY.passwordPlaceholder}
            required
            ref={passwordInput}
            aria-invalid={fieldErrors.password ? true : undefined}
            aria-describedby={
              fieldErrors.password ? 'sign-in-password-error' : undefined
            }
            onChange={() => clearFieldError('password')}
            onBlur={(event) => reportOnBlur('password', event.target.value)}
          />
          {fieldErrors.password ? (
            <p id="sign-in-password-error" className="text-destructive text-sm">
              {fieldErrors.password}
            </p>
          ) : null}
        </div>

        {/* One legend for the form — this form is majority-required (brief R9). */}
        <p className="text-muted-foreground text-xs">{COPY.requiredLegend}</p>

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {COPY.submit}
        </Button>
      </form>

      <p className="text-muted-foreground text-xs leading-relaxed">
        {COPY.footerHint}
      </p>
    </div>
  );
}

/**
 * The four outcomes this screen owns. A refusal never names which of the two
 * submitted values was wrong, and a lockout neither confirms nor denies that an
 * account with that address exists (brief R2 / BR1 / R17).
 */
function OutcomeBanner({ outcome }: { outcome: Outcome }) {
  switch (outcome.kind) {
    case 'success':
      return (
        <StatusBanner tone="success" lead={COPY.successLead}>
          {COPY.successFollowUp}
        </StatusBanner>
      );
    case 'incomplete':
      return (
        <StatusBanner tone="error" lead={COPY.incompleteLead}>
          {COPY.errorFollowUp}
        </StatusBanner>
      );
    case 'refused':
      return (
        <StatusBanner tone="error" lead={COPY.refusedLead}>
          {COPY.errorFollowUp}
        </StatusBanner>
      );
    case 'locked':
      return (
        <StatusBanner tone="error" lead={COPY.lockedLead}>
          {`Too many attempts were refused. Try again after ${outcome.availableAgainAt}.`}
        </StatusBanner>
      );
    case 'unavailable':
      return (
        <StatusBanner tone="error" lead={COPY.unavailableLead}>
          {COPY.unavailableFollowUp}
        </StatusBanner>
      );
  }
}
