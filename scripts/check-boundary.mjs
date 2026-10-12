#!/usr/bin/env node
// Enforces docs/product-shell.md §5 and acceptance criteria 2 and 6 on package
// sources and builds: no network, no product imports, no storage, no markup
// parsing or code evaluation, and no runtime dependencies beyond sibling
// @stack-ui packages (react is a peer). Zero dependencies.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packagesDir = join(root, 'packages');

const FORBIDDEN = [
  [/\bfetch\s*\(/, 'network call (fetch)'],
  [/\bXMLHttpRequest\b/, 'network call (XMLHttpRequest)'],
  [/\bWebSocket\b/, 'network call (WebSocket)'],
  [/\bEventSource\b/, 'network call (EventSource)'],
  [/\bnavigator\.sendBeacon\b/, 'network call (sendBeacon)'],
  [/\b(localStorage|sessionStorage|indexedDB)\b/, 'persistent storage'],
  [/\bdocument\.cookie\b/, 'cookie access'],
  [/\.innerHTML\b|\.outerHTML\s*=|insertAdjacentHTML|dangerouslySetInnerHTML/, 'markup parsing'],
  [/\beval\s*\(|new Function\s*\(|document\.write/, 'code evaluation'],
  [/from\s+['"]@(feltdb|appport|authboundry|compute)\//, 'product package import'],
  [/import\(\s*['"]@(feltdb|appport|authboundry|compute)\//, 'product package import'],
];

const walk = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  if (name === 'node_modules') return [];
  return statSync(path).isDirectory() ? walk(path) : [path];
});

const failures = [];
let scanned = 0;
for (const pkg of readdirSync(packagesDir)) {
  const pkgDir = join(packagesDir, pkg);
  const manifest = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
  for (const dep of Object.keys(manifest.dependencies || {})) {
    if (!dep.startsWith('@stack-ui/')) failures.push(`${pkg}/package.json: runtime dependency ${dep}`);
  }
  for (const peer of Object.keys(manifest.peerDependencies || {})) {
    if (peer !== 'react' && !peer.startsWith('@stack-ui/')) failures.push(`${pkg}/package.json: unexpected peer ${peer}`);
  }
  for (const sub of ['src', 'css', 'classic']) {
    const dir = join(pkgDir, sub);
    if (!existsSync(dir)) continue;
    for (const file of walk(dir).filter((f) => /\.(m?js|ts|css)$/.test(f))) {
      scanned += 1;
      const source = readFileSync(file, 'utf8');
      // Comments may name forbidden APIs to explain the rule; code may not use them.
      const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
      for (const [pattern, why] of FORBIDDEN) {
        if (pattern.test(code)) failures.push(`${relative(root, file)}: ${why}`);
      }
    }
  }
}

// The classic bundle is served inside products that scan their scripts for
// these names literally, comments included (Compute:
// crates/compute-environment/tests/service_ui.rs), so the bundle may not
// mention them at all.
const LITERAL = ['innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write', 'eval(', 'new Function', 'srcdoc', 'createContextualFragment'];
const bundlePath = join(packagesDir, 'core', 'classic', 'stack-ui-core.js');
if (existsSync(bundlePath)) {
  const bundle = readFileSync(bundlePath, 'utf8');
  for (const word of LITERAL) if (bundle.includes(word)) failures.push(`packages/core/classic/stack-ui-core.js: names ${word} (literal scan)`);
} else {
  failures.push('packages/core/classic/stack-ui-core.js: missing; run pnpm build first');
}

for (const failure of failures) console.error(failure);
console.log(`boundary: ${scanned} files scanned, ${failures.length} violations`);
process.exit(failures.length ? 1 : 0);
