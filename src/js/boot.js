  kit.subscribe(applyStatic);
  let introSkipped = false, skipAt = 0, skipIt = 0;
  const skipIntro = () => { if (V && !introDone && !introSkipped && introStart > 0 && introStart < Infinity){
    introSkipped = true; skipAt = performance.now(); skipIt = (skipAt - introStart)/1000; lock(false); } };
  ['keydown','wheel','touchstart','pointerdown'].forEach(t => addEventListener(t, skipIntro, { passive:true }));
  // the logo starts drawing in the centre straight away; the works only fly in once their images are decoded.
  // If they're not ready when the logo finishes, the logo simply holds in the centre until they are.
  let imagesReady = false;
  function begin(){
    let seen = false; try{ seen = sessionStorage.getItem('orbitIntroSeen') === '1'; }catch(e){}
    introStart = (seen && V && V.Intro.oncePerSession) ? -1e9 : performance.now();
    const decodes = cards.filter(c=>c.img).map(c => c.img.decode().catch(()=>{}));
    Promise.race([Promise.all(decodes), new Promise(r => setTimeout(r, 4000))]).then(() => { imagesReady = true; });
  }
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', begin); else begin();
  requestAnimationFrame(frame);
