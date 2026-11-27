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
    const card = { el, img:el.querySelector('img'), far:el.querySelector('canvas.far'), lbl:el.querySelector('.frame span'), id, fig:String(i + 1).padStart(2, '0'), dummy:false };
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

