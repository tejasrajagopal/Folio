#!/usr/bin/env node
// Builds a single self-contained preview page of the real site (fonts and scripts inlined, images beside it as works/NN.webp)
// with the band-motion picker, for publishing as a private preview. Usage: node tools/artifact.cjs <out.html>
const fs = require('node:fs'), path = require('node:path');
const { HEAD, UI } = require('./picker.cjs');
const ROOT = path.join(__dirname, '..'), read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const html = read('index.html');
const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); if (i < 0 || j < 0) throw new Error('missing ' + a); return html.slice(i + a.length, j); };
let css = cut('<style>', '</style>').replace(/url\(fonts\/([\w-]+\.woff2)\)/g, (_, f) =>
  'url(data:font/woff2;base64,' + fs.readFileSync(path.join(ROOT, 'fonts', f)).toString('base64') + ')');
let body = cut('<body>', '</body>');
const lenis = '<script src="vendor/lenis.min.js"></script>';
if (!body.includes(lenis)) throw new Error('lenis tag not found');
body = body.replace(lenis, () => '<script>' + read('vendor/lenis.min.js') + '</script>');
body = body.replace(/<script>\s*\/\/ DialKit[\s\S]*?<\/script>/, '');          // the #tune panel isn't part of the preview
const out = `<title>Folio Motion Preview</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400&family=Inter+Tight:wght@500;700&display=swap">
<style>${read('vendor/lenis.css')}</style>
<style>${css}</style>
${HEAD}
${body}
${UI}
`;
fs.writeFileSync(process.argv[2], out);
console.log('wrote', process.argv[2], out.length, 'bytes; DialKit script removed:', !/DialKit \(~420/.test(out));
