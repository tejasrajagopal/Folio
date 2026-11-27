  // The work: Nyuway, Avant and River. Every entry is a card in the orbit (works/<id>.webp, 1280×720); the first image of
  // each project (GRID) is also its tile in the work grid. A tile opens the project's gallery (GALLERIES, works/<project>/).
  const WORKS = [
    ["nyuway-1","Nyuway — Wordmark"],["avant-1","Avant — Identity"],["river-1","River — AI agent for e-commerce"],
    ["nyuway-2","Nyuway — Website"],["avant-2","Avant — Vault"],["river-2","River — Marketing spend"],
    ["nyuway-3","Nyuway — Code protection"],["avant-3","Avant — Asset page"],["river-3","River — Funnel"],
    ["nyuway-4","Nyuway — Bus shelter"],["avant-4","Avant — Real world assets"],["river-4","River — Dashboard"],
    ["nyuway-5","Nyuway — Terminal"],["avant-5","Avant — Mark"],["river-5","River — Ask River"],
    ["avant-6","Avant — Packaging"],["river-6","River — Sign in"]
  ];
  const GRID = new Set(["nyuway-1","avant-1","river-1"]);
  const HIDDEN = {}, SIZES = {};
  // what the project view says about each project (descriptions as on enframe.studio; `_default` is the Figma placeholder)
  const PROJECT_INFO = {
    _default: { description: 'Project is a company that does so and so across so many verticals', industry: 'Industry', disciplines: 'Brand/Motion/Product' },
    'Nyuway': { industry: 'AI Security', disciplines: 'Brand/Web',
      description: 'Nyuway empowers enterprises to stay secure by preventing data leaks, shadow AI, and compliance risks across modern AI tools. Its brand identity blends the dynamic energy of matrix-style technographics with the clarity of glass — a visual language of transparency and strength.' },
    'Avant': { industry: 'Crypto', disciplines: 'Brand/Product',
      description: 'Avant is a wealth management platform for crypto treasury teams to collateralize bitcoin and earn real-world yield. Users borrow stablecoins against their bitcoin collateral and trade ownership stakes of whiskey, real estate, and clean energy.' },
    'River': { industry: 'AI / Marketing', disciplines: 'Brand/Product',
      description: 'River is an AI-powered tool that gives you a clear, actionable audit of your Meta Ads campaigns. It pinpoints what’s working, what’s wasting budget, and what to do next — all explained in plain English, not marketing jargon.' },
  };
  const MAX_DUMMIES = 30;

  // ---------- DialKit config (defaults = Tejas's tuned values) ----------
  const worksCfg = { _collapsed:true };
  WORKS.forEach(([id,title]) => { worksCfg[id] = { _collapsed:true, title, size:[SIZES[id]||1,0.3,3,0.01], show:!HIDDEN[id] }; });

  const cfg = {
    Layout: {
      radius:[1.01,0.3,1.6,0.01],
      tilt:[36,0,70,1],
      perspective:[4150,800,8000,50],
      centreX:[0,-500,500,1],          // nudge from the auto-centred ring, px
      centreY:[0,-400,400,1],          // nudge from the auto-centred ring, px
      startAngle:[-27,-180,180,1],
      stacking:{ type:"select", options:[{value:"depth (pops)",label:"Depth (eased swap)"},{value:"deck (smooth)",label:"Deck (no swap)"}], default:"depth (pops)" },
    },
    Cards: {
      width:[481,80,720,1],
      aspect:{ type:"select", options:["16:9","3:2","4:3","1:1","4:5"], default:"16:9" },
      cornerRadius:[0,0,48,1],
      fit:{ type:"select", options:["cover","contain"], default:"cover" },
      shadow:[0.04,0,0.8,0.01],
      hoverZoom:[1,1,1.4,0.01],
    },
    Frame: {
      show:{ type:"select", options:["always","front only","hover","never"], default:"always" },
      border:true,
      colour:"#cbcbcb",
      gradient:false,
      colourB:"#ff2a2a",
      gradientAngle:[58,0,360,1],
      gradientSpin:[0,-180,180,1],
      borderWidth:[0,0,6,0.5],
      handles:true,
      handleSize:[7,0,24,1],
      handlePosition:{ type:"select", options:["outside","centred","inside"], default:"centred" },
      label:false,
      labelText:{ type:"select", options:["frame id","title"], default:"frame id" },
      labelColor:"#8a8a8a",
      labelSize:[12,6,20,1],
      labelGap:[6,0,24,1],
      keepCrisp:true,
    },
    "Size by position": {
      front:[1.24,0.3,3,0.01],
      sides:[1.15,0.3,3,0.01],
      back:[1,0.1,2,0.01],
      perspectiveSize:false,
    },
    Depth: {
      backOpacity:[1,0,1,0.01],
      backBlur:[3.5,0,12,0.1],
      backGreyscale:[0,0,1,0.01],
      falloff:[4,0.3,4,0.05],
    },
    Intro: {
      play:true,
      replay:{ type:"action" },
      logoDraw:[1.35,0.2,3,0.05],        // Tide draw-on, seconds
      logoHold:[0.25,0,3,0.05],
      logoScale:[1.6,0.5,6,0.05],
      logoStays:true,
      flight:[1.3,0.3,2.5,0.05],
      stagger:[75,0,200,1],             // average ms between cards; front cards get the widest gaps
      order:{ type:"select", options:["front first","back first","around"], default:"front first" },
      fromScale:[2.4,1.2,5,0.05],
      fromBlur:[2,0,12,0.5],              // depth of field while near the camera (kept light: heavy blur read as a broken card)
      settleScale:[1,1,2,0.01],          // >1: cards land this much bigger, then ripple down to size (off: they fly straight to their final size)
      rippleSpread:[0.6,0,1.5,0.05],     // s for the scale-down wave to travel from the front of the ring to the back
      rippleDur:[0.95,0.3,2,0.05],       // s each card takes to spring down (with a little overshoot)
      textIn:[0.7,0.1,3,0.05],
      lockScroll:true,
      oncePerSession:false,
    },
    Expand: {
      width:[0.82,0.4,0.98,0.01],
      openMs:[500,150,1200,10],
      closeMs:[320,100,1000,10],
    },
    Dummies: {
      count:[0,0,MAX_DUMMIES,1],
      size:[1,0.3,3,0.01],
      fill:"#e3e3e3",
      labelColor:"#9a9a9a",
      showLabel:true,
      placement:{ type:"select", options:["after works","interleave"], default:"interleave" },
    },
    Mobile: {
      _collapsed:true,
      breakpoint:[1024,400,1600,10],   // below this width: no orbit (the phone layout)
      cardWidth:[112,60,320,1],
      radius:[1.38,0.4,1.8,0.01],
      tilt:[78,0,85,1],
      centreY:[0,-500,200,1],
      maxWorks:[10,3,16,1],
      textTop:[50,40,75,1],
      blur:[0.3,0,1,0.05],
      ctaShort:"Get in touch",
      layout:{ type:"select", options:[{value:"list",label:"List (no orbit)"},{value:"orbit",label:"Orbit"}], default:"list" },
    },
    Choreography: {
      heroOut:[0.5,0.2,1.5,0.05],
      statementIn:[0.5,0.2,1.5,0.05],
      read:[1.5,0.5,4,0.05],
      exit:[0.9,0.5,3,0.05],
      flyScale:[2.2,1.5,6,0.1],
      flyStagger:[0.5,0,1.5,0.01],
      blur:[10,0,20,0.5],
    },
    Scroll: {
      smooth:true,
      lerp:[0.1,0.02,0.5,0.005],
      wheelMultiplier:[1,0.3,3,0.05],
    },
    Motion: {
      direction:{ type:"select", options:["clockwise","counter"], default:"clockwise" },
      autoSpeed:[3,0,30,0.5],
      drag:true,
      dragSensitivity:[1,0.2,3,0.05],
      ease:[0.1,0.02,0.4,0.005],
      maxSpeed:[3,0.5,8,0.1],
      scrollSpin:[1,0,4,0.05],
      mouseParallax:[0,0,3,0.05],
    },
    Theme: {
      mode:{ type:"select", options:["light","dark","system"], default:"light" },
      showToggle:true,
      darkBackground:"#0f0f0f",
      darkInk:"#f0eee9",
      darkMute:"#8f8b84",
      darkFrame:"#3a3a3a",
      darkLine:"#232323",
    },
    Text: {
      name:"Tejas Rajagopal",
      nameSize:[45,24,200,1],
      subtitle:"Brand-led generalist designer for fintech, AI and crypto. A few favourites from the archive.",
      showCaption:false,
      showLogos:true,
      yearsLabel:"5+ Years working at",
      ctaLabel:"Get in touch",
      aboutLink:"#",
      ctaLink:"mailto:",
      showCta:true,
      textAboveCards:true,
      showHint:true,
      statement:"Every startup starts as a story. I help founders tell it through brand, product and marketing, so the idea feels real from day one. These are some of my work",
      statementLead:6,
      background:"#ffffff",
      ink:"#141414",
    },
    "Theme transition": {
      blur:[12,2,30,1],                 // how soft the screen goes while the theme switches, px
      duration:[0.5,0.2,1.5,0.05],      // seconds for the whole switch (blur in + blur out)
    },
    Responsive: {
      scaleWithScreen:true,             // desktop: cards and orbit offsets shrink with the window
      referenceWidth:[2048,900,2600,10],// window width at which cards reach full size (13" laptops get ~70%)
      minScale:[0.45,0.2,1,0.05],       // never shrink cards below this share of their size
      clearText:false,                   // cards covering the hero text or the paragraph fade away
      padding:[24,0,120,2],             // breathing room kept around the text, px
      tolerance:[0.03,0,0.4,0.01],      // share of the text a card may cover before it starts to fade
      fadeRange:[0.08,0.02,0.6,0.01],    // further coverage over which it fades out completely
    },
    Wave: {
      startOpacity:[0.25,0,1,0.05],     // unread letters, as a share of the ink colour
      duration:[0.8,0.2,2,0.05],        // seconds each letter takes: grey → gradient → ink
      peak:[0.3,0.1,0.6,0.05],          // when in that time it reaches the gradient's first colour
      scrub:[0.12,0,0.6,0.01],          // how loosely the wave front follows the scroll
    },
    Works: worksCfg,
  };

