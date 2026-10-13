import type { ReactElement, ReactNode } from 'react';

export type Tone = 'positive' | 'progress' | 'attention' | 'critical' | 'neutral' | 'unknown';
export type VerificationState = 'verified' | 'verification_failed' | 'not_verified' | 'not_evaluated';
export type Freshness = 'live' | 'cached' | 'stale' | 'unknown';
export type Check = string | { label: string; status?: 'passed' | 'failed' };
type Passthrough = { className?: string; attrs?: Record<string, string | number | boolean | null | undefined> };

export interface StatusIndicatorProps extends Passthrough {
  /** A mapped source field, e.g. "compute.health". Resolves tone and default label. */
  field?: string;
  value?: string | number | boolean;
  tone?: Tone;
  label?: string;
  glyph?: string;
  detail?: ReactNode;
}
export interface VerificationBadgeProps extends Passthrough {
  state: VerificationState;
  checks?: Check[];
  at?: string | number | Date;
  evidenceHref?: string;
}
export interface FreshnessLabelProps extends Passthrough {
  freshness: Freshness;
  asOf?: string | number | Date;
  source?: string;
}
export interface UnavailableProps extends Passthrough {
  status?: 'partial' | 'unsupported';
  capability?: string;
  title?: string;
  reason?: ReactNode;
  /** Render the title as a heading (h1–h6) instead of a paragraph. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  children?: ReactNode;
}
export interface LoadingProps extends Passthrough { what?: string; long?: boolean }
export interface EmptyStateProps extends Passthrough {
  variant?: 'empty' | 'no-match';
  title?: string;
  body?: ReactNode;
  action?: ReactNode;
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
}
export interface ErrorPanelProps extends Passthrough {
  title?: string;
  message?: ReactNode;
  code?: string;
  requestId?: string;
  onRetry?: () => void;
  retryLabel?: string;
  actions?: ReactNode;
}
export interface MetadataItem {
  label: ReactNode;
  value?: ReactNode;
  hint?: ReactNode;
  mono?: boolean;
  attrs?: Record<string, string>;
}
export interface MetadataListProps extends Passthrough { items: MetadataItem[] }
export interface ResourceIdentityProps extends Passthrough {
  kind?: string;
  name?: string;
  id?: string;
  length?: number;
  href?: string;
}
export interface PageHeaderProps extends Passthrough {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
}
export interface ButtonProps extends Passthrough {
  label: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  type?: 'button' | 'submit';
  busy?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export declare function StatusIndicator(props: StatusIndicatorProps): ReactElement;
export declare function VerificationBadge(props: VerificationBadgeProps): ReactElement;
export declare function FreshnessLabel(props: FreshnessLabelProps): ReactElement;
export declare function Unavailable(props: UnavailableProps): ReactElement;
export declare function Loading(props: LoadingProps): ReactElement;
export declare function EmptyState(props: EmptyStateProps): ReactElement;
export declare function ErrorPanel(props: ErrorPanelProps): ReactElement;
export declare function MetadataList(props: MetadataListProps): ReactElement;
export declare function ResourceIdentity(props: ResourceIdentityProps): ReactElement;
export declare function PageHeader(props: PageHeaderProps): ReactElement;
export declare function Button(props: ButtonProps): ReactElement;

export declare function resolve(field: string, value: unknown, options?: { label?: string }): {
  field: string; value: string; tone: Tone; label: string; glyph: string; mapped: boolean;
};
export interface NormalizedCheck { label: string; status?: 'passed' | 'failed' }
export declare function verification(state: string, checks?: Check[]): { state: VerificationState; checks: NormalizedCheck[] };
export declare function verificationOf(field: string, value: unknown, checks?: Check[]): { state: VerificationState; checks: NormalizedCheck[] };
export declare function freshnessOf(field: string, value: unknown): Freshness;
export declare function capability(status: unknown): 'available' | 'partial' | 'unsupported';
export declare function humanize(value: unknown): string;
export declare const TONES: readonly Tone[];
export declare const GLYPHS: Readonly<Record<Tone, string>>;
export declare function toReact(value: unknown, key?: string | number): ReactNode;
