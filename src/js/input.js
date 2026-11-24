  // ---------- input ----------

  // ---- spin: drag with momentum, scroll adds a nudge; both decay back to the slow auto-rotation
  // velocity model (same as the Osmo tornado): input adds speed, speed eases back to the auto-rotation every frame,
  // and the ring only ever integrates speed — so drag is never jittery, whatever the pointer sampling does
  let spin = 0, spinV = 0, spinDir = 0, lastR = 400, suppressClick = false;
  let down = null, dragging = false;
  stage.addEventListener('pointerdown', e => {
    if (!V || isList(V) || !V.Motion.drag || !introDone || exId !== -1 || e.button !== 0 || e.target.closest('a,button') || scrollY > innerHeight*0.25) return;
    down = { id:e.pointerId, x0:e.clientX, y0:e.clientY, x:e.clientX, t:performance.now() };
  });
  stage.addEventListener('pointermove', e => {
    if (!down || e.pointerId !== down.id) return;
    if (!dragging){
      const dx0 = e.clientX - down.x0, dy0 = e.clientY - down.y0;
      if (Math.abs(dx0) < 5 || Math.abs(dx0) < Math.abs(dy0)) { if (Math.abs(dy0) > 8) down = null; return; }  // vertical = page scroll
      dragging = true; stage.setPointerCapture(e.pointerId); stage.classList.add('dragging');
    }
    const now = performance.now(), dt = Math.max(1, now - down.t) / 1000;
    const dx = e.clientX - down.x;
    if (dx){
      const M = V.Motion;
      spinV = clamp(spinV + dx * 0.0236 * M.dragSensitivity, -M.maxSpeed, M.maxSpeed);   // ≈1.35°/s of spin per px dragged
    }
    down.x = e.clientX; down.t = now;
  });
  const endDrag = e => {
    if (dragging){
      if (Math.abs(spinV) > 1e-3) spinDir = Math.sign(spinV);          // auto-rotation carries on the way you flung it
      suppressClick = true; setTimeout(() => suppressClick = false, 0);
      stage.classList.remove('dragging');
    }
    dragging = false; down = null;
  };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  let lastScrollY = scrollY;
  addEventListener('scroll', () => {
    const dy = scrollY - lastScrollY; lastScrollY = scrollY;
    if (V && introDone && scrollY < innerHeight && dy){
      const M = V.Motion, sd = (M.direction === 'clockwise' ? 1 : -1) * Math.sign(dy);
      spinV = clamp(spinV + Math.abs(clamp(dy, -200, 200)) * 0.0047 * M.scrollSpin * sd, -M.maxSpeed, M.maxSpeed);
      spinDir = sd;
    }
  }, {passive:true});
  addEventListener('pointermove', e => { mx=e.clientX/innerWidth-.5; my=e.clientY/innerHeight-.5; });
  // ---- Lenis smooth scroll (off for reduced motion)
  let lenis = null;
  if (!reduce && window.Lenis){ lenis = new Lenis({ lerp: 0.1, smoothWheel: true }); }
  const getScrollY = () => lenis ? lenis.scroll : scrollY;

