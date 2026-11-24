  // ---- favicon: the tab icon writes itself with the same Tide pens. In the foreground it plays once (on load, and when
  // you come back to the tab); while the tab is in the background it loops: write → hold → erase → pause → write…
  // Frames are rendered once (64px canvas → PNG data URLs, per OS colour) so each tick only swaps the link's href.
  // Background tabs pause requestAnimationFrame and slow page timers to ~1/s, so the loop is clocked by a tiny worker,
  // whose timer keeps a steady beat. Safari ignores live favicons (keeps the static one); reduced motion and Pause skip it.
  (() => {
    const link = document.querySelector('link[rel="icon"]');
    const cv = document.createElement('canvas'), layer = document.createElement('canvas');
    if (!link || !cv.getContext || !window.Path2D) return;
    const S = 64, k = S / 110;               // the static favicon's viewBox: -6 -30 110 110
    cv.width = cv.height = layer.width = layer.height = S;
    const ctx = cv.getContext('2d'), lx = layer.getContext('2d');
    const shape = id => new Path2D(document.querySelector('#introMark .' + id).getAttribute('d'));
    const pen = (el, w, t0, dur, ez) => ({ p: new Path2D(el.getAttribute('d')), len: el.getTotalLength(), w, t0, dur, ez });
    const groups = [
      { fill: shape('m-ring'), rule: 'evenodd', pens: [pen(penTop, 7, 0.05, 1.0, easeDraw), pen(penBot, 7, 0.05, 1.0, easeDraw)] },
      { fill: shape('m-swirl'), rule: 'nonzero', pens: [pen(penWave, 5, 0.14, 0.9, easeDraw), pen(penCurl, 5, T_FORK, 0.64, easeCurl)] },
    ];
    const END = Math.max(...groups.flatMap(g => g.pens.map(q => q.t0 + q.dur)));
    const TK = 1.2;                           // seconds per unit of pen time (the hero intro's pacing, a touch quicker)
    const STEP = 50;                          // ms per frame: 20fps is plenty for a 16px icon
    const N = Math.ceil(END*TK*1000 / STEP) + 1;
    const dark = matchMedia('(prefers-color-scheme: dark)');   // the tab strip follows the OS, not the site's toggle
    const STATIC = link.getAttribute('href');
    const cache = {};
    function render(t, ink){                  // t: seconds into the write
      ctx.clearRect(0, 0, S, S);
      for (const g of groups){
        lx.setTransform(1, 0, 0, 1, 0, 0); lx.globalCompositeOperation = 'source-over'; lx.clearRect(0, 0, S, S);
        lx.setTransform(k, 0, 0, k, 6*k, 30*k);
        lx.lineCap = 'round'; lx.lineJoin = 'round'; lx.strokeStyle = '#000';
        for (const q of g.pens){
          const d = q.ez(Math.min(1, Math.max(0, (t/TK - q.t0) / q.dur)));
          if (d <= 0) continue;
          lx.lineWidth = q.w; lx.setLineDash([q.len*d, q.len]); lx.stroke(q.p);
        }
        lx.globalCompositeOperation = 'source-in'; lx.fillStyle = ink; lx.fill(g.fill, g.rule);
        ctx.drawImage(layer, 0, 0);
      }
      return cv.toDataURL('image/png');
    }
    const frames = () => {                    // rendered lazily, one frame per call, so nothing blocks a tick
      const ink = dark.matches ? '#f0eee9' : '#141414', f = cache[ink] || (cache[ink] = []);
      return i => f[i] || (f[i] = render(Math.min(i*STEP/1000, END*TK), ink));
    };
    // the background loop, in frame indices: write (N), hold ~2.4s, erase at double speed, ~0.6s blank (-1 = empty)
    const LOOP = [...Array(N).keys(), ...Array(48).fill(N-1),
                  ...[...Array(Math.ceil(N/2)).keys()].map(i => Math.max(0, N-1 - i*2)), ...Array(12).fill(-1)];
    const BLANK = (() => { ctx.clearRect(0, 0, S, S); return cv.toDataURL('image/png'); })();
    let pos = 0, shown = null, mode = '', get = null;
    function show(i){ const href = i < 0 ? BLANK : get(i); if (href !== shown){ shown = href; link.href = href; } }
    function rest(){ mode = ''; shown = null; link.href = STATIC; }
    // foreground: play the write once on requestAnimationFrame, then hand back to the crisp SVG
    let raf = 0, t0 = 0;
    function tick(now){
      if (mode !== 'once') return;
      const i = Math.floor((now - t0) / STEP);
      if (i >= N){ raf = 0; rest(); return; }
      show(i); raf = requestAnimationFrame(tick);
    }
    // background: a worker's interval keeps the beat (page timers in hidden tabs are throttled to ~1/s)
    let worker = null;
    try {
      worker = new Worker(URL.createObjectURL(new Blob(
        ['let id=0;onmessage=e=>{clearInterval(id);id=e.data?setInterval(()=>postMessage(0),e.data):0}'], { type: 'text/javascript' })));
      worker.onmessage = () => { if (mode === 'loop'){ show(LOOP[pos]); pos = (pos + 1) % LOOP.length; } };
    } catch(e){ worker = null; }
    let fallback = 0;
    const off = () => document.documentElement.classList.contains('paused') || reduce;
    function stop(){
      cancelAnimationFrame(raf); raf = 0;
      if (worker) worker.postMessage(0); clearInterval(fallback); fallback = 0;
    }
    function playOnce(){
      stop(); if (off() || document.hidden){ rest(); return; }
      get = frames(); mode = 'once'; t0 = performance.now(); raf = requestAnimationFrame(tick);
    }
    function loop(){
      stop(); if (off()){ rest(); return; }
      get = frames(); mode = 'loop'; pos = 0;
      if (worker) worker.postMessage(STEP);
      else fallback = setInterval(() => { show(LOOP[pos]); pos = (pos + 1) % LOOP.length; }, STEP);
    }
    let hiddenAt = 0;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden){ hiddenAt = performance.now(); loop(); }
      else if (performance.now() - hiddenAt > 1500) playOnce();   // a quick flick between tabs doesn't replay it
      else { stop(); rest(); }
    });
    playOnce();
  })();
  // cache the name-block mark position (reading layout every frame forces a reflow)
  let markRect = null;
  let gridIO = null;
  let cueTopPx = null, cueDirty = true;   // scroll line: top (stage px); length recomputed when layout changes
  function measureMark(){
    // relative to the stage's centre, not the window's: the window includes the scrollbar gutter, the stage doesn't
    const r = centreMark.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    markRect = { cx: r.left + r.width/2 - (sr.left + sr.width/2), cy: r.top + r.height/2 - (sr.top + sr.height/2), w: r.width };
    // the scroll line hangs from "Get in touch" (its resting position: the rise-in offset is taken out)
    const cta = document.getElementById('cta'), cue = document.getElementById('heroCue');
    if (cta && cue && cta.offsetParent){ const cr = cta.getBoundingClientRect(), m = new DOMMatrix(getComputedStyle(cta).transform);
      cueTopPx = Math.round(cr.bottom - m.m42 - sr.top + 10); cue.style.top = cueTopPx + 'px'; cueDirty = true; }
    // phones: the hero line runs from under "Get in touch" towards the bottom of the first screen, as long as there's room
    if (cue && document.documentElement.classList.contains('m-list') && cueTopPx !== null){
      const len = Math.min(110, Math.round(sr.height - cueTopPx - 36));
      cue.style.height = Math.max(0, len) + 'px'; cue.style.visibility = len < 36 ? 'hidden' : '';
    } else if (cue) cue.style.visibility = '';
  }
  addEventListener('resize', () => requestAnimationFrame(measureMark));
  document.fonts && document.fonts.ready.then(() => requestAnimationFrame(measureMark));

  function makeCard(inner, i){
    const el = document.createElement('div');
    el.className = 'card';
    el.setAttribute('aria-hidden', 'true');   // decorative: the works are listed in the grid below
    el.innerHTML = `<div class="media">${inner}</div><div class="frame"><b></b><i class="tl"></i><i class="tr"></i><i class="bl"></i><i class="br"></i><span></span></div>`;
    el.addEventListener('pointerenter', () => el._hover = true);
    el.addEventListener('pointerleave', () => el._hover = false);
    ring.appendChild(el);
    return el;
  }
  // render each card's far-away version: cover-cropped to the card shape, greyscaled and blurred, at a small size
  const canFilter = (() => { try { const x = document.createElement('canvas').getContext('2d'); x.filter = 'blur(2px)'; return x.filter === 'blur(2px)'; } catch(e){ return false; } })();
  function buildFar(c, blurPx, grey, ar){
    const img = c.img, cv = c.far; if (!img || !cv || !img.naturalWidth) return false;
    const W = 360, H = Math.max(1, Math.round(W * ar)), x = cv.getContext('2d');
    cv.width = W; cv.height = H;
    const iw = img.naturalWidth, ih = img.naturalHeight, sc = Math.max(W/iw, H/ih), sw = W/sc, sh = H/sc;
    const b = blurPx * W / Math.max(1, c.w);                 // the card's blur, in this canvas's pixels
    if (canFilter){
      x.filter = `grayscale(${grey}) blur(${b.toFixed(2)}px)`;
      x.drawImage(img, (iw-sw)/2 - sw*0.04, (ih-sh)/2 - sh*0.04, sw*1.08, sh*1.08, 0, 0, W, H);   // slight overscan so blurred edges stay filled
    } else {
      // Safari has no canvas filter: blur by scaling down and back up, then greyscale the pixels
      const k = Math.max(1, b*1.6), t = document.createElement('canvas'); t.width = Math.max(1, Math.round(W/k)); t.height = Math.max(1, Math.round(H/k));
      t.getContext('2d').drawImage(img, (iw-sw)/2, (ih-sh)/2, sw, sh, 0, 0, t.width, t.height);
      x.imageSmoothingQuality = 'high'; x.drawImage(t, 0, 0, W, H);
      if (grey > 0){ const d = x.getImageData(0, 0, W, H), p = d.data;
        for (let i = 0; i < p.length; i += 4){ const l = 0.2126*p[i] + 0.7152*p[i+1] + 0.0722*p[i+2]; p[i] += (l-p[i])*grey; p[i+1] += (l-p[i+1])*grey; p[i+2] += (l-p[i+2])*grey; }
        x.putImageData(d, 0, 0); }
    }
    return true;
  }
  let farKey = '';
  function refreshFar(v, force){
    const D = v.Depth, bK = isMobile(v) ? v.Mobile.blur : 1, ar = ASPECT[v.Cards.aspect] || 9/16;
    const key = [D.backBlur*bK, D.backGreyscale, ar, v.Cards.width, isMobile(v)].join('|');
    if (key === farKey && !force) return; farKey = key;
    cards.forEach(c => { if (!c.far) return; c.farOk = false;
      const go = () => { c.farOk = buildFar(c, D.backBlur*bK, D.backGreyscale, ar); };
      if (c.img.complete && c.img.naturalWidth) go(); else c.img.addEventListener('load', go, { once:true }); });
  }
  const cards = [];
  WORKS.forEach(([id]) => {
    const i = cards.length;
    const el = makeCard(`<img data-src="works/${id}.webp" alt="" draggable="false" decoding="async"><canvas class="far"></canvas>`, i);
    const card = { el, img:el.querySelector('img'), far:el.querySelector('canvas.far'), lbl:el.querySelector('.frame span'), id, fig:id, dummy:false };
    cards.push(card);
  });
  for (let d=0; d<MAX_DUMMIES; d++){
    const i = cards.length, n = String(d+1).padStart(2,'0');
    const el = makeCard(`<div class="dlabel">Placeholder ${n}</div>`, i);
    cards.push({ el, img:null, dl:el.querySelector('.dlabel'), lbl:el.querySelector('.frame span'), id:'D'+n, fig:'D'+n, dummy:true, title:'Placeholder '+n });
  }

  // one colour (or an A→B gradient) shared by stroke + handles; each handle takes the gradient's colour at its corner
  function paintFrame(angle){
    const F = V.Frame, r = ring.style;
    const fc = isDark(V) ? V.Theme.darkFrame : F.colour;
    const A = fc, B = F.gradient ? F.colourB : fc;
    r.setProperty('--fc', A); r.setProperty('--fc2', B); r.setProperty('--fa', angle.toFixed(1)+'deg');
    const ar = ASPECT[V.Cards.aspect] || 9/16, a = angle*Math.PI/180;
    const dx = Math.sin(a), dy = -Math.cos(a), L = Math.abs(dx) + Math.abs(ar*dy);
    [['--htl',0,0],['--htr',1,0],['--hbl',0,1],['--hbr',1,1]].forEach(([k,x,y]) => {
      const t = clamp((((x-.5)*dx + (y-.5)*ar*dy) / L) + .5);
      r.setProperty(k, F.gradient ? `color-mix(in oklab, ${B} ${(t*100).toFixed(1)}%, ${A})` : A);
    });
  }
  let gAngle = null;

  const sel = document.createElement('div');
  sel.className = 'card-select';
  sel.innerHTML = '<div class="frame"><b></b><i class="tl"></i><i class="tr"></i><i class="bl"></i><i class="br"></i><span></span></div>';
  ring.appendChild(sel);
  const selLbl = sel.querySelector('span');

  const isMobile = v => innerWidth < (v ? v.Mobile.breakpoint : 1024);
  let wasMobile = null;
  addEventListener('resize', () => { if (V && isMobile(V) !== wasMobile){ applyStatic(V); } });

