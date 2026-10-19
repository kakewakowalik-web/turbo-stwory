/* Rysowanie: proceduralne stwory (SVG), karta, rewers, paczka. Zależy od PZData. */
(function (root) {
  'use strict';
  var D = root.PZData;
  var EL = {}; D.ELEMENTS.forEach(function (e) { EL[e.key] = e; });
  var cache = {};
  var uid = 0;

  function shade(hex, f) { // f<0 ciemniej, f>0 jaśniej
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    function m(c) { return Math.round(f < 0 ? c * (1 + f) : c + (255 - c) * f); }
    return 'rgb(' + m(r) + ',' + m(g) + ',' + m(b) + ')';
  }
  function f1(x) { return Math.round(x * 10) / 10; }

  var SET_SYMBOL = '<svg viewBox="0 0 20 20" class="setsym"><circle cx="10" cy="10" r="9" fill="#111" stroke="#fff" stroke-width="1.4"/><path d="M10 3.2l1.9 4.5 4.8.4-3.7 3.1 1.2 4.7L10 13.4 5.8 15.9 7 11.2 3.3 8.1l4.8-.4z" fill="#ffd23f"/></svg>';

  function creatureSVG(card) {
    if (cache[card.id]) return cache[card.id];
    var rng = D.mulberry32(card.seed), e = EL[card.el], t = D.TIERS[card.tier];
    function R(a, b) { return a + (b - a) * rng(); }
    function pick(a) { return a[(rng() * a.length) | 0]; }
    var id = 'g' + card.id + '_' + (uid++);
    var body = pick(e.body), dark = shade(body, -0.35), light = shade(body, 0.45);
    var W = 200, H = 130, cx = 100, cy = R(74, 82);
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">';
    s += '<defs><linearGradient id="' + id + 'b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + e.bg[0] + '"/><stop offset="1" stop-color="' + e.bg[1] + '"/></linearGradient>' +
      '<radialGradient id="' + id + 'c" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="' + light + '"/><stop offset=".55" stop-color="' + body + '"/><stop offset="1" stop-color="' + dark + '"/></radialGradient></defs>';
    s += '<rect width="200" height="130" fill="url(#' + id + 'b)"/>';
    // tło: promienie dla rzadszych, kropki/wzgórza dla pospolitych
    if (t.rank >= 2) {
      var rays = '', n = 18;
      for (var i = 0; i < n; i++) { var a0 = i / n * Math.PI * 2, a1 = a0 + Math.PI / n; rays += 'M100 70L' + f1(100 + Math.cos(a0) * 260) + ' ' + f1(70 + Math.sin(a0) * 260) + 'L' + f1(100 + Math.cos(a1) * 260) + ' ' + f1(70 + Math.sin(a1) * 260) + 'Z'; }
      s += '<path d="' + rays + '" fill="#fff" opacity="' + (t.rank >= 4 ? 0.28 : 0.18) + '"/>';
    } else {
      s += '<path d="M0 ' + f1(R(90, 100)) + ' Q 50 ' + f1(R(70, 90)) + ' 100 ' + f1(R(88, 98)) + ' T 200 ' + f1(R(85, 95)) + ' V130 H0Z" fill="#000" opacity=".12"/>';
      for (var d = 0; d < 7; d++) s += '<circle cx="' + f1(R(0, 200)) + '" cy="' + f1(R(5, 60)) + '" r="' + f1(R(2, 9)) + '" fill="#fff" opacity=".35"/>';
    }
    if (card.el === 'kosmos' || card.el === 'mrok' || t.rank >= 4) for (var st = 0; st < 14; st++) s += '<circle cx="' + f1(R(0, 200)) + '" cy="' + f1(R(0, 70)) + '" r="' + f1(R(0.6, 1.8)) + '" fill="#fff"/>';
    // cień
    s += '<ellipse cx="100" cy="' + f1(cy + 42) + '" rx="52" ry="8" fill="#000" opacity=".25"/>';
    var rx = R(36, 50), ry = R(30, 40);
    // ogon
    if (rng() < 0.6) { var side = rng() < 0.5 ? -1 : 1; s += '<path d="M' + f1(cx + side * rx * 0.7) + ' ' + f1(cy + 10) + ' Q ' + f1(cx + side * (rx + 30)) + ' ' + f1(cy + 20) + ' ' + f1(cx + side * (rx + 22)) + ' ' + f1(cy - 18) + '" stroke="' + dark + '" stroke-width="7" fill="none" stroke-linecap="round"/>'; if (card.el === 'ogien') s += '<circle cx="' + f1(cx + side * (rx + 22)) + '" cy="' + f1(cy - 22) + '" r="6" fill="#ffd23f"/>'; }
    // nogi
    var legs = rng() < 0.5 ? 2 : 4;
    for (var l = 0; l < legs; l++) { var lx = cx - rx * 0.6 + (rx * 1.2) * (legs === 1 ? 0.5 : l / (legs - 1)); s += '<ellipse cx="' + f1(lx) + '" cy="' + f1(cy + ry * 0.9) + '" rx="9" ry="7" fill="' + dark + '"/>'; }
    // kolce/rogi na górze
    var top = rng();
    if (top < 0.35) { var sp = 3 + ((rng() * 3) | 0); for (var k = 0; k < sp; k++) { var ang = Math.PI * (1.15 + 0.7 * (k + 0.5) / sp), bx = cx + Math.cos(ang) * rx * 0.92, by = cy + Math.sin(ang) * ry * 0.92; s += '<path d="M' + f1(bx - 7) + ' ' + f1(by + 3) + ' L' + f1(bx + Math.cos(ang) * 16) + ' ' + f1(by + Math.sin(ang) * 18) + ' L' + f1(bx + 7) + ' ' + f1(by + 3) + 'Z" fill="' + light + '" stroke="' + dark + '" stroke-width="1.5"/>'; } }
    else if (top < 0.65) { [-1, 1].forEach(function (sd) { s += '<path d="M' + f1(cx + sd * rx * 0.45) + ' ' + f1(cy - ry * 0.75) + ' Q ' + f1(cx + sd * rx * 0.9) + ' ' + f1(cy - ry - 22) + ' ' + f1(cx + sd * rx * 0.55) + ' ' + f1(cy - ry - 30) + ' Q ' + f1(cx + sd * rx * 0.5) + ' ' + f1(cy - ry - 8) + ' ' + f1(cx + sd * rx * 0.15) + ' ' + f1(cy - ry * 0.9) + 'Z" fill="#f5ecd0" stroke="#7a6a4a" stroke-width="1.5"/>'; }); }
    else if (top < 0.85) { [-1, 1].forEach(function (sd) { var ex = cx + sd * rx * 0.35, ey = cy - ry * 0.8; s += '<path d="M' + f1(ex) + ' ' + f1(ey) + ' Q ' + f1(ex + sd * 10) + ' ' + f1(ey - 22) + ' ' + f1(ex + sd * 18) + ' ' + f1(ey - 26) + '" stroke="' + dark + '" stroke-width="2.5" fill="none"/><circle cx="' + f1(ex + sd * 18) + '" cy="' + f1(ey - 26) + '" r="4.5" fill="' + (card.el === 'prad' ? '#fff' : '#ffd23f') + '" stroke="' + dark + '"/>'; }); }
    else { [-1, 1].forEach(function (sd) { s += '<ellipse cx="' + f1(cx + sd * rx * 0.75) + '" cy="' + f1(cy - ry * 0.75) + '" rx="10" ry="16" transform="rotate(' + sd * 30 + ' ' + f1(cx + sd * rx * 0.75) + ' ' + f1(cy - ry * 0.75) + ')" fill="' + body + '" stroke="' + dark + '" stroke-width="2"/>'; }); }
    // ciało – blob
    var pts = [], N = 10;
    for (var p = 0; p < N; p++) { var an = p / N * Math.PI * 2, j = R(0.88, 1.1); pts.push([cx + Math.cos(an) * rx * j, cy + Math.sin(an) * ry * j]); }
    var path = '';
    for (var q = 0; q < N; q++) { var a = pts[q], b = pts[(q + 1) % N], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; path += (q === 0 ? 'M' + f1((pts[N - 1][0] + a[0]) / 2) + ' ' + f1((pts[N - 1][1] + a[1]) / 2) : '') + ' Q' + f1(a[0]) + ' ' + f1(a[1]) + ' ' + f1(m[0]) + ' ' + f1(m[1]); }
    s += '<path d="' + path + 'Z" fill="url(#' + id + 'c)" stroke="' + dark + '" stroke-width="2.5"/>';
    s += '<ellipse cx="' + cx + '" cy="' + f1(cy + ry * 0.35) + '" rx="' + f1(rx * 0.55) + '" ry="' + f1(ry * 0.45) + '" fill="' + light + '" opacity=".7"/>';
    // łapki
    if (rng() < 0.7) [-1, 1].forEach(function (sd) { s += '<ellipse cx="' + f1(cx + sd * rx * 0.95) + '" cy="' + f1(cy + 6) + '" rx="7" ry="11" transform="rotate(' + (-sd * 25) + ' ' + f1(cx + sd * rx * 0.95) + ' ' + f1(cy + 6) + ')" fill="' + body + '" stroke="' + dark + '" stroke-width="2"/>'; });
    // oczy
    var eyes = rng() < 0.15 ? 1 : rng() < 0.85 ? 2 : 3, er = eyes === 1 ? R(11, 14) : R(6.5, 9.5), ey2 = cy - ry * 0.25;
    for (var o = 0; o < eyes; o++) {
      var ex2 = eyes === 1 ? cx : cx + (o - (eyes - 1) / 2) * er * 2.4, ey3 = ey2 - (eyes === 3 && o === 1 ? 6 : 0), lk = R(-2, 2);
      s += '<circle cx="' + f1(ex2) + '" cy="' + f1(ey3) + '" r="' + f1(er) + '" fill="#fff" stroke="' + dark + '" stroke-width="2"/>' +
        '<circle cx="' + f1(ex2 + lk) + '" cy="' + f1(ey3 + 1) + '" r="' + f1(er * 0.5) + '" fill="' + (t.rank >= 5 ? '#b8860b' : '#111') + '"/>' +
        '<circle cx="' + f1(ex2 + lk - er * 0.2) + '" cy="' + f1(ey3 - er * 0.2) + '" r="' + f1(er * 0.18) + '" fill="#fff"/>';
      if (card.el === 'mrok') s += '<path d="M' + f1(ex2 - er) + ' ' + f1(ey3 - er * 0.9) + ' L' + f1(ex2 + er) + ' ' + f1(ey3 - er * 0.4) + '" stroke="' + dark + '" stroke-width="3"/>';
    }
    // pyszczek
    var my = cy + ry * 0.25, mw = R(8, 16);
    if (rng() < 0.5) s += '<path d="M' + f1(cx - mw) + ' ' + f1(my) + ' Q ' + cx + ' ' + f1(my + mw * 0.9) + ' ' + f1(cx + mw) + ' ' + f1(my) + 'Z" fill="#5a1020" stroke="' + dark + '" stroke-width="2"/><path d="M' + f1(cx - mw * 0.6) + ' ' + f1(my) + ' l3 5 3 -5 M' + f1(cx + mw * 0.6 - 6) + ' ' + f1(my) + ' l3 5 3 -5" fill="#fff"/>';
    else s += '<path d="M' + f1(cx - mw) + ' ' + f1(my) + ' Q ' + cx + ' ' + f1(my + 9) + ' ' + f1(cx + mw) + ' ' + f1(my) + '" stroke="' + dark + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>';
    s += '<ellipse cx="' + f1(cx - rx * 0.55) + '" cy="' + f1(my - 2) + '" rx="5" ry="3" fill="#ff7aa2" opacity=".55"/><ellipse cx="' + f1(cx + rx * 0.55) + '" cy="' + f1(my - 2) + '" rx="5" ry="3" fill="#ff7aa2" opacity=".55"/>';
    // dodatki dla najrzadszych
    if (t.rank >= 5) s += '<path d="M' + (cx - 16) + ' ' + f1(cy - ry - 4) + ' l4 -16 8 9 4 -13 4 13 8 -9 4 16z" fill="#ffd700" stroke="#8a6d00" stroke-width="1.5"/><circle cx="' + cx + '" cy="' + f1(cy - ry - 10) + '" r="2.5" fill="#e0115f"/>';
    if (t.rank >= 4) for (var z = 0; z < 6; z++) { var zx = R(15, 185), zy = R(10, 60), zr = R(3, 6); s += '<path d="M' + f1(zx) + ' ' + f1(zy - zr) + ' L' + f1(zx + zr * 0.3) + ' ' + f1(zy - zr * 0.3) + ' L' + f1(zx + zr) + ' ' + f1(zy) + ' L' + f1(zx + zr * 0.3) + ' ' + f1(zy + zr * 0.3) + ' L' + f1(zx) + ' ' + f1(zy + zr) + ' L' + f1(zx - zr * 0.3) + ' ' + f1(zy + zr * 0.3) + ' L' + f1(zx - zr) + ' ' + f1(zy) + ' L' + f1(zx - zr * 0.3) + ' ' + f1(zy - zr * 0.3) + 'Z" fill="#fff"/>'; }
    s += '</svg>';
    cache[card.id] = s; return s;
  }

  function money(v) { return v.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' zł'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* Karty z zestawów Artist: gotowy obrazek WebP + nasze warstwy połysku (holo/iskry/odblask). opts.thumb = miniatura do albumu. */
  function setCardHTML(card, opts) {
    var rk = D.TIERS[card.tier].rank, src = 'sets/' + (opts && opts.thumb ? card.thumb : card.cardImage);
    return '<div class="card set-card set-' + card.set + ' t-' + card.tier + (rk >= 3 ? ' shiny' : '') + '" data-id="' + card.id + '">' +
      '<img class="set-img" src="' + src + '" alt="' + esc(card.name) + '" draggable="false">' +
      (rk >= 3 ? '<div class="holo"></div><div class="sparkle"></div>' : '') + '<div class="glare"></div></div>';
  }
  function cardHTML(card, opts) {
    if (card.set) return setCardHTML(card, opts);
    var t = D.TIERS[card.tier], rk = t.rank;
    return '<div class="card t-' + card.tier + ' el-' + card.el + (rk >= 3 ? ' shiny' : '') + '" data-id="' + card.id + '">' +
      '<div class="c-frame">' +
      '<div class="c-top"><span class="c-name">' + esc(card.name) + '</span><span class="c-hp">MOC <b>' + card.hp + '</b></span></div>' +
      '<div class="c-art">' + creatureSVG(card) + (rk === 3 ? '<div class="art-holo"></div><div class="sparkle"></div>' : '') + '</div>' +
      '<div class="c-type">Stwór ' + card.elName + ' · ' + t.name + '</div>' +
      '<div class="c-atk"><span>' + esc(card.atk.name) + '</span><b>' + card.atk.dmg + '</b></div>' +
      '<div class="c-text">' + esc(card.text) + '</div>' +
      '<div class="c-foot">' + SET_SYMBOL + '<span class="c-num">' + card.id + '/' + D.SET.size + '</span><span class="c-rar">' + t.sym + '</span></div>' +
      '</div>' +
      (rk >= 4 ? '<div class="holo"></div><div class="sparkle"></div>' : '') +
      '<div class="glare"></div></div>';
  }

  function setInfo(setId) { return root.PZCat && setId ? root.PZCat.get(setId) : null; }
  function backHTML(setId) {
    var si = setInfo(setId);
    if (si && si.cardBack) return '<div class="cback set-back"><img src="' + si.cardBack + '" alt="" draggable="false"></div>';
    return '<div class="cback"><div class="cb-in"><div class="cb-swirl"></div><div class="cb-logo"><span>TURBO</span><span>STWORY</span></div><div class="cb-star">★</div></div></div>';
  }

  /* Paczka: korpus + pasek do oderwania (oba z tym samym tłem foliowym, przycięte poszarpaną linią). */
  function packHTML(W, H, tearY, setId) {
    var pts = [], step = 9, x = 0, rng = D.mulberry32((Math.random() * 1e9) | 0);
    while (x < W) { pts.push([x, tearY + (rng() * 7 - 3.5)]); x += step * (0.6 + rng() * 0.8); }
    pts.push([W, tearY]);
    var line = pts.map(function (p) { return f1(p[0]) + 'px ' + f1(p[1]) + 'px'; });
    var strip = 'polygon(0 0,' + W + 'px 0,' + line.slice().reverse().join(',') + ')';
    var bodyClip = 'polygon(' + line.join(',') + ',' + W + 'px ' + H + 'px,0 ' + H + 'px)';
    var o6 = tearY - 6;
    var edge = 'polygon(' + pts.map(function (p) { return f1(p[0]) + 'px ' + f1(p[1] - o6 - 1) + 'px'; }).join(',') + ',' + pts.slice().reverse().map(function (p) { return f1(p[0]) + 'px ' + f1(p[1] - o6 + 4) + 'px'; }).join(',') + ')';
    var mascot = creatureSVG(D.BY_ID['155']);
    var face = '<div class="pk-foil"></div><div class="pk-crimp top"></div><div class="pk-crimp bot"></div>' +
      '<div class="pk-content"><div class="pk-brand"><div class="pk-logo"><span class="l1">TURBO</span><span class="l2">STWORY</span></div><div class="pk-series">SERIA I · KRYSZTAŁOWA GALAKTYKA</div></div>' +
      '<div class="pk-mascot">' + mascot + '</div><div class="pk-burst"><b>10</b>KART!</div>' +
      '<div class="pk-bottom"><span>KARTY KOLEKCJONERSKIE</span><span>Losowa zawartość · 1993</span></div><div class="pk-notch l"></div><div class="pk-notch r"></div></div><div class="pk-shine"></div>';
    var si = setInfo(setId);
    if (si && si.packImage) face = '<img class="pk-img" src="' + si.packImage + '" alt="' + esc(si.name) + '" draggable="false"><div class="pk-shine"></div>';
    return '<div class="pack' + (si && si.packImage ? ' set-pack' : '') + '" style="width:' + W + 'px;height:' + H + 'px">' +
      '<div class="pk-part pk-body" style="clip-path:' + bodyClip + '">' + face + '</div>' +
      '<div class="pk-peek' + (si ? ' set-' + si.id : '') + '" style="top:' + (tearY - 30) + 'px"><i></i><i></i><i></i></div>' +
      '<div class="pk-edgewrap" style="top:' + (tearY - 6) + 'px;height:14px"><div class="pk-edge" style="width:' + W + 'px;height:14px;clip-path:' + edge + '"></div></div>' +
      '<div class="pk-part pk-strip" style="clip-path:' + strip + '">' + face + '</div>' +
      '<div class="pk-guide" style="top:' + (tearY - 2) + 'px"></div>' +
      '</div>';
  }

  root.PZArt = { creatureSVG: creatureSVG, cardHTML: cardHTML, packFace: function (setId) { return packHTML(260, 420, 56, setId); }, backHTML: backHTML, packHTML: packHTML, money: money, esc: esc };
})(window);
