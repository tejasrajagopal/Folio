  // ---- theme: panel sets the default; the on-page toggle overrides it for this visitor
  // light unless the visitor switches: a manual choice lasts for this visit only (sessionStorage), and the old
  // remembered choice from earlier versions is cleared, so every new visit opens in light mode
  let themePick = null;
  try { localStorage.removeItem('orbitTheme'); themePick = sessionStorage.getItem('orbitTheme'); } catch(e){}
  const sysDark = matchMedia('(prefers-color-scheme: dark)');
  const isDark = v => { const m = themePick || v.Theme.mode; return m === 'dark' || (m === 'system' && sysDark.matches); };
  sysDark.addEventListener && sysDark.addEventListener('change', () => V && applyStatic(V));
  const swapTheme = () => {
    themePick = isDark(V) ? 'light' : 'dark';
    try { sessionStorage.setItem('orbitTheme', themePick); } catch(e){}
    applyStatic(V);
  };
  // light ⇄ dark: the screen blurs, the theme swaps while it's soft, then it comes back into focus
  const pixelWrap = document.getElementById('pixelWrap');
  let pixelBusy = false;
  const flipTheme = () => {
    if (pixelBusy) return;
    if (reduce){ swapTheme(); return; }
    pixelBusy = true;
    const P = V['Theme transition'], half = P.duration/2;
    pixelWrap.style.setProperty('--tb', P.blur + 'px'); pixelWrap.style.transitionDuration = half + 's';
    pixelWrap.classList.add('on');
    setTimeout(() => {
      swapTheme();
      setTimeout(() => { pixelWrap.classList.remove('on'); setTimeout(() => { pixelBusy = false; }, half*1000); }, 60);
    }, half*1000);
  };
  document.getElementById('themeToggle').addEventListener('click', flipTheme);
  document.getElementById('dockTheme').addEventListener('click', flipTheme);

  const isList = v => isMobile(v) && v.Mobile.layout === 'list';
  function applyStatic(v){
    wasMobile = isMobile(v);
    document.documentElement.classList.toggle('m-list', isList(v));
    { const st = document.getElementById('statementText'), sc = document.querySelector('.scroll-cue'), mi = document.getElementById('mIntro'), sg = document.getElementById('stage');
      if (isList(v)){ if (st.parentNode !== mi){ mi.append(st, sc); st.style.filter = ''; } }
      else if (st.parentNode !== sg){ sg.insertBefore(st, document.getElementById('centre')); sg.insertBefore(sc, document.getElementById('centre')); st.style.opacity = ''; } }
    V = v;
    const r = document.documentElement.style, F = v.Frame, Dm = v.Dummies;
    const set = (k,val) => r.setProperty(k,val);
    const dark = isDark(v), T = v.Theme;
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    set('--bg', dark ? T.darkBackground : v.Text.background); set('--ink', dark ? T.darkInk : v.Text.ink);
    set('--mute', dark ? T.darkMute : '#7a766f');
    set('--line', dark ? T.darkLine : '#ececec');
    set('--wframe', dark ? T.darkFrame : '#d5d5d5'); set('--whandle', dark ? T.darkFrame : '#d5d5d5'); set('--cellline', dark ? 'rgba(255,255,255,.14)' : 'rgba(0,0,0,.16)');
    set('--dummy', dark ? '#1c1c1c' : v.Dummies.fill);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'only light';   // scrollbars etc. follow the site's theme, not the OS
    ['themeToggle','dockTheme'].forEach(id => { const tt = document.getElementById(id);
    tt.innerHTML = dark ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.6A8.2 8.2 0 0 1 9.4 4a8.2 8.2 0 1 0 10.6 10.6Z"/></svg>';
    tt.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode'); tt.hidden = !T.showToggle; });
    set('--radius', v.Cards.cornerRadius+'px'); set('--name', v.Text.nameSize); set('--hover', v.Cards.hoverZoom);
    set('--fbw', F.borderWidth); set('--hs', F.handleSize);
    paintFrame(F.gradientAngle);
    set('--ho', {outside:1, centred:0.5, inside:0}[F.handlePosition]);
    set('--lc', F.labelColor); set('--ls', F.labelSize); set('--lg', F.labelGap);
    set('--dummy', isDark(v) ? '#1c1c1c' : Dm.fill); set('--dummyInk', isDark(v) ? '#6b6b6b' : Dm.labelColor);
    ring.classList.toggle('noHandles', !F.handles);
    ring.classList.toggle('noLabel', !F.label);
    ring.classList.toggle('noBorder', !F.border);
    const C = v.Choreography, mStart = C.heroOut*0.9 + C.statementIn + C.read + 0.1;
    section.style.height = isList(v) ? '' : ((mStart + C.exit + 1) * 100) + 'vh';     // pin long enough for: hero out → read → morph into the grid
    $('name').textContent = v.Text.name; splitNav();
    $('sub').textContent = v.Text.subtitle;
    $('caption').hidden = !v.Text.showCaption;
    $('logos').hidden = !v.Text.showLogos;
    $('yearsLabel').textContent = v.Text.yearsLabel;
    centre.style.zIndex = v.Text.textAboveCards ? 150 : 50;
    flightRank = null;
    requestAnimationFrame(measureMark);
    $('cta').textContent = v.Text.ctaLabel; $('cta').href = v.Text.ctaLink || '#'; $('cta').hidden = !v.Text.showCta;
    $('hint').hidden = !v.Text.showHint;

    const ar = ASPECT[v.Cards.aspect] || 9/16;
    cards.forEach((c, i) => {
      if (c.dummy){
        const k = i - WORKS.length;
        c.show = k < Dm.count; c.size = Dm.size;
        c.dl.style.display = Dm.showLabel ? '' : 'none';
      } else {
        const wv = v.Works[c.id];
        c.show = wv.show; c.size = wv.size; c.title = wv.title;
        c.img.style.objectFit = v.Cards.fit;
        if (c.show && !isList(v) && !c.img.src) c.img.src = c.img.dataset.src;   // load only shown cards, only when the orbit is on screen
      }
      c.w = (isMobile(v) ? v.Mobile.cardWidth : v.Cards.width) * c.size; c.h = c.w * ar;
      Object.assign(c.el.style, { width:c.w+'px', height:c.h+'px', marginLeft:(-c.w/2)+'px', marginTop:(-c.h/2)+'px' });
      
      c.lbl.textContent = F.labelText === 'title' ? c.title : `Frame 21472302${String(29+i).padStart(2,'0')}`;
    });
    refreshFar(v);

    // the next section: a plain grid of the visible works
    const wg = document.getElementById('worksGrid');
    wg.innerHTML = cards.filter(c => !c.dummy && c.show).map(c => {
      const project = c.title.split('—')[0].trim();
      return `<article class="wcell" data-cat="projects" data-id="${c.id}"><div class="wframe"><div class="wimg"><img data-src="works/${c.id}.webp" alt="${c.title}" width="1280" height="720" decoding="async"></div><i></i><i></i><i></i><i></i></div><h3 class="wtitle">${project}</h3></article>`;
    }).join('') + '<p class="wempty" hidden>No experiments here yet.</p>';
    applyFilter(currentFilter, true);
    // grid images load just before they scroll into view (native lazy-load fetched them all on phones,
    // where the grid starts right under the first screen)
    gridIO && gridIO.disconnect();
    gridIO = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(en => {
      if (en.isIntersecting){ const im = en.target; im.src = im.dataset.src; gridIO.unobserve(im); }
    }), { rootMargin: '300px 0px' }) : null;
    wg.querySelectorAll('img[data-src]').forEach(im => gridIO ? gridIO.observe(im) : (im.src = im.dataset.src));
    // statement: one span per word so it can read in with scroll
    const list = isList(v);
    // phones (Figma): every word capitalised (done here: the letters are split, so CSS capitalize would hit each one)
    const words = v.Text.statement.trim().split(/\s+/).map(w => list ? w.charAt(0).toUpperCase() + w.slice(1) : w);
    // phones: the first sentence sits in the gradient as one span; the rest reads in through the wave
    const firstEnd = list ? words.findIndex(w => /[.!?]$/.test(w)) : -1;
    statementGrad = firstEnd + 1;
    const wordsHtml = (firstEnd >= 0 ? `<span class="g">${words.slice(0, firstEnd + 1).join(' ')}</span> ` : '') +
      words.slice(firstEnd + 1).map(w => `<span>${[...w].map(ch => `<i>${ch}</i>`).join('')}</span>`).join(' ');
    document.getElementById('statementText').innerHTML = `<span class="st">${wordsHtml}</span>`;
    statementWords = [...document.querySelectorAll('#statementText .st > span:not(.g) > i')];
    statementWords.forEach(c => { c._on = false; c._t0 = -1e9; });
    $('dockCta').firstElementChild.textContent = isMobile(v) ? v.Mobile.ctaShort : v.Text.ctaLabel; $('dockAbout').href = v.Text.aboutLink || '#';
    $('dockAbout').textContent = isList(v) ? 'About' : 'About me'; splitNav(); $('dockCta').href = v.Text.ctaLink || '#';
    if (lenis){ lenis.options.lerp = v.Scroll.lerp; lenis.options.wheelMultiplier = v.Scroll.wheelMultiplier; lenis.options.smoothWheel = v.Scroll.smooth; }
    requestAnimationFrame(measureSections);

    let ws = cards.filter(c=>!c.dummy && c.show).map(c=>cards.indexOf(c));
    let ds = cards.filter(c=> c.dummy && c.show).map(c=>cards.indexOf(c));
    if (isList(v)){ ws = []; ds = []; }
    else if (isMobile(v)){
      // phones: a lighter ring — an even spread of works, no placeholders
      const n = Math.min(ws.length, Math.round(v.Mobile.maxWorks));
      ws = Array.from({length:n}, (_, k) => ws[Math.floor(k * ws.length / n)]); ds = [];
    }
    const inRing = new Set(ws.concat(ds));
    cards.forEach((c, i) => c.el.classList.toggle('hidden', !inRing.has(i)));
    centre.style.top = isList(v) ? '' : isMobile(v) ? v.Mobile.textTop + '%' : '';
    document.getElementById('statementText').style.top = isMobile(v) ? `calc(${v.Mobile.textTop}% - 6.5px)` : '';
    if (Dm.placement === 'interleave' && ds.length && ws.length){
      order = []; const total = ws.length + ds.length; let wi=0, di=0;
      for (let k=0;k<total;k++){
        const wantD = Math.floor((k+1)*ds.length/total) > di;
        if (wantD && di<ds.length) order.push(ds[di++]); else if (wi<ws.length) order.push(ws[wi++]); else order.push(ds[di++]);
      }
    } else order = ws.concat(ds);
    front = -1;
  }

