// React 18/19 binding for @stack-ui/core. Renders the same view trees as
// @stack-ui/core/dom, so a component's DOM is identical in React and
// framework-free pages. No build step: plain ES modules over React.createElement.
import { createElement, Fragment, isValidElement } from 'react';
import { COMPONENTS, isTree } from '@stack-ui/core/view';

const RENAMED = { class: 'className', for: 'htmlFor', datetime: 'dateTime', tabindex: 'tabIndex' };
const EVENTS = { click: 'onClick', change: 'onChange', input: 'onInput', submit: 'onSubmit', keydown: 'onKeyDown' };

/// Render a view tree (or string, array, React element) as React nodes.
export function toReact(value, key) {
  if (value === null || value === undefined || value === false || value === true) return null;
  if (typeof value === 'string' || typeof value === 'number') return value;
  if (Array.isArray(value)) {
    return createElement(Fragment, key === undefined ? null : { key }, ...value.map((item, index) => toReact(item, index)));
  }
  if (isValidElement(value)) return key === undefined ? value : createElement(Fragment, { key }, value);
  if (isTree(value)) {
    const props = key === undefined ? {} : { key };
    for (const [name, attr] of Object.entries(value.a)) {
      if (attr === null || attr === undefined || attr === false) continue;
      props[RENAMED[name] || name] = attr;
    }
    for (const [event, handler] of Object.entries(value.on || {})) {
      if (!EVENTS[event]) throw new Error(`toReact: unsupported event ${event}`);
      props[EVENTS[event]] = handler;
    }
    const children = value.c.map((child, index) => toReact(child, index));
    return createElement(value.t, props, ...children);
  }
  throw new TypeError('toReact: unsupported child');
}

const bind = (name) => {
  const component = COMPONENTS[name];
  const Bound = (props) => toReact(component(props || {}));
  Bound.displayName = `Stack${name}`;
  return Bound;
};

export const StatusIndicator = bind('StatusIndicator');
export const VerificationBadge = bind('VerificationBadge');
export const FreshnessLabel = bind('FreshnessLabel');
export const Unavailable = bind('Unavailable');
export const Loading = bind('Loading');
export const EmptyState = bind('EmptyState');
export const ErrorPanel = bind('ErrorPanel');
export const MetadataList = bind('MetadataList');
export const ResourceIdentity = bind('ResourceIdentity');
export const PageHeader = bind('PageHeader');
export const Button = bind('Button');

export { resolve, verification, verificationOf, freshnessOf, capability, humanize, TONES, GLYPHS } from '@stack-ui/core/states';
