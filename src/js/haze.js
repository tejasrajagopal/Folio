  // ---- haze (band mode 7): the gradient as a soft wash instead of a shape. As you scroll toward the next section the
  // screen fills with a pale wash of the site's colours; when the section arrives the wash clears in under a second while
  // the section rises out of it (fast first, easing to a stop, blurred → sharp), and a soft glow stays along the bottom.
  // Only opacity and transform move, plus a short-lived blur on the rising section.
  (() => {
    const haze = $('haze'), floor = $('hazeFloor');
    if (!haze) return;
    const D = { hazeFade: 0.93, hazeRise: 0.37, hazeTint: 0.5, hazeFloor: 0.85, hazeBlur: 14, hazeLead: 0.9 };
    const P = k => { const pv = window.FOLIO_BAND; return (pv && pv.p && pv.p[k] != null) ? pv.p[k] : D[k]; };
    const mode = () => { const pv = window.FOLIO_BAND; return (pv && pv.mode) || BAND_DEFAULT_MODE; };
    let on = false, released = false, t0 = 0, shownO = -1, shownF = -1, target = null, tint = -1;
    const clearTarget = () => { if (target){ target.style.transform = ''; target.style.filter = ''; target.style.willChange = ''; } };
    function tick(now){
      requestAnimationFrame(tick);
      const active = mode() === 7 && V && secs.wkTop;
      if (active !== on){ on = active; haze.hidden = floor.hidden = !on; if (!on){ clearTarget(); released = false; shownO = shownF = -1; } }
      if (!on) return;
      const list = isList(V), vh = innerHeight, y = scrollY;
      // what rises out of the haze: the work on desktop, the statement block on phones
      const el = list ? $('mIntro') : $('worksGrid'), T = list ? (secs.stTop || 0) - vh*0.1 : secs.wkTop;
      if (el !== target){ clearTarget(); target = el; }
      const t = P('hazeTint'); if (t !== tint){ tint = t; haze.style.setProperty('--ht', Math.round(t*100) + '%'); floor.style.setProperty('--ht', Math.round(Math.min(1, t*1.1)*100) + '%'); }
      const trigger = T - vh*0.72;                                   // the section's top has come 28% up the screen
      // the build-up never starts before the page has scrolled a little, so the first screen stays clean (phones)
      const lead = Math.max(vh*0.15, Math.min(Math.max(0.2, P('hazeLead')) * vh, trigger - vh*0.12));
      const approach = Math.min(1, Math.max(0, (y - (trigger - lead)) / lead));     // the wash builds over the scroll before it
      if (!released && y >= trigger){ released = true; t0 = now; }
      else if (released && y < trigger - vh*0.12){ released = false; clearTarget(); }
      let o, rise = 0, blur = 0, glow;
      if (released){
        const s = (now - t0)/1000, fade = Math.max(0.1, P('hazeFade'));
        const k = Math.min(1, s / fade); o = (1 - k)*(1 - k);                       // clears in `fade` seconds, quickest at first
        if (!reduce){ rise = P('hazeRise')*vh * Math.exp(-s/0.17); blur = P('hazeBlur') * Math.exp(-s/0.13); }   // ~15% of what's left per frame
        glow = Math.min(1, s / (fade*0.6));
      } else { o = approach*approach*(3 - 2*approach); glow = 0; }
      // the glow along the bottom stays for the first screen of the section, then lets go
      glow *= P('hazeFloor') * (1 - Math.min(1, Math.max(0, (y - (T + vh*0.6)) / (vh*0.8))));
      const oq = Math.round(o*200)/200, gq = Math.round(glow*200)/200;
      if (oq !== shownO){ shownO = oq; haze.style.opacity = oq; haze.style.visibility = oq > 0 ? 'visible' : 'hidden'; }
      if (gq !== shownF){ shownF = gq; floor.style.opacity = gq; floor.style.visibility = gq > 0 ? 'visible' : 'hidden'; }
      if (released && (rise > 0.5 || blur > 0.2)){
        target.style.willChange = 'transform, filter';
        target.style.transform = `translateY(${rise.toFixed(1)}px)`; target.style.filter = blur > 0.2 ? `blur(${blur.toFixed(1)}px)` : '';
      } else if (target.style.transform || target.style.filter) clearTarget();
    }
    requestAnimationFrame(tick);
  })();
