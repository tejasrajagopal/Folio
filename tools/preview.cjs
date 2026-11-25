#!/usr/bin/env node
// Local preview: serves the real site and adds a small picker for the band's motion (the picker is injected here, it is
// not part of index.html and never ships). Run: node tools/preview.cjs [port]   → http://localhost:4173
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const ROOT = path.join(__dirname, '..'), PORT = +process.argv[2] || 4173;
const TYPES = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.webp':'image/webp',
  '.woff2':'font/woff2', '.png':'image/png', '.jpg':'image/jpeg', '.txt':'text/plain', '.xml':'application/xml' };
const MODES = [
  ['Flow', 'The current one: colour layers drift up through the band.'],
  ['Rise', 'Bars grow up from the middle outward; the outline morphs flat → curve → peak as it crosses the screen.'],
  ['Pulse', 'Rings of colour breathe outward from a hot core, like the liquid-gradient reference.'],
  ['Swipe', 'The colours sweep across the bars in a diagonal staircase.'],
  ['Halftone', 'No blur: the edges break into dots that grow until they merge into solid colour.'],
  ['Stretch', 'Thin and pale at rest; it swells and brightens with the speed of your scroll.'],
];
const HEAD = `<script>window.FOLIO_BAND={mode:+(function(){try{return localStorage.getItem('bandMode')}catch(e){}})()||1};</script>`;
const UI = `
<style>
  #bp{position:fixed;left:12px;top:50%;transform:translateY(-50%);z-index:5000;font:11px/1.35 ui-monospace,Menlo,monospace;color:#eee;
    background:rgba(20,20,22,.92);border-radius:12px;padding:8px;width:176px;box-shadow:0 8px 28px rgba(0,0,0,.25)}
  #bp.min{width:auto} #bp.min .bpb{display:none}
  #bp header{display:flex;align-items:center;gap:6px;cursor:pointer;text-transform:uppercase;letter-spacing:.06em;padding:2px 4px 6px}
  #bp.min header{padding:2px 4px}
  #bp header b{font-weight:400;flex:1} #bp header i{font-style:normal;color:#F58E3F}
  #bp button{display:flex;gap:8px;width:100%;text-align:left;background:none;border:0;color:#cfcfcf;font:inherit;padding:7px 8px;border-radius:7px;cursor:pointer}
  #bp button:hover{background:#2a2a2e} #bp button[aria-pressed=true]{background:#F58E3F;color:#141414}
  #bp button span{opacity:.6;width:10px}
  #bp p{margin:8px 4px 4px;color:#9a9a9f}
  #bp .go{justify-content:center;background:#2a2a2e;margin-top:6px;color:#eee}
</style>
<div id="bp" role="group" aria-label="Band motion (preview only)">
  <header id="bph"><b>Band motion</b><i id="bpn"></i></header>
  <div class="bpb">
    ${MODES.map((m, i) => `<button type="button" data-m="${i + 1}"><span>${i + 1}</span>${m[0]}</button>`).join('')}
    <p id="bpd"></p>
    <button type="button" class="go" id="bpg">Go to the band</button>
    <p>Preview only. Keys 1–6 switch.</p>
  </div>
</div>
<script>
(() => {
  const M = ${JSON.stringify(MODES)}, el = document.getElementById('bp');
  const set = n => { window.FOLIO_BAND.mode = n; try { localStorage.setItem('bandMode', n); } catch(e){}
    el.querySelectorAll('[data-m]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.m === n)));
    document.getElementById('bpd').textContent = M[n-1][1]; document.getElementById('bpn').textContent = n + ' ' + M[n-1][0]; };
  el.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => set(+b.dataset.m)));
  addEventListener('keydown', e => { const n = +e.key; if (n >= 1 && n <= M.length && !e.metaKey && !e.ctrlKey) set(n); });
  document.getElementById('bph').addEventListener('click', () => el.classList.toggle('min'));
  document.getElementById('bpg').addEventListener('click', () => { const c = document.getElementById('bandCv');
    scrollTo({ top: Math.max(0, parseFloat(c.style.top) - innerHeight*0.55), behavior: 'smooth' }); });
  if (innerWidth < 700) el.classList.add('min');
  set(window.FOLIO_BAND.mode);
})();
</script>`;
http.createServer((req, res) => {
  let p = path.normalize(decodeURIComponent(req.url.split('?')[0])); if (p.endsWith(path.sep) || p === '/') p = path.join(p, 'index.html');
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); res.end('not found'); return; }
  const type = TYPES[path.extname(f)] || 'application/octet-stream';
  if (f === path.join(ROOT, 'index.html')){
    const html = fs.readFileSync(f, 'utf8').replace('</head>', HEAD + '</head>').replace('</body>', UI + '</body>');
    res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' }); res.end(html); return;
  }
  res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' }); fs.createReadStream(f).pipe(res);
}).listen(PORT, '0.0.0.0', () => console.log('preview on http://localhost:' + PORT));
