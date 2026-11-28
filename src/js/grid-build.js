  // ---- the work, the first time it's seen: once the grid is well on screen (after the gradient has passed) it is set out
  // like a drawing over ~3s (styles: .wg-pre / .wg-go in base.css). Once per visit; not with reduced motion. Time-based:
  // scrolling doesn't drive it. window.FOLIO_GRID_REPLAY() plays it again (the preview's picker uses it).
  (() => {
    const wg = $('worksGrid');
    if (!wg || reduce || !('IntersectionObserver' in window)) return;
    let seen = false; try { seen = sessionStorage.getItem('gridBuilt') === '1'; } catch(e){}
    let t = 0;
    function play(){
      clearTimeout(t);
      wg.classList.remove('wg-go'); wg.classList.add('wg-pre');
      const cells = [...wg.querySelectorAll('.wcell:not([hidden])')];
      cells.forEach((c, i) => {
        c.style.setProperty('--d', (i*0.18).toFixed(2) + 's');
        const im = c.querySelector('img[data-src]'); if (im && !im.getAttribute('src')) im.src = im.dataset.src;
        const f = c.querySelector('.wframe');
        if (f && !f.querySelector('.wg-g')) f.insertAdjacentHTML('beforeend', '<b class="wg-g h t"></b><b class="wg-g h b"></b><b class="wg-g v l"></b><b class="wg-g v r"></b>');
      });
      void wg.offsetWidth;                                             // start from the bare state
      requestAnimationFrame(() => { wg.classList.remove('wg-pre'); wg.classList.add('wg-go'); });
      t = setTimeout(() => { wg.classList.remove('wg-go'); wg.querySelectorAll('.wg-g').forEach(g => g.remove()); }, 3800 + cells.length*180);
      try { sessionStorage.setItem('gridBuilt', '1'); } catch(e){}
    }
    window.FOLIO_GRID_REPLAY = play;
    if (seen) return;
    wg.classList.add('wg-pre');                                        // bare until it's seen
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)){ io.disconnect(); play(); } }, { rootMargin: '0px 0px -55% 0px' });
    io.observe(wg);
  })();
