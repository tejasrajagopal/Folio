  // ---- sections
  let txtClear = null, waveHead = 0, statementGrad = 0, statementWords = [], secs = { wkTop:0 }, cellRects = {}, nCells = 0, workCells = [];
  function measureSections(){
    const wk = document.getElementById('works'), sy0 = scrollY;
    secs = { wkTop: wk.offsetTop };
    { const st = document.getElementById('statementText'), t = st.style.transform; st.style.transform = 'none';
      const r = st.getBoundingClientRect(); secs.stTop = r.top + sy0; secs.stH = r.height; st.style.transform = t;
      const sc = document.querySelector('.scroll-cue'), t2 = sc.style.transform; sc.style.transform = 'none';
      secs.scTop = sc.getBoundingClientRect().top + sy0; sc.style.transform = t2;
      const ct = document.getElementById('cta'), cr = ct.getBoundingClientRect(), cm = new DOMMatrix(getComputedStyle(ct).transform);
      secs.ctaBot = cr.bottom - cm.m42 + sy0; }
    cellRects = {}; nCells = 0;
    workCells = [...document.querySelectorAll('.wcell')].filter(c => !c.hidden);
    const saved = workCells.map(cell => cell.style.transform);
    workCells.forEach(cell => { cell.style.transform = 'none'; });
    workCells.forEach(cell => { cell._docTop = cell.getBoundingClientRect().top + sy0; });
    workCells.forEach((cell, i) => { cell.style.transform = saved[i]; cell._c = {}; });
    document.querySelectorAll('.wcell').forEach(cell => {
      if (cell.hidden) return;
      const r = cell.querySelector('.wimg').getBoundingClientRect();
      cellRects[cell.dataset.id] = { left:r.left, w:r.width, h:r.height, docTop:r.top + sy0, idx:nCells++ };
    });
  }
  document.fonts && document.fonts.ready.then(() => requestAnimationFrame(measureSections));
  addEventListener('resize', () => requestAnimationFrame(measureSections));
  let currentFilter = 'all';
  function applyFilter(f, quiet){
    currentFilter = f;
    document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === f)));
    let shown = 0;
    document.querySelectorAll('.wcell').forEach(c => { const on = f === 'all' || c.dataset.cat === f; c.hidden = !on; if (on) shown++; });
    const empty = document.querySelector('.wempty'); if (empty) empty.hidden = shown > 0;
    if (!quiet) requestAnimationFrame(measureSections);
  }
  document.getElementById('dockWorks').addEventListener('click', e => { e.preventDefault(); const y = secs.wkTop; lenis ? lenis.scrollTo(y, { duration: 0.9 }) : scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' }); });
  document.querySelectorAll('[data-filter]').forEach(b => b.addEventListener('click', () => {
    applyFilter(b.dataset.filter);
    const y = secs.wkTop; lenis ? lenis.scrollTo(y, { duration: 0.9 }) : scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  }));
  // nav labels: split into letters for the hover wave (the full word stays as the accessible name)
  function splitNav(){
    document.querySelectorAll('.dock-tabs button, .dock-about, #name').forEach(el => {
      if (el.firstElementChild && el.firstElementChild.classList.contains('sr-only')) return;   // already split
      const t = el.textContent.trim();
      el._waveText = t; el.classList.add('nav-wave');
      // the word stays readable to screen readers; the letters are visual only. Spaces stay real so the name can wrap.
      el.innerHTML = `<span class="sr-only">${t}</span>` + [...t].map((ch, i) => ch === ' ' ? (el.id === 'name' ? ' ' : '<i aria-hidden="true">&nbsp;</i>') : `<i aria-hidden="true" style="--i:${i}">${ch}</i>`).join('');   // the name keeps real spaces so it can wrap; flex nav items need a visible one
    });
  }
  var WAVE_SEL = '.dock-tabs button, .dock-about, #name';
  const startWave = el => { if (reduce) return; el.classList.remove('waving'); void el.offsetWidth; el.classList.add('waving'); };
  document.querySelectorAll(WAVE_SEL).forEach(el => {
    el.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') startWave(el); });
    el.addEventListener('focus', () => { if (el.matches(':focus-visible')) startWave(el); });
    el.addEventListener('animationend', e => { if (e.target === el.lastElementChild) el.classList.remove('waving'); });
  });
  document.getElementById('dockHome').addEventListener('click', e => { e.preventDefault(); lenis ? lenis.scrollTo(0, { duration: 1.2 }) : scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });

  function startIntro(){ introStart = performance.now(); introDone = false; lenis ? lenis.scrollTo(0, { immediate:true, force:true }) : scrollTo(0,0); flightRank = null; stage.classList.remove('ready'); centre.classList.remove('in'); stage.classList.remove('in'); }
  let scrollLocked = false;
  const blockScroll = e => { if (scrollLocked && e.cancelable) e.preventDefault(); };
  if (!lenis){ addEventListener('wheel', blockScroll, { passive:false }); addEventListener('touchmove', blockScroll, { passive:false }); }   // Lenis blocks these itself when stopped
  addEventListener('keydown', e => { if (scrollLocked && /^( |PageDown|PageUp|ArrowDown|ArrowUp|Home|End)$/.test(e.key) && !e.target.closest('input,textarea,select,[contenteditable]')) e.preventDefault(); });
  function lock(on){
    scrollLocked = on;
    if (lenis){ if (on && !lenis.isStopped) lenis.stop(); else if (!on && lenis.isStopped) lenis.start(); }
  }

