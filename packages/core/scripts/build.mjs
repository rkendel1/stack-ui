// Builds classic/stack-ui-core.js: states.js + view.js + dom.js as one
// strict-mode classic script exposing a single frozen global, `StackUI`, for
// pages without a module loader (Compute loads its UI as a classic script).
// Zero dependencies: the sources are written so that removing `import` lines and
// `export ` prefixes yields valid script code.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const ORDER = ['states.js', 'view.js', 'dom.js', 'theme.js'];

/// One classic script from the given sources, exposing a frozen `StackUI`.
function bundle(files, label) {
  const names = [];
  const body = files.map((file) => {
    const source = readFileSync(join(root, 'src', file), 'utf8');
    if (/^export\s*(\*|\{)/m.test(source)) throw new Error(`${file}: re-exports are not supported by the classic build`);
    const code = source
      .split('\n')
      .filter((line) => !/^import\s.+\sfrom\s.+;$/.test(line))
      .map((line) => line.replace(/^export (const|function|class|let) (\w+)/, (_, kind, name) => {
        names.push(name);
        return `${kind} ${name}`;
      }))
      .join('\n');
    if (/^\s*(import|export)\b/m.test(code)) throw new Error(`${file}: unhandled module syntax`);
    return `// ---- ${file}\n${code}`;
  }).join('\n');
  return {
    names,
    source: `/*! @stack-ui/core ${pkg.version} — ${label}. Exposes window.StackUI. */
'use strict';
(function (global) {
'use strict';
${body}
global.StackUI = Object.freeze({ version: ${JSON.stringify(pkg.version)}, ${names.join(', ')} });
})(typeof window !== 'undefined' ? window : globalThis);
`,
  };
}

// The full build, and a stateless one without theme.js for products that keep
// no browser storage at all (they omit the shell's theme control and follow
// the operating system's colour scheme).
const full = bundle(ORDER, 'classic build');
const stateless = bundle(ORDER.filter((file) => file !== 'theme.js'), 'classic build, stateless (no theme preference)');

const out = join(root, 'classic');
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'stack-ui-core.js'), full.source);
writeFileSync(join(out, 'stack-ui-core-stateless.js'), stateless.source);
console.log(`core: classic build exports ${full.names.length} names; stateless build ${stateless.names.length}`);
