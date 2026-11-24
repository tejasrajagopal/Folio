  // ---------- frame ----------
  let last = performance.now();
  // ---------- WebGL orbit renderer ----------
  // The pose maths above stays the single source of truth; this only replaces how the cards are drawn:
  // one WebGL2 canvas (a handful of draw calls) instead of 16 large DOM layers the browser has to composite.
  // Depth / fly-in / exit blur come back here for free (mip-level sampling instead of CSS filters).
  // Falls back to the DOM cards if WebGL2 is unavailable, the context is lost, or a DOM-only option is on.
  const GL = (() => {
    const api = { on: false, ok: false };
    let canvas, gl, prog, U = {}, vao, W = 0, H = 0, dpr = 1, items = [], hits = [], uploads = 0;
    let mx = -1e9, my = -1e9, frameFade = 1, fc = [0.8, 0.8, 0.8], fcKey = '', dummyRGB = [0.89, 0.89, 0.89], dummyKey = '';
    const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const TEXW = 1024;
    const forceDom = /[?&]dom\b/.test(location.search);   // ?dom: compare against the DOM renderer

    const VS = `#version 300 es
      in vec2 a_pos;
      uniform vec2 u_view, u_center, u_half; uniform float u_margin;
      out vec2 v_local;
      void main(){
        vec2 local = a_pos * (u_half + u_margin);
        v_local = local;
        vec2 p = (u_center + local) / u_view * 2.0 - 1.0;
        gl_Position = vec4(p.x, -p.y, 0.0, 1.0);
      }`;
    const FS = `#version 300 es
      precision highp float;
      in vec2 v_local; out vec4 o;
      uniform vec2 u_half; uniform float u_radius, u_dpr;
      uniform sampler2D u_tex; uniform float u_hasTex; uniform vec3 u_fill;
      uniform vec2 u_uvScale; uniform float u_lod, u_blur, u_grey, u_op;
      uniform float u_fo, u_hs, u_ho, u_bw; uniform vec3 u_fc;
      uniform float u_sh, u_shScale;
      float sdBox(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
      float erf(float x){ float s = sign(x), a = abs(x); float t = 1.0 + (0.278393 + (0.230389 + 0.078108*(a*a))*a)*a; t *= t; return s - s/(t*t); }
      void main(){
        float aa = 1.0 / u_dpr;
        // soft drop shadow (CSS: 0 30px 60px -28px), under the card
        vec4 col = vec4(0.0);
        if (u_sh > 0.001){
          vec2 sh = vec2(u_half.x - 28.0*u_shScale, u_half.y - 28.0*u_shScale);
          vec2 p = v_local - vec2(0.0, 30.0*u_shScale);
          float sg = 30.0*u_shScale * 0.70710678;
          float ax = 0.5*(erf((p.x + sh.x)/sg) - erf((p.x - sh.x)/sg));
          float ay = 0.5*(erf((p.y + sh.y)/sg) - erf((p.y - sh.y)/sg));
          float a = max(ax*ay, 0.0) * 0.9 * u_sh;
          col = vec4(vec3(20.0, 16.0, 10.0)/255.0 * a, a);
        }
        // media: cover-fit image (optionally blurred via mip level + 4 taps) inside a rounded rect
        float d = sdBox(v_local, u_half, u_radius);
        float inside = clamp(0.5 - d / aa, 0.0, 1.0);
        if (inside > 0.0){
          vec3 c = u_fill;
          if (u_hasTex > 0.5){
            vec2 uv = (v_local / u_half) * 0.5 * u_uvScale + 0.5;
            if (u_blur > 0.01){
              vec2 ts = vec2(textureSize(u_tex, 0)); vec2 o1 = exp2(u_lod) / ts * 0.6;
              c = 0.25 * (textureLod(u_tex, uv + vec2( o1.x,  o1.y*0.4), u_lod).rgb + textureLod(u_tex, uv + vec2(-o1.x, -o1.y*0.4), u_lod).rgb
                        + textureLod(u_tex, uv + vec2(-o1.x*0.4,  o1.y), u_lod).rgb + textureLod(u_tex, uv + vec2( o1.x*0.4, -o1.y), u_lod).rgb);
            } else c = textureLod(u_tex, uv, u_lod).rgb;
          }
          c = mix(c, vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), u_grey);
          col = vec4(c, 1.0) * inside + col * (1.0 - inside);
        }
        // frame: border stroke + four corner handles, sized in screen px
        if (u_fo > 0.001){
          float fa = 0.0;
          if (u_bw > 0.0){ fa = max(fa, clamp(0.5 - d/aa, 0.0, 1.0) * clamp(0.5 + (d + u_bw)/aa, 0.0, 1.0)); }
          if (u_hs > 0.0){
            vec2 ap = abs(v_local);
            vec2 hc = u_half + vec2(u_hs * (u_ho - 0.5));
            float hd = sdBox(ap - hc, vec2(u_hs*0.5), 0.0);
            fa = max(fa, clamp(0.5 - hd/aa, 0.0, 1.0));
          }
          fa *= u_fo;
          col = vec4(u_fc, 1.0) * fa + col * (1.0 - fa);
        }
        o = col * u_op;
      }`;

    function compile(type, src){ const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }

    function init(){
      try {
        canvas = document.createElement('canvas'); canvas.className = 'gl-orbit'; canvas.setAttribute('aria-hidden', 'true');
        gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'high-performance' });
        if (!gl) return false;
        prog = gl.createProgram();
        gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
        gl.linkProgram(prog); if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
        gl.useProgram(prog);
        ['u_view','u_center','u_half','u_margin','u_radius','u_dpr','u_tex','u_hasTex','u_fill','u_uvScale','u_lod','u_blur','u_grey','u_op',
         'u_fo','u_hs','u_ho','u_bw','u_fc','u_sh','u_shScale'].forEach(n => U[n] = gl.getUniformLocation(prog, n));
        vao = gl.createVertexArray(); gl.bindVertexArray(vao);
        const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(prog, 'a_pos'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.uniform1i(U.u_tex, 0);
        canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); api.ok = false; setOn(false); });
        ring.insertBefore(canvas, ring.firstChild);
        resize(); addEventListener('resize', resize);
        if (canHover){
          addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });
          document.addEventListener('pointerleave', () => { mx = my = -1e9; });
        }
        return true;
      } catch (err) { console.warn('[orbit] WebGL unavailable, using DOM cards:', err && err.message); return false; }
    }
    function resize(){
      W = ring.clientWidth || innerWidth; H = ring.clientHeight || innerHeight; dpr = Math.min(2, devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    }
    function setOn(on){
      if (api.on === on) return;
      api.on = on; ring.classList.toggle('gl', on);
      if (!on){ cards.forEach(c => { if (c.el._c) c.el._c = {}; }); if (canvas) canvas.style.display = 'none'; }
      else if (canvas) canvas.style.display = '';
    }
    // a texture per card, uploaded once from the decoded <img>, downscaled to 1024px wide, with mipmaps for blur
    function texFor(c){
      if (c.tex) return c.tex;
      if (!c.img || !c.img.complete || !c.img.naturalWidth || uploads >= 2) return null;   // ≤2 uploads per frame: no hitch
      uploads++;
      const iw = c.img.naturalWidth, ih = c.img.naturalHeight, w = Math.min(TEXW, iw), h = Math.round(ih * w / iw);
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d').drawImage(c.img, 0, 0, w, h);
      const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      c.tex = t; c.texW = w; c.texH = h; return t;
    }
    const hexRGB = h => hex(h).map(x => x/255);

    // called once per frame before the card loop: decides GL vs DOM for the current settings
    api.sync = v => {
      const want = api.ok && !forceDom && !v.Frame.label && !v.Frame.gradient && !(v.Dummies.count > 0) && !isList(v);
      setOn(want);
      if (!want) return;
      const f = isDark(v) ? v.Theme.darkFrame : v.Frame.colour; if (f !== fcKey){ fcKey = f; fc = hexRGB(f); }
      const dm = isDark(v) ? '#1c1c1c' : v.Dummies.fill; if (dm !== dummyKey){ dummyKey = dm; dummyRGB = hexRGB(dm); }
      items.length = 0; uploads = 0;
    };
    // one card's final pose for this frame (same numbers the DOM path would have written)
    api.add = (c, idx, sx, sy, sc, op, z, blur, grey, fo, sh) => {
      if (op < 0.004) return;
      items.push({ c, idx, sx, sy, sc, op, z, blur, grey, fo, sh });
    };
    api.draw = (v, exiting, dt, hidden) => {
      // frames fade together when the exit starts (200ms), like the CSS version
      frameFade += ((exiting ? 0 : 1) - frameFade) * (1 - Math.exp(-dt / 0.07));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      if (hidden) { hits.length = 0; return; }
      items.sort((a, b) => (a.z - b.z) || (a.idx - b.idx));          // same order as z-index + DOM order
      const Fr = v.Frame, hs = Fr.handles ? Fr.handleSize : 0, ho = { outside: 1, centred: 0.5, inside: 0 }[Fr.handlePosition] ?? 0.5;
      const bw = Fr.border ? Fr.borderWidth : 0, zoomTo = v.Cards.hoverZoom, k = 1 - Math.exp(-dt / 0.07);
      gl.uniform2f(U.u_view, W, H); gl.uniform1f(U.u_dpr, dpr); gl.uniform3f(U.u_fc, fc[0], fc[1], fc[2]);
      gl.uniform1f(U.u_ho, ho); gl.uniform1f(U.u_bw, bw); gl.uniform3f(U.u_fill, dummyRGB[0], dummyRGB[1], dummyRGB[2]);
      gl.activeTexture(gl.TEXTURE0);
      hits.length = 0;
      for (const it of items){
        const c = it.c, hw = c.w * it.sc / 2, hh = c.h * it.sc / 2;
        if (hw < 0.5 || hh < 0.5) continue;
        c.glZoom = (c.glZoom || 1) + (((c.el._hover && canHover) ? zoomTo : 1) - (c.glZoom || 1)) * k;
        c.glFo = (c.glFo ?? it.fo) + (it.fo - (c.glFo ?? it.fo)) * (1 - Math.exp(-dt / 0.12));
        const fo = c.glFo * frameFade, shA = it.sh;
        const hsPx = Fr.keepCrisp ? hs : hs * it.sc;
        const margin = Math.max(fo > 0.001 ? hsPx * Math.max(ho, 0.5) + 2 : 2, shA > 0.001 ? (30 + 60) * it.sc : 0);
        const tex = texFor(c);
        gl.uniform2f(U.u_center, W/2 + it.sx, H/2 + it.sy); gl.uniform2f(U.u_half, hw, hh); gl.uniform1f(U.u_margin, margin);
        gl.uniform1f(U.u_radius, Math.min(v.Cards.cornerRadius * it.sc, hw, hh));
        gl.uniform1f(U.u_op, it.op); gl.uniform1f(U.u_grey, it.grey); gl.uniform1f(U.u_fo, fo); gl.uniform1f(U.u_hs, hsPx);
        gl.uniform1f(U.u_sh, shA); gl.uniform1f(U.u_shScale, it.sc);
        if (tex){
          gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1f(U.u_hasTex, 1);
          // cover-fit + hover zoom, as UV scale around the centre
          const ca = hh / hw, ta = c.texH / c.texW;
          let sxU = 1, syU = 1; if (ca > ta) sxU = ta / ca; else syU = ca / ta;
          gl.uniform2f(U.u_uvScale, sxU / c.glZoom, syU / c.glZoom);
          // mip level: texels per device pixel (minification) plus the blur radius
          const tpd = c.texW * Math.min(1, sxU) / (2 * hw * dpr), blurPx = Math.max(0, it.blur);
          gl.uniform1f(U.u_lod, Math.log2(Math.max(1, tpd * (1 + 1.1 * blurPx * dpr))));
          gl.uniform1f(U.u_blur, blurPx);
        } else { gl.uniform1f(U.u_hasTex, 0); gl.uniform1f(U.u_blur, 0); gl.uniform1f(U.u_lod, 0); }
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        if (it.op > 0.5) hits.push({ c, l: W/2 + it.sx - hw, r: W/2 + it.sx + hw, t: H/2 + it.sy - hh, b: H/2 + it.sy + hh });
      }
      // hover: the topmost card under the pointer (DOM cards are hidden, so no pointerenter)
      if (canHover){
        if (mx > -1e8) api.measureIfDirty();
        let top = null; const px = mx - ringRect.left, py = my - ringRect.top;
        for (let i = hits.length - 1; i >= 0; i--){ const h = hits[i]; if (px >= h.l && px <= h.r && py >= h.t && py <= h.b){ top = h.c; break; } }
        for (const c of cards) c.el._hover = c === top;
      }
    };
    let ringRect = { left: 0, top: 0 };
    api.measure = () => { ringRect = ring.getBoundingClientRect(); };
    api.ok = init();
    let rectDirty = true; const markDirty = () => { rectDirty = true; };   // re-read the ring's position lazily, once per frame at most
    if (api.ok){ addEventListener('resize', markDirty); addEventListener('scroll', markDirty, { passive: true }); }
    api.measureIfDirty = () => { if (rectDirty){ rectDirty = false; api.measure(); } };
    return api;
  })();

