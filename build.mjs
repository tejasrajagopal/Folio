#!/usr/bin/env node
// Builds index.html (and llms.txt's work list) from src/. No dependencies.
//   src/index.html is the page; each line "@@include path@@" is replaced by that file from src/.
//   src/works.json is the one list of work; it fills the @@WORKS_*@@ placeholders (orbit/grid config, the static
//   grid for no-JS readers and crawlers, the structured data) and the "## Selected work" section of llms.txt.
// Run `node build.mjs` after editing anything in src/; `node build.mjs --check` exits 1 if the built files are stale.
import { readFileSync, writeFileSync } from 'node:fs';
const root = new URL('.', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
const SITE = 'https://tejasrajagopal.com/';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

const { projects } = JSON.parse(read('src/works.json'));
const meta = p => p.category + (p.year ? ' · ' + p.year : '');
const tiles = projects.flatMap(p => p.images.map(([id, what]) => ({ id, title: `${p.name} — ${what}`, p })));
const worksJs = 'const WORKS = ' + JSON.stringify(tiles.map(t => [t.id, t.title])) + ';\n  const PROJECTS = ' +
  JSON.stringify(Object.fromEntries(projects.map(p => [p.name, { meta: meta(p), tagline: p.tagline, description: p.description }]))) + ';';
// keep this markup the same as the tiles apply.js renders
const worksHtml = tiles.map(t => `<article class="wcell" data-cat="projects" data-id="${t.id}"><div class="wframe"><div class="wimg"><img data-src="works/${t.id}.webp" alt="${esc(t.title)}" width="1280" height="720" decoding="async"></div><i></i><i></i><i></i><i></i></div><h3 class="wtitle">${esc(t.p.name)}</h3><p class="wmeta">${esc(meta(t.p))}</p></article>`).join('');
const worksLd = JSON.stringify(projects.map((p, i) => ({ '@type': 'ListItem', position: i + 1, item: Object.assign(
  { '@type': 'CreativeWork', name: p.name, creator: { '@id': SITE + '#person' } },
  p.tagline ? { alternativeHeadline: p.tagline } : {}, p.description ? { description: p.description } : {}, { genre: p.category },
  p.year ? { dateCreated: String(p.year) } : {}, { image: p.images.map(([id]) => `${SITE}works/${id}.webp`) }) })));

const html = read('src/index.html')
  .replace(/^@@include (.+?)@@\n/gm, (_, p) => read('src/' + p))
  .replace('/*@@WORKS_JS@@*/', () => worksJs).replace('@@WORKS_HTML@@', () => worksHtml)
  .replace('@@WORKS_COUNT@@', () => String(projects.length)).replace('@@WORKS_JSONLD@@', () => worksLd);
if (/@@[A-Z_]+@@|@@include/.test(html)) { console.error('unfilled placeholder left in index.html'); process.exit(1); }

const llmsOld = read('llms.txt'), cut = llmsOld.indexOf('## Selected work');
const llms = (cut < 0 ? llmsOld.trimEnd() + '\n\n' : llmsOld.slice(0, cut)) + '## Selected work\n\n' + projects.map(p =>
  `- [${p.name}](${SITE}works/${p.images[0][0]}.webp): ${[p.tagline, meta(p)].filter(Boolean).join(' — ')}${p.description ? '. ' + p.description : ''}`).join('\n') + '\n';

if (process.argv.includes('--check')) {
  const stale = [['index.html', html], ['llms.txt', llms]].filter(([f, want]) => read(f) !== want).map(([f]) => f);
  if (stale.length) { console.error(stale.join(', ') + ' out of date: run `node build.mjs`'); process.exit(1); }
  console.log('built files are up to date');
} else {
  writeFileSync(new URL('index.html', root), html); writeFileSync(new URL('llms.txt', root), llms);
  console.log(`built index.html (${html.length} bytes) and llms.txt: ${projects.length} projects, ${tiles.length} tiles`);
}
