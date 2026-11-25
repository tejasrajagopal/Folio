// The band-motion picker shown by the local preview and the artifact preview. Never part of index.html.
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
module.exports = { HEAD, UI };
