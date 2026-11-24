  // ---------- state ----------
  let V = null;
  let pRaw=0, p=0, pV=0, auto=0, drift=0, offset=0, offsetT=0, mx=0, my=0, mxS=0, myS=0, front=-1, baseRot=0, order=[];
  let introStart=Infinity, introDone=false;
  const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
  const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  const easeOut=t=>1-Math.pow(1-t,3);
  const lerp=(a,b,t)=>a+(b-a)*t;
  const TAU=Math.PI*2;
  const ASPECT={ "16:9":9/16, "3:2":2/3, "4:3":3/4, "1:1":1, "4:5":5/4 };

  const tuneOn = location.hash === "#tune";          // the tuning panel never ships to visitors
  // the config's default values, resolved the way DialKit does (slider → first number, select → default)
  const cfgDefaults = c => {
    const o = {};
    for (const [k, v] of Object.entries(c)) {
      if (k === "_collapsed") continue;
      o[k] = Array.isArray(v) ? v[0]
        : (v && typeof v === "object") ? (v.type === "select" ? (v.default ?? (v.options[0]?.value ?? v.options[0])) : v.type ? v : cfgDefaults(v))
        : v;
    }
    return o;
  };
  if (tuneOn) DialKit.createDialRoot({ position:"top-right", theme:"light", defaultOpen: innerWidth > 800 });
  const kit = tuneOn
    ? DialKit.createDialKit("Orbit", cfg, { id:"orbit-hero-v34", persist:true,
        onAction: path => { if (String(path).includes("replay")) startIntro(); } })
    : { subscribe: fn => { fn(cfgDefaults(cfg)); return () => {}; } };

  // ---------- DOM ----------
  const $ = id => document.getElementById(id);
  const ring=$('ring'), centre=$('centre'), section=$('orbit');
  const figEl=$('fig'), nameEl=$('cname'), introMark=$('introMark'), centreMark=centre.querySelector('.mark');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stage = document.getElementById('stage'), caption = document.getElementById('caption');
  const chromeEls = [...document.querySelectorAll('.chrome')];
  // write-skipping: only touch a style when its (quantized) value actually changed.
  // Per-card CSS variables recalc every descendant, so unchanged writes are pure cost.
  function put(el, key, val){
    const c = el._c || (el._c = {});
    if (c[key] === val) return;
    c[key] = val;
    if (key[0] === '-') el.style.setProperty(key, val); else el.style[key] = val;
  }
  const q = (v, step) => Math.round(v/step)*step;
  const hex = h => { h = h.replace('#',''); if (h.length === 3) h = [...h].map(x => x+x).join(''); return [0,2,4].map(i => parseInt(h.substr(i,2),16)); };
  const mixRGB = (a, b, t) => [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t];
  const mixInto = (o, a, b, t) => { o[0] = a[0]+(b[0]-a[0])*t; o[1] = a[1]+(b[1]-a[1])*t; o[2] = a[2]+(b[2]-a[2])*t; return o; };
  const waveStart = [0,0,0], waveCol = [0,0,0];
  let waveTheme = '', waveInk = null, waveBg = null;
  const poseBuf = [], rankBuf = [];
  const byDepth = (x, y) => (x.sn - y.sn) || (x.ci - y.ci);
  const WAVE = ['#F58E3F','#ED583E','#F06F8A','#8D5FB7','#244EE7'].map(h => hex(h));
  const easeOutQuint = t => 1 - Math.pow(1-t, 5);
  const easeOutQuad = t => 1 - (1-t)*(1-t);
  const easeInOutCubic = t => t<.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;
  let flightRank = null;

  const easeOutExpo = t => t>=1 ? 1 : 1 - Math.pow(2, -10*t);
  // CSS-style cubic-bezier as a function (x → y), for the logo pens
  const penBezier = (x1, y1, x2, y2) => { const B = (a, c, t) => 3*a*t*(1-t)*(1-t) + 3*c*t*t*(1-t) + t*t*t;
    return x => { if (x <= 0) return 0; if (x >= 1) return 1; let lo = 0, hi = 1; for (let i = 0; i < 24; i++){ const m = (lo+hi)/2; (B(x1, x2, m) < x) ? lo = m : hi = m; } return B(y1, y2, (lo+hi)/2); }; };
  const easeDraw = penBezier(0.45, 0, 0.22, 1), easeCurl = penBezier(0.3, 0.42, 0.24, 1);
  const T_FORK = (() => { let lo = 0, hi = 1; for (let i = 0; i < 30; i++){ const m = (lo+hi)/2; (easeDraw(m) < 0.787) ? lo = m : hi = m; } return 0.14 + 0.9*lo; })();
  const penTop = document.getElementById('penTop'), penBot = document.getElementById('penBot'), penWave = document.getElementById('penWave'), penCurl = document.getElementById('penCurl');

