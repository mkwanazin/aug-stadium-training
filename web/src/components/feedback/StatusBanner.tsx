import { CircleCheck, CircleX, Info, TriangleAlert } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

import type { ReactNode } from 'react';

/**
 * The application's outcome banner: a bold lead sentence naming what happened,
 * followed by what the person may do next, with a 4px left border and a circled
 * icon in the matching status colour (design digest §Sign in → Validation).
 *
 * The tone decides the live-region role, and that split is load-bearing for
 * screen-reader users: failures interrupt (`alert`, assertive), confirmations do
 * not (`status`, polite).
 */
export type StatusBannerTone = 'success' | 'error' | 'warning' | 'info';

const TONES = {
  success: {
    role: 'status',
    icon: CircleCheck,
    accent: 'border-l-success',
    lead: 'text-success',
  },
  error: {
    role: 'alert',
    icon: CircleX,
    accent: 'border-l-destructive',
    lead: 'text-destructive',
  },
  warning: {
    role: 'alert',
    icon: TriangleAlert,
    accent: 'border-l-warning',
    lead: 'text-warning',
  },
  info: {
    role: 'status',
    icon: Info,
    accent: 'border-l-info',
    lead: 'text-info',
  },
} as const;

interface StatusBannerProps {
  tone: StatusBannerTone;
  /** The bold opening sentence — what happened. */
  lead: string;
  /** What the person may do next. */
  children: ReactNode;
  className?: string;
}

export function StatusBanner({
  tone,
  lead,
  children,
  className,
}: StatusBannerProps) {
  const { role, icon: Icon, accent, lead: leadTone } = TONES[tone];

  return (
    <Alert
      role={role}
      className={cn('bg-background border-l-4', accent, className)}
    >
      <Icon aria-hidden="true" className={leadTone} />
      <AlertDescription className="text-foreground">
        <p>
          <strong className={cn('font-semibold', leadTone)}>{lead}</strong>{' '}
          <span>{children}</span>
        </p>
      </AlertDescription>
    </Alert>
  );
}
