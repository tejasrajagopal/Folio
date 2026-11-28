// The band-motion picker shown by the local preview and the artifact preview. Never part of index.html.
// It drives the band through window.FOLIO_BAND = { mode, p: { …overrides of the band's settings }, rev }.
const MODES = [
  ['Flow', 'The original: colour layers drift up through the band, with soft blurred edges.'],
  ['Rise', 'Bars grow up from the middle outward; the outline morphs flat → curve → peak as it crosses the screen.'],
  ['Pulse', 'Rings of colour breathe outward from a hot core, like the liquid-gradient reference.'],
  ['Swipe', 'The colours sweep across the bars in a diagonal staircase.'],
  ['Halftone', 'No blur: the edges break into dots that grow until they merge into solid colour.'],
  ['Stretch', 'Thin and pale at rest; it swells and brightens with the speed of your scroll.'],
  ['Sweep', 'Light rising through the screen: a soft domed glow comes up from the bottom, fills the screen with colour, then the page floods up behind it and the colour leaves off the top. No black, no texture.'],
  ['Soft', 'Matched to your screen recording: a soft blurred band with film grain. Orange on top (lifting at the sides), red-pink, purple, and two blue-purple pools along the bottom.'],
];
// [key, label, min, max, step, default] — defaults mirror src/js/band.js
const GROUPS = [
  ['Pacing', [
    ['flowSpeed', 'Drift speed', 0, 0.6, 0.01, 0.18],
    ['flowScroll', 'Drift from scroll', 0, 4, 0.05, 1],
    ['settle', 'Glide after stop', 0.05, 2, 0.05, 0.6],
    ['rippleSpeed', 'Bar bob speed', 0, 2, 0.01, 0.5],
    ['rippleScroll', 'Bob from scroll', 0, 6, 0.05, 1.5],
    ['travelScroll', 'Wave roll', 0, 3, 0.05, 0.5],
  ]],
  ['Motion', [
    ['ripple', 'Bar bob amount', 0, 0.08, 0.001, 0.043],
    ['flowRings', 'Colour layers', 0.5, 4, 0.05, 2.8],
    ['halfPulse', 'Dot swell', 0, 0.6, 0.01, 0.57],
    ['halfPulseSpeed', 'Dot swell speed', 0, 3, 0.05, 0.95],
  ]],
  ['Dots', [
    ['halfPitch', 'Dot size', 4, 24, 0.5, 6.5],
    ['fadeTop', 'Top dissolve', 0.05, 0.6, 0.01, 0.32],
    ['fadeBottom', 'Bottom dissolve', 0.05, 0.6, 0.01, 0.34],
  ]],
  ['Soft (style 8)', [
    ['softThick', 'Thickness', 0.2, 1, 0.01, 0.68],
    ['softDip', 'Top sag', 0, 0.2, 0.005, 0.09],
    ['softLobe', 'Bottom pools', 0, 0.15, 0.005, 0.07],
    ['softFadeT', 'Top softness', 0.05, 0.6, 0.01, 0.3],
    ['softFadeB', 'Bottom softness', 0.05, 0.6, 0.01, 0.36],
    ['softWash', 'Pastel', 0, 0.6, 0.01, 0.24],
    ['softGrain', 'Grain', 0, 0.3, 0.005, 0.07],
    ['softBlue', 'Blue in pools', 0, 1, 0.01, 0.62],
    ['softSway', 'Pool sway', 0, 1, 0.01, 0.15],
  ]],
  ['Sweep (style 7)', [
    ['sweepThick', 'Colour depth', 0.3, 2, 0.01, 0.85],
    ['sweepDome', 'Dome', 0, 2.5, 0.01, 1.0],
    ['sweepDepth', 'Dome centre', 0.1, 2, 0.01, 0.45],
    ['sweepLead', 'Front softness', 0.02, 0.9, 0.01, 0.3],
    ['sweepTail', 'Light softness', 0.02, 0.9, 0.01, 0.18],
    ['sweepFlip', 'Orange leads', 0, 1, 1, 0],
    ['sweepStart', 'Start later', -0.5, 1, 0.01, 0],
    ['sweepEnd', 'End earlier', -0.3, 0.8, 0.01, 0.25],
    ['sweepGrain', 'Grain', 0, 0.6, 0.01, 0],
  ]],
  ['Shape (same on desktop + phone)', [
    ['barsOn', 'Stepped bars', 0, 1, 1, 0],
    ['bars', 'Ripple count', 8, 120, 1, 58],
    ['curveW', 'Curve height', 0, 0.4, 0.005, 0.175],
    ['thickW', 'Thickness', 0.15, 0.9, 0.01, 0.29],
    ['tilt', 'Bar tilt', -30, 30, 0.5, 8],
    ['wave', 'Wave', 0, 0.15, 0.005, 0.055],
  ]],
];
const HEAD = `<script>(function(){var m=8,p={};try{m=+localStorage.getItem('bandMode4')||8;p=JSON.parse(localStorage.getItem('bandParams')||'{}')}catch(e){}window.FOLIO_BAND={mode:m,p:p,rev:1}})();</script>`;
const UI = `
<style>
  #bp{position:fixed;left:12px;top:50%;transform:translateY(-50%);z-index:5000;font:11px/1.35 ui-monospace,Menlo,monospace;color:#eee;
    background:rgba(20,20,22,.93);border-radius:12px;padding:8px;width:236px;max-height:88vh;overflow:auto;overscroll-behavior:contain;box-shadow:0 8px 28px rgba(0,0,0,.25)}
  #bp.min{width:auto;overflow:visible} #bp.min .bpb{display:none}
  #bp header{display:flex;align-items:center;gap:6px;cursor:pointer;text-transform:uppercase;letter-spacing:.06em;padding:2px 4px 6px;position:sticky;top:-8px;background:rgb(22,22,24);z-index:1}
  #bp.min header{padding:2px 4px;position:static;background:none}
  #bp header b{font-weight:400;flex:1} #bp header i{font-style:normal;color:#F58E3F}
  #bp .modes{display:grid;grid-template-columns:1fr 1fr;gap:3px}
  #bp button{display:flex;gap:6px;width:100%;text-align:left;background:none;border:0;color:#cfcfcf;font:inherit;padding:6px 8px;border-radius:7px;cursor:pointer}
  #bp button:hover{background:#2a2a2e} #bp button[aria-pressed=true]{background:#F58E3F;color:#141414}
  #bp button span{opacity:.6}
  #bp p{margin:8px 4px 4px;color:#9a9a9f}
  #bp h4{margin:12px 4px 4px;font:inherit;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#8a8a8f}
  #bp .r{display:grid;grid-template-columns:86px 1fr 34px;align-items:center;gap:6px;padding:0 4px;min-height:24px}
  #bp .r label{color:#d2d2d2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #bp .r input{width:100%;accent-color:#F58E3F}
  #bp .r output{text-align:right;color:#8f8f94;font-variant-numeric:tabular-nums}
  #bp .row{display:flex;gap:4px;margin-top:8px} #bp .row button{justify-content:center;background:#2a2a2e;color:#eee}
  #bp textarea{width:100%;height:70px;margin-top:6px;background:#0e0e10;color:#cfcfcf;border:1px solid #333;border-radius:6px;font:10px/1.4 ui-monospace,Menlo,monospace;padding:6px}
</style>
<div id="bp" role="group" aria-label="Band motion (preview only)">
  <header id="bph"><b>Band</b><i id="bpn"></i></header>
  <div class="bpb">
    <div class="modes">${MODES.map((m, i) => `<button type="button" data-m="${i + 1}"><span>${i + 1}</span>${m[0]}</button>`).join('')}</div>
    <p id="bpd"></p>
    ${GROUPS.map(([g, rows]) => `<h4>${g}</h4>` + rows.map(([k, l, a, b, st]) =>
      `<div class="r"><label for="bp-${k}">${l}</label><input type="range" id="bp-${k}" data-k="${k}" min="${a}" max="${b}" step="${st}"><output id="bpo-${k}"></output></div>`).join('')).join('')}
    <div class="row"><button type="button" id="bpg">Go to band</button><button type="button" id="bpc">Copy settings</button><button type="button" id="bpr">Reset</button></div>
    <textarea id="bpt" readonly hidden aria-label="Settings"></textarea>
    <p>Preview only. Keys 1–8 switch the style. Settings are kept in this browser.</p>
  </div>
</div>
<script>
(() => {
  const M = ${JSON.stringify(MODES)}, G = ${JSON.stringify(GROUPS)}, el = document.getElementById('bp'), F = window.FOLIO_BAND;
  const D = {}; G.forEach(g => g[1].forEach(r => D[r[0]] = r[5]));
  const save = () => { try { localStorage.setItem('bandMode4', F.mode); localStorage.setItem('bandParams', JSON.stringify(F.p)); } catch(e){} };
  const fmt = (v, st) => st >= 1 ? String(Math.round(v)) : (+v).toFixed(st < 0.01 ? 3 : 2);
  const setMode = n => { F.mode = n; F.rev++; save();
    el.querySelectorAll('[data-m]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.m === n)));
    document.getElementById('bpd').textContent = M[n-1][1]; document.getElementById('bpn').textContent = n + ' ' + M[n-1][0]; };
  const sync = () => el.querySelectorAll('[data-k]').forEach(i => { const v = F.p[i.dataset.k] ?? D[i.dataset.k]; i.value = v; document.getElementById('bpo-' + i.dataset.k).textContent = fmt(v, +i.step); });
  el.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => setMode(+b.dataset.m)));
  el.querySelectorAll('[data-k]').forEach(i => i.addEventListener('input', () => { F.p[i.dataset.k] = +i.value; F.rev++; save(); document.getElementById('bpo-' + i.dataset.k).textContent = fmt(+i.value, +i.step); }));
  addEventListener('keydown', e => { const n = +e.key; if (n >= 1 && n <= M.length && !e.metaKey && !e.ctrlKey && e.target.tagName !== 'INPUT') setMode(n); });
  document.getElementById('bph').addEventListener('click', () => el.classList.toggle('min'));
  document.getElementById('bpg').addEventListener('click', () => { const c = document.getElementById('bandCv');
    scrollTo({ top: Math.max(0, parseFloat(c.style.top) - innerHeight*0.55), behavior: 'smooth' }); });
  document.getElementById('bpr').addEventListener('click', () => { F.p = Object.assign({}, D); F.rev++; save(); sync(); });
  const cb = document.getElementById('bpc'), ta = document.getElementById('bpt');
  cb.addEventListener('click', () => { const txt = JSON.stringify(Object.assign({ mode: F.mode }, D, F.p));
    const done = ok => { cb.textContent = ok ? 'Copied' : 'Copy below'; setTimeout(() => cb.textContent = 'Copy settings', 1500); };
    const fall = () => { ta.hidden = false; ta.value = txt; ta.select(); done(false); };
    try { navigator.clipboard.writeText(txt).then(() => done(true), fall); } catch(e){ fall(); } });
  if (innerWidth < 700) el.classList.add('min');
  sync(); setMode(F.mode);
})();
</script>`;
module.exports = { HEAD, UI };
