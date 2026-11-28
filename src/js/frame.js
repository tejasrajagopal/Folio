  function frame(now){
    requestAnimationFrame(frame);
    if (!V) return;
    const dt = Math.min(0.05,(now-last)/1000); last = now;
    if (lenis) lenis.raf(now);
    const S=V.Motion, Z=V["Size by position"], D=V.Depth, F=V.Frame, I=V.Intro;
    const MB = V.Mobile, isMob = isMobile(V), bK = isMob ? MB.blur : 1;      // phones: smaller ring, far less blur
    const L = isMob ? { ...V.Layout, radius: MB.radius, tilt: MB.tilt, centreX: 0, centreY: MB.centreY } : V.Layout;
    const N = order.length, step = N ? TAU/N : 0;

    // ---- intro timeline: logo draws → works fly in from the camera, front first → text
    let it = I.play ? Math.max(0,(now - introStart)/1000) : 1e6;
    // reduced motion: same order, opacity only — no drawing, flying, blurring or gliding
    const LD = reduce ? 0.0001 : I.logoDraw, LH = reduce ? 0 : I.logoHold;
    const listMode = isList(V);                                   // phones: no orbit on screen, so no card stagger to wait for
    const flight = reduce || listMode ? 0.5 : I.flight, stag = reduce || listMode ? 0 : I.stagger/1000;
    const tReveal = LD + LH;
    const stagSpan = Math.max(0,N-1)*stag;
    const flyDelay = r => N > 1 ? stagSpan * easeOutQuad(r/(N-1)) : 0;   // shrinking gaps: first cards clearly one by one
    if (!imagesReady && !introSkipped && I.play && it > tReveal && introStart > 0){ introStart += (it - tReveal) * 1000; }   // hold on the logo
    const doRipple = !reduce && !listMode && I.settleScale > 1.001;
    const tR0 = tReveal + stagSpan + flight*0.8;                 // ripple starts as the last cards land
    const tSettled = doRipple ? tR0 + I.rippleSpread + I.rippleDur : tReveal + stagSpan + flight;
    const tText = doRipple ? tR0 + 0.1 : tReveal + stagSpan + flight*0.55;      // text rises as the cards ripple down
    const tEnd = Math.max(tSettled, tText + I.textIn);
    if (introSkipped && !introDone){                     // skipped: play the rest faster (ramping 1× → 3×) instead of cutting to the end
      skipIt += dt * lerp(1, 3, easeInOutCubic(clamp((now - skipAt) / 350)));
      it = Math.max(it, skipIt);
      if (it >= tEnd) introStart = now - 60000;
    }
    if (it >= tEnd + 0.4 && !stage.classList.contains('ready')) stage.classList.add('ready');
    if (!introDone && it >= tEnd){ introDone = true; if (exId === -1) lock(false); try{ sessionStorage.setItem('orbitIntroSeen','1'); }catch(e){} }
    else if (!introDone && !introSkipped) lock(I.lockScroll);

    // ---- scroll + ambient
    // ---- spin: auto-rotation (linear, constant) + drag/scroll momentum (exponential friction)
    if (!spinDir) spinDir = S.direction === 'clockwise' ? 1 : -1;
    const holding = cards.some(c => c.el._hover || c.el === document.activeElement);
    const cruise = (reduce || holding || !introDone || exId !== -1) ? 0 : S.autoSpeed * Math.PI/180 * spinDir;
    spinV = lerp(spinV, cruise, 1 - Math.pow(1 - S.ease, dt*60));      // frame-rate independent lerp back to cruise
    spin += spinV * dt;
    const par = reduce ? 0 : S.mouseParallax;
    const g = 0;
    // ---- choreography (in viewport heights of scroll): hero text out → statement in → words read → cards land in the grid
    const C = V.Choreography, cvw = innerWidth, cvh = innerHeight, wy = scrollY, u = wy / cvh;
    const heroAway = clamp(u / C.heroOut);
    const stIn = clamp((u - C.heroOut*0.9) / C.statementIn);
    const listMode0 = isList(V), stTopV = (secs.stTop || 0) - wy;
    // phones: the paragraph reads in from when its top is 85% down the screen until its end is just past the middle
    const readP = listMode0 ? clamp((cvh*0.85 - stTopV) / (cvh*0.3 + (secs.stH || 1)))
                            : clamp((u - C.heroOut*0.9 - C.statementIn) / C.read);
    const mStart = C.heroOut*0.9 + C.statementIn + C.read + 0.1;
    const mph = clamp((u - mStart) / C.exit);                 // orbit leaves while the work rises from below
    const exO = easeInOutCubic(mph);
    const dir = S.direction === 'clockwise' ? 1 : -1;
    baseRot = spin + mxS*0.35*par + L.startAngle*Math.PI/180;
    const tilt = (L.tilt + myS*6*par) * Math.PI/180;
    const sT=Math.sin(tilt), cT=Math.cos(tilt);
    const span = Math.min(innerWidth, innerHeight*1.6);
    const R = 0.5*L.radius*span, persp = L.perspective;
    lastR = R;
    // responsive: below the size the layout was designed at, cards and the orbit's offsets shrink with the window
    const RS = V.Responsive;
    const rk = (!isMob && RS.scaleWithScreen) ? clamp(span / RS.referenceWidth, RS.minScale, 1) : 1;
    // text to keep clear, each weighted by how visible it is (rects re-read 4×/s). The paragraph is always kept
    // clear, so front cards fade out under its last lines instead of colliding with them; the hero only with clearText.
    if (!txtClear || now - txtClear.t > 250){
      const pad = RS.padding, list = [], sr = stage.getBoundingClientRect(), ox = sr.left + sr.width/2, oy = sr.top + sr.height/2;
      [[RS.clearText ? centre : null, 1 - heroAway], [statementEl, stIn]].forEach(([el, wt]) => {
        if (!el || wt < 0.05) return;
        const r = el.getBoundingClientRect(); if (!r.width) return;
        list.push({ l: r.left - pad - ox, r: r.right + pad - ox, t: r.top - pad - oy, b: r.bottom + pad - oy,
                    a: (r.width + 2*pad)*(r.height + 2*pad), wt });
      });
      txtClear = { t: now, list };
    }

    // ---- case view progress (time-based, restarts from the current value so it's interruptible)
    if (exId !== -1){
      const tt = clamp((now - exT0)/1000/exDur);
      exP = lerp(exFrom, exTo, easeSheet(tt));
      if (tt >= 1 && exTo === 0){ exId = -1; exP = 0; if (introDone) lock(false); }
    }

    // ---- first pass: ring positions, front card, flight order
    // (per-frame code allocates nothing: pose objects are reused and loops are plain for-loops)
    const poses = poseBuf;
    while (poses.length < order.length) poses.push({ ci:0, k:0, a:0, sn:0, sx:0, sy:0, ps:1 });
    poses.length = order.length;
    let frontCi = -1, best = -2, frontPose = null;
    // auto-centre: shift the ring so its full projected height (back card top → front card bottom) sits
    // in the middle of the screen, whatever the window shape; phones keep their own offset
    let ringCY = L.centreY*rk;
    if (!isMob){
      const hC = V.Cards.width * (ASPECT[V.Cards.aspect] || 9/16) * rk / 2;
      const psB = persp/Math.max(120, persp + R*cT), psF = persp/Math.max(120, persp - R*cT);
      const top = -R*sT*psB - hC*Z.back, bot = R*sT*psF + hC*Z.front;
      ringCY = -(top + bot)/2 + L.centreY*rk;
    }
    if (cueDirty && cueTopPx !== null && !isMob){
      cueDirty = false;
      const ar0 = ASPECT[V.Cards.aspect] || 9/16, w0 = V.Cards.width*rk, h0 = w0*ar0; let minTop = Infinity;
      for (let i = 0; i < 180; i++){
        const th = i/180*TAU, x = R*Math.cos(th), z = R*Math.sin(th), ps = persp/Math.max(120, persp - z*cT), sn = Math.sin(th);
        const os = sn >= 0 ? lerp(Z.sides, Z.front, sn) : lerp(Z.sides, Z.back, -sn);
        const sx = x*ps + L.centreX*rk, top = innerHeight/2 + z*sT*ps + ringCY - h0*os/2;
        if (Math.abs(sx) < w0*os/2 + 14 && top > cueTopPx + 20) minTop = Math.min(minTop, top);
      }
      heroCue.style.height = Math.round(clamp((minTop === Infinity ? cueTopPx + 176 : minTop) - cueTopPx - 26, 48, 150)) + 'px';
    }
    for (let k = 0; k < order.length; k++){
      const o = poses[k], th = Math.PI/2 + k*step - baseRot;
      const x = R*Math.cos(th), z = R*Math.sin(th);
      const ps = persp/Math.max(120, persp - z*cT);
      let a = (th - Math.PI/2) % TAU; if (a > Math.PI) a -= TAU; if (a <= -Math.PI) a += TAU;   // angle from the front
      o.ci = order[k]; o.k = k; o.a = a; o.sn = Math.sin(th); o.sx = x*ps + L.centreX*rk; o.sy = z*sT*ps + ringCY; o.ps = ps;
      if (o.sn > best){ best = o.sn; frontCi = o.ci; }
    }
    // flight order is fixed at the intro's start so cards don't reshuffle mid-flight
    if (!flightRank || flightRank.n !== N || flightRank.mode !== I.order){
      const idx = poses.map((o,j)=>j);
      if (I.order === 'front first') idx.sort((a,b)=>poses[b].sn - poses[a].sn);
      else if (I.order === 'back first') idx.sort((a,b)=>poses[a].sn - poses[b].sn);
      flightRank = { n:N, mode:I.order, rank: idx.reduce((m,j,r)=>(m[poses[j].ci]=r, m), {}) };
    }

    // stacking rank by depth; a card whose rank rises has just passed in front of a neighbour
    if (L.stacking === 'depth (pops)' && introDone){
      const ranked = rankBuf; ranked.length = poses.length;
      for (let j = 0; j < poses.length; j++) ranked[j] = poses[j];
      ranked.sort(byDepth);
      for (let r = 0; r < ranked.length; r++){
        const o = ranked[r], c = cards[o.ci];
        if (c.rank !== undefined && r > c.rank){
          // only ease the swap if it is visible — i.e. the card it just passed actually overlaps it on screen
          const ka = o.sn>=0 ? lerp(Z.sides, Z.front, o.sn) : lerp(Z.sides, Z.back, -o.sn), ahw = c.w*ka/2, ahh = c.h*ka/2;
          for (let j = c.rank; j < r; j++){
            const other = ranked[j]; if (!other || other.ci === o.ci) continue;
            const oc = cards[other.ci], kb = other.sn>=0 ? lerp(Z.sides, Z.front, other.sn) : lerp(Z.sides, Z.back, -other.sn);
            if (Math.abs(o.sx - other.sx) < ahw + oc.w*kb/2 && Math.abs(o.sy - other.sy) < ahh + oc.h*kb/2){ c.swapT0 = now; break; }
          }
        }
        c.rank = r;
      }
    }

    const ar = ASPECT[V.Cards.aspect] || 9/16;

    const exiting = mph > 0.01;
    if (GL.ok) GL.sync(V);
    if (stage._ex !== exiting){ stage._ex = exiting; stage.classList.toggle('exiting', exiting); }
    const ringGone = mph >= 1 && exId === -1;          // all cards have left: skip their per-frame work entirely
    put(ring, 'visibility', ringGone ? 'hidden' : '');
    if (!ringGone && !listMode) for (let pi = 0; pi < poses.length; pi++){ const o = poses[pi];
      const c = cards[o.ci], el = c.el, sn = o.sn, t = (sn+1)/2;

      // orbit pose
      let os = sn>=0 ? lerp(Z.sides, Z.front, sn) : lerp(Z.sides, Z.back, -sn);
      if (Z.perspectiveSize) os *= o.ps;
      const f = Math.pow(1-t, D.falloff);
      let sx = o.sx, sy = o.sy, sc = os * rk;
      let op = lerp(1, D.backOpacity, f), bl = D.backBlur*bK*f*f, gr = f*D.backGreyscale, gb = 0;   // gb: extra blur only the WebGL path draws

      // intro: fly in from the camera — strong ease-out, big → settled, blur clears, fade in early
      const e = clamp((it - tReveal - flyDelay(flightRank.rank[o.ci])) / flight);
      if (e < 1){
        if (reduce){ op *= e; }
        else {
          // depth z eases from near the camera to the ring; scale = 1/z, and position scales with it
          // around the vanishing point (the logo), so size and travel always agree — no sliding
          const ez = easeOut(e);                                        // gentle: the scale-down stays visible all the way in
          const z0 = 1/I.fromScale, zz = lerp(z0, 1, ez), d = 1/zz;
          sx = o.sx * d; sy = o.sy * d; sc = os * rk * d;              // rk: same screen-size scale the card settles at (no snap on landing)
          // no live CSS blur here (it re-rasterised 2.4×-scaled cards); the WebGL path draws the depth of field instead
          const near = clamp((d - 1) / (I.fromScale - 1 || 1)); gb += I.fromBlur*bK * near * near;
          op *= easeOutQuad(clamp(e / 0.18));
        }
      }

      // settle → ripple: every card lands settleScale× bigger; then a wave starting at the front of the ring and
      // running round both sides to the back springs each one down to size (one overshoot, then it settles)
      if (doRipple){
        const rt = (it - tR0 - I.rippleSpread * Math.abs(o.a) / Math.PI) / I.rippleDur;
        const sp = rt <= 0 ? 0 : rt >= 1 ? 1 : 1 - Math.exp(-5.5*rt) * Math.cos(3*Math.PI*rt);
        sc *= lerp(I.settleScale, 1, sp);
      }

      // stacking: sorting by depth swaps two overlapping cards the instant they pass each other at the front
      // (the "pop"). Deck order never swaps neighbours: each card slides over the one ahead of it, like a fanned
      // deck. The only reorder is at the very back, where the card fades out and back in so the swap is hidden.
      let zr;
      if (L.stacking === 'depth (pops)'){
        // nearer is always on top. After the intro the order is the exact depth rank (t*100 rounded to whole
        // z-indexes tied for the cards near the front, and ties fell back to card order, i.e. the wrong one could win)
        zr = (introDone && c.rank !== undefined) ? 10 + c.rank * 80 / Math.max(1, poses.length - 1) : t*100;
        // eased swap: the card that just moved above a neighbour dissolves in (opacity + a 1.5px blur, strong
        // ease-out, 240ms) instead of snapping, so the overlap reads as one card passing in front of another
        const sw = c.swapT0 ? clamp((now - c.swapT0) / 240) : 1;
        if (sw < 1 && g < 0.5 && exId === -1){ const m = easeOutQuint(sw); op *= lerp(0.45, 1, m); bl += (1-m)*1.5; }
      }
      else {
        zr = 50 + (dir * o.a / Math.PI) * 49;
        // the one reorder happens as a card passes the very back: soften it with a short, partial dip
        // (it used to fade the back card out over ~7s, leaving a hole at the top of the ring)
        if (c.prevA !== undefined && Math.abs(o.a - c.prevA) > Math.PI) c.wrapT0 = now;
        c.prevA = o.a;
        const ww = c.wrapT0 ? clamp((now - c.wrapT0) / 320) : 1;
        if (ww < 1) op *= lerp(lerp(0.5, 1, easeOutQuint(ww)), 1, g);
      }
      let z = Math.round(lerp(zr, 60, g));

      // exit: the intro in reverse — each card flies out past the camera (front first), blurring and fading;
      // the work section only starts rising once the orbit has gone
      if (mph > 0 && reduce){ op *= 1 - mph; }
      else if (mph > 0){
        const fs = C.flyStagger, ef = clamp(mph*(1+fs) - fs*(flightRank.rank[o.ci]/Math.max(1, N-1)));
        const eo = easeInOutCubic(ef);
        const d = 1 / lerp(1, 1/C.flyScale, eo);                 // depth → scale, around the vanishing point
        sx *= d; sy *= d; sc *= d;
        gb += C.blur*bK * eo * eo;
        op *= 1 - easeInOutCubic(clamp(ef / 0.6));                // gone by 60% of the flight: big half-transparent layers are what costs frames
      }

      // keep the text readable: a card covering it fades (and softens) away, smoothed so it never flickers
      if (txtClear){
        const hw = c.w*sc/2, hh = c.h*sc/2; let cov = 0;
        for (const T of txtClear.list){
          const ix = Math.min(sx + hw, T.r) - Math.max(sx - hw, T.l), iy = Math.min(sy + hh, T.b) - Math.max(sy - hh, T.t);
          if (ix > 0 && iy > 0) cov = Math.max(cov, (ix*iy) / Math.min(4*hw*hh, T.a) * T.wt);
        }
        const fz = clamp((cov - RS.tolerance) / RS.fadeRange), tgt = fz*fz*(3 - 2*fz);   // smoothstep: decisive, no half-ghosts
        c.clr = (c.clr || 0) + (tgt - (c.clr || 0)) * (1 - Math.exp(-dt / 0.18));
        if (c.clr > 0.002) op *= 1 - easeInOutCubic(c.clr);          // opacity only: a blur here toggled filters and re-rasterised cards
      } else c.clr = 0;

      // case view: this card expands from wherever it is; everything else steps back fast (≈200ms of the 500)
      if (exId !== -1){
        if (o.ci === exId){
          const ew = Math.min(innerWidth*V.Expand.width, (innerHeight*0.72)/ar);
          sx = lerp(sx, 0, exP); sy = lerp(sy, -24 + scrollY, exP); sc = lerp(sc, ew/c.w, exP);
          op = lerp(op, 1, exP); bl = lerp(bl, 0, exP); gr = lerp(gr, 0, exP); z = 400;
          caseInfo.style.top = (innerHeight/2 - 24 + (ew*ar)/2 + 20) + 'px';
        } else op *= 1 - clamp(exP*2.5);
      }

      // frames: the front card is "selected" — switches instantly (it changes too often to fade)
      const mode = F.show;
      let fo = mode==='always' ? 1 : mode==='never' ? 0 : mode==='hover' ? (el._hover?1:0) : 0;
      if (o.ci === frontCi) frontPose = { sx, sy, w: c.w*sc, h: c.h*sc, z, lbl: c.lbl.textContent, e };
      if (mode !== 'never') fo = Math.max(fo, g >= 0.98 ? 1 : 0, o.ci===exId && exP>0.98 ? 1 : 0);
      if (e < 1) fo = 0;
      if (GL.on){ GL.add(c, o.ci, sx, sy, sc, op, z, reduce ? 0 : bl + gb, gr, fo, V.Cards.shadow*t*(1-g)); continue; }
      // DOM fallback
      el.style.transform = `translate3d(${sx.toFixed(1)}px,${sy.toFixed(1)}px,0) scale(${sc.toFixed(4)})`;
      put(el, 'opacity', q(op, 0.005).toFixed(3));
      // filter stays on (or off) for the whole scroll; toggling it per card re-rasterised the card and made it jump
      const filterOn = D.backBlur > 0 || D.backGreyscale > 0;
      if (c.farOk){
        // depth look comes from the pre-rendered far image fading in; only short-lived blur (intro flight, exit,
        // eased swap) still uses a live filter, and it switches off entirely once those finish
        const depthBl = D.backBlur*bK*f*f, extra = bl - depthBl;
        const fo2 = q(lerp(Math.pow(f, 1.5), 0, g), 0.01);
        put(c.far, 'opacity', fo2.toFixed(2)); put(c.far, 'visibility', fo2 < 0.01 ? 'hidden' : 'visible');   // invisible layers aren't drawn at all
        put(el, 'filter', extra > 0.05 && !reduce ? `blur(${q(extra, 0.25).toFixed(2)}px)` : 'none');
      } else {
        put(el, 'filter', filterOn ? `grayscale(${q(gr, 0.1).toFixed(1)}) blur(${q(Math.max(0, bl), e < 1 ? 0.25 : 0.5).toFixed(2)}px)` : 'none');
      }
      put(el, 'zIndex', String(z));
      put(el, '--sh', q(V.Cards.shadow*t*(1-g), 0.01).toFixed(2));
      const foV = fo;
      put(el, '--fo', foV.toFixed(2));
      if (foV > 0 && !exiting) put(el, '--s', F.keepCrisp ? q(Math.max(0.05, sc), 1/64).toFixed(4) : '1');
    }

    if (GL.on) GL.draw(V, exiting, dt, ringGone);

    // selection overlay (front-only mode): sized in real pixels, not scaled → crisp lines, no shimmer
    const showSel = F.show === 'front only' && frontPose && frontPose.e >= 1 && heroAway < 0.4 && exId === -1 && !(cards[frontCi] && cards[frontCi].clr > 0.3);
    put(sel, 'opacity', showSel ? '1' : '0');
    if (frontPose && F.show === 'front only'){
      const W = Math.round(frontPose.w), H = Math.round(frontPose.h);
      put(sel, 'width', W + 'px'); put(sel, 'height', H + 'px');
      sel.style.transform = `translate3d(${(frontPose.sx - W/2).toFixed(1)}px,${(frontPose.sy - H/2).toFixed(1)}px,0)`;
      put(sel, 'zIndex', '140');   // selection outline draws above every card, like Figma's, so the front piece reads even when the next card overlaps it
      if (selLbl.textContent !== frontPose.lbl) selLbl.textContent = frontPose.lbl;
    }

    if (frontCi !== front && frontCi >= 0){
      front = frontCi;
      const c = cards[front];
      clearTimeout(caption._t);
      caption.classList.remove('pre'); caption.classList.add('out');
      caption._t = setTimeout(()=>{
        nameEl.textContent = c.title; figEl.textContent = 'Fig. ' + c.fig;
        caption.classList.replace('out','pre');
        caption.offsetWidth;
        caption.classList.remove('pre');
      }, 120);
    }

    // ---- text + chrome
    if (it >= tText && !centre.classList.contains('in')){ centre.classList.add('in'); stage.classList.add('in');
      setTimeout(() => document.documentElement.classList.add('ui-in'), reduce ? 0 : 650); }   // the switch follows the hero text in
    const away = clamp(g*2.5) , exAway = clamp(exP*2.5);
    if (isList(V)){
      put(centre, 'opacity', '1'); put(centre, 'filter', 'none'); put(centre, 'pointerEvents', '');
      put(centre, 'transform', 'none');
    } else {
      put(centre, 'opacity', q((1-heroAway)*(1-exAway), 0.005).toFixed(3));
      put(heroCue, '--co', q(1-clamp(heroAway*1.6), 0.005).toFixed(3));
      put(centre, 'filter', (heroAway > 0.01 && !reduce) ? `blur(${(easeInOutCubic(heroAway)*C.blur*bK).toFixed(2)}px)` : 'none');
      put(centre, 'pointerEvents', heroAway > 0.5 || exAway > 0.5 ? 'none' : '');
      put(centre, 'transform', `translate(-50%, calc(-50% - ${(easeOutQuad(heroAway)*16).toFixed(1)}px))`);
    }
    put(stage, 'overflow', exId !== -1 ? 'visible' : '');
    chromeEls.forEach(el => put(el, 'visibility', (heroAway > 0.3 || exAway > 0.5) ? 'hidden' : ''));

    // ---- case chrome
    put(caseBg, 'opacity', q(exP*0.96, 0.005).toFixed(3));
    const ip = clamp((exP-0.6)/0.4);
    put(caseInfo, 'opacity', ip.toFixed(3)); put(caseClose, 'opacity', ip.toFixed(3));

    // ---- logo: outline traces (ring, then swirl), fill settles, then it lifts into the name block's mark
    if (!markRect) measureMark();
    // logo appears: Tide — the oval is drawn by two pens from the left tip that meet on the right, the wave writes
    // itself left to right and, as its pen passes the crest, a second pen peels off and winds the curl into its eye
    const appear = clamp(it / LD), settle = 1, tk = LD / 1.35;
    const pen = (el, t0, dur, ez) => put(el, 'strokeDashoffset', (1 - ez(clamp((it - t0*tk) / (dur*tk)))).toFixed(4));
    pen(penTop, 0.05, 1.0, easeDraw); pen(penBot, 0.05, 1.0, easeDraw);
    pen(penWave, 0.14, 0.9, easeDraw); pen(penCurl, T_FORK, 0.64, easeCurl);
    const glideDur = Math.max(0.5, tText - tReveal - 0.15);
    const glide = ease(clamp((it - tReveal - 0.1) / glideDur));         // lands just before the text rises
    const tx = lerp(0, markRect.cx, glide), ty = lerp(0, markRect.cy, glide);
    const msc = lerp(I.logoScale*settle, (markRect.w/97.55) || 1, glide);
    let mOp = I.logoStays ? 1 : 1 - ease(clamp((it - tReveal) / 0.4));
    if (glide >= 1 || reduce) mOp = 0;
    introMark.style.transform = `translate(calc(-50% + ${tx.toFixed(1)}px), calc(-50% + ${ty.toFixed(1)}px)) scale(${msc.toFixed(3)})`;
    put(introMark, 'opacity', mOp.toFixed(3));
    put(centreMark, 'opacity', (glide >= 1 || reduce) ? '1' : '0');


    // ---- statement: words read in with scroll (opacity only); the opening sentence starts already read
    const y = getScrollY(), vh = innerHeight;
    // letters wave in: unread grey → your gradient (orange → red → pink → purple → blue) → ink, one after another
    if (statementWords.length){
      const W = V.Wave, n = statementWords.length, tNow = now/1000;
      waveHead += (readP*n - waveHead) * (W.scrub > 0 ? 1 - Math.exp(-dt / W.scrub) : 1);
      const dark = isDark(V), inkS = dark ? V.Theme.darkInk : V.Text.ink, bgS = dark ? V.Theme.darkBackground : V.Text.background;
      if (waveTheme !== inkS + bgS){ waveTheme = inkS + bgS; waveInk = hex(inkS); waveBg = hex(bgS); }   // parsed once per theme, not per frame
      const ink = waveInk, bg = waveBg;
      const start = mixInto(waveStart, bg, ink, W.startOpacity), dur = Math.max(0.05, W.duration), pk = W.peak;
      const active = Math.round(waveHead);
      for (let i = 0; i < n; i++){
        const c = statementWords[i], on = i < active;
        if (on !== c._on){ c._on = on; c._t0 = tNow; }
        let col;
        if (reduce) col = on ? ink : start;
        else if (on){
          const e = (tNow - c._t0) / dur;
          if (e >= 1) col = ink;
          else if (e < pk) col = mixInto(waveCol, start, WAVE[0], easeOutQuad(e/pk));
          else { const k = Math.pow((e - pk)/(1 - pk), 2) * WAVE.length;      // ease-in through the stops, then into ink
                 const j = Math.floor(k), f = k - j; col = mixInto(waveCol, WAVE[j], j+1 < WAVE.length ? WAVE[j+1] : ink, f); }
        } else {
          const e = clamp((tNow - c._t0) / (dur*0.5));
          col = mixInto(waveCol, ink, start, e);
        }
        // a letter that has settled (on and done, or off and faded) keeps its last colour: no string is built for it
        const key = (col[0]|0)*65536 + (col[1]|0)*256 + (col[2]|0);
        if (c._col !== key){ c._col = key; c.style.setProperty('-webkit-text-fill-color', `rgb(${col[0]|0},${col[1]|0},${col[2]|0})`); }
      }
    }
    // statement: blurs in, then blurs out as the orbit leaves
    if (listMode0){
      // phones: it simply fades and rises in as it comes on screen (compositor-only), and stays
      const k = reduce ? 1 : easeOutQuint(clamp((cvh*0.95 - stTopV) / (cvh*0.3)));
      put(statementEl, 'opacity', q(k, 0.01).toFixed(2));
      statementEl.style.transform = k >= 1 ? 'none' : `translateY(${((1-k)*20).toFixed(1)}px)`;
      // and the line + "Scroll down for works" under it, the same way
      const k2 = reduce ? 1 : easeOutQuint(clamp((cvh*0.95 - ((secs.scTop || 0) - wy)) / (cvh*0.3)));
      put(scrollCueEl, 'opacity', q(k2, 0.01).toFixed(2));
      put(scrollCueEl, 'transform', k2 >= 1 ? 'none' : `translateY(${((1-k2)*20).toFixed(1)}px)`);
    } else {
    const stOut = clamp(mph*3);
    put(statementEl, 'opacity', q(stIn * (1 - stOut), 0.005).toFixed(3));
    const stBlur = (1 - easeOutQuint(stIn)) * C.blur*bK + easeInOutCubic(stOut) * C.blur*bK;
    put(statementEl, 'filter', (stBlur > 0.05 && !reduce) ? `blur(${stBlur.toFixed(2)}px)` : 'none');
    statementEl.style.transform = `translate(-50%, calc(-50% + ${((1-easeOutQuint(stIn))*12 - easeInOutCubic(stOut)*16).toFixed(1)}px)) scale(${(1 + easeInOutCubic(stOut)*0.04).toFixed(4)})`;
    }
    // work cells: each one fades and rises in from below as it enters the screen (compositor-only: no filter)
    for (const cell of workCells){
      const top = cell._docTop - wy;
      // the tile forms as it comes up the screen: first its lines draw (grid lines, then the frame out from two corners,
      // the handles popping in), then the picture resolves out of the gradient and the title fades in
      const p = reduce ? 1 : clamp((cvh - top) / (cvh * 0.62));
      const ln = easeOutQuint(clamp(p / 0.6)), im = easeInOutCubic(clamp((p - 0.28) / 0.72)), k = easeOutQuint(clamp(p / 0.75));
      const lq = q(ln, 0.01).toFixed(2), iq = q(im, 0.01).toFixed(2);
      if (cell._ln !== lq){ cell._ln = lq; cell.style.setProperty('--ln', lq); }
      if (cell._im !== iq){ cell._im = iq; cell.style.setProperty('--im', iq); }
      put(cell, 'transform', (k >= 1 || reduce) ? 'none' : `translateY(${((1-k)*28).toFixed(1)}px)`);
      put(cell, 'willChange', (k >= 1 || k <= 0 || reduce) ? 'auto' : 'transform');   // a layer only while it moves
    }
    // ---- dock + edge blur appear once the work is on screen
    // theme switch: away while scrolling down, dissolves back on the way up (6px of travel decides, so jitter doesn't flicker it)
    const sdy = y - uiLastY;
    if (y < 60 || Math.abs(sdy) > 6){ const hide = y >= 60 && sdy > 0; uiLastY = y;
      if (hide !== uiHide){ uiHide = hide; document.documentElement.classList.toggle('ui-hide', hide); } }
    const showDock = pvOpen || y + vh*0.6 > secs.wkTop;   // the bar stays up while a project is open
    if (dock._on !== showDock){ dock._on = showDock; dock.classList.toggle('show', showDock); mTop.classList.toggle('show', showDock && isList(V)); mTop.inert = !showDock; document.documentElement.classList.toggle('bar-on', showDock); edgeBlur.classList.toggle('show', showDock); if (exId === -1) dock.inert = !showDock; }
    if (F.gradient && F.gradientSpin){ gAngle = ((gAngle ?? F.gradientAngle) + F.gradientSpin*dt) % 360; paintFrame(gAngle); } else gAngle = null;
  }

