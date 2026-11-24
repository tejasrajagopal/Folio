  // ---- gradient band: the statement → work transition. A dotted, grainy gradient (the site's stops) cut into stepped bars
  // on a curved profile. The canvas sits IN the page (not fixed to the screen), so it scrolls exactly with the content on
  // every device, including phones' native scrolling, with nothing to catch up. It's only as tall as the band, draws only
  // the rows on screen, and redraws at most 30 times a second for the colour flow; off screen it does nothing.
  (() => {
    const cv = document.getElementById('bandCv');
    const gl = cv && cv.getContext('webgl', { antialias:false, premultipliedAlpha:true, alpha:true });
    if (!gl) return;
    const B = { thickness:.78, wave:.055, waves:1, lobes:.015, fadeTop:.32, fadeBottom:.22, blur:120, grain:.43,   // blur + grain: the Figma layer blur (120) and mono noise (white, 43%)
      pitch:6, dotSize:1.6, density:.62, dotOpacity:.85, barWidth:33, tilt:8, shapeHeight:.28,
      ripple:.025, rippleSpeed:.5, rippleScroll:1.5, flowRings:1.4, flowSpeed:.12, flowScroll:1, travelScroll:.5, settle:.6,
      stops:['#F58E3F','#ED583E','#F06F8A','#8D5FB7','#244EE7'] };
    const FS = `
    precision highp float;
    uniform vec2 uRes, uVP; uniform float uDpr, uTop, uThickPx, uWave, uWaves, uLobes, uFadeT, uFadeB, uGrain;
    uniform float uPitch, uDot, uDensity, uDotA, uBarW, uTilt, uShapeH, uRipple, uRipPh, uFlRings, uFlPh, uWvPh;
    uniform vec3 uS0, uS1, uS2, uS3, uS4;
    float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }   // no sin(): stays random on every GPU
    vec3 ramp(float t){
      if (t < 0.2925) return mix(uS0, uS1, t/0.2925);
      if (t < 0.5147) return mix(uS1, uS2, (t-0.2925)/0.2222);
      if (t < 0.6281) return mix(uS2, uS3, (t-0.5147)/0.1134);
      return mix(uS3, uS4, clamp((t-0.6281)/0.3719, 0.0, 1.0));
    }
    void main(){
      vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uDpr;      // CSS px inside the canvas
      float bi = floor(px.x / uBarW), cx = (bi + 0.5)*uBarW, xr = px.x - cx, u = cx / uVP.x - 0.5, sc = min(uVP.y, uVP.x);
      float bend = uShapeH*sc*(1.0 - cos(3.14159265*clamp(u*2.0, -1.0, 1.0)))*0.5 + uWave*0.25*uVP.x*cos(6.2831853*uWaves*(u - uWvPh));
      bend += uRipple*uVP.y*sin(bi*0.55 - uRipPh) + xr*tan(uTilt*0.0174533);
      float v = (px.y - uTop - bend) / uThickPx;
      float a = smoothstep(0.0, uFadeT, v) * (1.0 - smoothstep(1.0 - uFadeB, 1.0, v));
      if (a <= 0.0){ gl_FragColor = vec4(0.0); return; }
      float t = (v - uFadeT*0.35) / (1.0 - uFadeT*0.35 - uFadeB*0.35);
      float x = t*uFlRings - uFlPh; t = clamp(1.0 - abs(fract(x*0.5)*2.0 - 1.0), 0.0, 1.0);
      vec3 c = ramp(t);
      c = mix(c, vec3(1.0), uGrain * step(0.5, hash(gl_FragCoord.xy + 17.0)));     // the Figma noise: fine white grain at 43%
      vec2 g = vec2(px.x, px.y - uTop), cell = floor(g / uPitch), f = g - cell*uPitch; cell = mod(cell, 4096.0);
      float r = 0.575*uDot*(0.45 + 1.25*t), d = length(f - 0.5*uPitch);            // round dots that swell with the colour
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
    const U = {}; ['uRes','uVP','uDpr','uTop','uThickPx','uWave','uWaves','uLobes','uFadeT','uFadeB','uGrain','uPitch','uDot','uDensity','uDotA','uBarW','uTilt','uShapeH','uRipple','uRipPh','uFlRings','uFlPh','uWvPh','uS0','uS1','uS2','uS3','uS4']
      .forEach(n => U[n] = gl.getUniformLocation(prog, n));
    const rgb = h => { const n = parseInt(h.slice(1), 16); return [(n>>16&255)/255, (n>>8&255)/255, (n&255)/255]; };
    B.stops.forEach((h, i) => gl.uniform3fv(U['uS'+i], rgb(h)));
    // the fixed uniforms are set once
    const set1 = (n, x) => gl.uniform1f(U[n], x);
    set1('uWave', B.wave); set1('uWaves', B.waves); set1('uLobes', B.lobes); set1('uGrain', B.grain);
    set1('uPitch', B.pitch); set1('uDot', B.dotSize); set1('uDensity', B.density); set1('uDotA', B.dotOpacity);
    set1('uBarW', B.barWidth); set1('uTilt', B.tilt); set1('uRipple', B.ripple); set1('uFlRings', B.flowRings);
    gl.enable(gl.SCISSOR_TEST);

    // ---- where the band sits in the page (document px); recomputed only when the layout changes
    let L = null, sig = '';
    function place(){
      const vh = innerHeight, vw = innerWidth, list = isList(V), sc0 = Math.min(vh, vw);
      const key = [vh, vw, list, secs.wkTop, secs.ctaBot, secs.stTop].join('|');
      if (key === sig && L) return L;
      sig = key;
      const shapeH = list ? 0.16 : B.shapeHeight;                    // phones: a gentler curve, so it fits its gap
      const reach = (B.wave + B.lobes)*vw + shapeH*sc0 + B.ripple*vh;
      let top, thick;
      if (list){
        // phones: its own space between "Get in touch" and the statement: 28px under the link, its lowest point 32px above the statement
        top = (secs.ctaBot || 0) + 28; thick = Math.max(vh*0.2, (secs.stTop || 0) - 32 - reach - top);
      } else {
        // desktop: it leads the work up the page, its soft trailing edge just over the work's top edge
        thick = B.thickness*vh; top = secs.wkTop - thick*(1 - B.fadeBottom*0.6) + vh*0.05;
      }
      const pad = B.ripple*vh + 4, boxTop = Math.round(top - pad), boxH = Math.round(thick + reach + 2*pad);
      const dpr = Math.min(1.25, devicePixelRatio || 1), W = Math.round(vw*dpr), H = Math.round(boxH*dpr);
      cv.style.top = boxTop + 'px'; cv.style.height = boxH + 'px';
      if (cv.width !== W || cv.height !== H){ cv.width = W; cv.height = H; }
      gl.viewport(0, 0, W, H);
      gl.uniform2f(U.uRes, W, H); gl.uniform2f(U.uVP, vw, vh); set1('uDpr', dpr); set1('uTop', top - boxTop); set1('uThickPx', thick); set1('uShapeH', shapeH);
      const soft = Math.min(0.45, (B.blur*2) / Math.max(1, thick));   // edges as soft as the Figma layer blur
      set1('uFadeT', Math.max(B.fadeTop, soft)); set1('uFadeB', Math.max(B.fadeBottom, soft));
      return (L = { boxTop, boxH, dpr, H, list });
    }

    let shown = false, prevY = 0, lastT = 0, lastDraw = 0, flT = 0, flP = 0, rpT = 0, rpP = 0, wvT = 0, wvP = 0;
    function tick(now){
      requestAnimationFrame(tick);
      if (!V || !secs.wkTop) return;
      const dt = Math.min(0.05, (now - (lastT || now))/1000); lastT = now;
      const y = scrollY, vh = innerHeight, dy = (y - prevY)/vh; prevY = y;
      const P = place();
      // on screen at all? (phones also wait for the hero to come in)
      const on = (!P.list || centre.classList.contains('in')) && P.boxTop < y + vh && P.boxTop + P.boxH > y;
      if (on !== shown){ shown = on; cv.style.visibility = on ? 'visible' : 'hidden'; }
      if (!on){ flP = flT; rpP = rpT; wvP = wvT; return; }
      if (!reduce){ flT += dy*B.flowScroll*0.6 + dt*B.flowSpeed; rpT += dy*B.rippleScroll*4 + dt*B.rippleSpeed*2; wvT += dy*B.travelScroll*0.5; }
      const k = 1 - Math.exp(-dt / B.settle);
      flP += (flT - flP)*k; rpP += (rpT - rpP)*k; wvP += (wvT - wvP)*k;
      if (now - lastDraw < 33 && lastDraw) return;                    // the flow is slow: 30 redraws a second is plenty
      lastDraw = now;
      set1('uRipPh', rpP); set1('uFlPh', flP); set1('uWvPh', wvP);
      // only the rows that are on screen (plus a margin for scrolling between redraws)
      const m = vh*0.4, r0 = Math.max(0, y - m - P.boxTop), r1 = Math.min(P.boxH, y + vh + m - P.boxTop);
      const y0 = Math.max(0, Math.floor((P.boxH - r1)*P.dpr)), h = Math.min(P.H - y0, Math.ceil((r1 - r0)*P.dpr) + 2);
      gl.scissor(0, y0, cv.width, Math.max(0, h));
      gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    addEventListener('resize', () => { sig = ''; });
    requestAnimationFrame(tick);
  })();

