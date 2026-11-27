#!/usr/bin/env node
// Smoke test: loads the built site at desktop and phone sizes and fails on the things that have broken before.
// Run: node tests/smoke.cjs      (needs Playwright with Chromium; no other dependencies)
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.webp':'image/webp',
  '.woff2':'font/woff2', '.png':'image/png', '.jpg':'image/jpeg', '.txt':'text/plain', '.xml':'application/xml' };
const server = http.createServer((req, res) => {
  let p = path.normalize(decodeURIComponent(req.url.split('?')[0])); if (p.endsWith(path.sep) || p === '/') p = path.join(p, 'index.html');
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});

const results = [];
const check = (where, name, ok, detail = '') => { results.push({ where, name, ok, detail }); };

async function run(browser, base, name, opts){
  const ctx = await browser.newContext({ ...opts, colorScheme: 'dark' });      // a dark-mode device: the site must still open light
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('requestfailed', r => errors.push('request failed: ' + r.url()));
  await page.goto(base, { waitUntil: 'load' });
  await page.waitForFunction(() => document.getElementById('centre').classList.contains('in'), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const phone = !!opts.isMobile;
  const ev = f => page.evaluate(f);
  const overflow = () => ev(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const to = async y => { await page.evaluate(y => scrollTo(0, y), y); await page.waitForTimeout(700); };

  check(name, 'hero text has come in', await ev(() => document.getElementById('centre').classList.contains('in')));
  check(name, 'opens in light mode on a dark-mode device', await ev(() => document.documentElement.dataset.theme === 'light'));
  check(name, 'phone layout class matches the device', (await ev(() => document.documentElement.classList.contains('m-list'))) === phone);
  check(name, 'theme switch is visible after the hero', await ev(() => getComputedStyle(document.getElementById('themeToggle')).visibility === 'visible'));
  check(name, 'no sideways scroll at the top', (await overflow()) <= 0, 'overflow ' + await overflow() + 'px');
  check(name, 'statement has its text', await ev(() => document.getElementById('statementText').textContent.trim().length > 40));

  const wk = await ev(() => document.getElementById('works').offsetTop);
  const band = () => ev(() => { const c = document.getElementById('bandCv'), r = c.getBoundingClientRect();
    return { vis: getComputedStyle(c).visibility === 'visible', top: r.top, bottom: r.bottom, h: r.height, vh: innerHeight }; });

  // the band: hidden where it can't be seen, visible in its stretch, and never covering the text it sits between
  if (phone){
    const g = await ev(() => { const c = document.getElementById('bandCv').getBoundingClientRect(), a = document.getElementById('cta').getBoundingClientRect(), s = document.getElementById('statementText').getBoundingClientRect();
      return { afterLink: c.top - a.bottom, beforeStatement: s.top - c.bottom, h: c.height }; });
    check(name, 'band sits below "Get in touch"', g.afterLink >= 0 && g.h > 100, JSON.stringify(g));
    check(name, 'band ends above the statement', g.beforeStatement >= 0, JSON.stringify(g));
    await to(Math.round(wk * 0.3));
    check(name, 'band is drawn while on screen', (await band()).vis);
  } else {
    check(name, 'band is hidden at the top of the page', !(await band()).vis);
    await to(Math.round(wk - 500));
    const b = await band();
    check(name, 'band is drawn ahead of the work', b.vis && b.top < b.vh && b.bottom > 0, JSON.stringify(b));
    const gap = await ev(() => document.getElementById('works').getBoundingClientRect().top - document.getElementById('bandCv').getBoundingClientRect().bottom);
    check(name, 'no empty gap between the band and the work', gap <= 0, 'gap ' + Math.round(gap) + 'px');
  }
  check(name, 'no sideways scroll mid-page', (await overflow()) <= 0, 'overflow ' + await overflow() + 'px');

  // the work
  await to(wk + 300);
  check(name, 'no sideways scroll in the work', (await overflow()) <= 0, 'overflow ' + await overflow() + 'px');
  check(name, 'bar appears with the work', await ev(() => document.getElementById('dock').classList.contains('show')));
  await page.waitForFunction(() => { const im = document.querySelector('.wcell:not([hidden]) img'); return im && im.naturalWidth > 0; }, null, { timeout: 8000 }).catch(() => {});
  check(name, 'first work image has loaded', await ev(() => { const im = document.querySelector('.wcell:not([hidden]) img'); return !!im && im.naturalWidth > 0; }));
  const cells = () => ev(() => [...document.querySelectorAll('.wcell')].filter(c => !c.hidden).length);
  const all = await cells();
  check(name, 'work grid has items', all >= 10, all + ' items');
  if (phone){
    check(name, 'phone: filter bar is shown', await ev(() => document.getElementById('mTop').classList.contains('show')));
    const d = await ev(() => { const c = document.getElementById('dockCta').getBoundingClientRect(), k = document.getElementById('dock').getBoundingClientRect(); return { cta: Math.round(c.width), dockRight: k.right, vw: innerWidth }; });
    check(name, 'phone: bottom bar fits the screen', d.dockRight <= d.vw && d.cta === 160, JSON.stringify(d));
    await page.click('#mTop [data-filter=projects]'); await page.waitForTimeout(900);
  } else {
    check(name, 'desktop: phone filter bar stays hidden', await ev(() => getComputedStyle(document.getElementById('mTop')).display === 'none'));
    await page.click('.dock-tabs [data-filter=projects]'); await page.waitForTimeout(900);
  }
  check(name, 'Projects filter keeps the projects', (await cells()) > 0 && await ev(() => [...document.querySelectorAll('.wcell')].every(c => c.hidden || c.dataset.cat === 'projects')));
  await ev(() => document.querySelector('[data-filter=all]').click()); await page.waitForTimeout(500);
  check(name, 'All filter restores everything', (await cells()) === all);

  // project view: a tile opens its project over the page; Esc brings the work back where it was
  const yBefore = await ev(() => Math.round(scrollY));
  await page.click('.wcell:not([hidden]) .wtitle a'); await page.waitForTimeout(1200);
  const pv = await ev(() => { const v = document.getElementById('projectView'); return { open: v.classList.contains('open'), hash: location.hash,
    title: (v.querySelector('.pv-title') || {}).textContent || '', imgs: v.querySelectorAll('.pv-g img').length, bar: document.getElementById('dock').classList.contains('show'),
    wide: v.scrollWidth - v.clientWidth }; });
  check(name, 'a tile opens its project', pv.open && pv.hash.startsWith('#project-') && pv.title.length > 1 && pv.imgs > 0, JSON.stringify(pv));
  check(name, 'project view keeps the bar and fits the screen', pv.bar && pv.wide <= 0, JSON.stringify(pv));
  await page.keyboard.press('Escape'); await page.waitForTimeout(900);
  const back = await ev(() => ({ open: document.getElementById('projectView').classList.contains('open'), hash: location.hash, y: Math.round(scrollY) }));
  check(name, 'Esc closes the project and returns to the work', !back.open && back.hash === '' && Math.abs(back.y - yBefore) < 4, JSON.stringify(back));

  // a project with its own gallery: every image is there and the first ones have loaded
  await ev(() => { location.hash = '#project-river'; }); await page.waitForTimeout(2500);
  const gal = await ev(() => { const im = [...document.querySelectorAll('#projectView .pv-g img')];
    return { n: im.length, loaded: im.slice(0, 2).filter(i => i.complete && i.naturalWidth > 0).length, sources: document.querySelectorAll('#projectView source[type="image/jxl"]').length }; });
  check(name, 'River opens with its 13-image gallery (JPEG XL with fallback)', gal.n === 13 && gal.sources === 13 && gal.loaded === 2, JSON.stringify(gal));
  await page.keyboard.press('Escape'); await page.waitForTimeout(700);

  // theme switch (by hand only)
  await ev(() => document.getElementById('themeToggle').click()); await page.waitForTimeout(1200);
  check(name, 'theme switch turns dark on', await ev(() => document.documentElement.dataset.theme === 'dark'));

  check(name, 'no errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}

(async () => {
  try { execFileSync('node', [path.join(ROOT, 'build.mjs'), '--check'], { stdio: 'pipe' }); check('build', 'index.html matches src/', true); }
  catch (e){ check('build', 'index.html matches src/', false, 'run `node build.mjs`'); }
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  await run(browser, base, 'desktop 1440×900', { viewport: { width: 1440, height: 900 } });
  await run(browser, base, 'phone 393×852', { viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
  await run(browser, base, 'small phone 360×640', { viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true });
  await browser.close(); server.close();
  let failed = 0;
  for (const r of results){ if (!r.ok) failed++; console.log((r.ok ? '  ok    ' : '  FAIL  ') + r.where + ' — ' + r.name + (r.ok || !r.detail ? '' : '  [' + r.detail + ']')); }
  console.log(failed ? `\n${failed} of ${results.length} checks failed` : `\nall ${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})();
