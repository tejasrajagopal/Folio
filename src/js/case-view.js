  // ---- case view: a card expands from where it sits (object permanence) and returns there on close
  // cubic-bezier solver for the iOS-sheet curve (.32,.72,0,1): steep start, long settle
  function bezier(x1,y1,x2,y2){
    const cx=3*x1, bx=3*(x2-x1)-cx, ax=1-cx-bx, cy=3*y1, by=3*(y2-y1)-cy, ay=1-cy-by;
    const X=t=>((ax*t+bx)*t+cx)*t, Y=t=>((ay*t+by)*t+cy)*t, dX=t=>(3*ax*t+2*bx)*t+cx;
    return x => { if (x<=0) return 0; if (x>=1) return 1; let t=x; for (let i=0;i<6;i++){ const d=dX(t); if (Math.abs(d)<1e-6) break; t-= (X(t)-x)/d; } return Y(clamp(t)); };
  }
  const easeSheet = bezier(.32,.72,0,1);
  let exId = -1, exP = 0, exFrom = 0, exTo = 0, exT0 = 0, exDur = 0.5;
  const statementEl = document.getElementById('statementText'), worksEl = document.getElementById('works');
  const mTop = document.getElementById('mTop');
  const heroCue = document.getElementById('heroCue'), dock = document.getElementById('dock'), edgeBlur = document.getElementById('edgeBlur');
  const caseBg = document.getElementById('caseBg'), caseInfo = document.getElementById('caseInfo'), caseClose = document.getElementById('caseClose');
  let lastFocus = null, paused = false, uiLastY = 0, uiHide = false;
  const scrollCueEl = document.querySelector('.scroll-cue');
  // while a piece is open, everything else is inert: focus stays in the view and screen readers only see it
  function setInertOutside(on, keep){
    ['works','dock','themeToggle','centre','statementText'].forEach(id => { const e = document.getElementById(id); if (e) e.inert = on; });
    cards.forEach((c, j) => { c.el.inert = on && j !== keep; });
  }
  function openCase(i){
    if (!introDone || cards[i].dummy || scrollY > innerHeight*0.25) return;
    if (exId !== -1 && exId !== i) return;
    exId = i; exFrom = exP; exTo = 1; exT0 = performance.now(); exDur = V.Expand.openMs/1000;
    document.getElementById('caseTitle').textContent = cards[i].title;
    document.getElementById('caseFig').textContent = 'Fig. ' + cards[i].fig;
    caseBg.classList.add('open'); lock(true); caseClose.style.pointerEvents = 'auto';
    lastFocus = document.activeElement;
    setInertOutside(true, i);
    caseClose.inert = false; caseClose.style.visibility = ''; caseClose.setAttribute('aria-label', `Close ${cards[i].title}`);
    caseClose.focus({preventScroll:true});
  }
  function closeCase(){
    if (exId === -1 || exTo === 0) return;
    exFrom = exP; exTo = 0; exT0 = performance.now(); exDur = V.Expand.closeMs/1000;   // exits are shorter
    caseBg.classList.remove('open'); caseClose.style.pointerEvents = 'none';
    setInertOutside(false); caseClose.inert = true; dock.inert = !dock._on;
    if (lastFocus && lastFocus.focus) lastFocus.focus({preventScroll:true});
  }
  caseClose.inert = true;
  addEventListener('keydown', e => {
    if (e.key !== 'Tab' || exId === -1 || exTo === 0) return;
    const card = cards[exId].el;
    if (document.activeElement === caseClose){ e.preventDefault(); card.focus({preventScroll:true}); }
    else if (document.activeElement === card){ e.preventDefault(); caseClose.focus({preventScroll:true}); }
  });
  ring.appendChild(caseBg);   // backdrop sits inside the ring's stacking context: above the other cards, below the opened one
  caseBg.addEventListener('click', closeCase);
  caseClose.addEventListener('click', closeCase);
  addEventListener('keydown', e => { if (e.key === 'Escape') closeCase(); });

