/* Menu główne (ekran tytułowy), pauza, ustawienia, autorzy. Mysz + klawiatura (strzałki, Enter, Esc).
 * PZSettings – ustawienia w localStorage 'paczki.settings.v1' (dźwięk, głośność muzyki, szybkość animacji).
 */
(function () {
  'use strict';
  var S = PZAudio, $ = function (id) { return document.getElementById(id); };
  var store = null; try { localStorage.setItem('_pzm', '1'); localStorage.removeItem('_pzm'); store = localStorage; } catch (e) { }
  var SKEY = 'paczki.settings.v1', SPEEDS = [{ v: 1, n: 'NORMALNA' }, { v: 1.5, n: 'SZYBKA' }, { v: 2.2, n: 'TURBO' }];
  var set = { v: 1, sound: true, music: 0.4, speed: 1 };
  try { var o = JSON.parse(store.getItem(SKEY)); if (o && o.v === 1) Object.assign(set, o); else if (window.App) set.sound = App.FREE_E.state.sound; } catch (e) { if (window.App) set.sound = App.FREE_E.state.sound; }
  function saveSet() { try { store && store.setItem(SKEY, JSON.stringify(set)); } catch (e) { } }
  function apply() { S.setEnabled(set.sound); S.music.setVolume(set.music); if (window.App) { App.FREE_E.setSound(set.sound); App.hud(); } document.documentElement.style.setProperty('--anim', String(1 / set.speed)); }
  window.PZSettings = { get: function () { return set; }, set: function (k, v) { set[k] = v; saveSet(); apply(); } };

  var world = $('world');
  var root = document.createElement('div'); root.id = 'menu'; root.className = 'ui-layer'; world.appendChild(root);
  var btn = document.createElement('button'); btn.id = 'b-menu'; btn.className = 'btn mini'; btn.innerHTML = '☰ MENU'; btn.title = 'Pauza / menu (Esc)'; world.appendChild(btn);
  btn.addEventListener('click', function () { S.click(); pause(); });

  var screen = 'main', ctx = 'title', sel = 0, armed = null;
  function bg() {
    var cards = ''; for (var i = 0; i < 9; i++) cards += '<i style="--i:' + i + ';left:' + (6 + i * 11) + '%;animation-delay:' + (-i * 2.3) + 's"></i>';
    return '<div class="mn-bg"><div class="mn-sky"></div><div class="mn-sun"></div><div class="mn-grid"></div><div class="mn-cards">' + cards + '</div><div class="mn-scan"></div><div class="mn-vig"></div></div>';
  }
  function logo() { return '<div class="mn-logo"><div class="l1">TURBO</div><div class="l2">STWORY</div><div class="l3">KARTY KOLEKCJONERSKIE · EST. 1991</div></div>'; }
  function item(act, label, sub, dis) { return '<button class="mi' + (dis ? ' dis' : '') + '" data-act="' + act + '"' + (dis ? ' disabled' : '') + '><span>' + label + '</span>' + (sub ? '<small>' + sub + '</small>' : '') + '</button>'; }
  function careerDeps() { return { D: PZData, CAT: PZCat, Hero: PZHero, Economy: PZEconomy, storage: store }; }
  function slots() { return PZShop.listSlots(careerDeps()); }
  function lastSlot() { var a = slots().filter(function (x) { return !x.empty; }); var l = +(store && store.getItem('paczki.lastShop')); return a.filter(function (x) { return x.slot === l; })[0] || a[0] || null; }
  function render() {
    var h = '';
    if (screen === 'main') {
      var ls = lastSlot();
      h = logo() + '<div class="mn-list">' +
        item('cont', 'KONTYNUUJ KARIERĘ', ls ? ls.shopName + ' · dzień ' + ls.day : 'brak zapisu', !ls) +
        item('career', 'KARIERA', 'własny sklep z kartami · 3 sloty') + item('free', 'GRA SWOBODNA', 'otwieraj paczki bez limitu') +
        item('album', 'ALBUM', 'kolekcja z gry swobodnej') + item('settings', 'USTAWIENIA') + item('credits', 'AUTORZY') + '</div>' +
        '<div class="mn-foot">↑↓ wybór · ENTER zatwierdź · ESC wróć &nbsp;|&nbsp; wersja 1.4 · 1991 edition</div>';
    } else if (screen === 'career') {
      h = '<div class="mn-title">KARIERA</div><div class="mn-sub">Otwierasz własny sklep z kartami w amerykańskim mallu, rok 1991. Hurtownia, gabloty, ceny, klienci – i czynsz co tydzień.</div><div class="slots">' +
        slots().map(function (x) {
          if (x.empty) return '<div class="slot empty"><div class="sl-n">SLOT ' + x.slot + '</div><div class="sl-face">?</div><div class="sl-info">Pusty</div>' + item('new:' + x.slot, 'NOWA KARIERA') + '</div>';
          return '<div class="slot"><div class="sl-n">SLOT ' + x.slot + '</div><div class="sl-face"><canvas class="sl-cv" width="96" height="140" data-look="' + PZArt.esc(JSON.stringify(x.look)) + '"></canvas></div><div class="sl-info"><b>' + PZArt.esc(x.shopName) + '</b><br>' + PZArt.esc(x.name) + ' · dzień ' + x.day + '<br>' + x.level + ' · $' + x.wallet.toFixed(0) + '</div>' +
            item('load:' + x.slot, 'KONTYNUUJ') + item('new:' + x.slot, armed === 'new:' + x.slot ? 'NADPISAĆ? KLIKNIJ' : 'NOWA') + item('del:' + x.slot, armed === 'del:' + x.slot ? 'NA PEWNO USUNĄĆ?' : 'USUŃ') + '</div>';
        }).join('') + '</div><div class="mn-list row">' + item('back', '◄ WRÓĆ') + '</div>';
    } else if (screen === 'settings') {
      var sp = SPEEDS.filter(function (x) { return x.v === set.speed; })[0] || SPEEDS[0];
      h = '<div class="mn-title">USTAWIENIA</div><div class="mn-list">' +
        item('snd', 'DŹWIĘK: ' + (set.sound ? 'WŁ' : 'WYŁ')) +
        '<div class="mi slider" data-act="vol"><span>MUZYKA: ' + Math.round(set.music * 100) + '%</span><input type="range" min="0" max="100" step="10" value="' + Math.round(set.music * 100) + '" id="mn-vol"></div>' +
        item('spd', 'SZYBKOŚĆ ANIMACJI: ' + sp.n, 'wielkie odsłony kart') +
        item('reset', armed === 'reset' ? 'NA PEWNO? WSZYSTKO ZNIKNIE – KLIKNIJ' : 'RESETUJ DANE', 'gra swobodna, kariery, ustawienia') +
        item('back', '◄ WRÓĆ') + '</div>';
    } else if (screen === 'credits') {
      h = '<div class="mn-title">AUTORZY</div><div class="credits"><p><b>Pomysł i zamówienie</b><br>Łukasz Kowalik</p><p><b>Programowanie, mechanika, ekonomia</b><br>Game Maker (Grok Bot)</p>' +
        '<p><b>Grafiki kart, paczek, sklepu i postaci, animacja odsłony</b><br>Artist (Grok Bot)</p><p><b>Muzyka i dźwięki</b><br>syntezator WebAudio, 100% kodu</p><p><b>Podziękowania</b><br>Sklepik „U Zdzisia”, Turbo Distribution Inc., wujek Bob</p>' +
        '<p class="small">Wszystkie postacie i karty są fikcyjne. Podobieństwo do prawdziwych osób przypadkowe.</p></div><div class="mn-list">' + item('back', '◄ WRÓĆ') + '</div>';
    } else if (screen === 'pause') {
      var car = window.PZShopUI && PZShopUI.active;
      h = '<div class="mn-title">PAUZA</div><div class="mn-sub">' + (car ? 'Kariera zapisuje się automatycznie.' : 'Gra swobodna – postęp zapisany.') + '</div><div class="mn-list">' +
        item('resume', 'WRÓĆ DO GRY') + item('settings', 'USTAWIENIA') + item('home', 'MENU GŁÓWNE') + '</div>';
    }
    root.className = 'ui-layer ' + (ctx === 'pause' ? 'pausebg' : 'titlebg') + ' scr-' + screen;
    root.innerHTML = (ctx === 'pause' ? '' : bg()) + '<div class="mn-box">' + h + '</div>';
    root.querySelectorAll('canvas.sl-cv').forEach(function (c) { PZHero.portrait(c, JSON.parse(c.dataset.look), { scale: 2.4 }); });
    var items = list(); if (sel >= items.length) sel = items.length - 1; if (sel < 0) sel = 0;
    focus();
    var vol = $('mn-vol'); if (vol) vol.addEventListener('input', function () { PZSettings.set('music', vol.value / 100); if (set.music > 0) S.music.start(); vol.previousSibling.textContent = 'MUZYKA: ' + vol.value + '%'; });
  }
  function list() { return Array.prototype.slice.call(root.querySelectorAll('.mi:not(.dis)')); }
  function focus() { var it = list(); it.forEach(function (b, i) { b.classList.toggle('sel', i === sel); }); }
  function go(scr) { screen = scr; sel = 0; armed = null; S.page(); render(); }
  function show(scr) { root.classList.remove('hidden'); btn.classList.add('hidden'); ctx = scr === 'pause' ? 'pause' : 'title'; go(scr || 'main'); }
  function hide() { root.classList.add('hidden'); btn.classList.remove('hidden'); }
  function act(a) {
    S.unlock(); S.click(); if (set.music > 0 && set.sound) S.music.start();
    var m = a.split(':'), n = +m[1];
    switch (m[0]) {
      case 'cont': var ls = lastSlot(); if (ls) { hide(); PZShopUI.load(ls.slot); } break;
      case 'career': go('career'); break;
      case 'free': hide(); PZShopUI.exit(); App.useMode(App.FREE_E, {}); break;
      case 'album': hide(); PZShopUI.exit(); App.useMode(App.FREE_E, {}); App.openAlbum(); break;
      case 'settings': go('settings'); break;
      case 'credits': go('credits'); break;
      case 'back': go(ctx === 'pause' ? 'pause' : screen === 'career' || screen === 'settings' || screen === 'credits' ? 'main' : 'main'); break;
      case 'load': hide(); PZShopUI.load(n); break;
      case 'new': if (!slots()[n - 1].empty && armed !== a) { armed = a; render(); return; } hide(); PZShopUI.creator(n); break;
      case 'del': if (armed !== a) { armed = a; render(); return; } PZShop.createShop(Object.assign(careerDeps(), { slot: n })).remove(); S.error(); armed = null; render(); break;
      case 'snd': PZSettings.set('sound', !set.sound); if (set.sound) { S.unlock(); S.music.start(); } render(); break;
      case 'spd': var i = SPEEDS.findIndex(function (x) { return x.v === set.speed; }); PZSettings.set('speed', SPEEDS[(i + 1) % SPEEDS.length].v); render(); break;
      case 'reset': if (armed !== 'reset') { armed = 'reset'; render(); return; }
        try { Object.keys(localStorage).filter(function (k) { return k.indexOf('paczki.') === 0; }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) { }
        location.reload(); break;
      case 'resume': hide(); break;
      case 'home': PZShopUI.exit(); App.useMode(App.FREE_E, {}); show('main'); break;
    }
  }
  root.addEventListener('click', function (e) { var b = e.target.closest('.mi[data-act]'); if (b && !b.disabled && b.dataset.act !== 'vol') act(b.dataset.act); });
  root.addEventListener('mousemove', function (e) { var b = e.target.closest('.mi'); if (!b) return; var i = list().indexOf(b); if (i >= 0 && i !== sel) { sel = i; focus(); } });
  addEventListener('keydown', function (e) {
    if (root.classList.contains('hidden')) return;
    var it = list();
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight' && screen === 'career') { sel = (sel + 1) % it.length; S.click(); focus(); e.preventDefault(); }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' && screen === 'career') { sel = (sel - 1 + it.length) % it.length; S.click(); focus(); e.preventDefault(); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); var b = it[sel]; if (b) { if (b.dataset.act === 'vol') return; act(b.dataset.act); } }
    else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && it[sel] && it[sel].dataset.act === 'vol') { }
    else if (e.key === 'Escape') { e.preventDefault(); if (ctx === 'pause' && screen === 'pause') hide(); else if (screen !== 'main' && screen !== 'pause') act('back'); }
  });
  function pause() { if (!root.classList.contains('hidden')) return; setTimeout(function () { show('pause'); }, 0); }
  window.PZMenu = { show: show, hide: hide, pause: pause, get open() { return !root.classList.contains('hidden'); }, act: act };
  apply();
  // start: ekran tytułowy (pomijany w trybie demo / ?free – dla testów i linków bezpośrednich)
  var q = new URLSearchParams(location.search);
  if (q.has('demo') || q.has('free')) hide(); else show('main');
})();
