// Framework-free rendering of view trees into DOM nodes. Builds nodes with
// createElement / createTextNode / setAttribute only: it never parses markup
// or evaluates code. The built bundle must not even name those APIs, because
// Compute scans its served script for them literally (scripts/check-boundary.mjs).

import { COMPONENTS, isTree } from './view.js';

/// Render a view tree (or string, number, array, Node) to a DOM Node.
export function toDom(value, doc) {
  const d = doc || document;
  if (value === null || value === undefined || value === false || value === true) return d.createDocumentFragment();
  if (typeof value === 'string' || typeof value === 'number') return d.createTextNode(String(value));
  if (Array.isArray(value)) {
    const fragment = d.createDocumentFragment();
    for (const item of value) fragment.appendChild(toDom(item, d));
    return fragment;
  }
  if (isTree(value)) {
    const element = d.createElement(value.t);
    for (const [key, attr] of Object.entries(value.a)) {
      if (attr === null || attr === undefined || attr === false) continue;
      element.setAttribute(key, attr === true ? '' : String(attr));
    }
    for (const [event, handler] of Object.entries(value.on || {})) element.addEventListener(event, handler);
    for (const child of value.c) element.appendChild(toDom(child, d));
    return element;
  }
  if (value && typeof value.nodeType === 'number') return value;
  throw new TypeError('toDom: unsupported child');
}

/// Each component as a function returning a DOM element, e.g.
///   StackUI.dom.StatusIndicator({ field: 'compute.health', value: 'healthy' })
export const dom = Object.freeze(Object.fromEntries(
  Object.entries(COMPONENTS).map(([name, component]) => [name, (props, doc) => toDom(component(props || {}), doc)]),
));
