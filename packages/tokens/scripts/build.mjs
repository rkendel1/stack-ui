// Generates css/tokens.css (light + dark) and css/tokens-light.css (light only,
// for products drawn light-only) from src/tokens.json.
// Zero dependencies. Run: node packages/tokens/scripts/build.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tokens = JSON.parse(readFileSync(join(root, 'src/tokens.json'), 'utf8'));

const missing = [
  ...Object.keys(tokens.light).filter((k) => !(k in tokens.dark)).map((k) => `dark lacks ${k}`),
  ...Object.keys(tokens.dark).filter((k) => !(k in tokens.light)).map((k) => `light lacks ${k}`),
];
if (missing.length) {
  console.error(`Every themed token needs a value in both themes:\n  ${missing.join('\n  ')}`);
  process.exit(1);
}

const block = (selector, entries, extra = []) =>
  `${selector} {\n${[...extra, ...Object.entries(entries).map(([k, v]) => `--stack-${k}: ${v};`)]
    .map((line) => `  ${line}`).join('\n')}\n}\n`;

const css = [
  '/* @stack-ui/tokens — generated from src/tokens.json; do not edit. */',
  block(':root', { ...tokens.shared, ...tokens.light }, ['color-scheme: light;']),
  '@media (prefers-color-scheme: dark) {',
  block(':root:not([data-stack-theme="light"])', tokens.dark, ['color-scheme: dark;'])
    .split('\n').map((l) => (l ? `  ${l}` : l)).join('\n'),
  '}',
  block(':root[data-stack-theme="light"]', tokens.light, ['color-scheme: light;']),
  block(':root[data-stack-theme="dark"]', tokens.dark, ['color-scheme: dark;']),
  '@media (prefers-reduced-motion: reduce) {',
  '  :root { --stack-motion-duration-fast: 0ms; --stack-motion-duration-base: 0ms; }',
  '}',
  '',
].join('\n');

// Light only: no dark values and no color-scheme, so a light-only product can
// embed it without the shared components turning dark on a dark-mode system.
const lightOnly = [
  '/* @stack-ui/tokens — light theme only; generated from src/tokens.json; do not edit. */',
  block(':root', { ...tokens.shared, ...tokens.light }),
  '@media (prefers-reduced-motion: reduce) {',
  '  :root { --stack-motion-duration-fast: 0ms; --stack-motion-duration-base: 0ms; }',
  '}',
  '',
].join('\n');

const out = join(root, 'css');
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'tokens.css'), css);
writeFileSync(join(out, 'tokens-light.css'), lightOnly);
console.log(`tokens: ${Object.keys(tokens.shared).length} shared, ${Object.keys(tokens.light).length} themed`);
