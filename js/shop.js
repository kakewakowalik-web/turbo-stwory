/* Kariera: własny sklep z kartami w amerykańskim mallu (lata 80./90.) – czysta logika, bez DOM (Node + przeglądarka).
 * Siatka izometryczna, meble (stawianie/przesuwanie/sprzedaż/ulepszenia), magazyn paczek z hurtowni, wystawianie i ceny,
 * klienci (agenci z trasą BFS), dzień otwarcia z raportem, czynsz co tydzień, reputacja i odblokowania.
 * Zapis: 'paczki.shop.<slot>' (stan) + 'paczki.shop.<slot>.eco' (portfel = $ i kolekcja singli).
 */
(function (root) {
  'use strict';
  var VERSION = 1, SLOTS = 3, DAY_MIN = 600, OPEN_H = 10;
  var SIZES = [{ w: 9, h: 7, cost: 0, lvl: 1 }, { w: 11, h: 8, cost: 1500, lvl: 3 }, { w: 13, h: 9, cost: 4000, lvl: 5 }];
  var LEVELS = [{ xp: 0, name: 'Nowy na rynku' }, { xp: 300, name: 'Lokalny sklepik' }, { xp: 900, name: 'Ulubiony sklep dzielnicy' }, { xp: 2200, name: 'Mekka kolekcjonerów' }, { xp: 4500, name: 'Legenda mallu' }, { xp: 8000, name: 'Imperium Turbo' }];
  var UNLOCK_DAY = { stwory: 1, pilka: 6, kosz: 13, fantasy: 21 };
  var WHOLESALE = 0.65, BOX = 24, BOX_RATE = 0.55, BULK_SELL = 0.4;
  // meble: kit = sprite z zestawu Artist (SHOP_KIT), draw = rysowane w kodzie (props z USA)
  var TYPES = {
    counter: { name: 'Lada z kasą', kit: 'us_register_counter', fp: [2, 1], rot: true, cost: 150, role: 'checkout', max: 1, desc: 'Bez kasy nikt nie zapłaci. Ulepszenie = szybsza obsługa.' },
    rack: { name: 'Stojak na paczki', kit: 'pack_rack', fp: [1, 1], cost: 120, kind: 'pack', cap: 12, attract: 0.02, desc: '12 paczek kart. Klienci biorą stąd zafoliowane paczki.' },
    shelf: { name: 'Regał ścienny', kit: 'us_shelf_wall_stocked', fp: [2, 1], rot: true, cost: 220, kind: 'pack', cap: 15, attract: 0.03, wall: true, desc: '15 paczek. Tylko przy ścianie (obrót = druga ściana).' },
    showcase: { name: 'Gablota na single', kit: 'showcase_full', kitEmpty: 'showcase_empty', fp: [2, 1], rot: true, cost: 260, kind: 'card', cap: 6, attract: 0.03, boost: 0.2, desc: '6 kart pod szkłem. Kolekcjonerzy w promieniu 3 pól kupują chętniej (+20%).' },
    spinner: { name: 'Obrotowy stojak z komiksami', kit: 'us_comic_spinner_stocked', kitEmpty: 'us_comic_spinner_empty', fp: [1, 1], cost: 140, kind: 'comic', cap: 12, attract: 0.03, desc: '12 komiksów. Komiksy z hurtowni: tani, pewny zarobek.' },
    bin: { name: 'Kosz okazji', kit: 'us_bargain_bin', fp: [1, 1], cost: 60, kind: 'bulk', cap: 50, attract: 0.01, desc: 'Do 50 pospolitych kart po jednej cenie. Dzieciaki to kochają.' },
    poster: { name: 'Stojak z plakatem', kit: 'us_poster_stand', fp: [1, 1], cost: 80, attract: 0.05, desc: 'Dekoracja: +5% atrakcyjności.' },
    plant: { name: 'Kwiatek w donicy', kit: 'plant', fp: [1, 1], cost: 30, attract: 0.02, desc: 'Dekoracja: +2% atrakcyjności.' },
    queue: { name: 'Barierka do kolejki', kit: 'us_queue_barrier', fp: [2, 1], rot: true, cost: 70, attract: 0.02, desc: 'Porządek przy kasie: +2% atrakcyjności.' },
    gumball: { name: 'Automat z gumami', kit: 'us_gumball_machine', fp: [1, 1], cost: 90, attract: 0.03, coins: 0.35, coin: 0.25, desc: 'Ćwierćdolarówki od dzieciaków, +3% atrakcyjności.' },
    soda: { name: 'Automat z napojami', kit: 'us_soda_machine', fp: [1, 1], cost: 180, attract: 0.05, lvl: 2, coins: 0.3, coin: 1, desc: '+5% atrakcyjności i dolar za puszkę.' },
    arcade: { name: 'Automat arcade', kit: 'us_arcade_cabinet', fp: [1, 1], cost: 300, attract: 0.10, lvl: 3, coins: 0.5, coin: 0.25, multi: 4, desc: '+10% atrakcyjności, ćwierćdolarówki od dzieciaków.' }
  };
  var CAT_ORDER = ['counter', 'rack', 'shelf', 'showcase', 'spinner', 'bin', 'poster', 'plant', 'queue', 'gumball', 'soda', 'arcade'];
  var COMIC = { name: 'Komiks', msrp: 2.5, cost: 1.2, bundle: 10 };
  var NAMES = ['Tommy', 'Jessica', 'Brian', 'Ashley', 'Kyle', 'Amber', 'Josh', 'Heather', 'Ryan', 'Nicole', 'Derek', 'Crystal', 'Travis', 'Megan', 'Cody', 'Stacy', 'Mr. Jenkins', 'Big Al', 'Doug', 'Coach Ray'];

  function r2(v) { return Math.round(v * 100) / 100; }
  function nicePrice(v) { if (v < 1) return Math.max(0.05, Math.round(v * 20) / 20); if (v < 20) return Math.max(0.99, Math.round(v) - 0.01); return Math.round(v); }
  function fresh(slot, hero) {
    return { v: VERSION, slot: slot, hero: hero, day: 1, phase: 'prep', time: 0, size: 0, xp: 0, uid: 1, loan: 0, loanUsed: -99,
      furn: [], inv: { stwory: 12 }, markup: { pack: 1.0, card: 1.0, bulk: 0.25, comic: 1.0 }, stats: { revenue: 0, sales: 0, customers: 0, bestSale: null, requests: 0, opened: 0, wholesale: 0, furniture: 0, rent: 0, bills: 0 },
      today: null, reports: [], seenSets: ['stwory'], events: [] };
  }
  function key(slot) { return 'paczki.shop.' + slot; }

  function createShop(deps) {
    var D = deps.D, CAT = deps.CAT, Hero = deps.Hero, Econ = deps.Economy, storage = deps.storage, slot = deps.slot || 1, rng = deps.rng || Math.random;
    var st = null, E = null, cust = [], cid = 0, spawnAcc = 0;
    var self = {};
    function trait() { return Hero.trait(st && st.hero.trait); }
    function makeEco() { var t = trait(); return Econ.createEconomy(D, storage, key(slot) + '.eco', CAT, { startWallet: 300, sellRate: BULK_SELL, luck: t.luck }); }
    function save() { try { storage && storage.setItem(key(slot), JSON.stringify(st)); } catch (e) { } }
    function load() { try { var raw = storage && storage.getItem(key(slot)); var o = raw && JSON.parse(raw); st = o && o.v === VERSION ? o : null; } catch (e) { st = null; } if (!st) return false; E = makeEco(); E.load(); if (st.phase === 'open') { st.phase = 'prep'; st.time = 0; } cust = []; return true; }
    function start(hero) {
      st = fresh(slot, { name: String(hero.name || 'Mike').slice(0, 16), age: Math.max(18, Math.min(45, hero.age | 0 || 24)), look: Hero.sanitize(hero.look, 1), trait: Hero.trait(hero.trait).id, shopName: String(hero.shopName || 'Turbo Cards & Comics').slice(0, 26) });
      E = makeEco(); E.reset(); E.save();
      // wyposażenie startowe
      // układ startowy jak preview_us.png Artist
      add('shelf', 1, 0); add('shelf', 0, 3, 1); add('gumball', 8, 3); add('spinner', 2, 2); add('showcase', 3, 4); add('counter', 6, 4, 1);
      add('bin', 4, 2); add('queue', 4, 6); add('plant', 0, 1); add('poster', 1, 5); add('rack', 7, 2);
      st.inv.comic = 12; st.furn.forEach(function (f) { if (TYPES[f.type].kind === 'pack') stockPacks(f.uid, 'stwory', 6); if (f.type === 'spinner') stockComics(f.uid); });
      save(); return self;
    }
    function add(type, tx, ty, rot) { var f = { uid: st.uid++, type: type, tx: tx, ty: ty, rot: rot ? 1 : 0, lvl: 1, items: [], bulk: [], bulkPrice: st.markup.bulk }; st.furn.push(f); return f; }
    /* ---------- poziomy, odblokowania ---------- */
    function levelIdx() { var i = 0; while (i + 1 < LEVELS.length && st.xp >= LEVELS[i + 1].xp) i++; return i; }
    function level() { return levelIdx() + 1; }
    function addXp(n) { var b = levelIdx(); st.xp += Math.max(0, Math.round(n)); var a = levelIdx(); if (a > b) push('level', 'AWANS SKLEPU: ' + LEVELS[a].name + '! Nowe meble i ciuchy odblokowane.'); }
    function push(t, txt) { st.events.push({ type: t, text: txt }); }
    function drain() { var e = st.events; st.events = []; return e; }
    function setUnlocked(id) { return st.day >= UNLOCK_DAY[id]; }
    function unlockedSets() { return CAT.list.filter(function (s) { return setUnlocked(s.id); }).map(function (s) { return s.id; }); }
    function grid() { return SIZES[st.size]; }
    function doorY() { return grid().h - 2; }
    /* ---------- siatka i kolizje ---------- */
    function fpOf(type, rot) { var p = TYPES[type].fp; return rot ? [p[1], p[0]] : p; }
    function fp(f) { return fpOf(f.type, f.rot); }
    function ownerTile(f) { return f.rot ? [f.tx - 1, f.ty] : [f.tx, f.ty - 1]; }
    function payTiles(f) { return f.rot ? [[f.tx + 1, f.ty], [f.tx + 1, f.ty + 1]] : [[f.tx, f.ty + 1], [f.tx + 1, f.ty + 1]]; }
    function occ(ignore) { var g = grid(), m = []; for (var y = 0; y < g.h; y++) { m.push([]); for (var x = 0; x < g.w; x++) m[y].push(0); } st.furn.forEach(function (f) { if (f.uid === ignore) return; var p = fp(f); for (var a = 0; a < p[0]; a++) for (var b = 0; b < p[1]; b++) if (m[f.ty + b]) m[f.ty + b][f.tx + a] = f.uid; if (f.type === 'counter') { var o = ownerTile(f); if (m[o[1]] && o[0] >= 0) m[o[1]][o[0]] = -2; } }); return m; }
    function inside(x, y) { var g = grid(); return x >= 0 && y >= 0 && x < g.w && y < g.h; }
    function reserved(x, y) { return y === doorY() && x === 0; }        // pole wejścia
    function bfs(m, sx, sy) { var g = grid(), dist = {}, q = [[sx, sy]], k = function (x, y) { return x + ',' + y; }; dist[k(sx, sy)] = null; var prev = {}; prev[k(sx, sy)] = null;
      while (q.length) { var c = q.shift(); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var nx = c[0] + d[0], ny = c[1] + d[1], kk = k(nx, ny); if (!inside(nx, ny) || m[ny][nx] || kk in prev) return; prev[kk] = c; q.push([nx, ny]); }); }
      return prev; }
    function access(f, m) {   // wolne pola przy meblu (przód/boki), z których klient sięga po towar
      if (f.type === 'counter') return payTiles(f).filter(function (c) { return inside(c[0], c[1]) && !m[c[1]][c[0]]; });
      var p = fp(f), out = [];
      for (var a = -1; a <= p[0]; a++) for (var b = -1; b <= p[1]; b++) { if ((a === -1 || a === p[0]) && (b === -1 || b === p[1])) continue; if (a >= 0 && a < p[0] && b >= 0 && b < p[1]) continue; var x = f.tx + a, y = f.ty + b; if (inside(x, y) && !m[y][x]) out.push([x, y]); }
      return out;
    }
    function canPlace(type, tx, ty, ignoreUid, rot) {
      var T = TYPES[type], p = fpOf(type, rot), m = occ(ignoreUid);
      for (var a = 0; a < p[0]; a++) for (var b = 0; b < p[1]; b++) { var x = tx + a, y = ty + b; if (!inside(x, y)) return 'Poza sklepem'; if (m[y][x]) return 'Zajęte'; if (reserved(x, y)) return 'Przejście przy drzwiach'; }
      if (T.role === 'checkout') { var ot = rot ? [tx - 1, ty] : [tx, ty - 1]; if (!inside(ot[0], ot[1]) || m[ot[1]][ot[0]]) return 'Za ladą musi być miejsce dla ciebie'; }
      if (T.wall && (rot ? tx !== 0 : ty !== 0)) return rot ? 'Ten regał tylko przy lewej ścianie' : 'Ten regał tylko przy tylnej ścianie (obróć, by postawić przy lewej)';
      // po postawieniu wszystko musi być osiągalne od drzwi
      for (a = 0; a < p[0]; a++) for (b = 0; b < p[1]; b++) m[ty + b][tx + a] = -1;
      if (T.role === 'checkout') m[ot[1]][ot[0]] = -2;
      var reach = bfs(m, 0, doorY()), tmp = { tx: tx, ty: ty, type: type, rot: rot ? 1 : 0 };
      var all = st.furn.filter(function (f) { return f.uid !== ignoreUid; }).concat([tmp]);
      for (var i = 0; i < all.length; i++) { var acc = access(all[i], m); if (!acc.some(function (c) { return (c[0] + ',' + c[1]) in reach; })) return 'Zablokujesz dojście'; }
      return null;
    }
    function furnCost(type) { return r2(TYPES[type].cost * (1 - (trait().furnDiscount || 0))); }
    function upgradeCost(f) { return f.lvl >= 3 ? null : r2(TYPES[f.type].cost * 0.75 * f.lvl * (1 - (trait().furnDiscount || 0)) + 50); }
    function catalog() { return CAT_ORDER.map(function (t) { var T = TYPES[t], n = st.furn.filter(function (f) { return f.type === t; }).length; return { type: t, name: T.name, desc: T.desc, cost: furnCost(t), lvl: T.lvl || 1, locked: (T.lvl || 1) > level(), maxed: T.max && n >= T.max, owned: n }; }); }
    function need(c, m) { if (!c) throw new Error(m); }
    function buyFurniture(type, tx, ty, rot) {
      var T = TYPES[type], c = catalog().filter(function (x) { return x.type === type; })[0];
      need(st.phase !== 'open', 'Meble przestawiasz przy zamkniętym sklepie'); need(!c.locked, 'Wymaga poziomu ' + c.lvl); need(!c.maxed, 'Masz już ' + T.name);
      var why = canPlace(type, tx, ty, null, rot); need(!why, why); need(E.pay(c.cost), 'Za mało kasy');
      st.stats.furniture = r2(st.stats.furniture + c.cost); spend(c.cost); var f = add(type, tx, ty, rot); f.paid = c.cost; save(); return f;
    }
    function moveFurniture(uid, tx, ty, rot) { var f = get(uid); need(st.phase !== 'open', 'Sklep otwarty'); if (rot == null) rot = f.rot; var why = canPlace(f.type, tx, ty, uid, rot); need(!why, why); f.tx = tx; f.ty = ty; f.rot = rot ? 1 : 0; save(); }
    function rotateFurniture(uid) {   // obrót 2x1: A <-> B; próbuje w miejscu, potem szuka najbliższego wolnego pola
      var f = get(uid); need(TYPES[f.type].rot, 'Ten mebel ma jedną orientację'); var r = f.rot ? 0 : 1, g = grid(), best = null;
      for (var d = 0; d < 6 && !best; d++) for (var y = Math.max(0, f.ty - d); y <= f.ty + d && !best; y++) for (var x = Math.max(0, f.tx - d); x <= f.tx + d && !best; x++) if (!canPlace(f.type, x, y, uid, r)) best = [x, y];
      need(best, 'Nie ma miejsca na obrót'); moveFurniture(uid, best[0], best[1], r); return best;
    }
    function sellFurniture(uid) {
      var f = get(uid); need(st.phase !== 'open', 'Sklep otwarty'); need(f.type !== 'counter', 'Kasy nie sprzedasz – musi być w sklepie');
      unstockAll(f); var back = r2((f.paid != null ? f.paid : TYPES[f.type].cost) * 0.5 + (f.upPaid || 0) * 0.5);
      E.deposit(back); st.furn = st.furn.filter(function (x) { return x.uid !== uid; }); save(); return back;
    }
    function upgradeFurniture(uid) { var f = get(uid), c = upgradeCost(f); need(c != null, 'Maksymalny poziom'); need(E.pay(c), 'Za mało kasy'); f.lvl++; f.upPaid = (f.upPaid || 0) + c; st.stats.furniture = r2(st.stats.furniture + c); spend(c); save(); return f.lvl; }
    function expandCost() { var n = SIZES[st.size + 1]; return n ? { cost: n.cost, lvl: n.lvl, w: n.w, h: n.h, ok: level() >= n.lvl && E.state.wallet >= n.cost } : null; }
    function expand() { var n = expandCost(); need(n && n.ok, 'Jeszcze nie możesz powiększyć sklepu'); need(st.phase !== 'open', 'Sklep otwarty'); E.pay(n.cost); spend(n.cost); st.size++; save(); }
    function get(uid) { var f = st.furn.filter(function (x) { return x.uid === uid; })[0]; need(f, 'Brak mebla'); return f; }
    function cap(f) { var T = TYPES[f.type]; return T.cap ? Math.round(T.cap * [1, 1.5, 2][f.lvl - 1]) : 0; }
    function spend(v) { if (st.today) st.today.spent = r2(st.today.spent + v); }
    /* ---------- hurtownia i magazyn ---------- */
    function wholesale(setId, box) { var p = CAT.get(setId).price; return box ? r2(p * BOX * BOX_RATE) : r2(p * WHOLESALE); }
    function buyStock(setId, box) {
      need(setUnlocked(setId), 'Hurtownia jeszcze nie ma tego zestawu'); var c = wholesale(setId, box); need(E.pay(c), 'Za mało kasy');
      st.inv[setId] = (st.inv[setId] || 0) + (box ? BOX : 1); st.stats.wholesale = r2(st.stats.wholesale + c); spend(c); save(); return c;
    }
    function buyComics() { var c = r2(COMIC.cost * COMIC.bundle); need(E.pay(c), 'Za mało kasy'); st.inv.comic = (st.inv.comic || 0) + COMIC.bundle; st.stats.wholesale = r2(st.stats.wholesale + c); spend(c); save(); return c; }
    function stockComics(uid) { var f = get(uid); need(TYPES[f.type].kind === 'comic', 'Komiksy idą na obrotowy stojak'); var n = 0; while ((st.inv.comic || 0) > 0 && f.items.length < cap(f)) { f.items.push({ k: 'comic', price: nicePrice(COMIC.msrp * (st.markup.comic || 1)) }); st.inv.comic--; n++; } save(); return n; }
    function invTotal() { var t = 0; for (var k in st.inv) if (k !== 'comic') t += st.inv[k]; return t; }
    function msrp(setId) { return CAT.get(setId).price; }
    function stockPacks(uid, setId, n) {
      var f = get(uid), T = TYPES[f.type]; need(T.kind === 'pack', 'Tu nie wystawisz paczek');
      var put = 0; while (put < (n || 999) && (st.inv[setId] || 0) > 0 && f.items.length < cap(f)) { f.items.push({ k: 'pack', set: setId, price: nicePrice(msrp(setId) * st.markup.pack) }); st.inv[setId]--; put++; }
      save(); return put;
    }
    function stockCard(uid, id, price) {
      var f = get(uid); need(TYPES[f.type].kind === 'card', 'Karty wystawiasz w gablocie'); need(f.items.length < cap(f), 'Gablota pełna'); need(E.removeCard(id), 'Nie masz tej karty');
      f.items.push({ k: 'card', id: id, price: price != null ? price : nicePrice(D.BY_ID[id].price * st.markup.card) }); save();
    }
    function fillBin(uid) {   // duplikaty pospolitych i niepospolitych (zostaje 1 sztuka do kolekcji)
      var f = get(uid); need(TYPES[f.type].kind === 'bulk', 'To nie kosz okazji'); var n = 0;
      Object.keys(E.state.collection).forEach(function (id) { var c = D.BY_ID[id]; if (c.tier !== 'C' && c.tier !== 'U') return; while (E.state.collection[id] > 1 && f.bulk.length < cap(f)) { E.removeCard(id); f.bulk.push(id); n++; } });
      save(); return n;
    }
    function unstock(uid, i) { var f = get(uid), it = f.items[i]; if (!it) return; f.items.splice(i, 1); if (it.k === 'pack') st.inv[it.set] = (st.inv[it.set] || 0) + 1; else if (it.k === 'comic') st.inv.comic = (st.inv.comic || 0) + 1; else E.addCard(it.id); save(); }
    function unstockAll(f) { while (f.items.length) unstock(f.uid, 0); f.bulk.forEach(function (id) { E.addCard(id); }); f.bulk = []; }
    function setPrice(uid, i, price) { var f = get(uid); if (i === 'bulk') f.bulkPrice = Math.max(0.05, r2(price)); else if (f.items[i]) f.items[i].price = Math.max(0.05, r2(price)); save(); }
    function value(it) { return it.k === 'pack' ? msrp(it.set) : it.k === 'comic' ? COMIC.msrp : D.BY_ID[it.id].price; }
    function reprice(kind, mul) {   // „przeceń wszystko” – ten sam narzut dla wszystkich wystawionych rzeczy danego typu
      st.markup[kind] = mul; st.furn.forEach(function (f) { if (kind === 'bulk' && TYPES[f.type].kind === 'bulk') f.bulkPrice = mul; f.items.forEach(function (it) { if (it.k === kind) it.price = nicePrice(value(it) * mul); }); }); save();
    }
    function autoStock() {   // wygodny przycisk: paczki na stojaki, najlepsze single do gablot, duplikaty do kosza
      var n = 0;
      st.furn.forEach(function (f) { var T = TYPES[f.type];
        if (T.kind === 'pack') unlockedSets().slice().sort(function (a, b) { return (st.inv[b] || 0) - (st.inv[a] || 0); }).forEach(function (s) { n += stockPacks(f.uid, s, Math.ceil(cap(f) / 2)); });
        if (T.kind === 'pack') unlockedSets().forEach(function (s) { n += stockPacks(f.uid, s); });
        if (T.kind === 'bulk') n += fillBin(f.uid);
        if (T.kind === 'comic') n += stockComics(f.uid);
      });
      var cards = Object.keys(E.state.collection).filter(function (id) { return D.TIERS[D.BY_ID[id].tier].rank >= 2; }).sort(function (a, b) { return D.BY_ID[b].price - D.BY_ID[a].price; });
      st.furn.forEach(function (f) { if (TYPES[f.type].kind !== 'card') return; while (f.items.length < cap(f) && cards.length) { var id = cards.shift(); if (E.state.collection[id] > 0) { stockCard(f.uid, id); n++; } } });
      save(); return n;
    }
    /* ---------- otwieranie paczek z magazynu (scena stołu w app.js) ---------- */
    function takePackToOpen(setId) { need((st.inv[setId] || 0) > 0, 'Brak paczek w magazynie'); need(st.phase !== 'open', 'Otwierasz po zamknięciu albo przed otwarciem'); st.inv[setId]--; st.stats.opened++; save(); return wholesale(setId); }
    /* ---------- atrakcyjność ---------- */
    function attract() {
      var a = 0.1 * levelIdx(); st.furn.forEach(function (f) { var T = TYPES[f.type]; a += (T.attract || 0) * (1 + 0.5 * (f.lvl - 1)); if (T.kind && (f.items.length || f.bulk.length)) a += 0.01; });
      return Math.round(a * 100) / 100;
    }
    /* ---------- dzień ---------- */
    function openShop() {
      need(st.phase === 'prep', 'Sklep już otwarty'); st.phase = 'open'; st.time = 0; cust = []; spawnAcc = 0;
      st.today = st.today && st.today.day === st.day ? st.today : newToday(); save();
    }
    function newToday() { return { day: st.day, customers: 0, buyers: 0, sales: 0, revenue: 0, spent: 0, best: null, expensive: 0, missed: [], requests: 0, coins: 0, xp0: st.xp, noStock: 0, items: {} }; }
    function ensureToday() { if (!st.today || st.today.day !== st.day) st.today = newToday(); }
    function weekend() { var d = st.day % 7; return d === 6 || d === 0; }
    function spawnRate() { return 0.024 * (1 + attract()) * (weekend() ? 1.35 : 1); }
    function spawn() {
      var r = rng(), kind = r < 0.45 ? 'kid' : r < 0.75 ? 'casual' : 'collector';
      var t = trait(), budget = kind === 'kid' ? 8 + rng() * 30 : kind === 'casual' ? 20 + rng() * 50 : 40 + Math.pow(rng(), 2) * 600;
      var c = { id: ++cid, kind: kind, name: NAMES[(rng() * NAMES.length) | 0], x: 0.5, y: doorY() + 0.5, path: [], st: 'enter', wait: 0, cart: [], budget: r2(budget), stops: 0, hue: (rng() * 360) | 0, face: 'se', bubble: null, bubbleT: 0, want: null, request: null, tried: false };
      if (kind === 'kid') c.want = r2(rng()) < 0.5 ? 'pack' : rng() < 0.6 ? 'bulk' : 'comic'; else if (kind === 'casual') c.want = rng() < 0.55 ? 'pack' : rng() < 0.6 ? 'comic' : 'card'; else c.want = 'card';
      if (kind === 'collector' && rng() < 0.22 * (t.reqRate || 1)) {
        var pool = []; unlockedSets().forEach(function (s) { pool = pool.concat(CAT.get(s).cards.filter(function (x) { var k = D.TIERS[x.tier].rank; return k >= 2 && k <= 4; })); });
        c.request = pool[(rng() * pool.length) | 0].id; say(c, 'Szukam: ' + D.BY_ID[c.request].name);
      }
      cust.push(c); st.today.customers++; st.stats.customers++; c.sheet = 'abc'[(rng() * 3) | 0];
      var coin = st.furn.filter(function (f) { return TYPES[f.type].coins; });
      coin.forEach(function (f) { var T = TYPES[f.type]; if (rng() < T.coins * (kind === 'kid' ? 1.4 : 0.7)) { var v = T.coin * (T.multi ? 1 + ((rng() * T.multi) | 0) : 1); E.deposit(v); st.today.coins = r2(st.today.coins + v); } });
      planNext(c);
    }
    function say(c, t) { c.bubble = t; c.bubbleT = 40; }
    function pathTo(c, targets) {
      var m = occ(), sx = Math.floor(c.x), sy = Math.floor(c.y), prev = bfs(m, sx, sy), best = null;
      targets.forEach(function (t) { if ((t[0] + ',' + t[1]) in prev && (!best || rng() < 0.4)) best = t; });
      if (!best) return false;
      var p = [], cur = best; while (cur) { p.unshift(cur); cur = prev[cur[0] + ',' + cur[1]]; } p.shift(); c.path = p; return true;
    }
    function displays(want) {
      return st.furn.filter(function (f) { var k = TYPES[f.type].kind; if (want === 'bulk') return k === 'bulk' && f.bulk.length; if (want === 'pack') return k === 'pack' && f.items.length; if (want === 'comic') return k === 'comic' && f.items.length; return k === 'card' && f.items.length; });
    }
    function planNext(c) {
      var m = occ();
      if (c.stops < 2 && !(c.stops && c.cart.length && rng() < 0.6)) {
        var ds = displays(c.want); if (!ds.length && c.stops === 0) { ds = displays(c.want === 'pack' ? 'card' : 'pack'); }
        if (ds.length) { var f = ds[(rng() * ds.length) | 0]; c.target = f.uid; if (pathTo(c, access(f, m))) { c.st = 'walk'; c.next = 'browse'; return; } }
        if (!c.stops) { st.today.noStock++; say(c, c.want === 'pack' ? 'Nie macie paczek?!' : 'Pusto tu...'); }
      }
      var counter = st.furn.filter(function (f) { return f.type === 'counter'; })[0];
      if ((c.cart.length || c.request) && counter && pathTo(c, access(counter, m))) { c.st = 'walk'; c.next = 'pay'; return; }
      leave(c);
    }
    function leave(c) { pathTo(c, [[0, doorY()]]); c.st = 'walk'; c.next = 'gone'; }
    function accept(ratio) { if (ratio <= 0.7) return 1; if (ratio >= 1.5) return 0; return Math.pow((1.5 - ratio) / 0.8, 1.3); }
    function boostAt(c) { var b = 0; st.furn.forEach(function (f) { var T = TYPES[f.type]; if (T.boost && Math.abs(f.tx + 1 - c.x) + Math.abs(f.ty + 0.5 - c.y) <= 3) b = Math.max(b, T.boost + 0.1 * (f.lvl - 1)); }); return b; }
    function browse(c) {
      var f = st.furn.filter(function (x) { return x.uid === c.target; })[0]; c.stops++;
      if (!f) return;
      var tol = 1 + (trait().priceTol || 0), boost = 1 + (c.kind === 'collector' ? boostAt(c) : 0), took = 0, pricey = false;
      if (TYPES[f.type].kind === 'bulk') {
        var want = 1 + ((rng() * (c.kind === 'kid' ? 6 : 3)) | 0), a = accept(f.bulkPrice / (0.3 * tol));
        for (var i = 0; i < want && f.bulk.length; i++) { if (c.budget < f.bulkPrice) break; if (rng() < a) { var id = f.bulk.splice((rng() * f.bulk.length) | 0, 1)[0]; c.cart.push({ k: 'bulk', id: id, price: f.bulkPrice, value: D.BY_ID[id].price }); c.budget = r2(c.budget - f.bulkPrice); took++; } else pricey = true; }
      } else {
        var idx = f.items.map(function (_, i) { return i; }); idx.sort(function () { return rng() - 0.5; });
        var maxTake = c.kind === 'collector' ? 2 : 1 + ((rng() * 3) | 0);
        for (var j = 0; j < idx.length && took < maxTake; j++) {
          var it = f.items[idx[j]]; if (!it || it.price > c.budget) continue;
          var v = value(it), interest = it.k === 'comic' ? 0.8 : it.k === 'pack' ? (c.kind === 'collector' ? 0.5 : 1) : (c.kind === 'collector' ? 1 : D.BY_ID[it.id].price <= 5 ? 0.8 : 0.35);
          var p = Math.min(1, accept(it.price / (v * tol)) * boost) * interest;
          if (rng() < p) { c.cart.push({ k: it.k, set: it.set, id: it.id, price: it.price, value: v }); c.budget = r2(c.budget - it.price); f.items[idx[j]] = null; took++; }
          else if (it.price > v * tol * 1.1) pricey = true;
        }
        f.items = f.items.filter(Boolean);
      }
      if (!took && pricey) { st.today.expensive++; say(c, rng() < 0.5 ? 'Za drogo!' : 'Zdzierstwo...'); }
      else if (took) say(c, took > 1 ? 'Biorę ' + took + '!' : 'O, to biorę!');
    }
    function pay(c) {
      var counter = st.furn.filter(function (f) { return f.type === 'counter'; })[0];
      var sum = 0, t = trait();
      if (c.request) {
        var have = E.state.collection[c.request] > 0;
        if (have) { var price = r2(D.BY_ID[c.request].price * (1 + (t.reqBonus || 0.25))); E.removeCard(c.request); c.cart.push({ k: 'card', id: c.request, price: price, value: D.BY_ID[c.request].price, req: true }); st.today.requests++; st.stats.requests++; addXp(15); say(c, 'Masz ją! Biorę!'); }
        else if (!c.cart.some(function (x) { return x.id === c.request; })) { st.today.missed.push(c.request); say(c, 'Szkoda, nie ma...'); }
      }
      c.cart.forEach(function (x) { sum += x.price; var nm = x.k === 'pack' ? CAT.get(x.set).name + ' (paczka)' : x.k === 'comic' ? 'Komiks' : D.BY_ID[x.id].name;
        if (!st.today.best || x.price > st.today.best.price) st.today.best = { name: nm, price: x.price };
        if (!st.stats.bestSale || x.price > st.stats.bestSale.price) st.stats.bestSale = { name: nm, price: x.price, day: st.day };
        var key2 = x.k === 'pack' ? 'pack:' + x.set : x.k; st.today.items[key2] = (st.today.items[key2] || 0) + 1; });
      sum = r2(sum);
      if (sum > 0) { E.deposit(sum); st.today.revenue = r2(st.today.revenue + sum); st.today.sales += c.cart.length; st.today.buyers++; st.stats.revenue = r2(st.stats.revenue + sum); st.stats.sales += c.cart.length; addXp(sum * 0.12 + 1); c.paid = sum; }
      c.cart = []; c.wait = Math.max(1, 4 - (counter ? counter.lvl : 1));
    }
    function step(c, dt) {
      if (c.bubbleT > 0) { c.bubbleT -= dt; if (c.bubbleT <= 0) c.bubble = null; }
      if (c.wait > 0) { c.wait -= dt; return; }
      if (c.st === 'walk') {
        var sp = 0.45 * dt;
        while (sp > 0 && c.path.length) { var t = c.path[0], tx = t[0] + 0.5, ty = t[1] + 0.5, dx = tx - c.x, dy = ty - c.y, d = Math.abs(dx) + Math.abs(dy);
          if (Math.abs(dx) > 0.01) c.face = dx > 0 ? 'se' : 'nw'; else if (Math.abs(dy) > 0.01) c.face = dy > 0 ? 'sw' : 'ne';
          if (d <= sp) { c.x = tx; c.y = ty; c.path.shift(); sp -= d; } else { c.x += Math.sign(dx) * Math.min(Math.abs(dx), sp); if (Math.abs(dx) < 0.01) c.y += Math.sign(dy) * Math.min(Math.abs(dy), sp); sp = 0; } }
        if (!c.path.length) {
          if (c.next === 'browse') { c.st = 'look'; c.wait = 3 + rng() * 5 + (st.furn.some(function (f) { return f.type === 'jukebox'; }) ? 2 : 0); }
          else if (c.next === 'pay') { c.st = 'paying'; pay(c); }
          else if (c.next === 'gone') c.st = 'gone';
        }
        return;
      }
      if (c.st === 'look') { browse(c); planNext(c); return; }
      if (c.st === 'paying') { leave(c); }
    }
    function tick(dt) {   // dt w minutach gry
      if (st.phase !== 'open') return;
      ensureToday();
      st.time = Math.min(DAY_MIN, st.time + dt);
      if (st.time < DAY_MIN - 40) { spawnAcc += dt * spawnRate(); while (spawnAcc >= 1) { spawnAcc -= 1; spawn(); } if (rng() < (dt * spawnRate()) % 1 * 0) spawn(); }
      cust.forEach(function (c) { step(c, dt); });
      cust = cust.filter(function (c) { return c.st !== 'gone'; });
      if (st.time >= DAY_MIN && !cust.length) close();
    }
    function close() {
      ensureToday(); var T = st.today, bills = 0, lines = [];
      if (st.day % 7 === 0) {   // tygodniowe opłaty
        var rent = 260 + 160 * st.size, util = 30 + 6 * st.furn.length; bills = rent + util;
        lines.push({ name: 'Czynsz w mallu', v: rent }, { name: 'Prąd i woda', v: util });
        if (st.loan) { lines.push({ name: 'Spłata pożyczki od wujka Boba', v: st.loan }); bills += st.loan; st.loan = 0; }
        E.state.wallet = r2(E.state.wallet - bills); E.save(); st.stats.rent = r2(st.stats.rent + bills);
      }
      st.phase = 'report';
      var rep = { day: st.day, customers: T.customers, buyers: T.buyers, sales: T.sales, revenue: T.revenue, spent: T.spent, bills: bills, billLines: lines, coins: T.coins,
        profit: r2(T.revenue + T.coins - T.spent - bills), best: T.best, expensive: T.expensive, missed: T.missed.slice(0, 5), requests: T.requests, xp: st.xp - T.xp0, wallet: E.state.wallet, items: T.items, noStock: T.noStock, attract: attract() };
      st.reports.push(rep); if (st.reports.length > 30) st.reports.shift();
      st.today = null; cust = []; save(); return rep;
    }
    function nextDay() {
      need(st.phase === 'report' || st.phase === 'prep', 'Najpierw zamknij sklep'); st.day++; st.phase = 'prep'; st.time = 0;
      CAT.list.forEach(function (s) { if (setUnlocked(s.id) && st.seenSets.indexOf(s.id) < 0) { st.seenSets.push(s.id); push('unlock', 'Hurtownia ma nowy zestaw: ' + s.name + '!'); } });
      save();
    }
    function skipDay() { if (st.phase === 'prep') openShop(); var g = 0; while (st.phase === 'open' && g++ < 10000) tick(1); return st.reports[st.reports.length - 1]; }
    // pożyczka – zawsze jest wyjście z dołka (spłata z najbliższym czynszem, +10%)
    function canLoan() { return !st.loan && E.state.wallet < 60; }
    function takeLoan() { need(canLoan(), 'Wujek Bob już ci pożyczył'); st.loan = 220; E.deposit(200); push('info', 'Wujek Bob pożyczył $200. Odda się z czynszem ($220).'); save(); }
    function sellBulk() { /* skup hurtowy w albumie: E.sell z sellRate 0.4 */ }
    function nextGoal() {
      var L = LEVELS[levelIdx() + 1], locked = CAT.list.filter(function (s) { return !setUnlocked(s.id); })[0], ex = expandCost();
      return { level: L ? { name: L.name, need: L.xp - st.xp } : null, set: locked ? { name: locked.name, day: UNLOCK_DAY[locked.id] } : null, expand: ex };
    }
    function summary() { return { slot: slot, name: st.hero.name, shopName: st.hero.shopName, day: st.day, level: LEVELS[levelIdx()].name, wallet: E.state.wallet, look: st.hero.look }; }
    function remove() { try { storage.removeItem(key(slot)); storage.removeItem(key(slot) + '.eco'); } catch (e) { } st = null; }
    Object.defineProperty(self, 'st', { get: function () { return st; } }); Object.defineProperty(self, 'E', { get: function () { return E; } }); Object.defineProperty(self, 'customers', { get: function () { return cust; } });
    Object.assign(self, { slot: slot, load: load, start: start, save: save, drain: drain, level: level, levelName: function () { return LEVELS[levelIdx()].name; },
      levelProgress: function () { var i = levelIdx(), a = LEVELS[i].xp, b = LEVELS[i + 1] ? LEVELS[i + 1].xp : a; return { cur: st.xp - a, need: b - a, max: !LEVELS[i + 1] }; },
      grid: grid, doorY: doorY, ownerTile: ownerTile, occ: occ, canPlace: canPlace, catalog: catalog, furnCost: furnCost, upgradeCost: upgradeCost, buyFurniture: buyFurniture, moveFurniture: moveFurniture, rotateFurniture: rotateFurniture, buyComics: buyComics, stockComics: stockComics, COMIC: COMIC, fp: fp, sellFurniture: sellFurniture, upgradeFurniture: upgradeFurniture,
      expandCost: expandCost, expand: expand, get: get, cap: cap, wholesale: wholesale, buyStock: buyStock, invTotal: invTotal, msrp: msrp, stockPacks: stockPacks, stockCard: stockCard, fillBin: fillBin, unstock: unstock, setPrice: setPrice, reprice: reprice, autoStock: autoStock, value: value,
      takePackToOpen: takePackToOpen, attract: attract, openShop: openShop, tick: tick, close: close, nextDay: nextDay, skipDay: skipDay, canLoan: canLoan, takeLoan: takeLoan, unlockedSets: unlockedSets, setUnlocked: setUnlocked,
      nextGoal: nextGoal, summary: summary, remove: remove, trait: trait, clock: function () { var m = Math.floor(st.time), h = OPEN_H + Math.floor(m / 60); return (h > 12 ? h - 12 : h) + ':' + ('0' + m % 60).slice(-2) + (h >= 12 ? ' PM' : ' AM'); },
      setLook: function (look) { st.hero.look = Hero.sanitize(look, level()); save(); }, nicePrice: nicePrice });
    return self;
  }
  function listSlots(deps) { var out = []; for (var s = 1; s <= SLOTS; s++) { var c = createShop(Object.assign({}, deps, { slot: s })); out.push(c.load() ? c.summary() : { slot: s, empty: true }); } return out; }
  var API = { COMIC: COMIC, CAT_ORDER: CAT_ORDER, createShop: createShop, listSlots: listSlots, TYPES: TYPES, LEVELS: LEVELS, SIZES: SIZES, UNLOCK_DAY: UNLOCK_DAY, DAY_MIN: DAY_MIN, WHOLESALE: WHOLESALE, BOX: BOX, BOX_RATE: BOX_RATE, SLOTS: SLOTS, key: key, VERSION: VERSION };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.PZShop = API;
})(typeof window !== 'undefined' ? window : this);
