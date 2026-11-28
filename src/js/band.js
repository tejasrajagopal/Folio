  // ---- gradient band: the statement → work transition. A dotted, grainy gradient (the site's stops) cut into stepped bars
  // on a curved profile. The canvas sits IN the page (not fixed to the screen), so it scrolls exactly with the content on
  // every device, including phones' native scrolling, with nothing to catch up. It's only as tall as the band, draws only
  // the rows on screen, and redraws at most 30 times a second for the colour flow; off screen it does nothing.
  const BAND_DEFAULT_MODE = 5;   // 5 Halftone (live). 7 is the sweep, drawn by sweep.js instead of this canvas
  (() => {
    const cv = document.getElementById('bandCv');
    const gl = cv && cv.getContext('webgl', { antialias:false, premultipliedAlpha:true, alpha:true, preserveDrawingBuffer:false });
    if (!gl) return;
    const B = { thickness:.78, wave:.055, waves:1, lobes:.015, fadeTop:.32, fadeBottom:.34, blur:120, grain:.43,   // blur + grain: the Figma layer blur (120) and mono noise (white, 43%)
      pitch:6, dotSize:1.6, density:.62, dotOpacity:.85, tilt:8,
      // shape, as shares of the screen WIDTH so desktop and phone get the same silhouette: bars across, curve height, thickness
      bars:58, barsOn:0, curveW:.175, thickW:.29,   // barsOn 0: a smooth edge (`bars` then only sets how tight its ripple is)
      // halftone (mode 5): dot spacing in px, and a slow swell that travels through the dots at the dissolving edges
      halfPitch:6.5, halfPulse:.57, halfPulseSpeed:.95,
      // soft (mode 8), matched to the owner's screen recording: a blurred band with film grain. Orange on top (lifting at the
      // sides), red-pink, purple, and two blue-purple pools along the bottom; pastel (washed with white); very soft edges.
      softThick:.68, softDip:.09, softLobe:.07, softFadeT:.3, softFadeB:.36, softWash:.24, softGrain:.07, softBlue:.62, softSway:.15,
      // soft on desktop is the in-between itself: taller than the screen (softCover × screen height), with its lower edge
      // tucked softUnder × screen height behind the first row of work, so no white shows above or below it mid-scroll
      softCover:1.5, softUnder:.45,
      ripple:.043, rippleSpeed:.5, rippleScroll:1.5, flowRings:2.8, flowSpeed:.18, flowScroll:1, travelScroll:.5, settle:.6,
      stops:['#F58E3F','#ED583E','#F06F8A','#8D5FB7','#244EE7'],
      // how it moves. 1 Flow: colour layers drift through the band (the original). 2 Rise: bars grow up from the middle outward
      // and the outline morphs flat → curve → peak as it crosses the screen. 3 Pulse: rings of colour breathe out from a hot core.
      // 4 Swipe: the colours sweep across in a diagonal staircase. 5 Halftone: the band dissolves into growing dots at its edges
      // instead of a blur. 6 Stretch: thin and calm at rest, it swells and brightens with the speed of your scroll.
      mode: BAND_DEFAULT_MODE };
    const FS = `
    precision highp float;
    uniform vec2 uRes, uVP; uniform float uDpr, uTop, uThickPx, uWave, uWaves, uFadeT, uFadeB, uGrain;
    uniform float uMode, uProg, uVel, uCurvePx, uHp, uHPulse, uHPh;
    uniform float uSoftDip, uSoftLobe, uSoftWash, uSoftGrain, uSoftBlue, uSoftSway;
    uniform float uPitch, uDot, uDensity, uDotA, uBarW, uBars, uTilt, uRipple, uRipPh, uFlRings, uFlPh, uWvPh;
    uniform vec3 uS0, uS1, uS2, uS3, uS4;
    float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }   // no sin(): stays random on every GPU
    vec3 ramp(float t){
      if (t < 0.2925) return mix(uS0, uS1, t/0.2925);
      if (t < 0.5147) return mix(uS1, uS2, (t-0.2925)/0.2222);
      if (t < 0.6281) return mix(uS2, uS3, (t-0.5147)/0.1134);
      return mix(uS3, uS4, clamp((t-0.6281)/0.3719, 0.0, 1.0));
    }
    #define IS(n) (uMode > n - 0.5 && uMode < n + 0.5)
    float edgeA(float v){ return smoothstep(0.0, uFadeT, v) * (1.0 - smoothstep(1.0 - uFadeB, 1.0, v)); }
    // How far the band's edge is pushed down at screen x (and u, the position across the screen, -0.5 … 0.5).
    // Smooth by default: one continuous wavy curve. With bars on, the edge steps per bar and tilts within each one.
    float bendAt(float x, out float u){
      float bi = x / uBarW, xr = 0.0;
      if (uBars > 0.5){ bi = floor(bi); float cx = (bi + 0.5)*uBarW; xr = x - cx; x = cx; }
      u = x / uVP.x - 0.5;
      float au = clamp(abs(u)*2.0, 0.0, 1.0), curve = (1.0 - cos(3.14159265*au))*0.5, prof = curve;
      // 2 Rise: the outline morphs flat → curve → straight-sided peak as the band crosses the screen
      if (IS(2.0)) prof = mix(mix(0.0, curve, smoothstep(0.08, 0.42, uProg)), au, smoothstep(0.55, 0.9, uProg));
      return uCurvePx*prof + uWave*0.25*uVP.x*cos(6.2831853*uWaves*(u - uWvPh))
           + uRipple*uVP.x*0.625*sin(bi*0.55 - uRipPh) + xr*tan(uTilt*0.0174533);
    }
    void main(){
      vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uDpr;      // CSS px inside the canvas
      if (IS(8.0)){
        // 8 Soft: the top edge lifts at the sides and sags in the middle; the bottom edge hangs in two pools
        float uu = px.x / uVP.x - 0.5;
        float bt = uSoftDip*uVP.x*cos(6.2831853*uu);
        float bb = -uSoftLobe*uVP.x*cos(12.5663706*(uu - uWvPh*uSoftSway));
        float sv = (px.y - uTop - bt) / max(1.0, uThickPx + bb - bt);
        float sa = smoothstep(0.0, uFadeT, sv) * (1.0 - smoothstep(1.0 - uFadeB, 1.0, sv));
        if (sa <= 0.0){ gl_FragColor = vec4(0.0); return; }
        vec3 bl = mix(uS3, uS4, uSoftBlue), sc;
        if (sv < 0.18) sc = uS0;                                           // orange holds through the soft top edge
        else if (sv < 0.34) sc = mix(uS0, uS1, (sv-0.18)/0.16);
        else if (sv < 0.44) sc = mix(uS1, uS2, (sv-0.34)/0.10);
        else if (sv < 0.58) sc = mix(uS2, uS3, (sv-0.44)/0.14);
        else sc = mix(uS3, bl, clamp((sv-0.58)/0.22, 0.0, 1.0));
        // the orange is strongest at the sides and thins toward the middle, as in the recording
        sa *= mix(1.0, 0.5, (1.0 - clamp(abs(uu)*2.0, 0.0, 1.0)) * (1.0 - smoothstep(0.16, 0.46, sv)));
        sc = mix(sc, vec3(1.0), uSoftWash);
        sc += (hash(gl_FragCoord.xy) - 0.5) * uSoftGrain;                 // film grain: lighter and darker specks
        gl_FragColor = vec4(clamp(sc, 0.0, 1.0)*sa, sa); return;
      }
      float u, bend = bendAt(px.x, u), au = clamp(abs(u)*2.0, 0.0, 1.0);
      float v = (px.y - uTop - bend) / uThickPx, k = 1.0;
      // 2 Rise: each bar grows up from its foot, the middle first and the sides after
      if (IS(2.0)){ float h = clamp(uProg*3.2 - au*1.25, 0.0, 1.0); h = 1.0 - pow(1.0 - h, 3.0); k = max(h, 0.001); }
      // 6 Stretch: thin at rest, full height at speed
      if (IS(6.0)) k = mix(0.5, 1.0, uVel);
      if (IS(2.0)) v = 1.0 - (1.0 - v)/k; else if (IS(6.0)) v = (v - 0.5)/k + 0.5;
      float a = edgeA(v);
      if (a <= 0.0 && !IS(5.0)){ gl_FragColor = vec4(0.0); return; }
      float t = (v - uFadeT*0.35) / (1.0 - uFadeT*0.35 - uFadeB*0.35), x = t*uFlRings - uFlPh;
      // 3 Pulse: rings breathe outward from a hot core low in the middle of the band
      if (IS(3.0)){ vec2 q = vec2(u*uVP.x/uThickPx*0.85, (v - 0.68)*1.5); x = length(q)*uFlRings*1.5 - uFlPh*1.6; }
      // 4 Swipe: the layers lean, so the flow reads as colour sweeping across in steps
      if (IS(4.0)) x = (t + u*1.7)*uFlRings - uFlPh*1.8;
      t = clamp(1.0 - abs(fract(x*0.5)*2.0 - 1.0), 0.0, 1.0);
      vec3 c = ramp(t);
      if (IS(6.0)) c = mix(c, vec3(1.0), 0.22*(1.0 - uVel));                         // calmer, paler at rest
      c = mix(c, vec3(1.0), uGrain * step(0.5, hash(gl_FragCoord.xy + 17.0)));     // the Figma noise: fine white grain at 43%
      if (IS(5.0)){
        // 5 Halftone: no blur at the edges; the band breaks into dots that grow until they merge into solid colour
        float hp = uHp; vec2 hc = (floor(px / hp) + 0.5)*hp;
        float uc, ac = edgeA((hc.y - uTop - bendAt(hc.x, uc)) / uThickPx);   // judged at the dot's centre, so every dot is round
        // the dots at the dissolving edges swell and shrink in a slow travelling wave (solid colour stays solid)
        float sw = 1.0 + uHPulse*(1.0 - ac)*sin(hc.y/(hp*5.0) + hc.x/(hp*11.0) - uHPh);
        float cov = clamp((sqrt(ac)*hp*0.80*sw - length(px - hc))*uDpr + 0.5, 0.0, 1.0);
        c += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
        gl_FragColor = vec4(c*cov, cov); return;
      }
      vec2 g = vec2(px.x, px.y - uTop), cell = floor(g / uPitch), f = g - cell*uPitch; cell = mod(cell, 4096.0);
      float r = 0.575*uDot*(0.45 + 1.25*t), d = length(f - 0.5*uPitch);            // round dots that swell with the colour
      if (IS(6.0)) r *= 0.7 + 0.9*uVel;
      c = mix(c, vec3(1.0), step(hash(cell), uDensity) * clamp((r - d)*uDpr + 0.5, 0.0, 1.0) * uDotA * smoothstep(0.04, 0.35, a));
      c += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
      gl_FragColor = vec4(c*a, a);
    }`;
    const sh = (ty, src) => { const o = gl.createShader(ty); gl.shaderSource(o, src); gl.compileShader(o); return o; };
    const prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }'));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const U = {}; ['uRes','uVP','uSoftDip','uSoftLobe','uSoftWash','uSoftGrain','uSoftBlue','uSoftSway','uMode','uProg','uVel','uCurvePx','uHp','uHPulse','uHPh','uDpr','uTop','uThickPx','uWave','uWaves','uFadeT','uFadeB','uGrain','uPitch','uDot','uDensity','uDotA','uBarW','uBars','uTilt','uShapeH','uRipple','uRipPh','uFlRings','uFlPh','uWvPh','uS0','uS1','uS2','uS3','uS4']
      .forEach(n => U[n] = gl.getUniformLocation(prog, n));
    const rgb = h => { const n = parseInt(h.slice(1), 16); return [(n>>16&255)/255, (n>>8&255)/255, (n&255)/255]; };
    B.stops.forEach((h, i) => gl.uniform3fv(U['uS'+i], rgb(h)));
    // the fixed uniforms are set once
    const set1 = (n, x) => gl.uniform1f(U[n], x);
    const applyParams = () => {
      set1('uWave', B.wave); set1('uWaves', B.waves); set1('uGrain', B.grain);
      set1('uPitch', B.pitch); set1('uDot', B.dotSize); set1('uDensity', B.density); set1('uDotA', B.dotOpacity);
      set1('uTilt', B.tilt); set1('uBars', B.barsOn ? 1 : 0); set1('uRipple', B.ripple); set1('uFlRings', B.flowRings);
      set1('uHp', Math.max(3, B.halfPitch)); set1('uHPulse', B.halfPulse);
      set1('uSoftDip', B.softDip); set1('uSoftLobe', B.softLobe); set1('uSoftWash', B.softWash); set1('uSoftGrain', B.softGrain); set1('uSoftBlue', B.softBlue); set1('uSoftSway', B.softSway);
    };
    applyParams();
    gl.enable(gl.SCISSOR_TEST);

    // the local preview can override the mode and any setting in B, live (window.FOLIO_BAND = { mode, p:{…}, rev })
    let rev = -1;
    const modeNow = () => { const pv = window.FOLIO_BAND; return (pv && pv.mode) || B.mode; };
    const syncPreview = () => { const pv = window.FOLIO_BAND; const r = pv ? (pv.rev || 0) + '|' + pv.mode : '';
      if (pv && r !== rev){ rev = r; Object.assign(B, pv.p || {}); applyParams(); sig = ''; } };
    // ---- where the band sits in the page (document px); recomputed only when the layout changes
    let L = null, sig = '';
    function place(){
      const vh = innerHeight, vw = innerWidth, list = isList(V), sc0 = Math.min(vh, vw);
      const key = [vh, vw, list, secs.wkTop, secs.ctaBot, secs.stTop].join('|');
      if (key === sig && L) return L;
      sig = key;
      const isSoft = modeNow() === 8;
      const curvePx = B.curveW*vw, bob = isSoft ? 0 : B.ripple*vw*0.625;
      // how far the shape reaches beyond its nominal top (up) and bottom (down)
      const up = isSoft ? Math.abs(B.softDip)*vw : 0, reach = isSoft ? (Math.abs(B.softDip) + Math.abs(B.softLobe))*vw : (B.wave + B.lobes)*vw + curvePx + bob;
      const thickW = isSoft ? B.softThick : B.thickW, fadeB = isSoft ? B.softFadeB : B.fadeBottom;
      let top, thick;
      if (list){
        // phones: its own space between "Get in touch" and the statement (28px under the link, 32px above the statement);
        // the band keeps the same proportions as on desktop and sits in the middle of that space
        const from = (secs.ctaBot || 0) + 28 + up, avail = (secs.stTop || 0) - 32 - reach - from + up;
        thick = Math.max(120, Math.min(avail, thickW*vw)); top = from + Math.max(0, (avail - thick)/2);
      } else {
        // desktop: it leads the work up the page, its trailing edge just over the work's top edge
        if (isSoft){ thick = Math.max(0.6, B.softCover)*vh; top = secs.wkTop + B.softUnder*vh - thick; }
        else { thick = Math.min(thickW*vw, vh*0.9); top = secs.wkTop - thick*(1 - fadeB*0.6) + vh*0.05; }
      }
      const pad = bob + 4, boxTop = Math.round(top - up - pad), boxH = Math.round(thick + reach + 2*pad);
      // Soft on desktop is taller than the screen, so its canvas is pinned to the screen (one screen tall) and the band is
      // drawn at its scrolled position each frame; desktop scrolling is driven from this same frame loop, so it stays in step.
      // Everything else keeps a canvas in the page, exactly the band's size, which scrolls natively.
      const pinned = isSoft && !list;
      const dpr = Math.min(1.25, devicePixelRatio || 1), W = Math.round(vw*dpr), H = Math.round((pinned ? vh : boxH)*dpr);
      cv.style.position = pinned ? 'fixed' : ''; cv.style.top = (pinned ? 0 : boxTop) + 'px'; cv.style.height = (pinned ? vh : boxH) + 'px';
      if (cv.width !== W || cv.height !== H){ cv.width = W; cv.height = H; }
      gl.viewport(0, 0, W, H);
      gl.uniform2f(U.uRes, W, H); gl.uniform2f(U.uVP, vw, vh); set1('uDpr', dpr); set1('uTop', top - boxTop); set1('uThickPx', thick); set1('uCurvePx', curvePx); set1('uBarW', vw / Math.max(4, B.bars));
      // halftone: the dissolve lengths are plain shares of the band (same shape on every screen); the blurred modes keep
      // edges at least as soft as the Figma layer blur
      const soft = modeNow() === 5 ? 0 : Math.min(0.45, (B.blur*2) / Math.max(1, thick));
      set1('uFadeT', isSoft ? B.softFadeT : Math.max(B.fadeTop, soft)); set1('uFadeB', isSoft ? B.softFadeB : Math.max(B.fadeBottom, soft));
      return (L = { boxTop, boxH, dpr, H, list, pinned, top });
    }

    let vel = 0;
    let shown = false, prevY = 0, lastT = 0, lastDraw = 0, flT = 0, flP = 0, rpT = 0, rpP = 0, wvT = 0, wvP = 0;
    function tick(now){
      requestAnimationFrame(tick);
      if (!V || !secs.wkTop) return;
      const dt = Math.min(0.05, (now - (lastT || now))/1000); lastT = now;
      const y = scrollY, vh = innerHeight, dy = (y - prevY)/vh; prevY = y;
      syncPreview();
      const P = place();
      // on screen at all? (phones also wait for the hero to come in)
      const on = modeNow() !== 7 && (!P.list || centre.classList.contains('in')) && P.boxTop < y + vh && P.boxTop + P.boxH > y;
      if (on !== shown){ shown = on; cv.style.visibility = on ? 'visible' : 'hidden'; }
      if (!on){ flP = flT; rpP = rpT; wvP = wvT; vel = 0; return; }
      // scroll speed, smoothed (0 at rest → 1 at a brisk scroll); only mode 6 reads it
      const sp = dt > 0 ? Math.min(1, Math.abs(dy)*vh / dt / 2200) : 0;
      vel += (sp - vel) * (1 - Math.exp(-dt / (sp > vel ? 0.12 : 0.45)));
      if (!reduce){ flT += dy*B.flowScroll*0.6 + dt*B.flowSpeed; rpT += dy*B.rippleScroll*4 + dt*B.rippleSpeed*2; wvT += dy*B.travelScroll*0.5; }
      const k = 1 - Math.exp(-dt / B.settle);
      flP += (flT - flP)*k; rpP += (rpT - rpP)*k; wvP += (wvT - wvP)*k;
      if (!P.pinned && now - lastDraw < 33 && lastDraw) return;      // a pinned canvas follows the scroll, so it draws every frame it's on screen                    // the flow is slow: 30 redraws a second is plenty
      lastDraw = now;
      set1('uRipPh', rpP); set1('uFlPh', flP); set1('uWvPh', wvP);
      set1('uMode', modeNow()); set1('uVel', reduce ? 1 : vel); set1('uHPh', rpP*B.halfPulseSpeed);
      set1('uProg', reduce ? 1 : Math.min(1, Math.max(0, (y + vh - P.boxTop) / (vh + P.boxH))));
      // only the rows that are on screen (plus a margin for scrolling between redraws)
      if (P.pinned){ set1('uTop', P.top - y); gl.scissor(0, 0, cv.width, cv.height); }
      else {
        const m = vh*0.4, r0 = Math.max(0, y - m - P.boxTop), r1 = Math.min(P.boxH, y + vh + m - P.boxTop);
        const y0 = Math.max(0, Math.floor((P.boxH - r1)*P.dpr)), h = Math.min(P.H - y0, Math.ceil((r1 - r0)*P.dpr) + 2);
        gl.scissor(0, y0, cv.width, Math.max(0, h));
      }
      gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    addEventListener('resize', () => { sig = ''; });
    requestAnimationFrame(tick);
  })();

