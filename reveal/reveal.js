/* TURBO STWORY – sekwencja odkrycia karty („reveal”).
 * Vanilla JS, bez zależności i bez budowania. Działa także z file://.
 *
 *   TurboReveal.init({ base: 'reveal/' });                       // raz, ścieżka do folderu z assets/ i audio/
 *   TurboReveal.play(card, 'SR', { from: 'back' }).then(r => …); // card = element | URL obrazka | {img}|{id} (PZArt)
 *   TurboReveal.skip();                                          // przeskok (jak kliknięcie gracza)
 *
 * Każda klatka jest liczona jako czysta funkcja czasu t (ms) – dzięki temu przeskok, przyspieszenie
 * i nagrywanie klatek są deterministyczne.
 */
(function (root) {
  'use strict';

  /* ------------------------------------------------------------------ KONFIG POZIOMÓW */
  // Czasy w ms od startu. Klucze zgodne z PZData.TIERS (C, U, R, H, UR, SR).
  var TIERS = {
    C:  { rank: 0, name: 'Pospolita',    antic: 0,    flip: [0, 300],    banner: [200, 'banner_C', 0.42],  fanfare: 220,
          ready: 420,  tapDefault: false, sparkles: 0,  confetti: 0, glow: null },
    U:  { rank: 1, name: 'Niepospolita', antic: 0,    flip: [0, 320],    banner: [280, 'banner_U', 0.5],   fanfare: 280, glint: [320, 420],
          ready: 760,  tapDefault: false, sparkles: 5,  sparkAt: 330, confetti: 0, glow: 'green' },
    R:  { rank: 2, name: 'Rzadka',       antic: 450,  shake: 3,  glow: 'blue', riser: null, prePing: true,
          flip: [450, 380], back: [450, 'burst_PYK', 0.62], burstSfx: 'burst_small', rays: ['rays_blue', 0.55], glint: [830, 420],
          banner: [830, 'banner_R', 0.6], fanfare: 830, sparkles: 12, sparkAt: 830, confetti: 0, ready: 1300, tapDefault: false },
    H:  { rank: 3, name: 'Holo',         antic: 900,  shake: 5,  glow: 'cyan', riser: [100, 'riser_short'], dim: [300, 900, 0.45],
          flip: [900, 420], back: [900, 'burst_TRACH', 0.7], burstSfx: 'burst_small', flash: [900, 0.55], shock: [900, 'shockwave_cyan'],
          rays: ['rays_white_24_soft', 0.7], holo: [1320, 700, 'rainbow'], banner: [1400, 'banner_H', 0.68], fanfare: 1400,
          sparkles: 24, sparkAt: 1350, confetti: 40, confAt: 1400, idleSpark: 420, ready: 2200, tapDefault: true },
    UR: { rank: 4, name: 'Ultra',        antic: 1400, shake: 8,  glow: 'magenta', riser: [0, 'riser_mid'], dim: [700, 1400, 0.65], leak: [900, 1400],
          front: [1400, 'burst_BACH', 0.95, 560], burstSfx: 'burst', flash: [1400, 0.85], quake: [1400, 260, 12], shock: [1400, 'shockwave_yellow'],
          rays: ['rays_rainbow', 0.8], flip: [1600, 450], holo: [2050, 800, 'rainbow'], banner: [2200, 'banner_UR', 0.78], fanfare: 2200,
          impact: [2200, 180, 6, 0.35], sparkles: 36, sparkAt: 2100, confetti: 90, confAt: 2150, idleSpark: 300, ready: 3200, tapDefault: true },
    SR: { rank: 5, name: 'Sekretna',     antic: 1600, shake: 12, glow: 'gold', riser: [0, 'riser_long'], dim: [1600, 2400, 0.86], leak: [1600, 2400], heldPack: [1600, 2400],
          front: [2400, 'burst_BUM', 1.15, 620], burstSfx: 'burst', flash: [2400, 1.0], quake: [2400, 320, 18], shock: [2400, 'shockwave_white'], shock2: [2520, 'shockwave_yellow'],
          rays: ['rays_gold', 0.82], rays2: ['rays_rainbow', 0.3], flip: [2650, 600], holo: [3300, 800, 'gold'],
          banner: [3600, 'banner_SR', 0.8], fanfare: 3600, impact: [3600, 220, 9, 0.6],
          sparkles: 60, sparkAt: 3400, confetti: 170, confAt: 3400, cannons: true, idleSpark: 200, ready: 4800, tapDefault: true }
  };
  var ORDER = ['C', 'U', 'R', 'H', 'UR', 'SR'];
  var GLOW = { blue: 'glow_ring_blue', cyan: 'glow_ring_cyan', magenta: 'glow_ring_magenta', gold: 'glow_ring_gold', green: 'glow_ring_green', white: 'glow_ring_white', rainbow: 'glow_ring_rainbow' };

  var IMG = {
    burst_PYK: 'starburst/burst_PYK.png', burst_TRACH: 'starburst/burst_TRACH.png', burst_BACH: 'starburst/burst_BACH.png', burst_BUM: 'starburst/burst_BUM.png',
    burst_gold: 'starburst/burst_gold.png', burst_yellow: 'starburst/burst_yellow.png',
    rays_blue: 'rays/rays_blue.png', rays_white_24_soft: 'rays/rays_white_24_soft.png', rays_rainbow: 'rays/rays_rainbow.png', rays_gold: 'rays/rays_gold.png', rays_white_16: 'rays/rays_white_16.png',
    shockwave_cyan: 'halftone/shockwave_cyan.png', shockwave_yellow: 'halftone/shockwave_yellow.png', shockwave_white: 'halftone/shockwave_white.png',
    vignette: 'halftone/dim_vignette_halftone.png',
    sparkle: 'particles/sparkle_sheet.png', sparkle_gold: 'particles/sparkle_sheet_gold.png', confetti: 'particles/confetti_sheet.png', confetti_stars: 'particles/confetti_stars.png',
    light_leak: 'glow/light_leak.png', light_beam: 'glow/light_beam.png',
    banner_C: 'banners/banner_C.png', banner_U: 'banners/banner_U.png', banner_R: 'banners/banner_R.png', banner_H: 'banners/banner_H.png', banner_UR: 'banners/banner_UR.png', banner_SR: 'banners/banner_SR.png',
    banner_SR_alt: 'banners/banner_SR_alt.png', banner_SR_super: 'banners/banner_SR_super.png',
    card_back: 'card/card_back.png', pack: 'card/pack_standin.png',
    holo_band: 'holo/holo_sweep_band.png', holo_foil: 'holo/holo_foil.png', gold_foil: 'holo/gold_foil.png'
  };
  Object.keys(GLOW).forEach(function (k) { IMG[GLOW[k]] = 'glow/' + GLOW[k] + '.png'; });
  var SFX = ['riser_short', 'riser_mid', 'riser_long', 'burst', 'burst_small', 'flip', 'whoosh', 'shimmer', 'sparkle', 'tap',
    'fanfare_C', 'fanfare_U', 'fanfare_R', 'fanfare_H', 'fanfare_UR', 'fanfare_SR'];

  /* ------------------------------------------------------------------ NARZĘDZIA */
  var W = 1280, H = 720, CX = 640, CY = 305, CARD_W = 300, CARD_H = 391;
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function prog(t, a, d) { return clamp((t - a) / d, 0, 1); }
  function easeOut(k) { return 1 - Math.pow(1 - k, 3); }
  function easeIn(k) { return k * k * k; }
  function easeOutBack(k, s) { s = s || 1.7; k = k - 1; return k * k * ((s + 1) * k + s) + 1; }
  function hash(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function mulberry(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function shakeXY(t, amp, seed) { return [amp * (Math.sin(t * 0.093 + seed) * 0.6 + Math.sin(t * 0.217 + seed * 2) * 0.4), amp * (Math.cos(t * 0.11 + seed) * 0.6 + Math.sin(t * 0.181 + seed * 3) * 0.4)]; }

  var cfg = { base: '', sound: true, volume: 0.8, lang: 'pl', tapText: 'KLIKNIJ, ABY KONTYNUOWAĆ', skipText: 'kliknij, aby pominąć', onSfx: null };
  var imgs = {}, audio = {}, loaded = null, cur = null;
  var reduced = !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var clock = { manual: false, t: 0 };
  function now() { return clock.manual ? clock.t : performance.now(); }

  function preload() {
    if (loaded) return loaded;
    var ps = Object.keys(IMG).map(function (k) {
      return new Promise(function (res) { var im = new Image(); im.onload = function () { imgs[k] = im; res(); }; im.onerror = function () { console.warn('[TurboReveal] brak obrazka', IMG[k]); res(); }; im.src = cfg.base + 'assets/' + IMG[k]; });
    });
    SFX.forEach(function (n) { var a = new Audio(); a.preload = 'auto'; a.src = cfg.base + 'audio/' + n + '.ogg'; audio[n] = a; });
    var font = root.FontFace ? new FontFace('TurboReveal', 'url(' + cfg.base + 'fonts/LuckiestGuy-Regular.ttf)').load().then(function (f) { document.fonts.add(f); }).catch(function () {}) : Promise.resolve();
    loaded = Promise.all(ps.concat([font]));
    return loaded;
  }
  var playing = [];
  function sfx(name, vol) {
    if (cfg.onSfx) { try { cfg.onSfx(name); } catch (e) {} }
    if (!cfg.sound || clock.manual || !audio[name]) return;
    try { var a = audio[name].cloneNode(); a.volume = clamp((vol || 1) * cfg.volume, 0, 1); var p = a.play(); if (p && p.catch) p.catch(function () {}); playing.push(a); } catch (e) {}
  }
  function stopSfx() { playing.forEach(function (a) { try { a.pause(); } catch (e) {} }); playing = []; }

  /* ------------------------------------------------------------------ DOM */
  var CSS = '.trv-root{position:fixed;inset:0;z-index:9999;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none;cursor:pointer}' +
    '.trv-root.in-box{position:absolute}' +
    '.trv-stage{position:absolute;left:50%;top:50%;width:1280px;height:720px;transform-origin:0 0}' +
    '.trv-stage>*{position:absolute}' +
    '.trv-dim{inset:0;background:#0b0614;opacity:0}' +
    '.trv-vig{inset:0;background-size:100% 100%;opacity:0}' +
    '.trv-cv{left:0;top:0;width:1280px;height:720px}' +
    '.trv-obj{left:0;top:0;transform-origin:50% 50%;will-change:transform,opacity}' +
    '.trv-pack img{display:block;width:100%;height:100%}' +
    '.trv-card{perspective:1400px}' +
    '.trv-flip{position:relative;width:100%;height:100%;transform-style:preserve-3d}' +
    '.trv-face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:14px;overflow:hidden;box-shadow:0 18px 40px rgba(0,0,0,.45)}' +
    '.trv-back{transform:rotateY(180deg)}' +
    '.trv-face img.trv-art{display:block;width:100%;height:100%;object-fit:cover}' +
    '.trv-foil,.trv-band,.trv-glint{position:absolute;inset:0;pointer-events:none;opacity:0;background-repeat:no-repeat}' +
    '.trv-foil{mix-blend-mode:overlay;background-size:200% 200%}' +
    '.trv-band{mix-blend-mode:hard-light;background-size:260% 200%}' +
    '.trv-glint{mix-blend-mode:screen;background:linear-gradient(115deg,transparent 40%,rgba(255,255,255,.85) 50%,transparent 60%);background-size:300% 100%}' +
    '.trv-tap{left:0;right:0;top:672px;text-align:center;font:30px TurboReveal,"Luckiest Guy","Arial Black",sans-serif;color:#ffd23f;letter-spacing:1px;' +
    'text-shadow:3px 3px 0 #1a1220,-2px -2px 0 #1a1220,2px -2px 0 #1a1220,-2px 2px 0 #1a1220;opacity:0}' +
    '.trv-skip{right:22px;top:18px;font:14px TurboReveal,"Arial Black",sans-serif;color:#fff;opacity:0;text-shadow:2px 2px 0 #1a1220;letter-spacing:.5px}';

  function el(tag, cls, parent) { var e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; }
  function injectCSS() { if (document.getElementById('trv-css')) return; var s = el('style'); s.id = 'trv-css'; s.textContent = CSS; document.head.appendChild(s); }

  function buildFront(card, face) {
    if (!card) card = {};
    if (typeof card === 'string') card = { img: card };
    if (card.nodeType === 1) {
      var wrap = el('div', '', face), clone = card.cloneNode(true);
      clone.classList && clone.classList.remove('hidden');
      wrap.appendChild(clone); wrap.style.cssText = 'position:absolute;left:0;top:0;transform-origin:0 0';
      requestAnimationFrame(function () {
        var w = clone.offsetWidth || CARD_W, h = clone.offsetHeight || CARD_H, s = Math.min(CARD_W / w, CARD_H / h);
        wrap.style.transform = 'translate(' + (CARD_W - w * s) / 2 + 'px,' + (CARD_H - h * s) / 2 + 'px) scale(' + s + ')';
      });
      return;
    }
    if (card.id != null && !card.img && root.PZArt && root.PZData && root.PZData.BY_ID) {
      var c = root.PZData.BY_ID[card.id] || card; face.innerHTML = root.PZArt.cardHTML(c);
      var n = face.firstChild; if (n) { n.style.transformOrigin = '0 0'; requestAnimationFrame(function () { var s = Math.min(CARD_W / (n.offsetWidth || CARD_W), CARD_H / (n.offsetHeight || CARD_H)); n.style.transform = 'scale(' + s + ')'; }); }
      return;
    }
    var im = el('img', 'trv-art', face); im.src = card.img || (cfg.base + 'card/zloty_smokator.png'); im.alt = card.name || '';
  }

  /* ------------------------------------------------------------------ CZĄSTECZKI (czysto od czasu) */
  function makeParticles(T, seed) {
    var r = mulberry(seed), P = { conf: [], spark: [] };
    var n = T.confetti || 0, at = T.confAt || 0;
    for (var i = 0; i < n; i++) {
      var cannon = T.cannons ? (i % 3) : 2, x0, y0, vx, vy;
      if (cannon === 0) { x0 = -20; y0 = 700; vx = 0.55 + r() * 0.75; vy = -(1.0 + r() * 0.7); }
      else if (cannon === 1) { x0 = 1300; y0 = 700; vx = -(0.55 + r() * 0.75); vy = -(1.0 + r() * 0.7); }
      else { var a = r() * Math.PI * 2, sp = 0.5 + r() * 0.9; x0 = CX; y0 = CY; vx = Math.cos(a) * sp; vy = Math.sin(a) * sp - 0.45; }
      P.conf.push({ t0: at + r() * 160, x0: x0, y0: y0, vx: vx, vy: vy, row: (r() * 6) | 0, star: r() < 0.2, ph: r() * 8, spin: 0.012 + r() * 0.02, sway: 20 + r() * 40, sf: 0.002 + r() * 0.004, s: 0.8 + r() * 0.7 });
    }
    for (var j = 0; j < (T.sparkles || 0); j++) {
      var ang = r() * Math.PI * 2, rad = 0.55 + r() * 0.75;
      P.spark.push({ t0: (T.sparkAt || 0) + r() * 700, x: CX + Math.cos(ang) * CARD_W * 0.62 * rad, y: CY + Math.sin(ang) * CARD_H * 0.6 * rad, s: 0.5 + r() * 1.0, gold: T.rank >= 5 ? r() < 0.6 : r() < 0.2, life: 420 + r() * 300 });
    }
    return P;
  }
  function drawSheet(g, im, fw, fh, fx, fy, x, y, s, rot, alpha) {
    if (!im) return; g.save(); g.globalAlpha = alpha; g.translate(x, y); if (rot) g.rotate(rot);
    g.drawImage(im, fx * fw, fy * fh, fw, fh, -fw * s / 2, -fh * s / 2, fw * s, fh * s); g.restore();
  }
  function drawImgC(g, im, x, y, s, rot, alpha, comp) {
    if (!im || alpha <= 0.001) return; g.save(); g.globalAlpha = Math.min(1, alpha); if (comp) g.globalCompositeOperation = comp; g.translate(x, y); if (rot) g.rotate(rot);
    g.drawImage(im, -im.width * s / 2, -im.height * s / 2, im.width * s, im.height * s); g.restore();
  }

  /* ------------------------------------------------------------------ SEKWENCJA */
  function Seq(card, tierKey, opts) {
    var T = TIERS[tierKey]; this.T = T; this.key = tierKey; this.opts = opts;
    this.speed = opts.speed || (opts.fast ? 1.7 : 1);
    this.tap = opts.waitForTap != null ? !!opts.waitForTap : T.tapDefault;
    this.from = opts.from || (T.antic ? 'pack' : 'back');
    var host = opts.container || document.body;
    var rt = this.root = el('div', 'trv-root' + (host === document.body ? '' : ' in-box'), host);
    if (host !== document.body && getComputedStyle(host).position === 'static') host.style.position = 'relative';
    var st = this.stage = el('div', 'trv-stage', rt);
    this.dim = el('div', 'trv-dim', st);
    this.vig = el('div', 'trv-vig', st); this.vig.style.backgroundImage = 'url(' + cfg.base + 'assets/' + IMG.vignette + ')';
    this.cvB = el('canvas', 'trv-cv', st);
    this.pack = el('div', 'trv-obj trv-pack', st);
    var pw = this.from === 'pack' ? 300 : CARD_W, ph = this.from === 'pack' ? 400 : CARD_H;
    this.pack.style.width = pw + 'px'; this.pack.style.height = ph + 'px'; this.packW = pw; this.packH = ph;
    if (opts.packEl) { var pc = opts.packEl.cloneNode(true); this.pack.appendChild(pc); }
    else { var pim = el('img', '', this.pack); pim.src = cfg.base + 'assets/' + (this.from === 'pack' ? IMG.pack : IMG.card_back); }
    this.cardBox = el('div', 'trv-obj trv-card', st); this.cardBox.style.width = CARD_W + 'px'; this.cardBox.style.height = CARD_H + 'px';
    this.flip = el('div', 'trv-flip', this.cardBox);
    var front = this.front = el('div', 'trv-face trv-front', this.flip);
    var back = el('div', 'trv-face trv-back', this.flip); var bim = el('img', 'trv-art', back); bim.src = cfg.base + 'assets/' + IMG.card_back;
    buildFront(card, front);
    this.foil = el('div', 'trv-foil', front); this.band = el('div', 'trv-band', front); this.glint = el('div', 'trv-glint', front);
    var foilImg = T.holo && T.holo[2] === 'gold' ? IMG.gold_foil : IMG.holo_foil;
    this.foil.style.backgroundImage = 'url(' + cfg.base + 'assets/' + foilImg + ')';
    this.band.style.backgroundImage = 'url(' + cfg.base + 'assets/' + IMG.holo_band + ')';
    this.cvF = el('canvas', 'trv-cv', st);
    this.tapEl = el('div', 'trv-obj trv-tap', st); this.tapEl.textContent = '▶ ' + (opts.tapText || cfg.tapText) + ' ◀';
    this.skipEl = el('div', 'trv-obj trv-skip', st); this.skipEl.textContent = opts.skipText || cfg.skipText;
    this.gB = this.cvB.getContext('2d'); this.gF = this.cvF.getContext('2d');
    this.P = makeParticles(T, opts.seed || 1993);
    this.banner = opts.banner || T.banner[1];
    this.fired = {}; this.skipped = false; this.state = 'play'; this.t = 0; this.offset = 0;
    this.tilt = [0, 0];
    this.fit(); var self = this;
    this.onResize = function () { self.fit(); }; root.addEventListener('resize', this.onResize);
    this.onPointer = function (e) { e.preventDefault(); self.input(); };
    this.onMove = function (e) { var r = self.root.getBoundingClientRect(); self.tilt = [((e.clientX - r.left) / r.width - 0.5) * 2, ((e.clientY - r.top) / r.height - 0.5) * 2]; };
    this.onKey = function (e) {   // w fazie capture: gra nie dostaje klawiszy, dopóki trwa odkrycie
      e.stopImmediatePropagation();
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); if (!e.repeat) self.input(); }
    };
    this.onClick = function (e) { e.stopPropagation(); e.preventDefault(); };
    rt.addEventListener('pointerdown', this.onPointer); rt.addEventListener('pointermove', this.onMove);
    rt.addEventListener('click', this.onClick); rt.addEventListener('mousedown', this.onClick);
    root.addEventListener('keydown', this.onKey, true);
    this.start = now();
  }
  Seq.prototype.fit = function () {
    var r = { width: this.root.offsetWidth || this.root.getBoundingClientRect().width, height: this.root.offsetHeight || this.root.getBoundingClientRect().height }, s = Math.min(r.width / W, r.height / H) || 1;   // [Game Maker] rozmiar layoutu, bez transformu rodzica (gra skaluje #world)
    this.scale = s; this.stage.style.transform = 'scale(' + s + ') translate(-50%,-50%)';
    var dpr = Math.min(2, (root.devicePixelRatio || 1) * s);
    [this.cvB, this.cvF].forEach(function (c) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0); });
  };
  Seq.prototype.input = function () {
    var T = this.T;
    if (this.state === 'ready') { this.finish(); return; }
    if (this.opts.skippable === false) return;
    if (this.t < (this.opts.skipLockMs != null ? this.opts.skipLockMs : 250)) return;   // anty-„przeklik” z poprzedniego kliknięcia
    this.skipTo();
  };
  Seq.prototype.skipTo = function () {
    var T = this.T; if (this.t >= T.ready) return;
    this.skipped = true; stopSfx();
    // Przeskok: od razu stan końcowy, ale z nagrodą – krótki flash + fanfara (bez napięcia i BUM)
    this.jumpFrom = this.t; this.jumpAt = T.ready;
    for (var k in this.fired) this.fired[k] = true;
    ['riser', 'burst', 'flip', 'shimmer', 'fanfare', 'sparkle'].forEach(function (k) { this.fired[k] = true; }, this);
    sfx('fanfare_' + this.key, 0.9);
    this.onPhase('skip');
  };
  Seq.prototype.onPhase = function (name) { if (this.opts.onPhase) { try { this.opts.onPhase(name, this.key); } catch (e) {} } };
  Seq.prototype.once = function (k, t, at, fn) { if (!this.fired[k] && at != null && t >= at) { this.fired[k] = true; fn.call(this); } };
  Seq.prototype.events = function (t) {
    var T = this.T, s = this;
    if (T.antic) this.once('ph_antic', t, 0, function () { s.onPhase('anticipation'); if (T.prePing) sfx('sparkle', 0.5); });
    if (T.riser) this.once('riser', t, T.riser[0], function () { sfx(T.riser[1], 0.9); });
    if (T.dim) this.once('ph_dim', t, T.dim[0], function () { s.onPhase('dim'); });
    var bAt = T.front ? T.front[0] : T.back ? T.back[0] : null;
    this.once('burst', t, bAt, function () { s.onPhase('burst'); sfx(T.burstSfx || 'burst'); });
    this.once('flip', t, T.flip[0], function () { s.onPhase('flip'); sfx('flip'); });
    if (T.holo) this.once('shimmer', t, T.holo[0], function () { s.onPhase('holo'); sfx('shimmer', 0.8); });
    if (T.glint && !T.holo) this.once('shimmer', t, T.glint[0], function () { if (T.rank >= 1) sfx('sparkle', 0.4); });
    this.once('fanfare', t, T.fanfare, function () { s.onPhase('banner'); sfx('fanfare_' + s.key); });
    this.once('ready', t, T.ready, function () { s.onPhase('ready'); if (!s.tap) s.finish(); else s.state = 'ready'; });
  };

  Seq.prototype.render = function (t) {
    var T = this.T, gB = this.gB, gF = this.gF, red = reduced;
    gB.clearRect(0, 0, W, H); gF.clearRect(0, 0, W, H);
    var jumped = this.skipped;
    // ---------- przyciemnienie
    var dimA = 0;
    if (T.dim) dimA = T.dim[2] * easeOut(prog(t, T.dim[0], T.dim[1] - T.dim[0]));
    if (T.rank >= 3 && !T.dim) dimA = 0;
    this.dim.style.opacity = dimA.toFixed(3); this.vig.style.opacity = (dimA * 0.9).toFixed(3);

    // ---------- napięcie: paczka / rewers
    var anticK = T.antic ? prog(t, 0, T.antic) : 1, packVisible = t < T.flip[0] + 60 && !jumped;
    var bAt = T.front ? T.front[0] : T.back ? T.back[0] : T.flip[0];
    var glowK = 0;
    if (packVisible) {
      var amp = T.antic ? (T.shake || 0) * Math.pow(anticK, 1.6) : 0;
      if (red) amp *= 0.25;
      var freq = 1 + 3 * anticK, sx = amp * Math.sin(t * 0.06 * freq) + amp * 0.4 * Math.sin(t * 0.17 * freq), sy = amp * 0.5 * Math.cos(t * 0.09 * freq);
      var rot = amp * 0.35 * Math.sin(t * 0.045 * freq);
      var lift = T.heldPack ? -14 * easeOut(prog(t, T.heldPack[0], 600)) : 0;
      var sc = 1 + 0.06 * anticK + (T.heldPack ? 0.05 * prog(t, T.heldPack[0], 800) : 0);
      var pop = prog(t, bAt - 40, 120), out = 1 - pop;
      if (T.antic === 0) { out = 0; }
      var pbright = 1 + (T.leak ? 0.8 * prog(t, T.leak[0], T.leak[1] - T.leak[0]) : 0.25 * anticK);
      this.pack.style.opacity = out.toFixed(3);
      this.pack.style.filter = 'brightness(' + pbright.toFixed(2) + ') drop-shadow(0 16px 30px rgba(0,0,0,.5))';
      this.pack.style.transform = 'translate(' + (CX - this.packW / 2 + sx) + 'px,' + (CY - this.packH / 2 + sy + lift) + 'px) rotate(' + rot + 'deg) scale(' + (sc + pop * 0.25) + ')';
      glowK = T.glow && T.antic ? anticK : 0;
    } else this.pack.style.opacity = 0;

    // ---------- glow ring (za paczką/kartą)
    var gName = T.glow ? GLOW[T.glow] : null;
    if (gName) {
      var pulse = 0.5 + 0.5 * Math.sin(t * (0.006 + 0.02 * anticK));
      var gA = packVisible ? glowK * (0.55 + 0.45 * pulse) : 0, gS = 0.9 + 0.5 * glowK + 0.08 * pulse;
      var after = prog(t, T.flip[0], 400);
      if (!packVisible || jumped) { gA = (T.rank >= 2 ? 0.85 : 0.5) * after * (0.75 + 0.25 * Math.sin(t * 0.004)); gS = 1.35 + 0.05 * Math.sin(t * 0.003); }
      if (T.rank === 1) gA *= 1 - prog(t, T.flip[0] + 400, 400);
      drawImgC(gB, imgs[gName], CX, CY, gS * (T.rank >= 4 ? 1.3 : 1.1), t * 0.0004, gA, 'lighter');
      if (T.rank >= 5 && packVisible) drawImgC(gB, imgs.glow_ring_rainbow, CX, CY, gS * 1.6, -t * 0.001, gA * 0.5 * anticK, 'lighter');
    }

    // ---------- wyciek światła z krawędzi paczki
    if (T.leak && packVisible) {
      var lk = prog(t, T.leak[0], T.leak[1] - T.leak[0]);
      drawImgC(gB, imgs.light_leak, CX, CY, 1.0 + 0.08 * lk, 0, lk * 1.2, 'lighter');
      var beams = 6 + Math.floor(lk * 16);
      for (var b = 0; b < beams; b++) {
        var h1 = hash(b + 1), side = b % 4, bx, by, ang;
        if (side === 0) { bx = CX - 150 + h1 * 300; by = CY - 200; ang = Math.PI; }
        else if (side === 1) { bx = CX - 150 + h1 * 300; by = CY + 200; ang = 0; }
        else if (side === 2) { bx = CX - 150; by = CY - 200 + h1 * 400; ang = Math.PI / 2; }
        else { bx = CX + 150; by = CY - 200 + h1 * 400; ang = -Math.PI / 2; }
        ang += (hash(b + 7) - 0.5) * 0.9 + Math.sin(t * 0.004 + b) * 0.05;
        var bl = (0.4 + hash(b + 3) * 0.9) * (0.5 + lk) * (0.75 + 0.25 * Math.sin(t * 0.02 + b * 3));
        var bi = imgs.light_beam; if (!bi) break;
        gB.save(); gB.globalCompositeOperation = 'lighter'; gB.globalAlpha = clamp(lk * 1.1 * (b < beams - 1 ? 1 : (lk * 16) % 1), 0, 1);
        gB.translate(bx, by); gB.rotate(ang); gB.drawImage(bi, -bi.width * 0.6, 0, bi.width * 1.2, bi.height * bl); gB.restore();
      }
    }

    // ---------- promienie
    if (T.rays) {
      var rStart = bAt, rk = jumped ? 1 : easeOut(prog(t, rStart, 500));
      var rS = (0.9 + 0.5 * rk) * 1.35;
      drawImgC(gB, imgs[T.rays[0]], CX, CY, rS, t * 0.00035, T.rays[1] * rk);
      if (T.rays2) drawImgC(gB, imgs[T.rays2[0]], CX, CY, rS * 1.1, -t * 0.0002, T.rays2[1] * rk, 'lighter');
    }
    if (T.rays && T.rank >= 3) {
      var vg = gB.createRadialGradient(CX, CY, 220, CX, CY, 760);
      vg.addColorStop(0, 'rgba(11,6,20,0)'); vg.addColorStop(1, 'rgba(11,6,20,' + (0.75 * (jumped ? 1 : easeOut(prog(t, bAt, 500)))).toFixed(3) + ')');
      gB.fillStyle = vg; gB.fillRect(0, 0, W, H);
    }
    // ---------- fala uderzeniowa (halftone)
    [T.shock, T.shock2].forEach(function (sh) {
      if (!sh || jumped) return; var k = prog(t, sh[0], 650); if (k <= 0 || k >= 1) return;
      drawImgC(gB, imgs[sh[1]], CX, CY, 0.25 + 1.9 * easeOut(k), 0, (1 - k) * 1.0);
    });
    // ---------- starburst za kartą (R, H)
    if (T.back) {
      var bk = prog(t, T.back[0], 260), bs = jumped ? T.back[2] : T.back[2] * easeOutBack(bk, 2.2);
      if (bk > 0 || jumped) drawImgC(gB, imgs[T.back[1]], CX + 255, CY - 140, bs * (1 + 0.03 * Math.sin(t * 0.01)), -0.18 + 0.03 * Math.sin(t * 0.004), 1);
    }

    // ---------- karta
    var fk = jumped ? 1 : prog(t, T.flip[0], T.flip[1]);
    if (fk > 0 || jumped) {
      var e = easeOutBack(fk, 1.4), ry = 180 * (1 - easeOut(fk)), sc2 = lerp(T.antic ? 0.35 : 0.9, 1, e), ty = lerp(T.antic ? 40 : 18, 0, easeOut(fk));
      var bob = Math.sin(t * 0.0022) * (T.rank >= 3 ? 4 : 0);
      var ready = t >= T.ready || jumped, tx = ready && T.rank >= 3 ? this.tilt[0] * 10 : 0, tyl = ready && T.rank >= 3 ? -this.tilt[1] * 8 : 0;
      this.cardBox.style.opacity = Math.min(1, fk * 4).toFixed(3);
      this.cardBox.style.transform = 'translate(' + (CX - CARD_W / 2) + 'px,' + (CY - CARD_H / 2 + ty + bob) + 'px) scale(' + sc2 + ')';
      this.flip.style.transform = 'rotateY(' + (ry + tx) + 'deg) rotateX(' + tyl + 'deg) rotateZ(' + ((1 - fk) * -8) + 'deg)';
      // folia / holo
      if (T.holo) {
        var hk = jumped ? 1 : prog(t, T.holo[0], T.holo[1]);
        var bp = -60 + 220 * easeOut(hk);
        var loop = (t - T.holo[0] - T.holo[1]) / 2400; var lp = loop > 0 ? (loop % 1) : -1;
        if (lp >= 0 && lp < 0.4) bp = -60 + 220 * easeOut(lp / 0.4);
        this.band.style.opacity = (hk > 0 && hk < 1 ? 0.9 : lp >= 0 && lp < 0.4 ? 0.55 : 0);
        this.band.style.backgroundPosition = bp + '% 50%';
        var fa = (T.holo[2] === 'gold' ? 0.42 : 0.5) * hk;
        this.foil.style.opacity = fa.toFixed(3);
        this.foil.style.backgroundPosition = (50 + 30 * Math.sin(t * 0.0009) + this.tilt[0] * 25) + '% ' + (50 + 30 * Math.cos(t * 0.0007) + this.tilt[1] * 25) + '%';
      }
      if (T.glint) {
        var gk = jumped ? 1 : prog(t, T.glint[0], T.glint[1]);
        this.glint.style.opacity = gk > 0 && gk < 1 ? 1 : 0; this.glint.style.backgroundPosition = (100 - 100 * easeOut(gk)) + '% 0';
      }
    } else this.cardBox.style.opacity = 0;

    // ---------- BUM! z przodu
    if (T.front && !jumped) {
      var fk2 = prog(t, T.front[0], T.front[3]);
      if (fk2 > 0 && fk2 < 1) {
        var s3 = T.front[2] * (fk2 < 0.25 ? easeOutBack(fk2 / 0.25, 2.5) : 1 + 0.08 * (fk2 - 0.25));
        var a3 = fk2 < 0.6 ? 1 : 1 - (fk2 - 0.6) / 0.4; if (fk2 > 0.6) s3 *= 1 + (fk2 - 0.6) * 0.6;
        drawImgC(gF, imgs[T.front[1]], CX, CY - 10, s3, -0.12 + 0.05 * Math.sin(fk2 * 9), a3);
      }
    }
    // ---------- iskry
    var sheetW = imgs.sparkle, P = this.P, i;
    for (i = 0; i < P.spark.length; i++) {
      var sp = P.spark[i], st = t - sp.t0; if (jumped && this.jumpFrom != null && sp.t0 < this.jumpAt) st = t - this.jumpAt - (sp.t0 - (T.sparkAt || 0)) * 0.5;
      if (st < 0 || st > sp.life) continue;
      var fr = Math.min(7, Math.floor(st / sp.life * 8));
      drawSheet(gF, sp.gold ? imgs.sparkle_gold : sheetW, 64, 64, fr, 0, sp.x, sp.y, sp.s, 0, 1);
    }
    if (T.idleSpark && t > (T.sparkAt || 0) + 700) {
      var per = T.idleSpark, kk = Math.floor(t / per);
      for (var q = kk - 2; q <= kk; q++) {
        var tt = t - q * per; if (tt < 0 || tt > 600) continue;
        var a4 = hash(q * 3.1) * Math.PI * 2, rr = 0.55 + hash(q * 7.7) * 0.6;
        drawSheet(gF, hash(q) < (T.rank >= 5 ? 0.6 : 0.25) ? imgs.sparkle_gold : sheetW, 64, 64, Math.min(7, Math.floor(tt / 600 * 8)), 0,
          CX + Math.cos(a4) * CARD_W * 0.6 * rr, CY + Math.sin(a4) * CARD_H * 0.58 * rr, 0.5 + hash(q * 1.3) * 0.7, 0, 1);
      }
    }
    // ---------- konfetti
    var ci = imgs.confetti, cs = imgs.confetti_stars;
    for (i = 0; i < P.conf.length; i++) {
      var c = P.conf[i], tau = t - c.t0; if (jumped && this.jumpAt != null && c.t0 < this.jumpAt) tau = t - this.jumpAt + (c.t0 - (T.confAt || 0));
      if (tau < 0 || tau > 4200) continue;
      var k = 0.0022, vt = 0.16, ex = (1 - Math.exp(-k * tau)) / k;
      var x = c.x0 + c.vx * ex + Math.sin(tau * c.sf + c.ph) * c.sway * Math.min(1, tau / 600);
      var y = c.y0 + (c.vy - vt) * ex + vt * tau;
      if (y > H + 40) continue;
      var alpha = tau > 3600 ? 1 - (tau - 3600) / 600 : 1;
      if (c.star) drawSheet(gF, cs, 32, 32, c.row, 0, x, y, c.s, tau * c.spin * 0.3, alpha);
      else drawSheet(gF, ci, 32, 32, Math.floor(tau * c.spin + c.ph) % 8, c.row, x, y, c.s, 0, alpha);
    }
    // ---------- baner
    var bn = imgs[this.banner];
    if (bn) {
      var bk2 = jumped ? 1 : prog(t, T.banner[0], 380);
      if (bk2 > 0) {
        var bsc = T.banner[2] * (jumped ? 1 : easeOutBack(bk2, 2.0));
        var wob = T.rank >= 4 ? Math.sin(t * 0.004) * 0.025 : 0;
        var by2 = CY + CARD_H / 2 + (this.opts.bannerGap != null ? Math.max(52, T.banner[2] * 103 + this.opts.bannerGap) : 52) + /* [Game Maker] opts.bannerGap: baner nie zasłania dołu karty */ (T.rank >= 3 ? Math.sin(t * 0.0022) * 4 : 0);
        var bA = 1;
        drawImgC(gF, bn, CX, by2, bsc, -0.035 + wob, Math.min(1, bk2 * 3) * bA);
      }
    }
    // ---------- flash + wstrząs
    var flash = 0, quake = 0;
    if (T.flash && !jumped) { var fl = prog(t, T.flash[0], 300); if (fl > 0 && fl < 1) flash = T.flash[1] * Math.pow(1 - fl, 2); }
    if (T.impact && !jumped) { var im2 = prog(t, T.impact[0], T.impact[1]); if (im2 > 0 && im2 < 1) { quake = T.impact[2] * (1 - im2); flash = Math.max(flash, T.impact[3] * Math.pow(1 - im2, 2)); } }
    if (T.quake && !jumped) { var qk = prog(t, T.quake[0], T.quake[1]); if (qk > 0 && qk < 1) quake = Math.max(quake, T.quake[2] * (1 - qk)); }
    if (jumped && this.jumpAt != null) { var jf = prog(t, this.jumpAt, 260); if (jf < 1) flash = Math.max(flash, (T.rank >= 3 ? 0.5 : 0.2) * (1 - jf)); }
    if (red) { quake *= 0.2; flash = Math.min(flash, 0.35); }
    if (flash > 0.002) { gF.save(); gF.globalAlpha = flash; gF.fillStyle = T.rank >= 5 ? '#fffbe6' : '#ffffff'; gF.fillRect(0, 0, W, H); gF.restore(); }
    var q2 = quake > 0 ? shakeXY(t, quake, 3) : [0, 0];
    this.stage.style.transform = 'scale(' + this.scale + ') translate(-50%,-50%) translate(' + q2[0].toFixed(1) + 'px,' + q2[1].toFixed(1) + 'px)';
    // ---------- napisy
    var showTap = this.tap && t >= T.ready;
    this.tapEl.style.opacity = showTap ? (0.55 + 0.45 * (Math.sin((t - T.ready) * 0.008) > -0.3 ? 1 : 0.2)) * prog(t, T.ready, 250) : 0;
    this.skipEl.style.opacity = !showTap && T.ready >= 1500 && this.opts.skippable !== false && !jumped ? 0.7 * prog(t, 400, 300) : 0;
  };
  Seq.prototype.tick = function () {
    if (this.state === 'done') return;
    var real = (now() - this.start) * this.speed;
    if (this.skipped && this.jumpBase == null) { this.jumpBase = real; }
    var t = this.skipped ? this.jumpAt + (real - this.jumpBase) : real;
    this.t = t; this.events(t); if (this.state === 'done') return; this.render(t);
    var self = this; if (!clock.manual) this.raf = requestAnimationFrame(function () { self.tick(); });
  };
  Seq.prototype.finish = function () {
    if (this.state === 'done') return; this.state = 'done';
    var self = this; if (this.tap) sfx('tap', 0.6);
    cancelAnimationFrame(this.raf);
    root.removeEventListener('resize', this.onResize); root.removeEventListener('keydown', this.onKey, true);
    this.root.style.transition = 'opacity .22s'; this.root.style.opacity = 0;
    this.onPhase('done');
    setTimeout(function () { self.root.remove(); }, clock.manual ? 0 : 240);
    if (cur === this) cur = null;
    this.resolve({ tier: this.key, skipped: this.skipped, ms: Math.round(this.t) });
  };

  /* ------------------------------------------------------------------ API */
  function normTier(tier) {
    if (typeof tier === 'number') return ORDER[clamp(tier, 0, 5)];
    tier = String(tier || 'C'); var up = tier.toUpperCase();
    if (TIERS[up]) return up;
    var map = { POSPOLITA: 'C', NIEPOSPOLITA: 'U', RZADKA: 'R', HOLO: 'H', ULTRA: 'UR', SEKRETNA: 'SR', LEGENDARNA: 'SR' };
    return map[up] || 'C';
  }
  var API = {
    TIERS: TIERS, ORDER: ORDER,
    init: function (o) { o = o || {}; for (var k in o) cfg[k] = o[k]; if (cfg.base && !/\/$/.test(cfg.base)) cfg.base += '/'; injectCSS(); return preload(); },
    /** play(card, tier, opts) -> Promise<{tier, skipped, ms}>
     * card: element karty (zostanie sklonowany) | URL obrazka | {img} | {id} (gdy jest PZArt/PZData)
     * tier: 'C'|'U'|'R'|'H'|'UR'|'SR' lub rank 0..5 lub nazwa PL
     * opts: { container, from:'pack'|'back', packEl, waitForTap, skippable, skipLockMs, speed, fast, banner, seed, onPhase(name,tier) } */
    play: function (card, tier, opts) {
      opts = opts || {}; injectCSS();
      if (cur) cur.finish();
      var key = normTier(tier);
      return preload().then(function () {
        return new Promise(function (resolve) {
          var s = new Seq(card, key, opts); s.resolve = resolve; cur = s; s.tick();
        });
      });
    },
    skip: function () { if (cur) cur.input(); },
    /** natychmiast kończy (np. przy zmianie ekranu) */
    cancel: function () { if (cur) cur.finish(); },
    get active() { return !!cur; },
    setSound: function (on) { cfg.sound = !!on; if (!on) stopSfx(); },
    duration: function (tier) { return TIERS[normTier(tier)].ready; },
    /* narzędzia do nagrywania klatek / testów */
    debug: {
      manual: function (on) { clock.manual = !!on; clock.t = 0; },
      seek: function (ms) { clock.t = ms; if (cur) { cur.start = 0; cur.tick(); } },
      current: function () { return cur; }
    }
  };
  root.TurboReveal = API;
})(window);
