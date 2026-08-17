/* Vanshika Soner — portfolio
 * Scroll engine: scattered cards settle into the grid while the palette
 * inverts dark -> light -> ink. No dependencies.
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var cards = Array.prototype.slice.call(document.querySelectorAll('.card'));
  var contact = document.getElementById('contact');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- palettes ---------- */
  var DARK  = { bg: [8, 8, 10],      fg: [243, 239, 231], surface: [16, 16, 20],    sh: 1 };
  var LIGHT = { bg: [241, 238, 232], fg: [14, 14, 16],    surface: [255, 255, 255], sh: 0.18 };
  var INK   = { bg: [10, 10, 12],    fg: [243, 239, 231], surface: [18, 18, 22],    sh: 1 };
  /* the inversion travels through a warm mid-tone instead of dead grey */
  var WARM  = { bg: [58, 43, 36],    surface: [66, 50, 42] };

  /* ---------- scatter layouts (x,y = fraction of viewport, r = deg, s = scale) ---------- */
  var SCATTER_WIDE = [
    { x: 0.045, y: 0.09, r: -8,  s: 0.28, d: 1.0 },
    { x: 0.700, y: 0.05, r: 5,   s: 0.32, d: 0.6 },
    { x: 0.860, y: 0.35, r: -6,  s: 0.26, d: 1.3 },
    { x: 0.625, y: 0.63, r: 8,   s: 0.30, d: 0.8 },
    { x: 0.335, y: 0.04, r: 3,   s: 0.22, d: 1.5 },
    { x: 0.800, y: 0.88, r: -10, s: 0.28, d: 0.5 },
    { x: 0.175, y: 0.90, r: 6,   s: 0.25, d: 1.1 },
    { x: 0.470, y: 0.92, r: -4,  s: 0.23, d: 0.9 }
  ];
  var SCATTER_NARROW = [
    { x: 0.03, y: 0.07, r: -7, s: 0.34, d: 1.0 },
    { x: 0.60, y: 0.03, r: 6,  s: 0.30, d: 0.7 },
    { x: 0.68, y: 0.30, r: -5, s: 0.28, d: 1.2 },
    { x: 0.05, y: 0.72, r: 7,  s: 0.30, d: 0.9 },
    { x: 0.55, y: 0.79, r: -8, s: 0.26, d: 1.4 },
    { x: 0.44, y: 0.92, r: 4,  s: 0.24, d: 0.6 },
    { x: 0.62, y: 0.16, r: 9,  s: 0.22, d: 1.1 },
    { x: 0.06, y: 0.23, r: -3, s: 0.20, d: 0.8 }
  ];

  /* ---------- state ---------- */
  var vw = 0, vh = 0, base = [], scatter = SCATTER_WIDE;
  var settleEnd = 1, inkStart = 1, inkEnd = 2;
  var target = 0, current = 0;      // damped scroll position
  var mx = 0, my = 0, cmx = 0, cmy = 0;
  var ticking = true;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function smooth(e0, e1, x) {
    var t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  }
  function mixRGB(a, b, t) {
    return 'rgb(' + Math.round(lerp(a[0], b[0], t)) + ',' +
                    Math.round(lerp(a[1], b[1], t)) + ',' +
                    Math.round(lerp(a[2], b[2], t)) + ')';
  }
  function rgba(c, alpha) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + alpha + ')'; }

  /* ---------- measure ---------- */
  function measure() {
    vw = window.innerWidth;
    vh = window.innerHeight;
    scatter = vw < 860 ? SCATTER_NARROW : SCATTER_WIDE;

    var sy = window.pageYOffset;
    cards.forEach(function (c) { c.style.transform = 'none'; });
    // force layout once, then read
    void document.body.offsetHeight;
    base = cards.map(function (c) {
      var r = c.getBoundingClientRect();
      return { left: r.left + window.pageXOffset, top: r.top + sy };
    });

    settleEnd = Math.max(1, vh * 0.95);
    var cRect = contact.getBoundingClientRect();
    var contactTop = cRect.top + sy;
    inkStart = Math.max(settleEnd + 1, contactTop - vh * 0.75);
    inkEnd = contactTop - vh * 0.1;
    if (inkEnd <= inkStart) inkEnd = inkStart + vh * 0.5;
  }

  /* ---------- paint ---------- */
  /* Three-point colour path (dark -> warm -> light) so the page never parks in
     a dead grey, and a deliberately snappier curve for type so the text flips
     legibility in a short window rather than fading through the background. */
  function via(a, mid, b, t) {
    return t < 0.5 ? mixRGB(a, mid, t * 2) : mixRGB(mid, b, (t - 0.5) * 2);
  }

  function paintTheme(y) {
    var from, to, tbg, tfg, S = settleEnd;
    if (y < inkStart) {
      from = DARK; to = LIGHT;
      tbg = smooth(S * 0.40, S * 0.98, y);
      tfg = smooth(S * 0.755, S * 0.845, y);
    } else {
      var span = inkEnd - inkStart;
      from = LIGHT; to = INK;
      tbg = smooth(inkStart, inkEnd, y);
      tfg = smooth(inkStart + span * 0.42, inkStart + span * 0.54, y);
    }

    var fgArr = [
      Math.round(lerp(from.fg[0], to.fg[0], tfg)),
      Math.round(lerp(from.fg[1], to.fg[1], tfg)),
      Math.round(lerp(from.fg[2], to.fg[2], tfg))
    ];
    var sh = lerp(from.sh, to.sh, tbg);

    root.style.setProperty('--bg', via(from.bg, WARM.bg, to.bg, tbg));
    root.style.setProperty('--fg', 'rgb(' + fgArr.join(',') + ')');
    root.style.setProperty('--muted', rgba(fgArr, 0.55));
    root.style.setProperty('--line', rgba(fgArr, 0.14));
    root.style.setProperty('--surface', via(from.surface, WARM.surface, to.surface, tbg));
    root.style.setProperty('--shadow', '0 30px 70px -30px rgba(0,0,0,' + (0.18 + 0.62 * sh).toFixed(3) + ')');
  }

  function paintCards(y) {
    var p = clamp(y / settleEnd, 0, 1);
    for (var i = 0; i < cards.length; i++) {
      var cfg = scatter[i % scatter.length];
      var b = base[i];
      if (!b) continue;

      var pi = easeOut(clamp(p * 1.16 - (i % 4) * 0.035, 0, 1));
      var inv = 1 - pi;

      var tx = (vw * cfg.x - b.left) * inv;
      var ty = (vh * cfg.y - b.top) * inv;

      // pointer parallax while floating
      tx += cmx * cfg.d * 26 * inv;
      ty += cmy * cfg.d * 18 * inv;

      var rot = cfg.r * inv;
      var sc = 1 + (cfg.s - 1) * inv;

      cards[i].style.transform =
        'translate3d(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px,0) rotate(' +
        rot.toFixed(2) + 'deg) scale(' + sc.toFixed(4) + ')';
      cards[i].style.setProperty('--drift', inv.toFixed(3));
      cards[i].style.zIndex = String(10 - (i % 8));
    }
  }

  /* ---------- loop ---------- */
  function frame() {
    var t = window.pageYOffset;
    current += (t - current) * 0.14;
    cmx += (mx - cmx) * 0.06;
    cmy += (my - cmy) * 0.06;
    if (Math.abs(t - current) < 0.15) current = t;

    paintTheme(current);
    paintCards(current);

    requestAnimationFrame(frame);
  }

  /* ---------- static fallback ---------- */
  function settleAll() {
    cards.forEach(function (c) { c.style.transform = 'none'; c.style.setProperty('--drift', '0'); });
    paintTheme(window.pageYOffset);
  }

  /* ---------- reveals ---------- */
  function reveals() {
    var els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(els, function (e) { e.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
    Array.prototype.forEach.call(els, function (e) { io.observe(e); });
  }

  /* ---------- init ---------- */
  function init() {
    reveals();

    if (reduced) {
      measure();
      settleAll();
      window.addEventListener('scroll', function () { paintTheme(window.pageYOffset); }, { passive: true });
      window.addEventListener('resize', function () { measure(); settleAll(); });
      return;
    }

    measure();
    current = window.pageYOffset;
    paintTheme(current);
    paintCards(current);
    requestAnimationFrame(frame);

    window.addEventListener('mousemove', function (e) {
      mx = (e.clientX / vw) * 2 - 1;
      my = (e.clientY / vh) * 2 - 1;
    }, { passive: true });

    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { measure(); paintCards(current); paintTheme(current); }, 120);
    });

    // re-measure once fonts and images have settled (layout can shift)
    window.addEventListener('load', function () { measure(); });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { measure(); });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
