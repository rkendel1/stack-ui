// Component structure (docs/design-system-contract.md §4–5) as plain trees:
//   { t: tag, a: attributes, c: children, on: { event: handler } }
// Children are trees, strings, numbers, null/false (skipped), arrays, or opaque
// slot content (a DOM Node or a React element) passed through untouched.
// dom.js and the React binding both render these trees, so the DOM a component
// produces is the same in every product.

import { GLYPHS, humanize, resolve, verification } from './states.js';

const node = (t, a, c, on) => ({ t, a: a || {}, c: c === undefined ? [] : [].concat(c), ...(on ? { on } : {}) });
export const isTree = (value) => Boolean(value && typeof value === 'object' && typeof value.t === 'string' && value.a && Array.isArray(value.c));

const cx = (...names) => names.filter(Boolean).join(' ');
const present = (value) => value !== null && value !== undefined && value !== '';

/// Extra attributes a product passes through (data-*, aria-*, id, title).
const passthrough = (attrs) => {
  const out = {};
  for (const [key, value] of Object.entries(attrs || {})) {
    if (/^(data-|aria-)/.test(key) || key === 'id' || key === 'title') out[key] = value;
  }
  return out;
};

/// Deterministic timestamp text, identical in every renderer and timezone.
export function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.toISOString().slice(0, 19).replace('T', ' ')} UTC`;
}
/// A <time> element, or the raw text when the value is not a valid time: a
/// malformed timestamp from a product must never break the page around it.
const timeNode = (value, cls) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? node('span', { class: cls }, String(value))
    : node('time', { class: cls, datetime: date.toISOString() }, formatTime(value));
};

export function StatusIndicator(props) {
  const { field, value, detail, className, attrs } = props;
  const resolved = field ? resolve(field, value, { label: props.label }) : null;
  const tone = resolved ? resolved.tone : (props.tone || 'unknown');
  const label = resolved ? resolved.label : (present(props.label) ? props.label : humanize(tone));
  const glyph = props.glyph || GLYPHS[tone] || GLYPHS.unknown;
  return node('span', {
    class: cx('stack-status', `stack-status--${tone}`, className),
    'data-tone': tone,
    ...(resolved ? { 'data-field': resolved.field, 'data-value': resolved.value } : {}),
    ...passthrough(attrs),
  }, [
    node('span', { class: 'stack-status__glyph', 'aria-hidden': 'true' }, glyph),
    node('span', { class: 'stack-status__label' }, label),
    present(detail) ? node('span', { class: 'stack-status__detail' }, detail) : null,
  ]);
}

const VERIFICATION_GLYPHS = { verified: '✓', verification_failed: '✕', not_verified: '!', not_evaluated: '–' };

export function VerificationBadge(props) {
  const { state, checks } = verification(props.state, props.checks);
  const failed = checks.filter((check) => check.status === 'failed');
  let label;
  if (state === 'verified') label = checks.length === 1 ? `Verified · ${checks[0].label}` : `Verified · ${checks.length} checks`;
  else if (state === 'verification_failed') {
    const named = failed.length ? failed : checks;
    label = named.length === 1 ? `Verification failed · ${named[0].label}`
      : named.length ? `Verification failed · ${named.length} checks` : 'Verification failed';
  } else label = state === 'not_verified' ? 'Not verified' : 'Not evaluated';
  return node('div', {
    class: cx('stack-verification', `stack-verification--${state}`, props.className),
    'data-verification': state,
    ...passthrough(props.attrs),
  }, [
    node('span', { class: 'stack-verification__glyph', 'aria-hidden': 'true' }, VERIFICATION_GLYPHS[state]),
    node('span', { class: 'stack-verification__label' }, label),
    present(props.at) ? [' · ', timeNode(props.at, 'stack-verification__at')] : null,
    present(props.evidenceHref) ? node('a', { class: 'stack-verification__evidence', href: props.evidenceHref }, 'Evidence') : null,
    checks.length > 1 ? node('ul', { class: 'stack-verification__checks' }, checks.map((check) => node('li', {
      class: 'stack-verification__check',
      ...(check.status ? { 'data-check-status': check.status } : {}),
    }, check.status ? `${check.label} — ${check.status}` : check.label))) : null,
  ]);
}

const FRESHNESS_LABELS = { live: 'Live', cached: 'Cached', stale: 'Stale', unknown: 'Freshness unknown' };
const FRESHNESS_GLYPHS = { live: '●', cached: '◷', stale: '▲', unknown: '?' };

export function FreshnessLabel(props) {
  const freshness = FRESHNESS_LABELS[props.freshness] ? props.freshness : 'unknown';
  const showAsOf = present(props.asOf) && freshness !== 'live';
  return node('span', {
    class: cx('stack-freshness', `stack-freshness--${freshness}`, props.className),
    'data-freshness': freshness,
    ...passthrough(props.attrs),
  }, [
    node('span', { class: 'stack-freshness__glyph', 'aria-hidden': 'true' }, FRESHNESS_GLYPHS[freshness]),
    node('span', { class: 'stack-freshness__label' }, [
      FRESHNESS_LABELS[freshness],
      showAsOf ? [' · as of ', timeNode(props.asOf, 'stack-freshness__as-of')] : null,
      present(props.source) ? ` · ${props.source}` : null,
    ]),
  ]);
}

export function Unavailable(props) {
  const status = props.status === 'partial' ? 'partial' : 'unsupported';
  const title = present(props.title) ? props.title : (status === 'partial' ? 'Partly available' : 'Not available');
  return node('div', {
    class: cx('stack-unavailable', `stack-unavailable--${status}`, props.className),
    role: 'note',
    'data-capability-status': status,
    ...(present(props.capability) ? { 'data-capability': props.capability } : {}),
    ...passthrough(props.attrs),
  }, [
    node(props.headingLevel ? heading(props.headingLevel) : 'p', { class: 'stack-unavailable__title' }, title),
    present(props.reason) ? node('p', { class: 'stack-unavailable__reason' }, props.reason) : null,
    props.children || null,
  ]);
}

export function Loading(props) {
  const what = present(props.what) ? props.what : '';
  const text = props.long ? `Still loading${what ? ` ${what}` : ''}…` : `Loading${what ? ` ${what}` : ''}…`;
  return node('div', {
    class: cx('stack-loading', props.long ? 'stack-loading--long' : null, props.className),
    role: 'status',
    'aria-live': 'polite',
    ...passthrough(props.attrs),
  }, [
    node('span', { class: 'stack-loading__indicator', 'aria-hidden': 'true' }),
    node('span', { class: 'stack-loading__label' }, text),
  ]);
}

const heading = (level) => `h${Math.min(6, Math.max(1, Number(level) || 2))}`;

export function EmptyState(props) {
  const variant = props.variant === 'no-match' ? 'no-match' : 'empty';
  const title = present(props.title) ? props.title : (variant === 'no-match' ? 'Nothing matches' : 'Nothing here yet');
  return node('div', {
    class: cx('stack-empty', `stack-empty--${variant}`, props.className),
    ...passthrough(props.attrs),
  }, [
    node(heading(props.headingLevel), { class: 'stack-empty__title' }, title),
    present(props.body) ? node('p', { class: 'stack-empty__body' }, props.body) : null,
    props.action ? node('div', { class: 'stack-empty__action' }, props.action) : null,
  ]);
}

export function ErrorPanel(props) {
  const meta = [
    present(props.code) ? ['Code ', node('code', {}, props.code)] : null,
    present(props.requestId) ? [present(props.code) ? ' · ' : '', 'Request ', node('code', {}, props.requestId)] : null,
  ].filter(Boolean);
  return node('div', {
    class: cx('stack-error', props.className),
    role: 'alert',
    ...passthrough(props.attrs),
  }, [
    node('p', { class: 'stack-error__title' }, present(props.title) ? props.title : 'Something went wrong'),
    present(props.message) ? node('p', { class: 'stack-error__message' }, props.message) : null,
    meta.length ? node('p', { class: 'stack-error__meta' }, meta) : null,
    props.onRetry || props.actions ? node('div', { class: 'stack-error__actions' }, [
      props.onRetry ? Button({ label: props.retryLabel || 'Retry', onClick: props.onRetry }) : null,
      props.actions || null,
    ]) : null,
  ]);
}

export function MetadataList(props) {
  return node('dl', { class: cx('stack-meta', props.className), ...passthrough(props.attrs) },
    (props.items || []).map((item) => {
      const missing = !present(item.value) && item.value !== 0 && item.value !== false;
      return node('div', { class: 'stack-meta__item', ...passthrough(item.attrs) }, [
        node('dt', { class: 'stack-meta__label' }, item.label),
        node('dd', {
          class: cx('stack-meta__value', item.mono ? 'stack-meta__value--mono' : null),
          ...(missing ? { 'data-missing': 'true' } : {}),
        }, missing ? '—' : (typeof item.value === 'boolean' ? String(item.value) : item.value)),
        present(item.hint) ? node('dd', { class: 'stack-meta__hint' }, item.hint) : null,
      ]);
    }));
}

export function ResourceIdentity(props) {
  const length = Number(props.length) || 12;
  const id = present(props.id) ? String(props.id) : null;
  const truncated = id && id.length > length ? `${id.slice(0, length)}…` : id;
  const name = present(props.name)
    ? node(props.href ? 'a' : 'span', { class: 'stack-identity__name', ...(props.href ? { href: props.href } : {}) }, props.name)
    : null;
  return node('span', { class: cx('stack-identity', props.className), ...passthrough(props.attrs) }, [
    present(props.kind) ? node('span', { class: 'stack-identity__kind' }, props.kind) : null,
    name,
    id ? node('code', { class: 'stack-identity__id', title: id }, truncated === id ? id : [
      node('span', { 'aria-hidden': 'true' }, truncated),
      node('span', { class: 'stack-visually-hidden' }, id),
    ]) : null,
  ]);
}

export function PageHeader(props) {
  return node('header', { class: cx('stack-page-header', props.className), ...passthrough(props.attrs) }, [
    present(props.eyebrow) ? node('p', { class: 'stack-page-header__eyebrow' }, props.eyebrow) : null,
    node('div', { class: 'stack-page-header__title-row' }, [
      node(heading(props.headingLevel || 1), { class: 'stack-page-header__title' }, props.title),
      props.status ? node('span', { class: 'stack-page-header__status' }, props.status) : null,
      props.actions ? node('div', { class: 'stack-page-header__actions' }, props.actions) : null,
    ]),
    present(props.description) ? node('p', { class: 'stack-page-header__description' }, props.description) : null,
    props.meta ? node('div', { class: 'stack-page-header__meta' }, props.meta) : null,
  ]);
}

const VARIANTS = ['primary', 'secondary', 'danger', 'ghost'];
const SIZES = ['sm', 'md', 'lg'];

export function Button(props) {
  const variant = VARIANTS.includes(props.variant) ? props.variant : 'secondary';
  const size = SIZES.includes(props.size) ? props.size : 'md';
  const inert = Boolean(props.disabled || props.busy);
  return node('button', {
    class: cx('stack-button', `stack-button--${variant}`, `stack-button--${size}`, props.className),
    type: props.type === 'submit' ? 'submit' : 'button',
    ...(inert ? { disabled: true } : {}),
    ...(props.busy ? { 'aria-busy': 'true' } : {}),
    ...passthrough(props.attrs),
  }, [
    props.busy ? node('span', { class: 'stack-button__busy', 'aria-hidden': 'true' }) : null,
    node('span', { class: 'stack-button__label' }, props.label),
  ], props.onClick && !inert ? { click: props.onClick } : undefined);
}

export const COMPONENTS = Object.freeze({
  StatusIndicator, VerificationBadge, FreshnessLabel, Unavailable, Loading, EmptyState,
  ErrorPanel, MetadataList, ResourceIdentity, PageHeader, Button,
});
