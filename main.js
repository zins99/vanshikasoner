/* Vanshika Soner — portfolio
 * Scroll engine: scattered cards settle into the grid while the palette
 * inverts dark -> warm -> light -> ink. No dependencies.
 *
 * Note on the scatter: the cards are pinned (position:fixed) while they float
 * in the hero and released into normal flow the moment they land. Translating
 * them thousands of pixels with a transform looks equivalent, but Chrome then
 * culls their images — the layout position sits far below the viewport — and
 * the hero renders as a field of empty plates. Pinning keeps them genuinely
 * on-screen, so they always rasterise.
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var cards = Array.prototype.slice.call(document.querySelectorAll('.card'));
  var inners = cards.map(function (c) { return c.querySelector('.card-inner'); });
  var metas = cards.map(function (c) { return c.querySelector('.meta'); });
  var pinned = cards.map(function () { return false; });
  var contact = document.getElementById('contact');
  var nav = document.getElementById('nav');
  var progress = document.getElementById('progress');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- palettes ---------- */
  var DARK  = { bg: [8, 8, 10],      fg: [243, 239, 231], surface: [16, 16, 20],    sh: 1 };
  var LIGHT = { bg: [241, 238, 232], fg: [14, 14, 16],    surface: [255, 255, 255], sh: 0.18 };
  var INK   = { bg: [10, 10, 12],    fg: [243, 239, 231], surface: [18, 18, 22],    sh: 1 };
  /* the inversion travels through a warm mid-tone instead of dead grey */
  var WARM  = { bg: [58, 43, 36],    surface: [66, 50, 42] };

  /* ---------- scatter layouts ----------
     x, y  : position of the card's top-left as a fraction of the viewport
     r     : rotation in degrees
     w     : target on-screen width as a fraction of viewport width
     d     : pointer-parallax depth                                        */
  var SCATTER_WIDE = [
    { x: 0.060, y: 0.125, r: -8, w: 0.115, d: 1.0 },  /* 01 increase  */
    { x: 0.300, y: 0.130, r: 6,  w: 0.125, d: 0.6 },  /* 02 lithic    */
    { x: 0.570, y: 0.120, r: -6, w: 0.062, d: 1.3 },  /* 03 copilot   */
    { x: 0.700, y: 0.150, r: 5,  w: 0.055, d: 1.5 },  /* 04 kudos     */
    { x: 0.820, y: 0.120, r: -6, w: 0.105, d: 1.2 },  /* 05 depot     */
    { x: 0.700, y: 0.400, r: 8,  w: 0.120, d: 0.8 },  /* 06 numeric   */
    { x: 0.900, y: 0.620, r: -8, w: 0.058, d: 1.4 },  /* 07 curtsy    */
    { x: -0.015, y: 0.600, r: 7, w: 0.060, d: 0.7 },  /* 08 rosebud   */
    { x: 0.050, y: 0.745, r: 6,  w: 0.110, d: 1.1 },  /* 09 method    */
    { x: 0.330, y: 0.795, r: -4, w: 0.100, d: 0.9 },  /* 10 middesk   */
    { x: 0.550, y: 0.755, r: 5,  w: 0.095, d: 0.5 },  /* 11 mercoa    */
    { x: 0.780, y: 0.810, r: -7, w: 0.105, d: 1.0 }   /* 12 tennr     */
  ];
  var SCATTER_NARROW = [
    { x: 0.030, y: 0.110, r: -7, w: 0.34, d: 1.0 },
    { x: 0.550, y: 0.120, r: 6,  w: 0.36, d: 0.7 },
    { x: 0.050, y: 0.655, r: -5, w: 0.17, d: 1.3 },
    { x: 0.270, y: 0.700, r: 6,  w: 0.15, d: 1.5 },
    { x: 0.600, y: 0.270, r: -4, w: 0.30, d: 1.2 },
    { x: 0.020, y: 0.245, r: 7,  w: 0.32, d: 0.8 },
    { x: 0.500, y: 0.645, r: -7, w: 0.16, d: 1.4 },
    { x: 0.740, y: 0.700, r: 5,  w: 0.14, d: 0.6 },
    { x: 0.300, y: 0.860, r: -3, w: 0.28, d: 1.1 },
    { x: 0.630, y: 0.875, r: 4,  w: 0.26, d: 0.9 },
    { x: 0.420, y: 0.930, r: 6,  w: 0.26, d: 0.5 },
    { x: 0.340, y: 0.275, r: -5, w: 0.24, d: 1.0 }
  ];

  /* ---------- state ---------- */
  var vw = 0, vh = 0, base = [], scatter = SCATTER_WIDE;
  var settleEnd = 1, inkStart = 1, inkEnd = 2, docSpan = 1;
  var current = 0, mx = 0, my = 0, cmx = 0, cmy = 0;
  var navHidden = false;

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
  function via(a, mid, b, t) {
    return t < 0.5 ? mixRGB(a, mid, t * 2) : mixRGB(mid, b, (t - 0.5) * 2);
  }

  function release(i) {
    if (!pinned[i]) return;
    var s = inners[i].style;
    s.position = ''; s.left = ''; s.top = ''; s.width = ''; s.zIndex = ''; s.transform = '';
    if (metas[i]) { metas[i].style.transform = ''; metas[i].style.opacity = ''; }
    pinned[i] = false;
  }
  function pin(i, w) {
    if (pinned[i]) return;
    var s = inners[i].style;
    s.position = 'fixed'; s.width = w + 'px';
    pinned[i] = true;
  }

  /* ---------- measure ---------- */
  function measure() {
    vw = window.innerWidth;
    vh = window.innerHeight;
    scatter = vw < 1080 ? SCATTER_NARROW : SCATTER_WIDE;

    /* read the natural grid geometry with everything released */
    var i;
    for (i = 0; i < cards.length; i++) { release(i); cards[i].style.height = ''; }
    void document.body.offsetHeight;

    var sx = window.pageXOffset, sy = window.pageYOffset;
    base = cards.map(function (c) {
      var r = c.getBoundingClientRect();
      return { left: r.left + sx, top: r.top + sy, w: r.width || 1, h: r.height || 1 };
    });
    /* freeze the row heights so pinning a card never collapses the grid */
    for (i = 0; i < cards.length; i++) { cards[i].style.height = base[i].h + 'px'; }

    settleEnd = Math.max(1, vh * 0.95);
    docSpan = Math.max(1, document.body.scrollHeight - vh);

    /* The ink phase has to finish inside the scrollable range — the contact
       section is last, so anchoring purely to its offset can leave the page
       stranded mid-transition at the bottom of the document. */
    var contactTop = contact.getBoundingClientRect().top + sy;
    inkEnd = Math.min(contactTop - vh * 0.35, docSpan - vh * 0.05);
    inkStart = Math.max(settleEnd + 1, inkEnd - vh * 0.9);
    if (inkEnd <= inkStart) inkEnd = inkStart + vh * 0.4;
  }

  /* ---------- paint ---------- */
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

  function paintCards(y, now) {
    var p = clamp(y / settleEnd, 0, 1);
    var t = (now || 0) / 1000;
    var sx = window.pageXOffset, sy = window.pageYOffset;

    for (var i = 0; i < cards.length; i++) {
      var cfg = scatter[i % scatter.length];
      var b = base[i];
      if (!b) continue;

      var pi = easeOut(clamp(p * 1.16 - (i % 4) * 0.03, 0, 1));
      var inv = 1 - pi;

      if (inv < 0.0008) { release(i); continue; }
      pin(i, b.w);


      /* rest position in viewport space — exactly where the grid puts it */
      var restX = b.left - sx, restY = b.top - sy;
      var toX = vw * cfg.x, toY = vh * cfg.y;

      var fl = reduced ? 0 : inv;
      var x = restX + (toX - restX) * inv + cmx * cfg.d * 26 * inv;
      var yy = restY + (toY - restY) * inv + cmy * cfg.d * 18 * inv +
               Math.sin(t * 0.62 + i * 1.31) * 11 * fl;
      var rot = cfg.r * inv + Math.sin(t * 0.47 + i * 0.83) * 0.55 * fl;

      /* Size the card by width rather than a scale() transform. A scaled-down
         transform makes Chrome defer the image raster — and since a transform
         change never invalidates content, the card can stay an empty plate.
         Laying the image out small is an ordinary downscale it always draws. */
      var kw = b.w + (vw * cfg.w - b.w) * inv;
      var s = inners[i].style;
      s.width = kw.toFixed(1) + 'px';
      /* left/top rather than a translate: layout properties repaint content
         every frame, which is exactly what keeps the card images drawn. A
         transform is composited without ever repainting what is inside. */
      s.left = x.toFixed(1) + 'px';
      s.top = yy.toFixed(1) + 'px';
      s.transform = 'rotate(' + rot.toFixed(3) + 'deg)';
      s.zIndex = String(12 - (i % 12));

      /* captions ride the same shrink and fade in as the card lands */
      if (metas[i]) {
        var ms = metas[i].style;
        ms.transformOrigin = '0 0';
        ms.transform = 'scale(' + (kw / b.w).toFixed(4) + ')';
        ms.opacity = clamp(pi * 1.9 - 0.9, 0, 1).toFixed(3);
      }
    }
  }

  function paintChrome(y) {
    /* the header is for the first screen only */
    var shouldHide = y > 30;
    if (shouldHide !== navHidden) {
      navHidden = shouldHide;
      nav.classList.toggle('is-hidden', shouldHide);
    }
    if (progress) {
      progress.style.transform = 'scaleX(' + clamp(y / docSpan, 0, 1).toFixed(4) + ')';
      progress.style.opacity = y > 30 ? '.28' : '0';
    }
  }

  /* ---------- loop ---------- */
  function frame(now) {
    var t = window.pageYOffset;
    current += (t - current) * 0.14;
    cmx += (mx - cmx) * 0.06;
    cmy += (my - cmy) * 0.06;
    if (Math.abs(t - current) < 0.15) current = t;

    paintTheme(current);
    paintCards(current, now);
    paintChrome(t);

    requestAnimationFrame(frame);
  }

  function settleAll() {
    for (var i = 0; i < cards.length; i++) { release(i); }
    paintTheme(window.pageYOffset);
    paintChrome(window.pageYOffset);
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

  /* Chrome defers the scaled decode of an image drawn at ~0.2x, and a
     transform-only change never invalidates content — so a card can sit there
     as an empty plate indefinitely. Forcing a decode (and a one-off content
     invalidation) a few times over the first seconds settles it. */
  function warmImages() {
    Array.prototype.forEach.call(document.querySelectorAll('.card img'), function (im) {
      /* Re-assigning the (cached) source forces a content invalidation. A
         transform-only change never repaints content, so a card whose image
         finished decoding after its first paint can otherwise stay an empty
         plate for the whole session. */
      var src = im.getAttribute('src');
      if (src) { im.setAttribute('src', src); }
      if (im.decode) { im.decode().catch(function () {}); }
    });
  }

  function scheduleWarm() {
    [0, 400, 1200, 2500].forEach(function (d) { setTimeout(warmImages, d); });
  }

  /* ---------- init ---------- */
  function init() {
    reveals();
    scheduleWarm();

    if (reduced) {
      measure();
      settleAll();
      window.addEventListener('scroll', function () {
        paintTheme(window.pageYOffset); paintChrome(window.pageYOffset);
      }, { passive: true });
      window.addEventListener('resize', function () { measure(); settleAll(); });
      return;
    }

    measure();
    current = window.pageYOffset;
    paintTheme(current);
    paintCards(current, 0);
    paintChrome(current);
    requestAnimationFrame(frame);

    window.addEventListener('mousemove', function (e) {
      mx = (e.clientX / vw) * 2 - 1;
      my = (e.clientY / vh) * 2 - 1;
    }, { passive: true });

    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { measure(); paintCards(current, 0); paintTheme(current); }, 120);
    });

    window.addEventListener('load', function () { scheduleWarm(); measure(); });
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
