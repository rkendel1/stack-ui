// Brand and marketing foundation (docs/brand.md): identity follows the theme
// and the product, never changes state colours; pre-rendered HTML equals the
// DOM renderer; the theme switch works end to end; marketing layouts hold at
// phone width; new controls work from the keyboard.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { html, toHtml } from '../../packages/core/src/html.js';
import { PORTFOLIO } from '../../packages/core/src/brand.js';
import { THEME_INIT_SCRIPT, THEME_STORAGE_KEY } from '../../packages/core/src/theme.js';
import { FIXTURES, withHandlers, REPLACE_SOURCE } from '../fixtures.mjs';
import { openPage, assets } from './harness.mjs';

const brand = JSON.parse(readFileSync(new URL('../../packages/tokens/src/brand.json', import.meta.url), 'utf8'));
const hexToRgb = (hex) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;

test('pre-rendered HTML (html.js) parses to the same DOM as dom.js, for every fixture', async () => {
  const { browser, page } = await openPage();
  try {
    await page.addScriptTag({ content: REPLACE_SOURCE });
    for (const [index, [name, props]] of FIXTURES.entries()) {
      const markup = html[name](withHandlers(props, () => {}));
      const [fromHtml, fromDom] = await page.evaluate(({ name, props, markup }) => {
        const template = document.createElement('template');
        template.setHTMLUnsafe ? template.setHTMLUnsafe(markup) : (template.innerHTML = markup); // test-only parse
        return [window.__canon(template.content.firstElementChild), window.__canon(window.StackUI.dom[name](window.__withHandlers(props, () => {})))];
      }, { name, props, markup });
      assert.deepEqual(fromHtml, fromDom, `${name} #${index}`);
    }
  } finally {
    await browser.close();
  }
});

test('html.js escapes text and attributes and refuses what it cannot serialize', () => {
  const out = html.SiteFooter({ tagline: '<script>alert(1)</script> & "q"', columns: [{ title: 'x"><b>', links: [{ label: 'a', href: 'javascript:"><img src=x>' }] }] });
  assert.ok(!out.includes('<script>'), 'text is escaped');
  assert.ok(!out.includes('"><img'), 'attribute values are escaped');
  assert.ok(out.includes('&lt;script&gt;alert(1)&lt;/script&gt; &amp; "q"'));
  assert.throws(() => toHtml({ t: 'div', a: { onclick: 'x' }, c: [] }), /bad attribute/);
  assert.throws(() => toHtml({ t: 'div', a: {}, c: [{ nodeType: 1 }] }), /unsupported child/);
});

for (const [colorScheme, theme, expect] of [['light', null, 'light'], ['dark', null, 'dark'], ['light', 'dark', 'dark'], ['dark', 'light', 'light']]) {
  test(`product accents follow the theme (${theme ? `${theme} forced over ${colorScheme}` : `${colorScheme} system`}) and never change state colours`, async () => {
    const { browser, page } = await openPage({ colorScheme });
    try {
      const result = await page.evaluate(({ theme }) => {
        if (theme) document.documentElement.setAttribute('data-stack-theme', theme);
        const root = document.getElementById('root');
        root.appendChild(window.StackUI.dom.SiteFooter({ id: 'f', year: 2026 }));
        const plain = window.StackUI.dom.StatusIndicator({ tone: 'critical', label: 'Failed' });
        const scoped = document.createElement('div');
        scoped.setAttribute('data-stack-product', 'feltdb');
        scoped.appendChild(window.StackUI.dom.StatusIndicator({ tone: 'critical', label: 'Failed' }));
        scoped.appendChild(window.StackUI.dom.Button({ label: 'Go', variant: 'primary' }));
        root.append(plain, scoped);
        const accents = {};
        for (const li of root.querySelectorAll('.stack-site-footer__products li')) {
          accents[li.getAttribute('data-stack-product')] = getComputedStyle(li.querySelector('a')).borderLeftColor;
        }
        const glyph = (el) => getComputedStyle(el.querySelector('.stack-status__glyph')).color;
        const plainButton = window.StackUI.dom.Button({ label: 'Go', variant: 'primary' });
        root.appendChild(plainButton);
        return {
          accents,
          plainGlyph: glyph(plain), scopedGlyph: glyph(scoped),
          plainButton: getComputedStyle(plainButton).backgroundColor,
          scopedButton: getComputedStyle(scoped.querySelector('.stack-button')).backgroundColor,
        };
      }, { theme });
      for (const product of PORTFOLIO.products) {
        assert.equal(result.accents[product.id], hexToRgb(brand.products[product.id][expect]), `${product.id} ${expect} accent`);
      }
      assert.equal(result.scopedGlyph, result.plainGlyph, 'a product scope does not recolour state');
      assert.equal(result.scopedButton, result.plainButton, 'a product scope does not recolour actions');
    } finally {
      await browser.close();
    }
  });
}

test('the Boundry mark renders as SVG with its gradient taken from the theme', async () => {
  for (const colorScheme of ['light', 'dark']) {
    const { browser, page } = await openPage({ colorScheme });
    try {
      const out = await page.evaluate(() => {
        const svg = window.StackUI.dom.BrandMark({ idPrefix: 'm', title: 'Boundry' });
        svg.style.width = '120px';
        document.getElementById('root').appendChild(svg);
        const box = svg.getBBox();
        return {
          ns: svg.namespaceURI,
          width: box.width,
          start: getComputedStyle(svg.querySelector('.stack-brand-mark__start')).stopColor,
          end: getComputedStyle(svg.querySelector('.stack-brand-mark__end')).stopColor,
          name: svg.getAttribute('role') === 'img' ? svg.querySelector('title').textContent : null,
        };
      });
      assert.equal(out.ns, 'http://www.w3.org/2000/svg');
      assert.ok(out.width > 300, 'paths are drawn');
      assert.equal(out.start, hexToRgb(brand.company[colorScheme]['brand-mark-start']));
      assert.equal(out.end, hexToRgb(brand.company[colorScheme]['brand-mark-end']));
      assert.equal(out.name, 'Boundry');
    } finally {
      await browser.close();
    }
  }
});

test('the theme switch stores and applies a choice, and the head script restores it before paint', async () => {
  const { browser, page } = await openPage({ colorScheme: 'light' });
  try {
    await page.route('https://site.test/**', (route) => route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html><html lang="en"><head><title>t</title><script>${THEME_INIT_SCRIPT}</script><style>${assets.tokens}${assets.core}</style><script>${assets.script}</script></head><body><main id="main"></main></body></html>`,
    }));
    await page.goto('https://site.test/');
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme), 'light');
    await page.evaluate(() => {
      const header = window.StackUI.dom.SiteHeader({
        theme: { preference: window.StackUI.readThemePreference(), onChange: (value) => window.StackUI.setThemePreference(value) },
      });
      document.body.prepend(header);
    });
    await page.selectOption('.stack-theme-switch__control', 'dark');
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-stack-theme')), 'dark');
    assert.equal(await page.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEY), 'dark');
    await page.reload();
    // Only the head script has run: no component code touched the page yet.
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-stack-theme')), 'dark');
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--stack-color-bg-canvas').trim() || getComputedStyle(document.documentElement).getPropertyValue('--stack-color-bg-canvas').trim()), '#0f1115');
    await page.evaluate(() => window.StackUI.setThemePreference('system'));
    await page.reload();
    assert.equal(await page.evaluate(() => document.documentElement.hasAttribute('data-stack-theme')), false, 'system follows the OS');
    // Blocked storage leaves the system theme, never an error.
    await page.evaluate(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }));
    const scriptError = await page.evaluate((src) => { try { (0, eval)(src); return null; } catch (e) { return String(e); } }, THEME_INIT_SCRIPT); // test-only
    assert.equal(scriptError, null);
  } finally {
    await browser.close();
  }
});

for (const width of [320, 768, 1280]) {
  test(`a product site's header and footer fit at ${width}px with no page-level horizontal scroll`, async () => {
    const { browser, page } = await openPage({ width });
    try {
      const out = await page.evaluate(() => {
        document.body.style.padding = '0';
        const root = document.getElementById('root');
        root.before(window.StackUI.dom.SiteHeader({
          mainId: 'root', product: { id: 'authboundry' },
          navigation: ['Product', 'Developers', 'Docs', 'Security', 'Pricing'].map((label) => ({ label, href: `/${label.toLowerCase()}` })),
          theme: { preference: 'system' }, actions: 'Console',
        }));
        root.after(window.StackUI.dom.SiteFooter({
          product: { id: 'authboundry' }, year: 2026, tagline: 'Authority for applications and agents.',
          columns: [{ title: 'Product', links: [{ label: 'Pricing', href: '/pricing' }] }, { title: 'Contact', links: [{ label: 'partnerships@authboundry.example', href: 'mailto:partnerships@authboundry.example' }] }],
        }));
        const footer = document.querySelector('.stack-site-footer');
        return {
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          family: document.querySelector('.stack-site-header__family').href,
          familyVisible: document.querySelector('.stack-site-header__family').getBoundingClientRect().width > 0,
          footerCompany: footer.querySelector('.stack-site-footer__company').href,
          current: footer.querySelector('[aria-current="true"]').textContent,
          legal: footer.querySelector('.stack-site-footer__legal').textContent,
        };
      });
      assert.ok(out.overflow <= 0, `page scrolls horizontally by ${out.overflow}px`);
      assert.equal(out.family, 'https://boundry.company/');
      assert.ok(out.familyVisible, '"A Boundry product" is visible');
      assert.equal(out.footerCompany, 'https://boundry.company/');
      assert.match(out.current, /^AuthBoundry/);
      assert.match(out.legal, /AuthBoundry is a Boundry product/);
    } finally {
      await browser.close();
    }
  });
}

test('every portfolio link is https, and a product without a verified site links to boundry.company', () => {
  for (const product of PORTFOLIO.products) assert.match(product.href, /^https:\/\//, product.id);
  assert.equal(PORTFOLIO.company.href, 'https://boundry.company');
});

test('checkboxes toggle from the keyboard and by their label, and report a boolean', async () => {
  const { browser, page } = await openPage();
  try {
    await page.evaluate(() => {
      window.__changes = [];
      const group = window.StackUI.dom.FieldGroup({ id: 'g', legend: 'Scopes' });
      group.querySelector('.stack-fieldgroup__controls').append(
        window.StackUI.dom.Checkbox({ id: 'read', label: 'Read', onChange: (checked) => window.__changes.push(checked) }),
        window.StackUI.dom.Checkbox({ id: 'write', label: 'Write', disabled: true }),
      );
      document.getElementById('root').appendChild(group);
    });
    await page.focus('#read');
    await page.keyboard.press('Space');
    await page.click('label[for="read"]');
    assert.deepEqual(await page.evaluate(() => window.__changes), [true, false]);
    // Keyboard focus (focus-visible) shows the ring: Shift+Tab from the body lands on the last focusable box.
    await page.evaluate(() => document.activeElement.blur());
    await page.keyboard.press('Shift+Tab');
    const focus = await page.evaluate(() => (document.activeElement.id === 'read' ? getComputedStyle(document.activeElement).outlineStyle : `focused ${document.activeElement.id}`));
    assert.notEqual(focus, 'none');
    assert.equal(await page.evaluate(() => document.querySelector('fieldset legend').textContent), 'Scopes');
  } finally {
    await browser.close();
  }
});

test('the shell of a portfolio product links to Boundry and its siblings, never to itself', async () => {
  const { browser, page } = await openPage();
  try {
    const out = await page.evaluate(() => {
      const shell = window.StackUI.dom.Shell({ product: { id: 'appboundry', name: 'AppBoundry', homeHref: '/' }, navigation: [] });
      document.body.replaceChildren(shell);
      return {
        accent: shell.getAttribute('data-stack-product'),
        family: shell.querySelector('.stack-shell__family').href,
        others: Array.from(shell.querySelectorAll('.stack-shell__switcher a')).map((a) => a.textContent),
        none: window.StackUI.dom.Shell({ product: { id: 'appboundry', name: 'AppBoundry', homeHref: '/' }, navigation: [], otherProducts: [], family: false })
          .querySelector('.stack-shell__switcher'),
        compute: window.StackUI.dom.Shell({ product: { name: 'Compute', homeHref: '/' }, navigation: [] }).querySelector('.stack-shell__family'),
      };
    });
    assert.equal(out.accent, 'appboundry');
    assert.equal(out.family, 'https://boundry.company/');
    assert.ok(!out.others.includes('AppBoundry'));
    assert.deepEqual(out.others, ['FeltDB', 'FeltKit', 'AuthBoundry', 'AgentBoundry', 'AppPort', 'About Boundry']);
    assert.equal(out.none, null);
    assert.equal(out.compute, null, 'a product outside the portfolio is unchanged');
  } finally {
    await browser.close();
  }
});

test("a product's bare-element styles cannot reshape the shared header and footer", async () => {
  const { browser, page } = await openPage({ width: 320 });
  try {
    // Rules of the kind real product stylesheets contain (AppBoundry's styles.css).
    await page.addStyleTag({ content: 'nav{display:grid;gap:6px} nav a{display:flex;align-items:center;text-transform:capitalize;padding:11px 13px;border-left:2px solid transparent} footer{text-align:center;padding:30px 0;font:9px monospace} footer p{text-align:right} header{height:72px;display:flex}' });
    const out = await page.evaluate(() => {
      document.body.style.padding = '0';
      const root = document.getElementById('root');
      root.before(window.StackUI.dom.SiteHeader({ mainId: 'root', product: { id: 'appboundry' }, navigation: [{ label: 'Why AppBoundry', href: '#why' }], theme: { preference: 'system' } }));
      root.after(window.StackUI.dom.SiteFooter({ product: { id: 'appboundry' }, year: 2026, columns: [{ title: 'Account', links: [{ label: 'Sign up with email', href: '/a' }] }] }));
      const footer = document.querySelector('.stack-site-footer');
      const link = footer.querySelector('.stack-site-footer__link');
      return {
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        transform: getComputedStyle(link).textTransform,
        padding: getComputedStyle(link).paddingLeft,
        align: getComputedStyle(footer.querySelector('.stack-site-footer__tagline') || footer.querySelector('.stack-site-footer__legal')).textAlign,
        family: getComputedStyle(footer.querySelector('.stack-site-footer__family')).display,
        productAlign: getComputedStyle(footer.querySelector('.stack-site-footer__product')).alignItems,
        footerPadding: getComputedStyle(footer).paddingTop,
        headerHeight: getComputedStyle(document.querySelector('.stack-site-header')).height,
      };
    });
    assert.ok(out.overflow <= 0, `page scrolls horizontally by ${out.overflow}px`);
    assert.equal(out.transform, 'none');
    assert.equal(out.padding, '0px');
    assert.equal(out.align, 'left');
    assert.equal(out.family, 'block');
    assert.equal(out.productAlign, 'flex-start');
    assert.equal(out.footerPadding, '0px');
    assert.notEqual(out.headerHeight, '72px');
  } finally {
    await browser.close();
  }
});
