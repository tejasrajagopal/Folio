  // ---- sweep (band mode 7): the gradient as light rising through the screen, after the reference the owner shared.
  // A soft glow comes up from the bottom with a gently domed front (higher in the middle): the deepest colour leads, the
  // warm bright one follows, and behind it the page's own light floods up, pushing the colour off the top; the top
  // corners clear last. No black, no texture. It is one fixed full-screen layer whose only input is the scroll position;
  // it's drawn at half resolution (it has no fine detail), redraws only when the scroll moves, and is off outside its stretch.
  (() => {
    const cv = $('sweepCv');
    const gl = cv && cv.getContext('webgl', { antialias:false, premultipliedAlpha:true, alpha:true });
    if (!gl) return;
    const D = { sweepThick: 0.85, sweepDome: 1.0, sweepDepth: 0.45, sweepLead: 0.3, sweepTail: 0.18, sweepFlip: 0, sweepGrain: 0, sweepStart: 0, sweepEnd: 0.25 };
    const P = k => { const pv = window.FOLIO_BAND; return (pv && pv.p && pv.p[k] != null) ? pv.p[k] : D[k]; };
    const mode = () => { const pv = window.FOLIO_BAND; return (pv && pv.mode) || BAND_DEFAULT_MODE; };
    const FS = `
    precision highp float;
    uniform vec2 uRes; uniform float uR, uThick, uDome, uDepth, uLead, uTail, uFlip, uGrain;
    uniform vec3 uS0, uS1, uS2, uS3, uS4, uPage;
    float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    vec3 ramp(float t){                      // t: 0 at the trailing (light) side → 1 at the leading side
      vec3 a = uS0, b = uS1, c = uS2, d = uS3, e = uS4;
      if (uFlip > 0.5){ a = uS4; b = uS3; d = uS1; e = uS0; }
      vec3 pale = mix(a, uPage, 0.55);
      if (t < 0.16) return mix(pale, a, t/0.16);
      if (t < 0.38) return mix(a, b, (t-0.16)/0.22);
      if (t < 0.56) return mix(b, c, (t-0.38)/0.18);
      if (t < 0.74) return mix(c, d, (t-0.56)/0.18);
      return mix(d, e, clamp((t-0.74)/0.20, 0.0, 1.0));
    }
    void main(){
      vec2 uv = gl_FragCoord.xy / uRes;                                   // y: 0 at the bottom of the screen
      // rings around a point below the screen, stretched sideways: a wide, shallow dome
      float r = length(vec2((uv.x - 0.5)*uDome, uv.y + uDepth));
      float t = (r - uR) / uThick;                                        // <0: the light has passed · 0…1: the colour · >1: not reached yet
      float a = smoothstep(0.0, uTail, t) * (1.0 - smoothstep(1.0 - uLead, 1.0, t));
      if (a <= 0.0){ gl_FragColor = vec4(0.0); return; }
      vec3 c = ramp(clamp(t, 0.0, 1.0));
      c = mix(c, vec3(1.0), uGrain * step(0.5, hash(gl_FragCoord.xy + 17.0)));
      c += (hash(gl_FragCoord.xy) - 0.5) / 255.0;                          // dither: no banding in the long fades
      gl_FragColor = vec4(c*a, a);
    }`;
    const sh = (ty, src) => { const o = gl.createShader(ty); gl.shaderSource(o, src); gl.compileShader(o); return o; };
    const prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }'));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const U = {}; ['uRes','uR','uThick','uDome','uDepth','uLead','uTail','uFlip','uGrain','uS0','uS1','uS2','uS3','uS4','uPage'].forEach(n => U[n] = gl.getUniformLocation(prog, n));
    const rgb = h => { const n = parseInt(h.slice(1), 16); return [(n>>16&255)/255, (n>>8&255)/255, (n&255)/255]; };
    ['#F58E3F','#ED583E','#F06F8A','#8D5FB7','#244EE7'].forEach((h, i) => gl.uniform3fv(U['uS'+i], rgb(h)));
    let shown = false, last = '', W = 0, H = 0;
    function tick(){
      requestAnimationFrame(tick);
      const active = mode() === 7 && V && secs.wkTop;
      if (!active){ if (shown){ shown = false; cv.style.visibility = 'hidden'; last = ''; } return; }
      const vh = innerHeight, vw = innerWidth, y = scrollY, list = isList(V), C = V.Choreography;
      // the stretch it plays over. Desktop: from the moment the statement has been read (the orbit starts to leave) until
      // the work's top edge is a quarter of the way down the screen. Phones: from just after the first screen until the
      // statement is a third of the way down.
      const y0 = (list ? Math.max(vh*0.06, (secs.ctaBot || 0) - vh*0.8) : (C.heroOut*0.9 + C.statementIn + C.read + 0.1) * vh) + P('sweepStart')*vh;
      const y1 = Math.max(y0 + vh*0.4, (list ? (secs.stTop || 0) : secs.wkTop) - P('sweepEnd')*vh - (list ? vh*0.05 : 0));
      const p = Math.min(1, Math.max(0, (y - y0) / (y1 - y0)));
      const on = p > 0 && p < 1 && (!list || centre.classList.contains('in'));
      if (on !== shown){ shown = on; cv.style.visibility = on ? 'visible' : 'hidden'; }
      if (!on){ last = ''; return; }
      // on a narrow screen the same dome would read as a tall pointed arch, so it flattens with the screen's shape
      const dome = P('sweepDome') * Math.min(1, Math.max(0.3, (vw / vh) / 1.6)), depth = P('sweepDepth'), thick = Math.max(0.2, P('sweepThick'));
      // the front goes from just under the bottom edge to past the far top corners
      const rMin = depth, rMax = Math.hypot(0.5*dome, 1 + depth);
      const R = (rMin - thick - 0.02) + ((rMax + 0.02) - (rMin - thick - 0.02)) * p;
      const dark = isDark(V), page = dark ? V.Theme.darkBackground : V.Text.background;
      const key = [R.toFixed(4), vw, vh, dome, depth, thick, P('sweepLead'), P('sweepTail'), P('sweepFlip'), P('sweepGrain'), page].join('|');
      if (key === last) return;                                          // nothing moved: no redraw
      last = key;
      const grain = P('sweepGrain'), scale = grain > 0 ? Math.min(1.25, devicePixelRatio || 1) : 0.5;   // smooth colour needs no detail
      const w = Math.max(2, Math.round(vw*scale)), h = Math.max(2, Math.round(vh*scale));
      if (w !== W || h !== H){ W = w; H = h; cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); }
      gl.uniform2f(U.uRes, W, H); gl.uniform1f(U.uR, R); gl.uniform1f(U.uThick, thick); gl.uniform1f(U.uDome, dome); gl.uniform1f(U.uDepth, depth);
      gl.uniform1f(U.uLead, Math.min(0.9, Math.max(0.02, P('sweepLead')))); gl.uniform1f(U.uTail, Math.min(0.9, Math.max(0.02, P('sweepTail'))));
      gl.uniform1f(U.uFlip, P('sweepFlip')); gl.uniform1f(U.uGrain, grain); gl.uniform3fv(U.uPage, rgb(page));
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    requestAnimationFrame(tick);
  })();
