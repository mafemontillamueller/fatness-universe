/* ==========================================================================
   CRAV clone — main.js (v2, sobre el HTML real del sitio)
   Esta versión usa el markup ORIGINAL (mismos data-attributes que trae
   cravburgers.shop: [data-pop], [data-anm-btn], [data-cursor-hide],
   .sticker-container/.flap, #main-menu), así que en vez de inventar
   selectores, enganchamos directamente sobre esos hooks reales.
   ========================================================================== */

gsap.registerPlugin(ScrollTrigger);

/* --------------------------------------------------------------------
   0.5 REBOTE "en el sitio" (squash & stretch), reutilizable.
   No traslada el elemento, solo lo achata/estira desde su base, como
   una pelota que rebota sin moverse de lugar. Se usa en la hamburguesa
   del hero Y en los stickers de la sección About.
   -------------------------------------------------------------------- */
function bounceInPlace(el, delay = 1) {
  gsap.set(el, { transformOrigin: '50% 100%' });
  gsap.timeline({ repeat: -1, delay, repeatDelay: 0.4 })
    .to(el, { scaleY: 0.9, scaleX: 1.06, duration: 0.15, ease: 'power1.out' })
    .to(el, { scaleY: 1.08, scaleX: 0.96, duration: 0.25, ease: 'power2.out' })
    .to(el, { scaleY: 0.97, scaleX: 1.02, duration: 0.18, ease: 'power1.inOut' })
    .to(el, { scaleY: 1, scaleX: 1, duration: 0.2, ease: 'power1.inOut' });
}

const heroBurger = document.getElementById('hero-burger');
if (heroBurger) bounceInPlace(heroBurger, 1);

/* --------------------------------------------------------------------
   0. Preloader real del sitio (role="dialog" aria-label="Page loading")
   Reproduce la secuencia que tiene cravburgers.shop al cargar:
     1) va "armando" la hamburguesa capa por capa (pan, carne, queso,
        tomate, lechuga, pan de arriba), cada una cae con un rebote y
        cambia el texto ("TOASTING THE ARTISAN BUN...", "SEARING THE
        GLAZED PATTY...", etc.), sincronizado con la barra de progreso.
     2) al llegar a "READY TO CRAV!" con la hamburguesa completa,
        las 3 cortinas de color (marrón/naranja/azul) se deslizan hacia
        arriba y se van, revelando el header + hero de la página.
   El HTML real YA trae las 6 capas vectoriales de la hamburguesa (pan de
   abajo, carne, queso, tomate, lechuga, pan de arriba con sésamo) dentro
   de .origin-bottom, todas con opacity:1 desde el principio — por eso
   antes se veían "dos hamburguesas montadas" cuando además dibujábamos
   rectángulos de colores encima. Ahora reusamos esas capas reales: las
   escondemos al empezar y las vamos revelando una a una, sincronizadas
   con el texto y la barra de progreso.
   -------------------------------------------------------------------- */
const preloader = document.querySelector('[role="dialog"][aria-label="Page loading"]');
const loaderFill = document.querySelector('.loader-bar > div');
const loaderText = document.querySelector('[aria-label="Page loading"] [aria-live="polite"]');
const burgerStage = document.querySelector('[aria-label="Page loading"] .origin-bottom');
const curtainLayers = document.querySelectorAll('[aria-label="Page loading"] svg');
// capas reales del sitio: divs directos de .origin-bottom con "will-change-transform"
// (así evitamos el div de confeti, que tiene otras clases)
const ingredientLayers = burgerStage
  ? Array.from(burgerStage.children).filter((el) => el.classList.contains('will-change-transform'))
  : [];

const BUILD_STEPS = [
  'Toasting the artisan bun...',
  'Searing the glazed patty...',
  'Melting cheddar cheese...',
  'Slicing ripe red tomatoes...',
  'Adding crispy garden lettuce...',
  'Preparing to serve the CRAV masterpiece!',
];

function runPreloader() {
  if (!preloader || !burgerStage) return;

  // las capas empiezan invisibles/caídas; se revelan en orden (de abajo hacia arriba,
  // que es el mismo orden en que ya están en el DOM)
  gsap.set(ingredientLayers, { opacity: 0, y: -40, scale: 0.85, transformOrigin: '50% 100%' });

  const tl = gsap.timeline({ delay: 0.3 });
  const stepDuration = 0.55;
  const stepPause = 0.35;
  const steps = Math.max(BUILD_STEPS.length, ingredientLayers.length);

  BUILD_STEPS.forEach((text, i) => {
    tl.call(() => {
      if (loaderText) loaderText.textContent = text;
    });
    const layer = ingredientLayers[i];
    if (layer) {
      tl.to(layer, { opacity: 1, y: 0, scale: 1, duration: stepDuration, ease: 'bounce.out' }, '<');
    }
    tl.to(
      { p: (i / steps) * 100 },
      {
        p: ((i + 1) / steps) * 100,
        duration: stepDuration,
        onUpdate: function () {
          if (loaderFill) loaderFill.style.width = this.targets()[0].p + '%';
        },
      },
      '<'
    );
    tl.to({}, { duration: stepPause });
  });

  tl.call(() => {
    if (loaderText) loaderText.textContent = 'Ready to crav!';
  });
  tl.to({}, { duration: 0.9 }); // se queda un instante mostrando la hamburguesa completa

  // --- fade de texto/hamburguesa + cortinas deslizándose hacia arriba ---
  tl.to([loaderText, burgerStage, document.querySelector('.loader-bar')], {
    opacity: 0,
    duration: 0.4,
  });
  tl.to(
    curtainLayers,
    {
      yPercent: -100,
      duration: 0.9,
      ease: 'power2.inOut',
      stagger: 0.15, // marrón, luego naranja, luego azul — igual que el original
    },
    '-=0.1'
  );
  tl.call(() => {
    preloader.style.display = 'none';
    document.body.style.overflow = '';
    ScrollTrigger.refresh();
  });
}
setTimeout(runPreloader, 400);

/* --------------------------------------------------------------------
   1. TEXTO PALABRA POR PALABRA
   El HTML YA trae cada palabra envuelta en <span data-pop="true">
   (así lo hace el sitio original, sin el plugin de pago SplitText).
   Aquí solo animamos su entrada agrupando por bloque de texto padre,
   con ScrollTrigger + stagger, igual que documenta el informe.
   -------------------------------------------------------------------- */
const popGroups = new Map();
document.querySelectorAll('[data-pop]').forEach((span) => {
  const wrapper = span.closest('[aria-hidden="true"]') || span.parentElement;
  if (!popGroups.has(wrapper)) popGroups.set(wrapper, []);
  popGroups.get(wrapper).push(span);
  gsap.set(span, { opacity: 0, y: '0.6em' });
});
popGroups.forEach((words, wrapper) => {
  ScrollTrigger.create({
    trigger: wrapper,
    start: 'top 85%',
    once: true,
    onEnter: () => gsap.to(words, { opacity: 1, y: 0, duration: 0.7, stagger: 0.05, ease: 'power3.out' }),
  });
});

/* --------------------------------------------------------------------
   2. REVEAL GENÉRICO (fade + slight rise) para imágenes y párrafos
   sueltos que no tengan ya su propia animación de palabra.
   Mismo patrón gsap.set + ScrollTrigger.create + onEnter documentado
   en el informe de análisis.
   -------------------------------------------------------------------- */
const revealTargets = document.querySelectorAll(
  '#about img:not(.about-sticker), #ingredients img, #map-desktop img, #map-mobile img, #cta img, #cta .reel-card, .country-label'
);
revealTargets.forEach((el) => {
  gsap.set(el, { opacity: 0, y: 30 });
  ScrollTrigger.create({
    trigger: el,
    start: 'top 90%',
    once: true,
    onEnter: () => gsap.to(el, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }),
  });
});

/* --------------------------------------------------------------------
   2.5 STICKERS DE FONDO de la sección About (papas, pizza, taco, etc.)
   Aparecen con un "pop" (escala + rotación + fade) escalonado cuando
   la sección entra en viewport. El estado inicial (opacity:0, escala
   chica, rotados) ya viene en el CSS (.about-sticker).
   -------------------------------------------------------------------- */
const aboutStickers = document.querySelectorAll('.about-sticker');
if (aboutStickers.length) {
  ScrollTrigger.create({
    trigger: '#about',
    start: 'top 70%',
    once: true,
    onEnter: () => {
      gsap.to(aboutStickers, {
        opacity: 1,
        scale: 1,
        rotate: 0,
        duration: 0.9,
        stagger: 0.12,
        ease: 'back.out(1.8)',
        onComplete: () => {
          // igual que la hamburguesa del hero: rebote "en el sitio", escalonado
          aboutStickers.forEach((el, i) => bounceInPlace(el, i * 0.25));
        },
      });
    },
  });
}

/* --------------------------------------------------------------------
   2.6 AVIÓN — recorre las 5 paradas (antes ciudades, ahora los
   reportajes) de la sección "map-desktop" a medida que se hace scroll.
   El sitio original animaba esto con un plugin de pago (MotionPath);
   aquí lo resolvemos con un timeline scrubbed por waypoints (izq/top),
   con pequeños bandeos de rotación en cada giro.
   -------------------------------------------------------------------- */
const planeDesktop = document.getElementById('plane-desktop');
if (planeDesktop) {
  const planeStops = [
    { left: '5vw', top: '15vw', rotate: 15 },
    { left: '80vw', top: '48vw', rotate: -10 },
    { left: '35vw', top: '62vw', rotate: 20 },
    { left: '65vw', top: '78vw', rotate: -15 },
    { left: '15vw', top: '103vw', rotate: 15 },
    { left: '71vw', top: '128vw', rotate: -5 },
  ];
  gsap.set(planeDesktop, { left: planeStops[0].left, top: planeStops[0].top, rotate: planeStops[0].rotate });
  const planeTl = gsap.timeline({
    scrollTrigger: {
      trigger: '#map-desktop',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1,
    },
  });
  for (let i = 1; i < planeStops.length; i++) {
    planeTl.to(planeDesktop, {
      left: planeStops[i].left,
      top: planeStops[i].top,
      rotate: planeStops[i].rotate,
      ease: 'power1.inOut',
      duration: 1,
    });
  }
}

/* --------------------------------------------------------------------
   3. STICKERS — efecto "peel" + luz especular que sigue el cursor
   El CSS original controla el peel con las custom properties
   --peel-direction / --peel-amount sobre .sticker-container (clip-path).
   La luz la dan los filtros SVG <fePointLight>, cuyo x/y actualizamos
   en cada mousemove (igual que hace el bundle original).
   -------------------------------------------------------------------- */
document.querySelectorAll('.sticker-container').forEach((container) => {
  const wrapper = container.closest('[style*="--peel-direction"]') || container.parentElement;
  const lights = wrapper.querySelectorAll('fePointLight');

  wrapper.addEventListener('mousemove', (e) => {
    const rect = wrapper.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    lights.forEach((l) => {
      l.setAttribute('x', x.toFixed(1));
      l.setAttribute('y', y.toFixed(1));
    });
    // pequeño "peel" hacia el lado del cursor
    const dir = (x - 50) / 50; // -1..1
    wrapper.style.setProperty('--peel-direction', dir * 4 + 'deg');
  });
  wrapper.addEventListener('mouseleave', () => {
    wrapper.style.setProperty('--peel-direction', '0deg');
  });
});

/* --------------------------------------------------------------------
   4. BOTÓN BLOB (data-anm-btn) — wobble de escala al pasar el mouse
   -------------------------------------------------------------------- */
document.querySelectorAll('[data-anm-btn="btn"]').forEach((btn) => {
  btn.addEventListener('mouseenter', () => gsap.to(btn, { scale: 1.06, duration: 0.3, ease: 'back.out(3)' }));
  btn.addEventListener('mouseleave', () => gsap.to(btn, { scale: 1, duration: 0.3, ease: 'back.out(3)' }));
});

/* --------------------------------------------------------------------
   5. MENÚ MÓVIL/DESKTOP (#main-menu) — abre/cierra con el botón toggle
   -------------------------------------------------------------------- */
const menuBtn = document.querySelector('[aria-controls="main-menu"]');
const menu = document.getElementById('main-menu');
const backdrop = document.querySelector('.bg-red\\/30.backdrop-blur-md');
if (menuBtn && menu) {
  let open = false;
  menuBtn.addEventListener('click', () => {
    open = !open;
    menuBtn.setAttribute('aria-expanded', open);
    gsap.to(menu, { opacity: open ? 1 : 0, scale: open ? 1 : 0.3, duration: 0.3, ease: 'back.out(2)' });
    menu.style.pointerEvents = open ? 'auto' : 'none';
    if (backdrop) {
      gsap.to(backdrop, { opacity: open ? 1 : 0, duration: 0.3 });
      backdrop.style.pointerEvents = open ? 'auto' : 'none';
    }
  });
}

/* --------------------------------------------------------------------
   6. CURSOR CUSTOM — se oculta el nativo en [data-cursor-hide]
   -------------------------------------------------------------------- */
const cursor = document.getElementById('custom-cursor');
if (window.matchMedia('(pointer: fine)').matches && cursor) {
  document.body.classList.add('cursor-active');
  window.addEventListener('mousemove', (e) => {
    gsap.to(cursor, { x: e.clientX, y: e.clientY, duration: 0.15, ease: 'power2.out' });
  });
  document.querySelectorAll('[data-cursor-hide]').forEach((el) => {
    el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
  });
}

/* --------------------------------------------------------------------
   7. SCROLL SUAVE — Lenis sincronizado con ScrollTrigger
   -------------------------------------------------------------------- */
const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
