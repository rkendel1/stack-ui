// Generates css/tokens.css (light + dark) and css/tokens-light.css (light only,
// for products drawn light-only) from src/tokens.json.
// Zero dependencies. Run: node packages/tokens/scripts/build.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tokens = JSON.parse(readFileSync(join(root, 'src/tokens.json'), 'utf8'));
const brand = JSON.parse(readFileSync(join(root, 'src/brand.json'), 'utf8'));
const productIds = Object.keys(brand.products).filter((id) => !id.startsWith('$'));
for (const id of productIds) {
  if (!/^[a-z][a-z0-9-]*$/.test(id)) throw new Error(`brand.json: bad product id ${id}`);
  for (const theme of ['light', 'dark']) {
    if (!/^#[0-9a-f]{6}$/i.test(brand.products[id][theme] || '')) throw new Error(`brand.json: ${id} needs a ${theme} hex accent`);
  }
}
for (const theme of ['light', 'dark']) {
  const keys = Object.keys(brand.company[theme]).sort().join();
  if (keys !== Object.keys(brand.company.light).sort().join()) throw new Error('brand.json: company tokens differ between themes');
}

// Company identity, plus the product accent: the company accent by default,
// a product's own accent inside [data-stack-product="<id>"] (on <html> or any
// element). It colours identity only — marks, rules, eyebrows — never state.
const brandThemed = (theme) => ({
  ...brand.company[theme],
  'product-accent': brand.company[theme]['brand-accent'],
  'product-accent-fg': brand.onAccent[theme],
});
const productBlocks = (theme, scope) => productIds.map((id) => {
  const selectors = scope
    ? `${scope} [data-stack-product="${id}"], ${scope}[data-stack-product="${id}"]`
    : `[data-stack-product="${id}"]`;
  return `${selectors} { --stack-product-accent: ${brand.products[id][theme]}; --stack-product-accent-fg: ${brand.onAccent[theme]}; }`;
}).join('\n') + '\n';

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
  block(':root', { ...tokens.shared, ...tokens.light, ...brandThemed('light') }, ['color-scheme: light;']),
  productBlocks('light'),
  '@media (prefers-color-scheme: dark) {',
  (block(':root:not([data-stack-theme="light"])', { ...tokens.dark, ...brandThemed('dark') }, ['color-scheme: dark;'])
    + productBlocks('dark', ':root:not([data-stack-theme="light"])'))
    .split('\n').map((l) => (l ? `  ${l}` : l)).join('\n'),
  '}',
  block(':root[data-stack-theme="light"]', { ...tokens.light, ...brandThemed('light') }, ['color-scheme: light;']),
  productBlocks('light', ':root[data-stack-theme="light"]'),
  block(':root[data-stack-theme="dark"]', { ...tokens.dark, ...brandThemed('dark') }, ['color-scheme: dark;']),
  productBlocks('dark', ':root[data-stack-theme="dark"]'),
  '@media (prefers-reduced-motion: reduce) {',
  '  :root { --stack-motion-duration-fast: 0ms; --stack-motion-duration-base: 0ms; }',
  '}',
  '',
].join('\n');

// Light only: no dark values and no color-scheme, so a light-only product can
// embed it without the shared components turning dark on a dark-mode system.
const lightOnly = [
  '/* @stack-ui/tokens — light theme only; generated from src/tokens.json; do not edit. */',
  block(':root', { ...tokens.shared, ...tokens.light, ...brandThemed('light') }),
  productBlocks('light'),
  '@media (prefers-reduced-motion: reduce) {',
  '  :root { --stack-motion-duration-fast: 0ms; --stack-motion-duration-base: 0ms; }',
  '}',
  '',
].join('\n');

const out = join(root, 'css');
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'tokens.css'), css);
writeFileSync(join(out, 'tokens-light.css'), lightOnly);
console.log(`tokens: ${Object.keys(tokens.shared).length} shared, ${Object.keys(tokens.light).length} themed, ${productIds.length} product accents`);
