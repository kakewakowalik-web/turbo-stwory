/* Kariera „Turbo Cards & Comics” – widok izometryczny sklepu (canvas + sprite’y Artist z kit/), panele, tryb edycji,
 * kreator właściciela, raport dnia. Logika w shop.js (PZShop). Teksty UI po polsku, szyldy i waluta po amerykańsku ($).
 */
(function () {
  'use strict';
  var D = PZData, CAT = PZCat, A = PZArt, S = PZAudio, KIT = window.SHOP_KIT, Hero = PZHero, P = PZShop;
  var $ = function (id) { return document.getElementById(id); }, esc = A.esc;
  var store = null; try { localStorage.setItem('_pzs', '1'); localStorage.removeItem('_pzs'); store = localStorage; } catch (e) { }
  function $$(v) { return (v < 0 ? '-$' : '$') + Math.abs(v).toFixed(2); }
  var world = $('world');
  var root = document.createElement('div'); root.id = 'shopui'; root.className = 'ui-layer hidden';
  root.innerHTML = '<canvas id="iso" width="2560" height="1600"></canvas><div id="sh-top"></div><div id="sh-side"></div><div id="sh-bottom"></div><div id="sh-notes"></div><div id="sh-modal" class="hidden"></div><div id="sh-tip"></div>';
  world.appendChild(root);
  var cr = document.createElement('div'); cr.id = 'creator'; cr.className = 'ui-layer hidden'; world.appendChild(cr);
  var cv = $('iso'), g = cv.getContext('2d');
  var shop = null, active = false, view = { Z: 1.4, OX: 0, OY: 0 }, hover = null, sel = null, edit = false, ghost = null, tab = 'sklep', speed = 1, last = 0, anim = 0, raf = 0, pick = null, floor = 0, HK = null, pickLoc = null, sellLeft = false;
  function deps(slot) { return { D: D, CAT: CAT, Hero: Hero, Economy: PZEconomy, storage: store, slot: slot }; }

  /* ---------- obrazki z kitu ---------- */
  var IM = {};
  function im(src) { if (!src) return null; var i = IM[src]; if (!i) { i = IM[src] = new Image(); i.src = 'kit/' + src; } return i.complete && i.naturalWidth ? i : null; }
  function item(name) { return KIT.items[name]; }
  function spriteOf(name, frame, rot) {
    var m = item(name), o = rot && m.orientations ? m.orientations.B : m;
    var src = frame && o.frames && o.frames[frame] ? o.frames[frame].src : frame && m.frames && m.frames[frame] && !rot ? m.frames[frame].src : o.src;
    return { img: im(src), fp: o.footprint || m.footprint, anchor: o.anchor || m.anchor, slots: o.slots || m.slots || [] };
  }
  function preloadKit() { Object.keys(KIT.items).forEach(function (k) { var m = KIT.items[k]; im(m.src); [m.frames, m.orientations && m.orientations.B && m.orientations.B.frames].forEach(function (fr) { if (fr) Object.keys(fr).forEach(function (f) { im(fr[f].src); }); }); if (m.orientations) im(m.orientations.B.src); }); Hero.preload(); }

  /* ---------- geometria ---------- */
  var AREA = { x: 0, y: 64, w: 900, h: 660 };
  function layout() {
    var gr = shop.grid(), W = gr.w, H = gr.h;
    view.Z = Math.min(1.75, (AREA.w - 40) / ((W + H) * 32), (AREA.h - 40) / ((W + H) * 16 + 150));
    view.OX = AREA.x + AREA.w / 2 - (W - H) * 16 * view.Z; view.OY = AREA.y + 20 + 140 * view.Z + (AREA.h - 40 - ((W + H) * 16 + 150) * view.Z) / 2;
  }
  function scr(x, y) { return [view.OX + (x - y) * 32 * view.Z, view.OY + (x + y) * 16 * view.Z]; }
  function toTile(mx, my) { var a = (mx - view.OX) / (32 * view.Z), b = (my - view.OY) / (16 * view.Z); return [Math.floor((a + b) / 2), Math.floor((b - a) / 2)]; }
  function blit(name, tx, ty, frame, rot, alpha, filter) {
    var s = spriteOf(name, frame, rot); if (!s.img) return s;
    var p = scr(tx + s.fp[0], ty + s.fp[1]), Z = view.Z;
    if (alpha != null) g.globalAlpha = alpha; if (filter) g.filter = filter;
    g.drawImage(s.img, p[0] - s.anchor[0] * Z, p[1] - s.anchor[1] * Z, s.img.naturalWidth / 2 * Z, s.img.naturalHeight / 2 * Z);
    g.globalAlpha = 1; g.filter = 'none'; s.base = p; return s;
  }
  var SET_HUE = { stwory: 0, pilka: 95, kosz: 200, fantasy: 300 };

  /* ---------- rysowanie ---------- */
  function furnSprite(f) { var T = P.TYPES[f.type]; return (T.kitEmpty && !f.items.length) ? T.kitEmpty : T.kit; }
  function frameOf(f) { if (f.type === 'arcade') return 'f' + (Math.floor(anim * 4) % 3); return null; }
  function draw() {
    var st = shop.st, gr = shop.grid(), W = gr.w, H = gr.h, Z = view.Z, open = st.phase === 'open';
    g.setTransform(2, 0, 0, 2, 0, 0); g.imageSmoothingEnabled = true;
    var bg = g.createLinearGradient(0, 0, 0, 800); bg.addColorStop(0, '#1b1440'); bg.addColorStop(1, '#2a2350'); g.fillStyle = bg; g.fillRect(0, 0, 1280, 800);
    // parking/mall za oknem: delikatne gwiazdki
    g.fillStyle = 'rgba(255,255,255,.25)'; for (var i = 0; i < 40; i++) g.fillRect((i * 97) % 900, (i * 53) % 120 + 70, 1.5, 1.5);
    var LC = shop.loc(), fl = Math.min(floor, gr.floors - 1), WP = wallPieces(LC);
    // podłoga z lokalu Artist: domyślna + nadpisania per znak siatki (korytarz, zaplecze, scena, wycieraczka...)
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) { var ch = shop.cell(x, y, fl); if (ch === '#') continue;
      if (ch === 'O') { diamond(x, y, '#120c26', 'rgba(255,214,63,.6)'); continue; }
      blit(fl ? (LC.upper_floor || LC.default_floor) : ((LC.floor_overrides || {})[ch] || LC.default_floor), x, y); }
    // siatka i podświetlenia w trybie edycji
    if (edit) { g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1; for (y = 0; y < H; y++) for (x = 0; x < W; x++) if (BUILDC[shop.cell(x, y, fl)]) diamond(x, y, null, 'rgba(255,255,255,.38)'); }
    if (ghost) { var gfp = ghostFp(), ok = !shop.canPlace(ghost.type, ghost.tx, ghost.ty, ghost.uid, ghost.rot, fl); for (var a = 0; a < gfp[0]; a++) for (var b = 0; b < gfp[1]; b++) if (inside(ghost.tx + a, ghost.ty + b)) blit(ok ? 'tile_valid' : 'tile_invalid', ghost.tx + a, ghost.ty + b); }
    else if (hover && edit) blit('tile_hover', hover[0], hover[1]);
    // ściany z reguły kitu: lewa przy pustce po lewej, prawa przy pustce z tyłu, narożnik przy obu; drzwi/okna/zaplecze z „openings”
    var neonAt = null, openAt = null;
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) { if (shop.cell(x, y, fl) === '#') continue;
      var eL = shop.edgeAt(x, y, 'L', fl), eR = shop.edgeAt(x, y, 'R', fl); if (eL === 'partition' || eL === 'doorway') eL = null; if (eR === 'partition' || eR === 'doorway') eR = null;
      if (eL === 'wall' && eR === 'wall') { blit(WP.corner, x, y); continue; }
      if (eR) { blit(eR === 'window' ? WP.right_window : eR === 'storage' ? 'us_storage_door' : eR === 'door' || eR === 'door2' ? 'us_wall_right_door' : WP.right, x, y); if (eR === 'wall' && neonAt == null && x >= 2 && shop.edgeAt(x + 1, y, 'R', fl) === 'wall' && fl === 0) neonAt = [x, y]; }
      if (eL) { if (eL === 'door' || eL === 'door2') blit('us_entrance_door', x, y, open && eL === 'door' ? 'open' : 'closed'); else blit(eL === 'window' ? WP.left_window : WP.left, x, y); if (eL === 'window' && !openAt && fl === 0) openAt = [x, y]; }
    }
    var neonOn = open ? (Math.floor(anim * 3) % 17 !== 0) : false;
    if (neonAt) blit('us_neon_sign', neonAt[0], neonAt[1], open || st.phase === 'prep' ? 'on' : 'off');
    if (openAt) blit('us_neon_open_left', openAt[0], openAt[1], neonOn ? 'on' : 'off');
    // meble + postacie posortowane po głębokości
    var L = [];
    // przeszkody z siatki (kolumny, scena, schody), przepierzenia (półprzezroczyste = widać zaplecze), kartony na zapleczu
    var bt = 0, boxN = Math.ceil(shop.invTotal() / 30);
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) { var c2 = shop.cell(x, y, fl);
      if (c2 === 'C') L.push({ k: x + y + 0.01, obj: 'loc_column', x: x, y: y });
      if (c2 === 'S' && shop.cell(x - 1, y, fl) !== 'S' && shop.cell(x, y - 1, fl) !== 'S') L.push({ k: x + 3 + y + 2 + 2.5 + 0.01, obj: 'loc_stage', x: x, y: y });
      if (c2 === 'U' && shop.cell(x, y - 1, fl) !== 'U') L.push({ k: x + y + 2 + 1 + 0.01, obj: 'loc_stairs', x: x, y: y });
      if (c2 === 'B' && (x + y) % 2 === 0 && bt++ < boxN && !st.furn.some(function (f) { return f.tx === x && f.ty === y; })) L.push({ k: x + y + 0.01, obj: 'us_box_stack', x: x, y: y });
      var pk = fl ? null : shop.edgeAt(x, y, 'R', fl); if (pk === 'partition' || pk === 'doorway') L.push({ k: x + y - 0.6, obj: pk === 'doorway' ? WP.right_doorway : WP.right, x: x, y: y, alpha: 0.55 });
    }
    st.furn.forEach(function (f) { if (ghost && ghost.uid === f.uid) return; if ((f.fl || 0) !== fl) return; var p = shop.fp(f); L.push({ k: (f.tx + p[0] - 1) + (f.ty + p[1] - 1) + 0.5 * (p[0] + p[1] - 2) + 0.01, f: f }); });
    shop.customers.forEach(function (c) { if ((c.fl || 0) === fl) L.push({ k: c.x - 0.5 + c.y - 0.5 + 0.4, c: c }); });
    var counter = st.furn.filter(function (f) { return f.type === 'counter'; })[0];
    if (counter && fl === 0) { var ot = shop.ownerTile(counter); L.push({ k: ot[0] + ot[1] + 0.4, owner: ot, rot: counter.rot }); }
    if (ghost) L.push({ k: ghost.tx + ghost.ty + 2, ghost: ghost });
    L.sort(function (p, q) { return p.k - q.k; });
    L.forEach(function (o) { if (o.obj) blit(o.obj, o.x, o.y, null, null, o.alpha); else if (o.f) drawFurn(o.f); else if (o.c) drawCust(o.c); else if (o.owner) drawOwner(o.owner, o.rot); else drawGhost(o.ghost); });
    if (ghost) { var gf2 = ghostFp(), ok2 = !shop.canPlace(ghost.type, ghost.tx, ghost.ty, ghost.uid, ghost.rot, fl); g.lineWidth = 2; for (var a2 = 0; a2 < gf2[0]; a2++) for (var b2 = 0; b2 < gf2[1]; b2++) diamond(ghost.tx + a2, ghost.ty + b2, ok2 ? 'rgba(60,255,120,.28)' : 'rgba(255,50,60,.34)', ok2 ? '#3f8' : '#f34'); }
    // dymki i cenówki na wierzchu
    st.furn.forEach(function (f) { if (!edit && (f.fl || 0) === fl) drawTag(f); });
    shop.customers.forEach(function (c) { if (c.bubble && (c.fl || 0) === fl) bubble(c); });
    if (gr.floors > 1) { g.fillStyle = 'rgba(255,214,63,.95)'; g.font = '900 16px Arial Black, Arial'; g.fillText(fl ? 'PIĘTRO 1' : 'PARTER', 20, 118); }
    if (!open && st.phase === 'prep' && !edit) { /* nic */ }
    if (edit) { g.fillStyle = 'rgba(255,214,63,.95)'; g.font = '900 15px Arial Black, Arial'; g.fillText('TRYB EDYCJI  ·  klik = podnieś / połóż  ·  R = obrót  ·  Esc = anuluj', 20, 96); }
  }
  var BUILDC = { '.': 1, A: 1, B: 1 };
  function wallPieces(L) { return L.wall_pieces || { left: 'us_wall_left', right: 'us_wall_right', corner: 'us_wall_corner', left_window: 'us_wall_left_window', right_window: 'us_wall_right_window', right_doorway: 'loc_wall_us_right_doorway' }; }
  function inside(x, y) { return shop.cell(x, y, Math.min(floor, shop.grid().floors - 1)) !== '#'; }
  function diamond(x, y, fill, stroke) { var a = scr(x, y), b = scr(x + 1, y), c = scr(x + 1, y + 1), d = scr(x, y + 1); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.stroke(); } }
  function drawFurn(f, alpha) {
    var T = P.TYPES[f.type], s = blit(furnSprite(f), f.tx, f.ty, frameOf(f), f.rot, alpha);
    if (!s.img) return;
    var Z = view.Z, kind = T.kind;
    // towar na slotach (paczki US przebarwione per zestaw, karty, komiksy)
    if (kind === 'pack' && f.type === 'rack') f.items.slice(0, s.slots.length).forEach(function (it, i) { prod('product_cardpack_us', s, s.slots[i], 'hue-rotate(' + SET_HUE[it.set] + 'deg)'); });
    if (kind === 'card') f.items.forEach(function (it, i) { if (s.slots[i]) prod('product_card', s, s.slots[i]); });
    if (kind === 'comic') f.items.forEach(function (it, i) { if (s.slots[i]) prod('product_comic_us', s, s.slots[i]); });
    if (f.type === 'counter') s.slots.forEach(function (sl) { prod('product_cardpack_us', s, sl); });
    if (f.lvl > 1) { g.fillStyle = '#ffd23f'; g.strokeStyle = '#1b1b1b'; g.lineWidth = 2; g.font = '900 ' + Math.round(10 * Z) + 'px Arial Black, Arial'; var t = '★'.repeat(f.lvl - 1); g.strokeText(t, s.base[0] - 8 * Z, s.base[1] - 4 * Z); g.fillText(t, s.base[0] - 8 * Z, s.base[1] - 4 * Z); }
    if (sel && sel === f.uid) { var p = shop.fp(f); g.lineWidth = 2.5; for (var a = 0; a < p[0]; a++) for (var b = 0; b < p[1]; b++) diamond(f.tx + a, f.ty + b, 'rgba(255,214,63,.18)', 'rgba(255,214,63,.95)'); }
  }
  function prod(name, s, sl, filter) { var p = item(name), i2 = im(p.src); if (!i2) return; var Z = view.Z, x = s.base[0] + sl.x * Z, y = s.base[1] + sl.y * Z; if (filter) g.filter = filter; g.drawImage(i2, x - p.anchor[0] * Z, y - p.anchor[1] * Z, i2.naturalWidth / 2 * Z, i2.naturalHeight / 2 * Z); g.filter = 'none'; }
  function drawTag(f) {
    var T = P.TYPES[f.type]; if (!T.kind) return; var min = null;
    if (T.kind === 'bulk') { if (!f.bulk.length) return; min = f.bulkPrice; } else { f.items.forEach(function (it) { if (min == null || it.price < min) min = it.price; }); if (min == null) return; }
    var s = spriteOf(furnSprite(f), null, f.rot), p = scr(f.tx + s.fp[0], f.ty + s.fp[1]), Z = view.Z, tg = item('price_tag_us'), ti = im(tg.src); if (!ti) return;
    var x = p[0] - s.anchor[0] * Z + s.img.naturalWidth / 4 * Z + 6 * Z, y = p[1] - s.anchor[1] * Z + 18 * Z, w = 30 * Z, h = 22 * Z;
    g.drawImage(ti, x - w / 2, y - h, w, h);
    var na = tg.number_area; g.fillStyle = '#1b1b1b'; g.font = '900 ' + Math.max(8, Math.round(7.4 * Z)) + 'px Arial, sans-serif'; g.textAlign = 'center';
    var txt = min >= 100 ? Math.round(min) + '' : min >= 10 ? min.toFixed(0) : min.toFixed(2); g.fillText(txt, x - w / 2 + (na.x + na.w / 2) * Z, y - h + (na.y + na.h - 1.2) * Z); g.textAlign = 'left';
  }
  function drawCust(c) {
    var m = item('customer_us_' + c.sheet), sh = im(m.src); if (!sh) return;
    var dir = { se: 'SE', sw: 'SW', ne: 'NE', nw: 'NW' }[c.face] || 'SE', row = m.sheet.rows.indexOf(dir), walking = c.st === 'walk' && c.path.length;
    var col = walking ? 1 + (Math.floor(anim * 8 + c.id) % 4) : 0, fw = 64, fh = 112, Z = view.Z, p = scr(c.x, c.y);
    var bob = walking ? 0 : Math.sin(anim * 3 + c.id) * 0.8;
    g.drawImage(sh, col * fw, row * fh, fw, fh, p[0] - 16 * Z, p[1] - 54 * Z + bob, 32 * Z, 56 * Z);
    if (c.request) { g.fillStyle = '#ffd23f'; g.font = '900 ' + Math.round(11 * Z) + 'px Arial Black'; g.fillText('?', p[0] + 6 * Z, p[1] - 52 * Z); }
  }
  function drawOwner(t, rot) { var p = scr(t[0] + 0.5, t[1] + 0.5); Hero.draw(g, shop.st.hero.look, p[0], p[1], { scale: view.Z, dir: rot ? 'SE' : 'SW', frame: 0 }); }
  function drawGhost(gh) { var fake = { type: gh.type, tx: gh.tx, ty: gh.ty, rot: gh.rot, lvl: gh.lvl || 1, items: gh.items || [], bulk: [], uid: -1 }; drawFurn(fake, 0.72); }
  function bubble(c) {
    var p = scr(c.x, c.y), Z = view.Z, t = c.bubble; g.font = '700 ' + Math.round(6.6 * Z) + 'px "Comic Sans MS", "Trebuchet MS", sans-serif';
    var w = g.measureText(t).width + 12, x = p[0] - w / 2, y = p[1] - 64 * Z - 18;
    g.fillStyle = '#fffbe6'; g.strokeStyle = '#1b1b1b'; g.lineWidth = 2; rr(x, y, w, 18, 6); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(p[0] - 4, y + 18); g.lineTo(p[0], y + 24); g.lineTo(p[0] + 4, y + 18); g.fill(); g.fillStyle = '#1b1b1b'; g.fillText(t, x + 6, y + 13);
  }
  function rr(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function ghostFp() { var p = P.TYPES[ghost.type].fp; return ghost.rot ? [p[1], p[0]] : p; }

  /* ---------- pętla ---------- */
  var notesT = 0;
  function loop(t) {
    raf = requestAnimationFrame(loop); if (!active || root.classList.contains('hidden')) { last = t; return; }
    var dt = Math.min(0.1, (t - last) / 1000 || 0); last = t; anim += dt;
    var st = shop.st;
    if (st.phase === 'open' && !(window.PZMenu && PZMenu.open)) {
      var sold0 = st.today ? st.today.revenue : 0, c0 = st.today ? st.today.customers : 0;
      shop.tick(dt * 8 * speed);
      if (st.today && st.today.revenue > sold0 + 0.001) { sfx('register'); }
      if (st.phase === 'report') { showReport(st.reports[st.reports.length - 1]); }
      if ((anim * 4 | 0) % 2 === 0) top();
    }
    notes();
    draw();
  }
  function sfx(n) { if (window.TurboFX && TurboFX.sfx && PZSettings.get().sound) { try { TurboFX.sfx(n === 'register' ? 'cash_register' : n); return; } catch (e) { } } if (S[n]) S[n](); }

  /* ---------- HUD / panele ---------- */
  function top() {
    var st = shop.st, lp = shop.levelProgress();
    $('sh-top').innerHTML = '<canvas id="sh-face" width="64" height="96"></canvas><div class="sh-name"><b>' + esc(st.hero.shopName) + '</b><small>' + esc(st.hero.name) + ' · ' + Hero.trait(st.hero.trait).name + ' · #' + (st.loc + 1) + ' ' + esc(shop.loc().name_pl) + '</small></div>' +
      '<div class="sh-cells"><div class="cell clk"><label>DZIEŃ ' + st.day + ' · ' + ['NIEDZ.', 'PON.', 'WT.', 'ŚR.', 'CZW.', 'PT.', 'SOB.'][st.day % 7] + (shop.rainy() ? ' ☂' : '') + '</label><span>' + shop.dateLabel() + '</span></div><div class="cell clk"><label>ZEGAR</label><span>' + (st.phase === 'open' ? shop.clock() : st.phase === 'prep' ? 'CLOSED' : 'CLOSED') + '</span></div>' +
      '<div class="cell"><label>KASA</label><span class="' + (shop.E.state.wallet < 0 ? 'neg' : '') + '">' + $$(shop.E.state.wallet) + '</span></div><div class="cell"><label>DZIŚ OBRÓT</label><span>' + $$(st.today ? st.today.revenue : 0) + '</span></div>' +
      '<div class="cell"><label>REPUTACJA</label><span>★ ' + Math.floor(st.rep) + '</span></div><div class="cell wide"><label>POZIOM ' + shop.level() + ' · ' + esc(shop.levelName()) + '</label><div class="bar"><i style="width:' + (lp.max ? 100 : Math.round(lp.cur / lp.need * 100)) + '%"></i></div></div><div class="cell"><label>PRZYCIĄGANIE</label><span>+' + Math.round(shop.attract() * 100) + '%</span></div></div>';
    Hero.portrait($('sh-face'), st.hero.look, { scale: 1.5 });
  }
  function bottom() {
    var st = shop.st, open = st.phase === 'open';
    $('sh-bottom').innerHTML = (st.phase === 'prep' ? '<button class="btn buy pulse" data-b="open">OTWÓRZ SKLEP ▶</button>' : open ? '<button class="btn mini' + (speed === 1 ? ' on' : '') + '" data-b="sp1">▶ x1</button><button class="btn mini' + (speed === 3 ? ' on' : '') + '" data-b="sp3">▶▶ x3</button><button class="btn mini' + (speed === 8 ? ' on' : '') + '" data-b="sp8">▶▶▶ x8</button>' : '<button class="btn buy" data-b="report">RAPORT DNIA</button>') +
      '<button class="btn alt' + (edit ? ' on' : '') + '" data-b="edit"' + (open ? ' disabled' : '') + '>' + (edit ? 'KONIEC EDYCJI' : 'TRYB EDYCJI (E)') + '</button><button class="btn alt" data-b="album">SINGLE / ALBUM</button><button class="btn alt" data-b="locs">LOKALE 🏬</button>' + (shop.grid().floors > 1 ? '<button class="btn mini" data-b="floor">' + (floor ? 'PARTER ▼' : 'PIĘTRO ▲') + '</button>' : '') + (shop.canLoan() ? '<button class="btn mini" data-b="loan">POŻYCZKA OD WUJKA BOBA +$100</button>' : '');
  }
  function side() {
    var st = shop.st, h = '<div class="sh-tabs">' + [['sklep', 'MEBEL'], ['magazyn', 'MAGAZYN'], ['hurt', 'HURTOWNIA'], ['meble', 'MEBLE'], ['staty', 'RAPORTY']].map(function (t) { return '<b data-tab="' + t[0] + '" class="' + (tab === t[0] ? 'on' : '') + '">' + t[1] + '</b>'; }).join('') + '</div><div class="sh-body">';
    if (tab === 'sklep') h += selPanel();
    if (tab === 'magazyn') {
      h += '<h4>Zafoliowane paczki</h4>' + shop.unlockedSets().map(function (id) { var n = st.inv[id] || 0, si = CAT.get(id); return '<div class="row"><span class="dot" style="filter:hue-rotate(' + SET_HUE[id] + 'deg)"></span><b>' + si.name + '</b><span>' + n + ' szt.</span><button class="btn mini" data-b="openpack" data-set="' + id + '"' + (n && st.phase !== 'open' ? '' : ' disabled') + '>OTWÓRZ 1</button></div>'; }).join('') +
        '<div class="row"><b>Komiksy</b><span>' + (st.inv.comic || 0) + ' szt.</span></div><div class="row"><span>Miejsce w magazynie: <b>' + shop.invTotal() + '/' + shop.storageCap() + '</b> paczek</span></div><p class="note">Otwarta paczka to loteria: karty są średnio warte ok. 2/3 ceny zafoliowanej paczki, ale single sprzedasz w gablocie, koszu albo kolekcjonerom, którzy o nie pytają.</p>' +
        '<h4>Single w magazynie</h4><div class="row"><span>' + Object.keys(shop.E.state.collection).length + ' różnych · wartość ' + $$(shop.E.collectionValue()) + '</span></div>' +
        '<button class="btn alt wide" data-b="auto">AUTO-WYSTAW WSZYSTKO</button>' +
        '<h4>Ceny (narzut na wartość rynkową)</h4>' + ['pack', 'card', 'comic'].map(function (k) { var v = st.markup[k] || 1; return '<div class="row"><span>' + { pack: 'Paczki', card: 'Single', comic: 'Komiksy' }[k] + '</span><button class="btn mini" data-b="mk" data-k="' + k + '" data-d="-0.05">−</button><b>' + Math.round(v * 100) + '%</b><button class="btn mini" data-b="mk" data-k="' + k + '" data-d="0.05">+</button></div>'; }).join('') +
        '<div class="row"><span>Kosz okazji</span><button class="btn mini" data-b="mk" data-k="bulk" data-d="-0.01">−</button><b>' + $$(st.markup.bulk) + '</b><button class="btn mini" data-b="mk" data-k="bulk" data-d="0.01">+</button></div>';
    }
    if (tab === 'hurt') {
      h += '<h4>Hurtownia „Turbo Distribution Inc.”</h4>' + CAT.list.map(function (si) { var u = shop.setUnlocked(si.id);
        return '<div class="ws' + (u ? '' : ' off') + '"><b>' + si.name + '</b><small>detal ' + $$(shop.msrp(si.id)) + ' / paczka</small>' + (u ? '<button class="btn mini" data-b="ws" data-set="' + si.id + '">1 PACZKA · ' + $$(shop.wholesale(si.id)) + '</button><button class="btn mini" data-b="wsbox" data-set="' + si.id + '">BOX ' + P.BOX + ' · ' + $$(shop.wholesale(si.id, true)) + '</button>' : '<small>dostawa od dnia ' + P.UNLOCK_DAY[si.id] + '</small>') + '</div>'; }).join('') +
        '<div class="ws"><b>Komiksy (paczka 10 szt.)</b><small>detal ' + $$(P.COMIC.msrp) + ' / szt.</small><button class="btn mini" data-b="comics">10 SZT. · ' + $$(P.COMIC.cost * P.COMIC.bundle) + '</button></div>';
    }
    if (tab === 'meble') {
      h += '<h4>Katalog mebli <span class="lv">' + st.furn.length + '/' + shop.furnMax() + ' w lokalu</span></h4><div class="catg">' + shop.catalog().map(function (c) { return '<div class="cat' + (c.locked || c.maxed ? ' off' : '') + '" data-b="buyf" data-type="' + c.type + '"><canvas data-kit="' + P.TYPES[c.type].kit + '" width="120" height="120"></canvas><b>' + c.name + '</b><span>' + (c.locked ? '🔒 poziom ' + c.lvl : c.maxed ? (st.furn.length >= shop.furnMax() ? 'limit lokalu' : 'masz już') : $$(c.cost)) + '</span><small>' + c.desc + '</small></div>'; }).join('') + '</div>' +
        (st.stored.length ? '<h4>Meble w magazynie (po przeprowadzce)</h4>' + st.stored.map(function (m, i) { return '<div class="row"><span>' + P.TYPES[m.type].name + (m.lvl > 1 ? ' ★' + (m.lvl - 1) : '') + '</span><button class="btn mini" data-b="placest" data-i="' + i + '"' + (st.phase === 'open' ? ' disabled' : '') + '>POSTAW</button><button class="btn mini" data-b="sellst" data-i="' + i + '">SPRZEDAJ</button></div>'; }).join('') : '') +
        (shop.perk('bulk') ? '<h4>Hala</h4><div class="row"><span>' + (st.heat ? 'Ogrzewanie działa ✓' : 'Zimna hala: −5% zadowolenia') + '</span>' + (st.heat ? '' : '<button class="btn mini" data-b="heat">OGRZEWANIE ' + $$(P.HEAT_COST || 600) + '</button>') + '</div>' : '') +
        '<h4>Lokal</h4><div class="row"><span>#' + (st.loc + 1) + ' ' + esc(shop.loc().name_pl) + ' · czynsz ' + $$(shop.loc().rent_week) + '/tydz.</span><button class="btn mini" data-b="locs">OGŁOSZENIA</button></div><p class="note">' + esc(shop.loc().perk_pl) + '</p>';
    }
    if (tab === 'staty') {
      var g2 = shop.nextGoal();
      h += '<h4>Cele</h4>' + (g2.level ? '<div class="row"><span>Do poziomu „' + g2.level.name + '”: ' + g2.level.need + ' pkt reputacji</span></div>' : '') + (g2.set ? '<div class="row"><span>Nowy zestaw w hurtowni: ' + g2.set.name + ' (dzień ' + g2.set.day + ')</span></div>' : '') +
        (g2.loc ? '<div class="row"><span>Następny lokal: #' + (g2.loc.idx + 1) + ' ' + esc(g2.loc.loc.name_pl) + ' – ' + g2.loc.req.map(function (r) { return (r.ok ? '✓ ' : '✗ ') + r.label + ' ' + (r.k === 'money' ? $$(r.have) + '/' + $$(r.need) : r.have + '/' + r.need); }).join(', ') + '</span></div>' : '') +
        '<h4>Ostatnie dni</h4>' + st.reports.slice(-7).reverse().map(function (r) { return '<div class="row"><span>Dzień ' + r.day + '</span><span>' + r.customers + ' klientów</span><b class="' + (r.profit < 0 ? 'neg' : 'pos') + '">' + $$(r.profit) + '</b></div>'; }).join('') +
        (st.debt > 0 ? '<div class="row"><b class="neg">Dług (zeszyt): ' + $$(st.debt) + '</b><span>spłata 25% obrotu dziennie</span></div>' : '') + '<h4>Całość</h4><div class="row"><span>Obrót ' + $$(st.stats.revenue) + ' · sprzedanych ' + st.stats.sales + ' · prośby ' + st.stats.requests + '</span></div>' + (st.stats.bestSale ? '<div class="row"><span>Najlepsza sprzedaż: ' + esc(st.stats.bestSale.name) + ' ' + $$(st.stats.bestSale.price) + '</span></div>' : '');
    }
    $('sh-side').innerHTML = h + '</div>';
    $('sh-side').querySelectorAll('canvas[data-kit]').forEach(function (c) { thumb(c, c.dataset.kit); });
  }
  function thumb(c, name) { var x = c.getContext('2d'), s = spriteOf(name); if (!s.img) { setTimeout(function () { thumb(c, name); }, 200); return; } var w = s.img.naturalWidth, h2 = s.img.naturalHeight, k = Math.min(c.width / w, c.height / h2); x.clearRect(0, 0, c.width, c.height); x.drawImage(s.img, (c.width - w * k) / 2, c.height - h2 * k, w * k, h2 * k); }
  function selPanel() {
    if (!sel) return '<p class="note">Kliknij mebel w sklepie, żeby wystawić towar i ustawić ceny.<br><br>Klienci patrzą na cenę względem wartości rynkowej: 100% sprzedaje się dobrze, 130% już rzadko, powyżej 150% prawie wcale.<br><br>Gablota podbija chęć zakupu kolekcjonerów w promieniu 3 pól.</p>';
    var f; try { f = shop.get(sel); } catch (e) { sel = null; return ''; }
    var T = P.TYPES[f.type], up = shop.upgradeCost(f), h = '<h4>' + T.name + ' <span class="lv">poz. ' + f.lvl + '/3</span></h4><p class="note">' + T.desc + '</p>';
    if (T.kind === 'pack') h += '<div class="row"><span>Paczki: ' + f.items.length + '/' + shop.cap(f) + '</span></div>' + shop.unlockedSets().map(function (id) { return '<button class="btn mini" data-b="stockp" data-set="' + id + '"' + ((shop.st.inv[id] || 0) ? '' : ' disabled') + '>+ ' + CAT.get(id).name + ' (' + (shop.st.inv[id] || 0) + ')</button>'; }).join('');
    if (T.kind === 'comic') h += '<div class="row"><span>Komiksy: ' + f.items.length + '/' + shop.cap(f) + '</span><button class="btn mini" data-b="stockc">+ DOŁÓŻ (' + (shop.st.inv.comic || 0) + ')</button></div>';
    if (T.kind === 'bulk') h += '<div class="row"><span>Karty w koszu: ' + f.bulk.length + '/' + shop.cap(f) + '</span><button class="btn mini" data-b="fill">NAPEŁNIJ DUPLIKATAMI</button></div><div class="row"><span>Cena za kartę</span><button class="btn mini" data-b="bp" data-d="-0.01">−</button><b>' + $$(f.bulkPrice) + '</b><button class="btn mini" data-b="bp" data-d="0.01">+</button></div>';
    if (T.kind === 'card') {
      h += '<div class="row"><span>Karty: ' + f.items.length + '/' + shop.cap(f) + '</span><button class="btn mini" data-b="pickcard"' + (f.items.length < shop.cap(f) ? '' : ' disabled') + '>+ WYSTAW KARTĘ</button></div>';
      if (pick) { var ids = Object.keys(shop.E.state.collection).sort(function (a, b) { return shop.cardValue(b) - shop.cardValue(a); }).slice(0, 30); h += '<div class="pick">' + (ids.length ? ids.map(function (id) { var c = D.BY_ID[id]; return '<div data-b="putcard" data-id="' + id + '"><b>' + esc(c.name) + '</b><span>' + D.TIERS[c.tier].short + ' · ' + $$(shop.cardValue(id)) + ' · x' + shop.E.state.collection[id] + '</span></div>'; }).join('') : '<p class="note">Brak singli – otwórz paczkę z magazynu.</p>') + '</div>'; }
    }
    if (f.items.length) h += '<div class="items">' + f.items.map(function (it, i) { var v = shop.value(it), nm = it.k === 'pack' ? CAT.get(it.set).name : it.k === 'comic' ? 'Komiks' : D.BY_ID[it.id].name;
      return '<div class="it"><span>' + esc(nm) + '<small>wartość ' + $$(v) + ' · ' + Math.round(it.price / v * 100) + '%</small></span><button class="btn mini" data-b="pr" data-i="' + i + '" data-d="0.9">−10%</button><b>' + $$(it.price) + '</b><button class="btn mini" data-b="pr" data-i="' + i + '" data-d="1.1">+10%</button><button class="btn mini" data-b="un" data-i="' + i + '">✕</button></div>'; }).join('') + '</div>';
    if (T.coins) h += '<p class="note">Zarabia drobne od klientów: monety lecą do kasy same.</p>';
    h += '<div class="row acts"><button class="btn mini" data-b="up"' + (up != null ? '' : ' disabled') + '>ULEPSZ ' + (up != null ? $$(up) : 'MAX') + '</button>' + (edit ? '<button class="btn mini" data-b="rot"' + (T.rot ? '' : ' disabled title="Ten mebel ma jedną orientację"') + '>OBRÓĆ (R)</button><button class="btn mini" data-b="sellf"' + (f.type === 'counter' ? ' disabled' : '') + '>SPRZEDAJ</button><button class="btn mini" data-b="storef"' + (f.type === 'counter' ? ' disabled' : '') + '>DO MAGAZYNU</button>' : '') + '</div>';
    return h;
  }
  function refresh() { top(); bottom(); side(); }
  var noteQ = [];
  function note(t, cls) { noteQ.push({ t: t, cls: cls || '' }); }
  function notes() {
    if (shop) shop.drain().forEach(function (e) { note(e.text, e.type); if (e.type === 'level') { sfx('fanfare'); } });
    if (!noteQ.length || Date.now() < notesT) return; var n = noteQ.shift(); notesT = Date.now() + 1400;
    var el = document.createElement('div'); el.className = 'sh-note ' + n.cls; el.textContent = n.t; $('sh-notes').appendChild(el); setTimeout(function () { el.classList.add('out'); }, 3800); setTimeout(function () { el.remove(); }, 4400);
  }
  function err(e) { note(e.message || String(e), 'err'); S.error(); }

  /* ---------- akcje ---------- */
  $('sh-bottom').addEventListener('click', function (e) { var b = e.target.closest('[data-b]'); if (b && !b.disabled) act(b.dataset.b, b); });
  $('sh-side').addEventListener('click', function (e) { var t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; pick = null; S.click(); side(); return; } var b = e.target.closest('[data-b]'); if (b && !b.disabled && !b.classList.contains('off')) act(b.dataset.b, b); });
  function act(a, b) {
    var st = shop.st; S.unlock();
    try {
      switch (a) {
        case 'open': edit = false; ghost = null; shop.openShop(); sfx('register'); note('Otwarte! Klienci zaczynają się schodzić.'); break;
        case 'sp1': speed = 1; break; case 'sp3': speed = 3; break; case 'sp8': speed = 8; break;
        case 'report': showReport(st.reports[st.reports.length - 1]); return;
        case 'edit': toggleEdit(); return;
        case 'album': App.openAlbum(); return;
        case 'loan': shop.takeLoan(); S.coin(); break;
        case 'openpack': openPack(b.dataset.set); return;
        case 'auto': note('Wystawiono ' + shop.autoStock() + ' rzeczy'); S.page(); break;
        case 'mk': var k = b.dataset.k, v = Math.max(k === 'bulk' ? 0.01 : 0.5, Math.min(k === 'bulk' ? 1 : 2.5, Math.round(((st.markup[k] || 1) + +b.dataset.d) * 100) / 100)); shop.reprice(k, v); S.click(); break;
        case 'ws': shop.buyStock(b.dataset.set); S.coin(); note('Kupiono paczkę ' + CAT.get(b.dataset.set).name); break;
        case 'wsbox': shop.buyStock(b.dataset.set, true); S.register(); note('Box ' + P.BOX + ' paczek ' + CAT.get(b.dataset.set).name + ' w magazynie!'); break;
        case 'comics': shop.buyComics(); S.coin(); break;
        case 'buyf': if (st.phase === 'open') throw new Error('Meble przestawiasz przy zamkniętym sklepie'); if (!edit) toggleEdit(true); ghost = { type: b.dataset.type, tx: 0, ty: 0, rot: 0, uid: null, buy: true }; S.click(); note('Wybierz miejsce w sklepie (R = obrót)'); break;
        case 'locs': showPicker(); return;
        case 'floor': floor = floor ? 0 : 1; ghost = null; sel = null; S.click(); break;
        case 'placest': if (!edit) toggleEdit(true); var sm = st.stored[+b.dataset.i]; ghost = { type: sm.type, tx: 0, ty: 0, rot: 0, uid: null, stored: +b.dataset.i, lvl: sm.lvl }; note('Wybierz miejsce (R = obrót)'); break;
        case 'sellst': note('Sprzedano za ' + $$(shop.sellStored(+b.dataset.i))); S.coin(); break;
        case 'heat': shop.buyHeating(); S.register(); note('Ogrzewanie hali działa!'); break;
        case 'stockp': shop.stockPacks(sel, b.dataset.set); S.page(); break;
        case 'stockc': shop.stockComics(sel); S.page(); break;
        case 'fill': note('Do kosza trafiło ' + shop.fillBin(sel) + ' kart'); break;
        case 'bp': var f = shop.get(sel); shop.setPrice(sel, 'bulk', Math.max(0.01, Math.round((f.bulkPrice + +b.dataset.d) * 100) / 100)); break;
        case 'pickcard': pick = !pick; break;
        case 'putcard': shop.stockCard(sel, b.dataset.id); S.flip(); break;
        case 'pr': var it = shop.get(sel).items[+b.dataset.i]; shop.setPrice(sel, +b.dataset.i, shop.nicePrice(it.price * +b.dataset.d)); S.click(); break;
        case 'un': shop.unstock(sel, +b.dataset.i); break;
        case 'up': shop.upgradeFurniture(sel); S.register(); note('Ulepszono!'); break;
        case 'rot': rotateSel(); break;
        case 'storef': shop.storeFurniture(sel); sel = null; note('Mebel w magazynie'); break;
        case 'sellf': note('Sprzedano mebel za ' + $$(shop.sellFurniture(sel))); sel = null; S.coin(); break;
      }
    } catch (ex) { err(ex); }
    refresh();
  }
  function toggleEdit(on) { if (shop.st.phase === 'open') { err(new Error('Najpierw zamknij sklep')); return; } edit = on != null ? on : !edit; ghost = null; S.click(); refresh(); }
  function rotateSel() {
    if (ghost) { if (!P.TYPES[ghost.type].rot) throw new Error('Ten mebel ma jedną orientację'); ghost.rot = ghost.rot ? 0 : 1; return; }
    if (sel) { shop.rotateFurniture(sel); S.click(); }
  }
  function furnAt(tx, ty) { var m = shop.occ(null, floor); return inside(tx, ty) && m[ty][tx] > 0 ? m[ty][tx] : null; }
  function mouse(e) { var r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * 1280 / r.width, (e.clientY - r.top) * 800 / r.height]; }
  // podnoszenie myszką też po sprite (wysokie meble zasłaniają kafle za sobą)
  function hitFurn(mx, my) {
    var best = null;
    shop.st.furn.forEach(function (f) { if ((f.fl || 0) !== floor) return; var s = spriteOf(furnSprite(f), null, f.rot); if (!s.img) return; var p = scr(f.tx + s.fp[0], f.ty + s.fp[1]), Z = view.Z, x = p[0] - s.anchor[0] * Z, y = p[1] - s.anchor[1] * Z, w = s.img.naturalWidth / 2 * Z, h = s.img.naturalHeight / 2 * Z;
      if (mx >= x + w * 0.15 && mx <= x + w * 0.85 && my >= y + h * 0.1 && my <= y + h) { var fp2 = shop.fp(f), k = f.tx + f.ty + fp2[0] + fp2[1]; if (!best || k > best.k) best = { k: k, f: f }; } });
    var t = toTile(mx, my), u = furnAt(t[0], t[1]); if (u) return u; return best && best.f.uid;
  }
  cv.addEventListener('pointermove', function (e) {
    var m = mouse(e), t = toTile(m[0], m[1]); hover = inside(t[0], t[1]) ? t : null;
    if (ghost) { var p = ghostFp(); ghost.tx = t[0] - (p[0] > 1 ? 1 : 0); ghost.ty = t[1] - (p[1] > 1 ? 1 : 0); }
    var u = !ghost && hitFurn(m[0], m[1]); cv.style.cursor = ghost ? 'grabbing' : u ? 'pointer' : 'default';
    var tip = $('sh-tip'); if (u && !edit) { var f = shop.get(u); tip.textContent = P.TYPES[f.type].name + (P.TYPES[f.type].kind ? ' · ' + (f.items.length || f.bulk.length) + '/' + shop.cap(f) : ''); tip.style.left = (m[0] + 14) + 'px'; tip.style.top = (m[1] + 10) + 'px'; tip.classList.add('on'); } else tip.classList.remove('on');
  });
  cv.addEventListener('click', function (e) {
    var m = mouse(e); S.unlock();
    if (ghost) {
      try {
        if (ghost.buy) { var f = shop.buyFurniture(ghost.type, ghost.tx, ghost.ty, ghost.rot, floor); sel = f.uid; note('Postawiono: ' + P.TYPES[f.type].name); S.register(); }
        else if (ghost.stored != null) { var f3 = shop.placeStored(ghost.stored, ghost.tx, ghost.ty, ghost.rot, floor); sel = f3.uid; note('Postawiono z magazynu: ' + P.TYPES[f3.type].name); S.flip(); }
        else { shop.moveFurniture(ghost.uid, ghost.tx, ghost.ty, ghost.rot, floor); sel = ghost.uid; S.flip(); }
        ghost = null;
      } catch (ex) { err(ex); }
      refresh(); return;
    }
    var u = hitFurn(m[0], m[1]);
    if (edit && u) { var f2 = shop.get(u); ghost = { type: f2.type, tx: f2.tx, ty: f2.ty, rot: f2.rot, uid: u, lvl: f2.lvl, items: f2.items }; sel = u; S.click(); tab = 'sklep'; refresh(); return; }
    sel = u || null; pick = null; if (u) { tab = 'sklep'; S.click(); } refresh();
  });
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); if (ghost) { ghost = null; refresh(); } });
  addEventListener('keydown', function (e) {
    if (!active || root.classList.contains('hidden') || (window.PZMenu && PZMenu.open) || !$('album').classList.contains('hidden') || !cr.classList.contains('hidden')) return;
    if (e.target && e.target.tagName === 'INPUT') return;
    if (!$('sh-modal').classList.contains('hidden')) { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); var b = $('sh-modal').querySelector('[data-m]'); if (b) b.click(); } return; }
    if (e.key === 'Escape') { e.preventDefault(); if (ghost) { ghost = null; refresh(); } else if (edit) toggleEdit(false); else PZMenu.pause(); }
    else if (e.key === 'e' || e.key === 'E') toggleEdit();
    else if (e.key === 'r' || e.key === 'R') { try { rotateSel(); } catch (ex) { err(ex); } refresh(); }
    else if (e.key === ' ' && shop.st.phase === 'prep') { e.preventDefault(); act('open'); }
    else if (e.key === 'a' || e.key === 'A') App.openAlbum();
  });
  // album nad sklepem: Esc zamyka album
  addEventListener('keydown', function (e) { if (active && e.key === 'Escape' && !$('album').classList.contains('hidden') && !root.classList.contains('hidden')) { if (!$('detail').classList.contains('hidden')) $('detail').classList.add('hidden'); else App.closeAlbum(); } });

  /* ---------- otwieranie paczki z magazynu (stara scena stołu) ---------- */
  function openPack(setId) {
    var cost = shop.takePackToOpen(setId);
    root.classList.add('hidden'); App.openOwned(setId, cost); sfx('rip');
  }
  function home() { root.classList.remove('hidden'); App.closeAlbum(); refresh(); }
  function hooks() {
    HK = { career: true, currency: '$', home: home, revealSpeed: shop.revealSpeed(), buyer: 'Skup hurtowy', sellNote: function () { return 'W sklepie zarobisz więcej – wystaw kartę w gablocie.'; }, sellMsg: '',
      receiptTitle: esc(shop.st.hero.shopName.toUpperCase()), receiptSub: 'OTWARCIE Z MAGAZYNU', costLabel: 'KOSZT HURTOWY',
      finishHint: function () { return 'Single trafiły do magazynu. Wystaw je w gablocie albo koszu okazji. (H / przycisk = wróć do sklepu)'; },
      onSold: function () { refresh(); } };
    return HK;
  }

  /* ---------- raport dnia ---------- */
  function showReport(r) {
    if (!r) return; var m = $('sh-modal'), it = r.items || {};
    var lines = Object.keys(it).map(function (k) { var nm = k.indexOf('pack:') === 0 ? CAT.get(k.slice(5)).name + ' (paczki)' : { card: 'Single z gabloty', bulk: 'Karty z kosza', comic: 'Komiksy' }[k] || k; return '<div class="ln"><span>' + nm + '</span><span>' + it[k] + ' szt.</span></div>'; }).join('');
    m.innerHTML = '<div class="report"><h3>' + esc(shop.st.hero.shopName.toUpperCase()) + '</h3><div class="sub">DAILY REPORT · RAPORT DNIA ' + r.day + (r.date ? ' · ' + r.date : '') + (r.rainy ? ' · ☂ deszcz' : '') + '</div>' +
      '<div class="ln"><span>Klienci</span><span>' + r.customers + ' (kupiło ' + r.buyers + ')</span></div>' + lines + '<hr>' +
      '<div class="ln tot"><span>OBRÓT</span><span>' + $$(r.revenue) + '</span></div>' + (r.coins ? '<div class="ln"><span>Automaty (monety)</span><span>' + $$(r.coins) + '</span></div>' : '') +
      '<div class="ln"><span>Zakupy (hurt, meble)</span><span>-' + $$(r.spent) + '</span></div>' + r.billLines.map(function (b) { return '<div class="ln"><span>' + b.name + '</span><span>-' + $$(b.v) + '</span></div>'; }).join('') +
      '<div class="ln tot ' + (r.profit >= 0 ? 'pos' : 'neg') + '"><span>ZYSK DNIA</span><span>' + $$(r.profit) + '</span></div><hr>' +
      (r.best ? '<div class="ln"><span>Najlepsza sprzedaż</span><span>' + esc(r.best.name) + ' ' + $$(r.best.price) + '</span></div>' : '') +
      '<div class="ln"><span>„Za drogo!”</span><span>' + r.expensive + 'x</span></div><div class="ln"><span>Puste półki („nie macie?!”)</span><span>' + r.noStock + 'x</span></div>' +
      '<div class="ln"><span>Spełnione prośby kolekcjonerów</span><span>' + r.requests + '</span></div>' + (r.missed.length ? '<div class="ln small"><span>Pytali o: ' + r.missed.map(function (id) { return esc(D.BY_ID[id].name); }).join(', ') + '</span></div>' : '') +
      (r.theft ? '<div class="ln"><span>Kradzieże (downtown)</span><span>' + r.theft + 'x · -' + $$(r.theftValue) + '</span></div>' : '') +
      '<div class="ln"><span>Doświadczenie / reputacja</span><span>+' + r.xp + ' XP · ' + (r.rep >= 0 ? '+' : '') + (r.rep || 0).toFixed(1) + ' ★</span></div><div class="ln tot"><span>KASA</span><span>' + $$(r.wallet) + '</span></div>' +
      (shop.st.day % 7 === 6 ? '<div class="thx">Jutro czynsz za tydzień: ' + $$(shop.weeklyRent()) + '!</div>' : '<div class="thx">Thank you, come again!</div>') +
      '<button class="btn buy" data-m="next">NASTĘPNY DZIEŃ ▶</button></div>';
    m.classList.remove('hidden'); sfx('register');
  }
  $('sh-modal').addEventListener('click', function (e) { if (pickerClick(e)) return; var b = e.target.closest('[data-m]'); if (!b) return; $('sh-modal').classList.add('hidden'); if (shop.st.phase === 'report') { shop.nextDay(); speed = 1; } S.page(); refresh(); });

  /* ---------- ogłoszenia: wybór lokalu (picker_mockup Artist) ---------- */
  function showPicker() {
    var m = $('sh-modal'), L = shop.locations(), st = shop.st; if (pickLoc == null) pickLoc = Math.min(9, st.loc + 1);
    var cards = L.map(function (s) { var l = s.loc, cls = s.current ? 'cur' : !s.unlocked ? 'lock' : '';
      return '<div class="lp-card ' + cls + (pickLoc === s.idx ? ' sel' : '') + '" data-p="pick" data-i="' + s.idx + '"><i class="n">' + (s.idx + 1) + '</i>' + (s.current ? '<i class="ok">✓</i>' : !s.unlocked ? '<i class="pad">🔒</i>' : '') +
        '<img src="' + (s.unlocked && !s.current ? l.facadeRent : l.facadeImg) + '" alt=""><b class="rent">' + $$(l.rent_week).replace('.00', '') + '/wk</b>' +
        '<div class="lp-st"><span>▱ ' + l.size[0] + '×' + l.size[1] + '</span><span>☺ ' + l.foot_traffic_per_hour + '/h</span><span class="' + (s.req[1].ok ? '' : 'no') + '">★ ' + l.unlock.reputation + '</span><span class="' + (s.req[2].ok ? '' : 'no') + '">LV ' + l.unlock.level + '</span><span class="' + (s.req[0].ok ? '' : 'no') + '">' + $$(l.unlock.money).replace('.00', '') + '</span></div></div>'; }).join('');
    var s = L[pickLoc], l = s.loc, pv = s.current ? null : shop.previewMove(pickLoc);
    var det = '<div class="lp-det"><div><b>#' + (s.idx + 1) + ' ' + esc(l.name_pl) + '</b> <small>' + esc(l.name_en) + '</small><p>' + esc(l.perk_pl) + '</p>' +
      '<small>Czynsz ' + $$(l.rent_week) + '/tydz. · kaucja ' + $$(s.deposit) + ' (zwrot obecnej ' + $$(s.refund) + ') · do ' + l.furniture_max + ' mebli · klienci: ' + Object.keys(l.customer_mix).map(function (k) { return ({ kids: 'dzieciaki', kid: 'dzieciaki', casual: 'przechodnie', collector: 'kolekcjonerzy', collectors: 'kolekcjonerzy', pro: 'gracze', pros: 'gracze', tourist: 'turyści', tourists: 'turyści' }[k] || k) + ' ' + l.customer_mix[k] + '%'; }).join(', ') + '</small>' +
      (s.unlocked ? '' : '<small class="no">Wymagania: ' + s.req.filter(function (r) { return !r.ok; }).map(function (r) { return r.label + ' ' + (r.k === 'money' ? $$(r.have) + ' / ' + $$(r.need) : r.have + ' / ' + r.need); }).join(' · ') + '</small>') +
      (pv ? '<small>Przeprowadzka: ' + pv.placed + ' mebli jedzie z tobą' + (pv.left.length ? ', ' + pv.left.length + ' się nie zmieści (' + pv.left.map(function (t) { return P.TYPES[t].name; }).join(', ') + ')' : '') + '.</small>' : '') + '</div>' +
      '<div class="lp-btns">' + (s.current ? '<b class="ok">TWÓJ LOKAL ✓</b>' : '<label><input type="checkbox" data-p="sellleft"' + (sellLeft ? ' checked' : '') + '> sprzedaj, co się nie zmieści</label><button class="btn buy" data-p="rent"' + (s.unlocked && s.cashOk && st.phase === 'prep' ? '' : ' disabled') + '>WYNAJMIJ · ' + $$(Math.max(0, s.net)) + '</button>') + '<button class="btn mini" data-p="close">ZAMKNIJ</button></div></div>';
    m.innerHTML = '<div class="lpick"><div class="lp-top"><h3>LOKALE DO WYNAJĘCIA · REAL ESTATE</h3><b class="cash">' + $$(shop.E.state.wallet) + '</b></div><div class="lp-grid">' + cards + '</div>' + det + '</div>';
    m.classList.remove('hidden');
  }
  function pickerClick(e) {
    var b = e.target.closest('[data-p]'); if (!b) return !!e.target.closest('.lpick'); var a = b.dataset.p;
    if (a === 'sellleft') { sellLeft = b.checked; return true; }
    S.click();
    if (a === 'pick') { pickLoc = +b.dataset.i; showPicker(); }
    if (a === 'close') { $('sh-modal').classList.add('hidden'); pickLoc = null; refresh(); }
    if (a === 'rent') { try { var r = shop.moveTo(pickLoc, { sell: sellLeft }); floor = 0; sel = null; ghost = null; layout(); if (HK) HK.revealSpeed = shop.revealSpeed(); $('sh-modal').classList.add('hidden'); pickLoc = null; S.register(); note('Nowy lokal! Kaucja ' + $$(r.paid) + (r.left ? ' · ' + r.left + ' mebli ' + (r.sold ? 'sprzedanych' : 'w magazynie') : '')); } catch (ex) { note(ex.message || String(ex)); } refresh(); }
    return true;
  }

  /* ---------- kreator właściciela ---------- */
  var cl = null, crSlot = 1, crT = 0;
  function creator(slot) {
    crSlot = slot; cl = { name: Hero.randomName(), shopName: 'Turbo Cards & Comics', age: 26, look: Hero.defaults(), trait: 'sprzedawca' };
    cr.classList.remove('hidden'); renderCreator(); Hero.preload(function () { renderCreator(); });
    if (!crT) crT = setInterval(spinCreator, 160);
  }
  var spin = 0;
  function spinCreator() { if (cr.classList.contains('hidden')) return; spin++; var c = $('cr-face'); if (!c) return; var dirs = ['SE', 'SW', 'NW', 'NE'], d = dirs[Math.floor(spin / 12) % 4]; Hero.portrait(c, cl.look, { scale: 6, dir: d, frame: Math.floor(spin / 12) % 2 ? 1 + spin % 4 : 0 }); }
  function renderCreator() {
    var h = '<div class="cr-box"><div class="mn-title">NOWY SKLEP · KARIERA ' + crSlot + '</div><div class="cr-cols"><div class="cr-left"><canvas id="cr-face" width="240" height="360"></canvas><button class="btn alt" data-c="rand">🎲 LOSUJ</button></div><div class="cr-right">' +
      '<div class="cr-row"><label>Imię właściciela</label><input id="cr-name" maxlength="16" value="' + esc(cl.name) + '"></div>' +
      '<div class="cr-row"><label>Nazwa sklepu (szyld)</label><input id="cr-shop" maxlength="26" value="' + esc(cl.shopName) + '"></div>' +
      '<div class="cr-row"><label>Wiek: <b>' + cl.age + '</b></label><input id="cr-age" type="range" min="18" max="45" value="' + cl.age + '"></div>' +
      Hero.ORDER.map(function (k) { var P2 = Hero.PARTS[k], p = Hero.part(k, cl.look[k]), av = Hero.available(k, 1), lock = P2.items.length - av.length;
        return '<div class="cr-part"><label>' + P2.label + '</label><button class="btn mini" data-c="prev" data-k="' + k + '">◄</button><span>' + (p.c ? '<i style="background:' + p.c + '"></i>' : '') + p.name + '</span><button class="btn mini" data-c="next" data-k="' + k + '">►</button>' + (lock ? '<small>🔒 +' + lock + ' za reputację</small>' : '') + '</div>'; }).join('') +
      '<div class="cr-traits">' + Hero.TRAITS.map(function (t) { return '<div class="tr' + (cl.trait === t.id ? ' on' : '') + '" data-c="trait" data-t="' + t.id + '"><b>' + t.name + ' <small>' + t.en + '</small></b><span>' + t.desc + '</span></div>'; }).join('') + '</div>' +
      '<div class="cr-btns"><button class="btn mini" data-c="back">◄ WRÓĆ</button><button class="btn buy" data-c="go">OTWIERAMY INTERES! ▶</button></div></div></div></div>';
    cr.innerHTML = '<div class="mn-bg"><div class="mn-sky"></div><div class="mn-sun"></div><div class="mn-grid"></div><div class="mn-scan"></div></div>' + h;
    spinCreator();
  }
  cr.addEventListener('input', function (e) { if (e.target.id === 'cr-name') cl.name = e.target.value; if (e.target.id === 'cr-shop') cl.shopName = e.target.value; if (e.target.id === 'cr-age') { cl.age = +e.target.value; e.target.previousSibling.innerHTML = 'Wiek: <b>' + cl.age + '</b>'; } });
  cr.addEventListener('click', function (e) {
    var b = e.target.closest('[data-c]'); if (!b) return; S.unlock(); S.click();
    var a = b.dataset.c;
    if (a === 'prev' || a === 'next') { var k = b.dataset.k, av = Hero.available(k, 1), i = av.findIndex(function (x) { return x.id === cl.look[k]; }); cl.look[k] = av[(i + (a === 'next' ? 1 : av.length - 1)) % av.length].id; renderCreator(); }
    if (a === 'rand') { cl.look = Hero.random(Math.random, 1); cl.name = Hero.randomName(); renderCreator(); }
    if (a === 'trait') { cl.trait = b.dataset.t; renderCreator(); }
    if (a === 'back') { cr.classList.add('hidden'); PZMenu.show('career'); }
    if (a === 'go') { cl.name = (cl.name || '').trim() || 'Mike'; cl.shopName = (cl.shopName || '').trim() || 'Turbo Cards & Comics'; cr.classList.add('hidden'); var s2 = P.createShop(Object.assign(deps(crSlot), {})); s2.start(cl); enter(s2); note('Witaj w ' + cl.shopName + '! Ustaw towar i otwórz sklep.'); }
  });

  /* ---------- wejście / wyjście ---------- */
  function enter(s2) {
    shop = s2; active = true; edit = false; ghost = null; sel = null; tab = 'magazyn'; speed = 1; floor = 0; pickLoc = null;
    try { store && store.setItem('paczki.lastShop', String(s2.slot)); } catch (e) { }
    App.useMode(shop.E, hooks()); root.classList.remove('hidden'); preloadKit(); layout(); refresh();
    if (!raf) raf = requestAnimationFrame(loop);
    if (shop.st.phase === 'report') showReport(shop.st.reports[shop.st.reports.length - 1]);
  }
  function load(slot) { var s2 = P.createShop(deps(slot)); if (!s2.load()) { err(new Error('Pusty slot')); return false; } enter(s2); return true; }
  function exit() { active = false; shop = null; root.classList.add('hidden'); cr.classList.add('hidden'); $('sh-modal').classList.add('hidden'); }
  window.PZShopUI = { creator: creator, load: load, exit: exit, get active() { return active; }, get shop() { return shop; }, act: act, home: home,
    get edit() { return edit; }, picker: function (i) { if (i != null) pickLoc = i; showPicker(); }, setFloor: function (f) { floor = f; refresh(); }, get floor() { return floor; }, select: function (uid) { sel = uid; tab = 'sklep'; refresh(); }, pickUp: function (uid) { var f = shop.get(uid); edit = true; ghost = { type: f.type, tx: f.tx, ty: f.ty, rot: f.rot, uid: uid, lvl: f.lvl, items: f.items }; sel = uid; refresh(); }, ghostTo: function (tx, ty) { if (ghost) { ghost.tx = tx; ghost.ty = ty; } },
    screenOf: function (tx, ty) { return scr(tx, ty); }, deps: deps, report: showReport };
})();
