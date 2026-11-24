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
