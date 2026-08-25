import { Suspense } from 'react';

import { SignInForm } from '@/components/auth/SignInForm';
import { SignInReasonBanner } from '@/components/auth/SignInReasonBanner';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign in — Transaction file importer',
  description:
    'Sign in with the email address and password you already hold. Accounts are created by an administrator.',
};

/**
 * Sign in — the surface every session begins on.
 *
 * A synchronous server component composing the client-side form: the brand panel
 * is static, and only the parts that need the browser (the credential form, the
 * session-end explanation read from the query string) are client components.
 */
export default function SignInPage() {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(280px,1fr)_1.2fr]">
      <BrandPanel />

      <div className="flex items-center justify-center px-6 py-12">
        <div className="flex w-full max-w-[360px] flex-col gap-4">
          <Suspense fallback={null}>
            <SignInReasonBanner />
          </Suspense>
          <SignInForm />
        </div>
      </div>
    </div>
  );
}

/**
 * Left column: who this is and what the application is for. Text-only branding —
 * no logo asset was supplied with the design.
 */
function BrandPanel() {
  return (
    <div className="bg-primary text-primary-foreground flex flex-col justify-between gap-12 px-10 py-12">
      <div className="flex flex-col gap-1">
        <p className="font-heading text-2xl">PIM Capital Group</p>
        <p className="text-primary-foreground/90 text-sm">
          Financial services back-office
        </p>
      </div>

      <h1 className="text-4xl leading-tight">Transaction file importer</h1>

      <p className="text-primary-foreground/90 max-w-[46ch] text-sm leading-relaxed">
        Files are checked before anything is committed. Only transaction data
        that has passed validation and human review reaches the permanent
        record.
      </p>
    </div>
  );
}
