/* Główna logika: stany sceny, interakcje, HUD, album. */
(function () {
  'use strict';
  var D = PZData, A = PZArt, S = PZAudio, FX = PZFx;
  var $ = function (id) { return document.getElementById(id); };
  var money = A.money;
  var params = new URLSearchParams(location.search);
  var DEMO = { secret: 'SR', sekretna: 'SR', sr: 'SR', ultra: 'UR', ur: 'UR', holo: 'H', h: 'H', rare: 'R', rzadka: 'R', r: 'R' };
  var demoRaw = (params.get('demo') || '').toLowerCase(), force = DEMO[demoRaw] || null, demo = params.has('demo');
  var store = null;
  try { localStorage.setItem('_pz', '1'); localStorage.removeItem('_pz'); store = localStorage; } catch (e) { store = null; }
  // tryb demo nie rusza prawdziwego zapisu
  var E = PZEconomy.createEconomy(D, demo ? null : store, 'paczki.v1');
  E.load(); if (demo && params.has('wallet')) E.state.wallet = +params.get('wallet') || E.state.wallet;
  S.setEnabled(E.state.sound);

  var PACK_W = 260, PACK_H = 420, TEAR_Y = 56;
  var mode = 'empty', busy = false, scale = 1;
  var packEl = null, tear = { p: 0, dir: 0 }, drag = null;
  var cardEls = [], currentUp = null, asideCount = 0;
  var stack = $('stack'), packwrap = $('packwrap'), shaker = $('shaker');

  /* ---------- skalowanie świata 1280x800 ---------- */
  function fit() { scale = Math.min(innerWidth / 1280, innerHeight / 800); document.documentElement.style.setProperty('--s', scale); }
  addEventListener('resize', fit); fit();
  function local(e, el) { var r = el.getBoundingClientRect(); return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale, w: r.width / scale, h: r.height / scale }; }

  /* ---------- HUD ---------- */
  var shown = {};
  function tween(id, to, fmt, color) {
    var el = $(id), from = shown[id] == null ? to : shown[id]; shown[id] = to;
    if (color) { el.classList.toggle('neg', to < -0.004); el.classList.toggle('pos', to > 0.004); }
    if (Math.abs(from - to) < 0.005) { el.textContent = fmt(to); return; }
    el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
    var t0 = performance.now(), dur = Math.min(900, 250 + Math.abs(to - from) * 2);
    (function step(t) { var k = Math.min(1, (t - t0) / dur); k = 1 - Math.pow(1 - k, 3); el.textContent = fmt(from + (to - from) * k); if (k < 1) requestAnimationFrame(step); })(t0);
  }
  function signed(v) { return (v > 0.004 ? '+' : '') + money(v); }
  function hud() {
    var st = E.state;
    tween('h-wallet', st.wallet, money); tween('h-spent', st.spent, money); tween('h-pulled', st.pulled, money); tween('h-profit', E.profit(), signed, true);
    $('h-packs').textContent = st.packs;
    $('h-best').textContent = st.best ? D.BY_ID[st.best.id].name + ' · ' + money(st.best.price) : '—';
    var buy = $('b-buy');
    buy.textContent = 'KUP PACZKĘ · ' + money(D.PACK.price);
    buy.disabled = !E.canBuy();
    buy.classList.toggle('pulse', E.canBuy() && (mode === 'empty' || mode === 'summary'));
    $('b-album').textContent = 'ALBUM ' + E.uniqueCount() + '/' + D.CARDS.length;
    $('b-pocket').classList.toggle('hidden', !(st.wallet < D.PACK.price && !st.pending));
    $('b-sound').textContent = 'DŹWIĘK: ' + (st.sound ? 'WŁ' : 'WYŁ');
  }
  function hint(t, blink) { var h = $('hint'); h.textContent = t; h.classList.toggle('blink', !!blink); }
  var toastT;
  function toast(t) { var el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { el.classList.remove('on'); }, 2200); }

  /* ---------- paczka ---------- */
  function showPack(animate) {
    packwrap.innerHTML = A.packHTML(PACK_W, PACK_H, TEAR_Y); packEl = packwrap.firstChild;
    packEl.classList.add('hot'); packwrap.style.transform = ''; packwrap.style.display = '';
    if (animate) { packwrap.classList.remove('drop'); void packwrap.offsetWidth; packwrap.classList.add('drop'); }
    tear = { p: 0, dir: 0 }; mode = 'pack';
    hint('Złap górny pasek paczki i przeciągnij wzdłuż krawędzi, żeby ją rozerwać', true);
  }
  function strip() { return packEl && packEl.querySelector('.pk-strip'); }
  function setTear(p) {
    tear.p = p; var s = strip(); if (!s) return;
    var dir = tear.dir || 1, ew = packEl.querySelector('.pk-edgewrap');
    s.style.transformOrigin = (dir > 0 ? PACK_W : 0) + 'px ' + TEAR_Y + 'px';
    s.style.transform = 'translateY(' + (-p * 7) + 'px) rotate(' + (dir * p * 15) + 'deg)';
    ew.classList.toggle('rtl', dir < 0); ew.style.width = (p * PACK_W) + 'px';
    packEl.querySelector('.pk-guide').style.opacity = Math.max(0, 1 - p * 3);
  }
  function completeTear() {
    if (mode !== 'pack') return; mode = 'busy'; drag = null;
    var s = strip(), dir = tear.dir || 1;
    setTear(1); S.rip(); packEl.classList.remove('hot');
    s.classList.add('fall');
    s.style.transform = 'translate(' + (dir * 190) + 'px, 560px) rotate(' + (dir * 75) + 'deg)';
    FX.burst(640 + dir * 60, 196 + TEAR_Y, 14, { colors: ['#ffffff', '#d8d8e8', '#ffd23f', '#ff5c8a'], power: 4, grav: 0.25 });
    setTimeout(function () { if (s.parentNode) s.remove(); }, 1000);
    setTimeout(function () {
      mode = 'torn'; packEl.querySelector('.pk-peek').classList.add('ready');
      hint('Teraz wyciągnij karty – przeciągnij je w górę (albo kliknij paczkę)', true);
    }, 420);
  }
  function pullOut() {
    if (mode !== 'torn') return; mode = 'busy';
    E.markPulled(); S.whoosh();
    var peek = packEl.querySelector('.pk-peek'); peek.classList.remove('ready');
    peek.style.transform = 'translateY(-150px)'; peek.style.opacity = '0';
    setTimeout(function () {
      packEl.classList.add('empty');
      buildStack(true);
      packwrap.style.transform = 'translate(-275px, 150px) rotate(-26deg) scale(.58)';
    }, 260);
    setTimeout(function () {
      // pusta folia zostaje na stole
      var w = document.createElement('div'); w.className = 'wrapper';
      var old = $('wrappers').children; if (old.length >= 4) old[0].remove();
      var jx = (Math.random() - 0.5) * 40, jy = (Math.random() - 0.5) * 30, rot = -26 + (Math.random() - 0.5) * 30;
      w.style.cssText = 'position:absolute;left:510px;top:196px;transform:translate(' + (-275 + jx) + 'px,' + (150 + jy) + 'px) rotate(' + rot + 'deg) scale(.58)';
      w.appendChild(packEl); $('wrappers').appendChild(w);
      packwrap.innerHTML = ''; packwrap.style.transition = 'none'; packwrap.style.transform = ''; void packwrap.offsetWidth; packwrap.style.transition = '';
      packEl = null;
      mode = 'reveal'; stack.classList.add('on');
      hint('Kliknij stos (albo przesuń kartę w bok), żeby sprawdzać karty po kolei', true);
    }, 1050);
  }

  packwrap.addEventListener('pointerdown', function (e) {
    S.unlock(); if (!packEl) return;
    var l = local(e, packEl);
    if (mode === 'pack') {
      drag = { type: 'tear', x0: l.x, last: l.x, moved: 0, t: performance.now() };
      if (l.y > 130) { drag.type = 'body'; }
      packwrap.setPointerCapture(e.pointerId);
    } else if (mode === 'torn') { drag = { type: 'pull', y0: l.y, dy: 0 }; packwrap.setPointerCapture(e.pointerId); }
  });
  packwrap.addEventListener('pointermove', function (e) {
    if (!drag || !packEl) return; var l = local(e, packEl);
    if (drag.type === 'tear') {
      var dx = l.x - drag.x0, mv = Math.abs(l.x - drag.last); drag.last = l.x; drag.moved += mv;
      if (!tear.dir && Math.abs(dx) > 4) tear.dir = dx > 0 ? 1 : -1;
      if (tear.dir) {
        var p = Math.max(tear.p, Math.min(1, (dx * tear.dir) / (PACK_W * 0.8)));
        if (p > tear.p) { S.crinkle(Math.min(1, mv / 12)); setTear(p); }
        if (p >= 1) completeTear();
      }
    } else if (drag.type === 'pull') {
      drag.dy = Math.max(0, Math.min(90, drag.y0 - l.y));
      packEl.querySelector('.pk-peek').style.transform = 'translateY(' + (-drag.dy) + 'px)';
      if (drag.dy > 4) S.crinkle(0.3);
      if (drag.dy >= 70) { drag = null; pullOut(); }
    }
  });
  function packUp() {
    if (!drag) return; var d = drag; drag = null;
    if (d.type === 'tear' && d.moved < 6 && mode === 'pack') { // kliknięcie: kawałek rozdarcia
      tear.dir = tear.dir || 1; S.crinkle(1); S.crinkle(1); setTear(Math.min(1, tear.p + 0.34)); if (tear.p >= 1) completeTear();
      else hint('Jeszcze trochę... (możesz też przeciągnąć wzdłuż krawędzi)');
    } else if (d.type === 'body' && mode === 'pack') { S.crinkle(0.6); FX.shake(packwrap.firstChild, 'wiggle'); hint('Rozrywa się od góry – złap za pasek nad przerywaną linią!', true); }
    else if (d.type === 'pull' && mode === 'torn') {
      if (d.dy > 35 || d.dy < 4) pullOut(); else packEl.querySelector('.pk-peek').style.transform = '';
    }
  }
  packwrap.addEventListener('pointerup', packUp); packwrap.addEventListener('pointercancel', packUp);

  /* ---------- stos kart i odkrywanie ---------- */
  function buildStack(animate) {
    stack.innerHTML = ''; cardEls = []; currentUp = null; asideCount = 0;
    var p = E.state.pending;
    p.cards.forEach(function (id, i) {
      var c = D.BY_ID[id], d = document.createElement('div');
      d.className = 'c3d' + (animate ? ' enter' : '');
      d.innerHTML = '<div class="tilt"><div class="flip"><div class="face front">' + A.cardHTML(c) + '</div><div class="face back">' + A.backHTML() + '</div></div></div>';
      if (animate) d.style.animationDelay = (i * 0.02) + 's';
      stack.appendChild(d); cardEls.push(d);
    });
    for (var i = 0; i < p.revealed; i++) { cardEls[i].classList.add('up'); toAside(cardEls[i], true); }
    restack(p.revealed);
  }
  function restack(top) {
    var n = cardEls.length;
    for (var i = top; i < n; i++) { var k = i - top; cardEls[i].style.zIndex = 100 - i; cardEls[i].style.transform = 'translate(' + (k * 1.4) + 'px,' + (k * 1.8) + 'px)'; }
  }
  function toAside(el, instant) {
    var o = asideCount++;
    el.classList.add('aside'); el.style.zIndex = 200 + o;
    var rot = ((o * 37) % 13) - 6, dx = 300 + ((o % 2) ? 8 : -8), dy = -95 + o * 21;
    if (instant) el.style.transition = 'none';
    el.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(' + rot + 'deg) scale(.5)';
    resetTilt(el);
    if (instant) { void el.offsetWidth; el.style.transition = ''; }
  }
  function showTag(c) {
    var t = D.TIERS[c.tier], el = $('tag');
    el.className = 'r-' + c.tier;
    el.innerHTML = '<span class="tr ' + c.tier + '">' + t.name.toUpperCase() + '</span><span class="pr">' + money(c.price) + '</span>';
    void el.offsetWidth; el.classList.add('on');
  }
  function hideTag() { $('tag').classList.remove('on'); }

  function advance() {
    if (mode !== 'reveal' || busy) return;
    var p = E.state.pending; if (!p) return;
    if (currentUp) { toAside(currentUp); currentUp = null; hideTag(); S.whoosh(); }
    if (p.revealed >= p.cards.length) { finish(); return; }
    flipNext();
  }
  /* ---------- TurboReveal (moduł Artist): wielkie odkrycie dla Rzadkiej i wyżej ---------- */
  var revInit = null;
  var REV_SPEED = { R: 1.6, H: 1.2, UR: 1, SR: 1 };   // R ma zostać szybka (~0,8 s), show jest dla UR/SR
  function ensureReveal() {
    if (!window.TurboReveal) return null;
    if (!revInit) revInit = TurboReveal.init({ base: 'reveal/', sound: false, onSfx: function (n) { S.sfx(n); } }).catch(function () {});
    return revInit;
  }
  function revealBack() { var d = document.createElement('div'); d.style.cssText = 'width:300px;height:391px;padding-left:10px'; d.innerHTML = A.backHTML(); return d; }
  function bigReveal(el, c, rank) {
    ensureReveal();
    var res = E.revealNext(), dup = (E.state.collection[c.id] || 0) > 1;
    el.style.visibility = 'hidden';
    var speed = REV_SPEED[c.tier] * (dup && rank < 5 ? 1.7 : 1);
    if (rank >= 4) hint('Kliknij albo naciśnij Spację, żeby pominąć animację', false);
    TurboReveal.play({ id: c.id }, c.tier, {
      container: $('world'), from: 'back', packEl: revealBack(), speed: speed, waitForTap: rank >= 4, bannerGap: 6, seed: (Math.random() * 1e6) | 0,
      onPhase: function (ph) {
        if (ph === 'anticipation') { var b = $('world').querySelector('.trv-root .trv-back'); if (b) b.innerHTML = A.backHTML(); }
        if (ph === 'skip') S.stopSfx();
      }
    }).then(function () {
      var f = el.querySelector('.flip'); f.style.transition = 'none'; el.classList.add('up'); void f.offsetWidth; f.style.transition = '';
      el.style.visibility = ''; currentUp = el;
      onRevealed(res, true); busy = false;
    });
  }
  function flipNext() {
    var p = E.state.pending, idx = p.revealed, el = cardEls[idx], c = D.BY_ID[p.cards[idx]], rank = D.TIERS[c.tier].rank;
    restack(idx); busy = true;
    if (rank >= 2 && window.TurboReveal) { bigReveal(el, c, rank); return; }
    var pre = rank >= 5 ? 2000 : rank === 4 ? 1100 : rank === 3 ? 550 : 0;
    if (pre) {
      el.classList.add('charge', 'charge-' + c.tier); S.riser(pre / 1000);
      hint(rank >= 5 ? 'CO TO?! Karta aż drży w rękach...' : rank === 4 ? 'Ta karta jest jakaś... cięższa?' : 'Coś błysnęło pod spodem...', true);
      if (rank >= 5) { var iv = setInterval(function () { FX.burst(640 + (Math.random() - 0.5) * 300, 380 + (Math.random() - 0.5) * 380, 3, { stars: true, power: 2, grav: -0.02 }); }, 90); setTimeout(function () { clearInterval(iv); }, pre); }
    }
    setTimeout(function () {
      el.classList.remove('charge', 'charge-' + c.tier);
      var res = E.revealNext();
      el.classList.add('up'); currentUp = el; S.flip();
      setTimeout(function () { onRevealed(res); busy = false; }, rank >= 3 ? 420 : 250);
    }, pre);
  }
  function onRevealed(res, viaModule) {
    var c = res.card, rank = D.TIERS[c.tier].rank, p = E.state.pending;
    if (!viaModule) S.reveal(rank); showTag(c); hud();
    var left = p.cards.length - p.revealed;
    if (viaModule) {   // pokaz już był w module – tu tylko cena (dla SR duża) i trochę iskier na stole
      if (rank >= 3) FX.burst(640, 380, rank >= 5 ? 90 : 30, { stars: true, power: rank >= 5 ? 9 : 5, grav: 0.05 });
      if (rank >= 5) { S.register(); var pp = $('pop'); pp.innerHTML = '<div class="p1">✦ SEKRETNA KARTA! ✦</div><div class="p2">' + money(c.price) + '</div>'; pp.classList.remove('go'); void pp.offsetWidth; pp.classList.add('go'); }
    }
    else if (rank === 3) { FX.burst(640, 380, 40, { stars: true, power: 6, grav: 0.05 }); FX.flash($('flash')); }
    if (!viaModule && rank === 4) { FX.flash($('flash')); FX.shake(shaker, 'shake-s'); FX.burst(640, 380, 120, { stars: true, power: 10 }); }
    if (!viaModule && rank >= 5) {
      FX.flash($('flash'), true); FX.shake(shaker);
      FX.burst(640, 380, 260, { power: 14 }); setTimeout(function () { FX.burst(300, 800, 120, { up: true, power: 20 }); FX.burst(980, 800, 120, { up: true, power: 20 }); }, 250);
      var pop = $('pop'); pop.innerHTML = '<div class="p1">✦ SEKRETNA KARTA! ✦</div><div class="p2">' + money(c.price) + '</div>';
      pop.classList.remove('go'); void pop.offsetWidth; pop.classList.add('go');
    }
    if (rank >= 2 && res.isBest && E.state.packs > 1) setTimeout(function () { toast('NOWY REKORD! ' + c.name + ' – ' + money(c.price)); }, 300);
    if (rank >= 4) hint(c.name + '! Porusz myszką nad kartą, żeby zobaczyć połysk.');
    else hint(left ? 'Zostało ' + left + (left === 1 ? ' karta' : left < 5 ? ' karty' : ' kart') + ' – klikaj dalej' + (left === 1 ? ' (ostatnia bywa rzadka!)' : '') : 'To ostatnia karta. Kliknij, żeby podsumować paczkę.');
  }
  function finish() {
    mode = 'summary'; stack.classList.remove('on'); hideTag();
    var p = E.finishPack(), val = p.value, diff = D.round2(val - D.PACK.price);
    var lines = p.cards.map(function (id) {
      var c = D.BY_ID[id], t = D.TIERS[c.tier];
      return '<div class="ln' + (t.rank >= 5 ? ' sr' : t.rank >= 3 ? ' hit' : '') + '"><span>' + c.id + ' ' + A.esc(c.name) + ' (' + t.short + ')</span><span>' + money(c.price).replace(' zł', '') + '</span></div>';
    }).join('');
    var r = $('receipt');
    r.innerHTML = '<h3>SKLEPIK „U ZDZISIA”</h3><div class="sub">PARAGON NIEFISKALNY · PACZKA nr ' + E.state.packs + '</div>' + lines +
      '<hr><div class="ln tot"><span>WARTOŚĆ KART</span><span>' + money(val) + '</span></div><div class="ln"><span>CENA PACZKI</span><span>' + money(D.PACK.price) + '</span></div>' +
      '<div class="ln tot ' + (diff >= 0 ? 'pos' : 'neg') + '"><span>BILANS</span><span>' + signed(diff) + '</span></div>' +
      '<div class="thx">' + (diff >= 0 ? '*** SZCZĘŚCIARZ! ***' : 'Dziękujemy, zapraszamy ponownie!') + '</div>';
    r.classList.remove('on'); void r.offsetWidth; r.classList.add('on');
    if (diff >= 0) S.register(); else S.page();
    hud();
    hint(E.canBuy() ? 'Karty trafiły do albumu. Kupujesz kolejną paczkę?' : 'Brak kasy na kolejną paczkę – sprzedaj coś w albumie albo weź kieszonkowe.');
  }

  /* tilt i połysk pod myszką */
  function resetTilt(el) { var t = el.querySelector('.tilt'), c = el.querySelector('.card'); t.style.transform = ''; c.classList.remove('tilting'); c.style.removeProperty('--mx'); c.style.removeProperty('--my'); }
  function applyTilt(el, e, amt) {
    var l = local(e, el), px = Math.max(0, Math.min(1, l.x / l.w)), py = Math.max(0, Math.min(1, l.y / l.h));
    var t = el.querySelector('.tilt'), c = el.querySelector('.card');
    t.style.transform = 'rotateY(' + ((px - 0.5) * amt) + 'deg) rotateX(' + ((0.5 - py) * amt) + 'deg)';
    c.classList.add('tilting'); c.style.setProperty('--mx', (px * 100).toFixed(1) + '%'); c.style.setProperty('--my', (py * 100).toFixed(1) + '%');
  }
  var sdown = null;
  stack.addEventListener('pointermove', function (e) { if (currentUp && !busy) applyTilt(currentUp, e, 26); });
  stack.addEventListener('pointerleave', function () { if (currentUp) resetTilt(currentUp); });
  stack.addEventListener('pointerdown', function (e) { S.unlock(); sdown = { x: e.clientX, y: e.clientY }; });
  stack.addEventListener('pointerup', function (e) { if (!sdown) return; sdown = null; advance(); });

  /* ---------- zakupy ---------- */
  function clearTable() {
    $('receipt').classList.remove('on'); hideTag();
    cardEls.forEach(function (el, i) { el.style.transition = 'transform .5s ease-in ' + (i * 0.02) + 's, opacity .5s ' + (i * 0.02) + 's'; el.style.transform += ' translate(600px,-300px)'; el.style.opacity = '0'; });
    var old = cardEls; cardEls = []; currentUp = null; setTimeout(function () { old.forEach(function (el) { el.remove(); }); }, 700);
  }
  function buy() {
    S.unlock();
    if (mode !== 'empty' && mode !== 'summary') { toast('Najpierw otwórz tę paczkę!'); S.error(); return; }
    if (!E.canBuy()) { toast('Za mało kasy! Paczka kosztuje ' + money(D.PACK.price)); S.error(); return; }
    clearTable();
    var opts = force ? { force: force } : undefined; if (force && !params.has('always')) force = null;
    E.buy(Math.random, opts); S.coin(); hud(); ensureReveal();
    showPack(true); hud();
  }

  /* ---------- album ---------- */
  var albumPage = 0, PER = 18, PAGES = Math.ceil(D.CARDS.length / PER);
  function pocketHTML(c) {
    var n = E.state.collection[c.id] || 0;
    if (!n) return '<div class="pocket"><div class="num">' + (c.tier === 'SR' ? '<span class="sec">✦</span><br>' : '') + c.id + '<small>' + (c.tier === 'SR' ? '???' : D.TIERS[c.tier].name) + '</small></div></div>';
    return '<div class="pocket has" data-id="' + c.id + '">' + A.cardHTML(c) + '<div class="sleeve"></div>' + (n > 1 ? '<div class="qty">x' + n + '</div>' : '') + '<div class="pp">' + money(c.price) + '</div></div>';
  }
  function renderAlbum(turn) {
    var start = albumPage * PER, cards = D.CARDS.slice(start, start + PER), dv = E.duplicatesValue();
    var pg = function (arr, cls) { var h = arr.map(pocketHTML).join(''); for (var i = arr.length; i < 9; i++) h += '<div class="pocket" style="visibility:hidden"></div>'; return '<div class="page ' + cls + (turn ? ' turn' : '') + '">' + h + '</div>'; };
    var dupes = 0; for (var id in E.state.collection) dupes += E.state.collection[id] - 1;
    $('album').innerHTML = '<div class="binder"><div class="al-head"><div class="al-title">MÓJ ALBUM</div>' +
      '<div class="al-stats">Zebrane: <b>' + E.uniqueCount() + '/' + D.CARDS.length + '</b> · Wartość kolekcji: <b>' + money(E.collectionValue()) + '</b> · Duplikaty: <b>' + dupes + '</b></div>' +
      '<button class="btn mini" data-a="prev">◄</button><span class="pg-num">STR. ' + (albumPage + 1) + '/' + PAGES + '</span><button class="btn mini" data-a="next">►</button>' +
      '<button class="btn mini" data-a="dupes"' + (dv > 0 ? '' : ' disabled') + '>SPRZEDAJ DUPLIKATY +' + money(dv) + '</button><button class="btn mini" data-a="close">ZAMKNIJ ✕</button></div>' +
      '<div class="pages">' + pg(cards.slice(0, 9), 'l') + pg(cards.slice(9, 18), 'r') + '<div class="rings"><i></i><i></i><i></i><i></i></div></div></div>';
  }
  function openAlbum() { S.unlock(); S.page(); renderAlbum(); $('album').classList.remove('hidden'); }
  function closeAlbum() { $('album').classList.add('hidden'); }
  $('album').addEventListener('click', function (e) {
    var b = e.target.closest('[data-a]'), pk = e.target.closest('.pocket.has');
    if (b) {
      var a = b.dataset.a;
      if (a === 'close') closeAlbum();
      else if (a === 'prev' || a === 'next') { albumPage = (albumPage + (a === 'next' ? 1 : PAGES - 1)) % PAGES; S.page(); renderAlbum(true); }
      else if (a === 'dupes') { var got = E.sellDuplicates(); if (got) { S.register(); toast('Sprzedano duplikaty za ' + money(got)); } renderAlbum(); hud(); }
    } else if (pk) openDetail(pk.dataset.id);
    else if (e.target.id === 'album') closeAlbum();
  });

  function openDetail(id) {
    var c = D.BY_ID[id], n = E.state.collection[id] || 0, t = D.TIERS[c.tier], sp = E.sellPrice(id);
    var el = $('detail');
    el.innerHTML = '<div class="dt-card"><div class="tilt">' + A.cardHTML(c) + '</div></div><div class="dt-hint">Porusz myszką nad kartą</div>' +
      '<div class="dt-info"><h2>' + A.esc(c.name) + '</h2><div class="row">Nr <b>' + c.id + '/' + D.SET.size + '</b> · <b>' + t.name + '</b> · Stwór ' + c.elName + '</div>' +
      '<div class="big">' + money(c.price) + '</div><div class="row">Cena rynkowa. Sklepik odkupi za <b>' + money(sp) + '</b> (' + Math.round(D.PACK.sellRate * 100) + '%).</div>' +
      '<div class="row">Masz: <b>' + n + ' szt.</b></div><div class="btns">' +
      (n ? '<button class="btn" data-a="sell1">SPRZEDAJ 1 · +' + money(sp) + '</button>' : '') + (n > 1 ? '<button class="btn" data-a="sellall">SPRZEDAJ WSZYSTKIE · +' + money(D.round2(sp * n)) + '</button>' : '') +
      '<button class="btn alt" data-a="back">WRÓĆ</button></div></div>';
    el.dataset.id = id; el.classList.remove('hidden'); S.flip();
  }
  $('detail').addEventListener('pointermove', function (e) { var dc = e.target.closest('.dt-card'); var box = $('detail').querySelector('.dt-card'); if (box) { if (dc) applyTilt(box, e, 30); else resetTilt(box); } });
  $('detail').addEventListener('click', function (e) {
    var b = e.target.closest('[data-a]'), id = $('detail').dataset.id;
    if (!b) { if (!e.target.closest('.dt-card') && !e.target.closest('.dt-info')) $('detail').classList.add('hidden'); return; }
    if (b.dataset.a === 'back') { $('detail').classList.add('hidden'); return; }
    var got = E.sell(id, b.dataset.a === 'sellall' ? 999 : 1);
    if (got) { S.register(); toast('Sprzedano za ' + money(got)); }
    hud(); renderAlbum();
    if (E.state.collection[id]) openDetail(id); else $('detail').classList.add('hidden');
  });

  /* ---------- przyciski i klawiatura ---------- */
  $('b-buy').addEventListener('click', buy);
  $('b-album').addEventListener('click', openAlbum);
  $('b-pocket').addEventListener('click', function () { var g = E.pocketMoney(); if (g) { S.coin(); toast('Babcia dała ' + money(g) + ' kieszonkowego!'); } hud(); if (mode === 'empty' || mode === 'summary') hint('Kup paczkę, żeby zacząć!'); });
  $('b-sound').addEventListener('click', function () { E.setSound(!E.state.sound); S.setEnabled(E.state.sound); S.click(); hud(); });
  var resetArm = 0;
  $('b-reset').addEventListener('click', function () {
    var b = $('b-reset');
    if (Date.now() - resetArm > 3000) { resetArm = Date.now(); b.textContent = 'NA PEWNO? KLIKNIJ'; setTimeout(function () { b.textContent = 'NOWA SESJA'; }, 3000); return; }
    E.reset(); location.reload();
  });
  addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { if (!$('detail').classList.contains('hidden')) $('detail').classList.add('hidden'); else closeAlbum(); return; }
    if (!$('album').classList.contains('hidden')) { if (e.key === 'ArrowRight') $('album').querySelector('[data-a=next]').click(); if (e.key === 'ArrowLeft') $('album').querySelector('[data-a=prev]').click(); return; }
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') {
      e.preventDefault(); S.unlock();
      if (mode === 'pack') { tear.dir = tear.dir || 1; S.crinkle(1); setTear(Math.min(1, tear.p + 0.34)); if (tear.p >= 1) completeTear(); }
      else if (mode === 'torn') pullOut(); else if (mode === 'reveal') advance(); else if (mode === 'empty' || mode === 'summary') buy();
    }
    if (e.key === 'a' || e.key === 'A') openAlbum();
  });

  /* ---------- start ---------- */
  PZScene.build($('props')); FX.init($('fx'));
  var pend = E.state.pending;
  if (pend) {
    ensureReveal();
    if (pend.pulled) {
      if (pend.revealed >= pend.cards.length) { buildStack(false); mode = 'reveal'; finish(); }
      else { buildStack(false); mode = 'reveal'; stack.classList.add('on'); hint('Wracamy do otwartej paczki – kliknij stos, żeby odkrywać dalej', true); }
    } else showPack(false);
  } else {
    hint(E.canBuy() ? 'Masz ' + money(E.state.wallet) + '. Kup paczkę TURBO STWORÓW i sprawdź szczęście!' : 'Pusto w portfelu – weź kieszonkowe albo sprzedaj karty.', true);
  }
  hud();

  // API do testów/automatyzacji
  window.App = { E: E, D: D, get mode() { return mode; }, get busy() { return busy; }, buy: buy, setTear: function (p) { tear.dir = tear.dir || 1; setTear(p); }, completeTear: completeTear,
    pullOut: pullOut, advance: advance, get revealActive() { return !!(window.TurboReveal && TurboReveal.active); }, openAlbum: openAlbum, closeAlbum: closeAlbum, openDetail: openDetail, finish: finish };
})();
