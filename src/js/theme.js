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
