#!/usr/bin/env node
// Local preview: serves the real site and adds a small picker for the band's motion (the picker is injected here, it is
// not part of index.html and never ships). Run: node tools/preview.cjs [port]   → http://localhost:4173
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const ROOT = path.join(__dirname, '..'), PORT = +process.argv[2] || 4173;
const TYPES = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.webp':'image/webp',
  '.woff2':'font/woff2', '.png':'image/png', '.jpg':'image/jpeg', '.txt':'text/plain', '.xml':'application/xml' };
const { HEAD, UI } = require('./picker.cjs');
http.createServer((req, res) => {
  let p = path.normalize(decodeURIComponent(req.url.split('?')[0])); if (p.endsWith(path.sep) || p === '/') p = path.join(p, 'index.html');
  const f = path.join(ROOT, p === path.sep + 'phone.html' ? 'index.html' : p);   // phone.html: the same page, framed by the picker's phone view
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); res.end('not found'); return; }
  const type = TYPES[path.extname(f)] || 'application/octet-stream';
  if (f === path.join(ROOT, 'index.html')){
    const html = fs.readFileSync(f, 'utf8').replace('</head>', HEAD + '</head>').replace('</body>', UI + '</body>');
    res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' }); res.end(html); return;
  }
  res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' }); fs.createReadStream(f).pipe(res);
}).listen(PORT, '0.0.0.0', () => console.log('preview on http://localhost:' + PORT));
