#!/usr/bin/env node
// Builds index.html from src/: src/index.html is the page, and each line "@@include path@@" is replaced by that
// file from src/. No dependencies. Run `node build.mjs` after editing anything in src/; `node build.mjs --check`
// exits 1 if the committed index.html is out of date (the smoke test runs this).
import { readFileSync, writeFileSync } from 'node:fs';
const root = new URL('.', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
const out = read('src/index.html').replace(/^@@include (.+?)@@\n/gm, (_, p) => read('src/' + p));
if (process.argv.includes('--check')){
  if (read('index.html') !== out){ console.error('index.html is out of date: run `node build.mjs`'); process.exit(1); }
  console.log('index.html is up to date');
} else { writeFileSync(new URL('index.html', root), out); console.log('built index.html (' + out.length + ' bytes)'); }
