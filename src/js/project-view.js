  // ---- project view: clicking a work opens its project over the page (the URL becomes #project-<name>, so Back closes it
  // and the link can be shared). The projects are the works grouped by name; text comes from PROJECT_INFO in config.js.
  let pvOpen = false;
  const pvEl = $('projectView');
  const pvSlug = n => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const pvProjects = () => { const m = new Map();
    cards.filter(c => !c.dummy && c.show).forEach(c => { const n = c.title.split('—')[0].trim(); (m.get(n) || m.set(n, []).get(n)).push(c); });
    return m; };
  // the gallery rhythm from the design; a row that can't be filled falls back to what the remaining images allow
  function pvRows(imgs){
    const need = [1, 3, 1, 2, 1, 4], rows = []; let i = 0, k = 0;
    while (i < imgs.length){
      const left = imgs.length - i; let n = need[k++ % need.length];
      if (n > left) n = left === 3 ? 3 : left === 2 ? 2 : 1;
      rows.push({ n, kind: n === 1 ? 'wide' : n === 3 ? 'mix' : n === 4 ? 'quad' : (need[(k - 1) % need.length] === 2 ? 'tall' : 'pair'), imgs: imgs.slice(i, i + n) }); i += n;
    }
    return rows;
  }
  function pvRender(name, list){
    const info = PROJECT_INFO[name] || PROJECT_INFO._default; let i = 0;
    const tile = (c, cls) => `<div class="pv-t ${cls}" style="--i:${i++}"><img src="works/${c.id}.webp" alt="${c.title}" loading="${i > 2 ? 'lazy' : 'eager'}" decoding="async"></div>`;
    const rows = pvRows(list).map(r =>
      r.kind === 'wide' ? tile(r.imgs[0], 'pv-wide')
      : r.kind === 'mix' ? `<div class="pv-row mix">${tile(r.imgs[0], 'pv-tall')}<div class="pv-col">${tile(r.imgs[1], 'pv-half')}${tile(r.imgs[2], 'pv-half')}</div></div>`
      : r.kind === 'tall' ? `<div class="pv-row">${tile(r.imgs[0], 'pv-tall')}${tile(r.imgs[1], 'pv-tall')}</div>`
      : r.kind === 'pair' ? `<div class="pv-row">${tile(r.imgs[0], 'pv-half')}${tile(r.imgs[1], 'pv-half')}</div>`
      : `<div class="pv-row"><div class="pv-col">${tile(r.imgs[0], 'pv-half')}${tile(r.imgs[1], 'pv-half')}</div><div class="pv-col">${tile(r.imgs[2], 'pv-half')}${tile(r.imgs[3], 'pv-half')}</div></div>`).join('');
    pvEl.innerHTML = `<div class="pv-in"><div class="pv-info"><div><h2 class="pv-title" id="pvTitle" tabindex="-1">${name}</h2>` +
      (info.description ? `<p class="pv-desc">${info.description}</p>` : '') + `</div><div>` +
      (info.industry ? `<span class="pv-tag">${info.industry}</span>` : '') + (info.disciplines ? `<p class="pv-disc">${info.disciplines}</p>` : '') +
      `</div></div><div class="pv-g">${rows}</div></div>`;
    pvEl.setAttribute('aria-label', name);
  }
  let pvFocusBack = null, pvCameFromSite = false;
  function pvSync(){
    const m = /^#project-(.+)$/.exec(location.hash), all = pvProjects();
    const name = m && [...all.keys()].find(n => pvSlug(n) === m[1]);
    if (name){
      if (!pvOpen) pvFocusBack = document.activeElement;
      pvRender(name, all.get(name)); pvEl.hidden = false; pvEl.scrollTop = 0;
      pvOpen = true; document.documentElement.classList.add('pv-open'); if (lenis) lenis.stop();
      $('main').inert = true;
      requestAnimationFrame(() => { pvEl.classList.add('open'); $('pvTitle').focus({ preventScroll: true }); });
    } else if (pvOpen){
      pvOpen = false; pvEl.classList.remove('open'); document.documentElement.classList.remove('pv-open'); if (lenis) lenis.start();
      $('main').inert = false;
      setTimeout(() => { if (!pvOpen){ pvEl.hidden = true; pvEl.innerHTML = ''; } }, 260);
      if (pvFocusBack && pvFocusBack.focus) pvFocusBack.focus({ preventScroll: true });
    }
  }
  function closeProject(){
    if (!pvOpen) return;
    if (pvCameFromSite) history.back();                                           // Back and the bar agree
    else { history.replaceState(null, '', location.pathname + location.search); pvSync(); }
  }
  addEventListener('hashchange', pvSync);
  $('worksGrid').addEventListener('click', e => { if (e.target.closest('a[href^="#project-"]')) pvCameFromSite = true; });
  addEventListener('keydown', e => { if (e.key === 'Escape' && pvOpen) closeProject(); });
  // the bar's logo, filters and "Works" lead back to the work
  document.querySelectorAll('#dockHome, #dockWorks, [data-filter]').forEach(el => el.addEventListener('click', closeProject, true));
