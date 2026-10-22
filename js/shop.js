/* Kariera: własny sklep z kartami w amerykańskim mallu (1991+) – czysta logika, bez DOM (Node + przeglądarka).
 * v2: 10 lokali Artist (loc/locations.js) – od kiosku w pasażu do superstore. Siatka z lokalu (ściany, drzwi, okna,
 * zaplecze, kolumny, schody/piętro), meble, magazyn, klienci (BFS, też między piętrami), perki lokali, czynsz i kaucja,
 * przeprowadzki (meble jadą z tobą albo do magazynu), reputacja, 20 poziomów. Ceny w realnych dolarach z 1991.
 * Zapis: 'paczki.shop.<slot>' (stan) + 'paczki.shop.<slot>.eco' (portfel $ i kolekcja singli). Zapisy v1 są migrowane.
 */
(function (root) {
  'use strict';
  var LOCS = root.SHOP_LOCATIONS || (typeof require !== 'undefined' ? require('../loc/locations.js') : null);
  var LOC = LOCS.locations, LECO = LOCS.economy || {};
  var VERSION = 2, SLOTS = 3, DAY_MIN = 600, OPEN_H = 10;
  // skala cen: paczka 19 zł → $2.49 (1991). Karty: wartość z danych × K.
  var K = 0.131, START_WALLET = 260;
  var LVL_NAMES = ['Nowy na rynku', 'Wózek z kartami', 'Budka w pasażu', 'Sklepik za rogiem', 'Lokalny sklepik', 'Znany w dzielnicy', 'Ulubiony sklep dzieciaków', 'Kącik kolekcjonera',
    'Sklep z tradycją', 'Mekka kolekcjonerów', 'Gwiazda mallu', 'Sklep miesiąca', 'Król singli', 'Legenda mallu', 'Marka w mieście', 'Sieć w planach', 'Flagowiec', 'Kultowy adres', 'Imperium Turbo', 'Turbo Superstore'];
  var LEVELS = LVL_NAMES.map(function (n, i) { return { xp: Math.round(250 * Math.pow(i, 1.93)), name: n }; });
  var UNLOCK_DAY = { stwory: 1, pilka: 6, kosz: 13, fantasy: 21 };
  var WHOLESALE = 0.62, BOX = 24, BOX_RATE = 0.55, BULK_SELL = 0.4, BULK_REF = 0.12, ENTER = 1.0, HEAT_COST = 600, WAGE = 120;
  // meble: kit = sprite z zestawu Artist (SHOP_KIT). pack_rack celowo poza katalogiem (brak finalnej grafiki).
  var TYPES = {
    counter: { name: 'Lada z kasą', kit: 'us_register_counter', fp: [2, 1], rot: true, cost: 120, role: 'checkout', max: 1, kind: 'pack', cap: 6, desc: 'Bez kasy nikt nie zapłaci. 6 paczek „na impuls” przy kasie. Ulepszenie = szybsza obsługa i więcej miejsca.' },
    rack: { name: 'Stojak na paczki', kit: 'pack_rack', fp: [1, 1], cost: 60, kind: 'pack', cap: 12, attract: 0.02, legacy: true, desc: 'Wycofany.' },
    shelf: { name: 'Regał ścienny', kit: 'us_shelf_wall_stocked', fp: [2, 1], rot: true, cost: 90, kind: 'pack', cap: 15, attract: 0.03, wall: true, desc: '15 paczek. Tylko przy pełnej ścianie (nie w oknie, nie w drzwiach).' },
    showcase: { name: 'Gablota na single', kit: 'showcase_full', kitEmpty: 'showcase_empty', fp: [2, 1], rot: true, cost: 140, kind: 'card', cap: 6, attract: 0.03, boost: 0.2, desc: '6 kart pod szkłem. Kolekcjonerzy w promieniu 3 pól kupują chętniej (+20%).' },
    spinner: { name: 'Obrotowy stojak z komiksami', kit: 'us_comic_spinner_stocked', kitEmpty: 'us_comic_spinner_empty', fp: [1, 1], cost: 60, kind: 'comic', cap: 12, attract: 0.03, desc: '12 komiksów. Tani, pewny zarobek.' },
    bin: { name: 'Kosz okazji', kit: 'us_bargain_bin', fp: [1, 1], cost: 25, kind: 'bulk', cap: 50, attract: 0.01, desc: 'Do 50 pospolitych kart po jednej cenie. Dzieciaki to kochają.' },
    poster: { name: 'Stojak z plakatem', kit: 'us_poster_stand', fp: [1, 1], cost: 20, attract: 0.05, desc: 'Dekoracja: +5% atrakcyjności.' },
    plant: { name: 'Kwiatek w donicy', kit: 'plant', fp: [1, 1], cost: 12, attract: 0.02, desc: 'Dekoracja: +2% atrakcyjności.' },
    queue: { name: 'Barierka do kolejki', kit: 'us_queue_barrier', fp: [2, 1], rot: true, cost: 30, attract: 0.02, desc: 'Porządek przy kasie: +2% atrakcyjności.' },
    gumball: { name: 'Automat z gumami', kit: 'us_gumball_machine', fp: [1, 1], cost: 45, attract: 0.03, coins: 0.35, coin: 0.25, desc: 'Ćwierćdolarówki od dzieciaków, +3% atrakcyjności.' },
    soda: { name: 'Automat z napojami', kit: 'us_soda_machine', fp: [1, 1], cost: 120, attract: 0.05, lvl: 3, coins: 0.3, coin: 0.75, desc: '+5% atrakcyjności, 75¢ za puszkę.' },
    arcade: { name: 'Automat arcade', kit: 'us_arcade_cabinet', fp: [1, 1], cost: 400, attract: 0.10, lvl: 5, coins: 0.5, coin: 0.25, multi: 4, desc: '+10% atrakcyjności, ćwierćdolarówki. W strefie arcade zarabia sam.' },
    boxes: { name: 'Stos kartonów (magazyn)', kit: 'us_box_stack', fp: [1, 1], cost: 35, storage: 30, back: true, desc: '+30 miejsc w magazynie. Jedyny mebel na zapleczu.' }
  };
  var CAT_ORDER = ['counter', 'shelf', 'showcase', 'spinner', 'bin', 'poster', 'plant', 'queue', 'gumball', 'soda', 'arcade', 'boxes'];
  var COMIC = { name: 'Komiks', msrp: 1.25, cost: 0.6, bundle: 10 };
  var NAMES = ['Tommy', 'Jessica', 'Brian', 'Ashley', 'Kyle', 'Amber', 'Josh', 'Heather', 'Ryan', 'Nicole', 'Derek', 'Crystal', 'Travis', 'Megan', 'Cody', 'Stacy', 'Mr. Jenkins', 'Big Al', 'Doug', 'Coach Ray'];
  var KINDS = ['kids', 'casual', 'collector', 'pro', 'tourist'], KIND1 = { kids: 'kid', casual: 'casual', collector: 'collector', pro: 'pro', tourist: 'tourist' };
  var WALK = { '.': 1, E: 1, P: 1, A: 1 }, BUILD = { '.': 1, A: 1 };
  var PERK = {};   // opisy efektów w grze (perk_pl Artist jest tekstem dla gracza)
  LOC.forEach(function (l, i) { l.idx = i; PERK[l.perk_id] = i; });

  function r2(v) { return Math.round(v * 100) / 100; }
  function nicePrice(v) { if (v < 1) return Math.max(0.05, Math.round(v * 20) / 20); if (v < 20) return Math.max(0.99, Math.round(v * 2) / 2 - 0.01); return Math.round(v); }
  function msrpOf(p) { return Math.max(0.99, Math.round(Math.round(p * K * 10) * 10 - 1) / 100); }
  function dateOf(day) { return new Date(1991, 8, 1 + day); }   // dzień 1 = pon. 2 września 1991
  function fresh(slot, hero) {
    return { v: VERSION, slot: slot, hero: hero, day: 1, phase: 'prep', time: 0, loc: 0, locSince: 1, deposit: 0, rep: 0, xp: 0, uid: 1, loan: 0, heat: false,
      furn: [], stored: [], inv: { stwory: 12 }, markup: { pack: 1.0, card: 1.0, bulk: 0.1, comic: 1.0 },
      stats: { revenue: 0, sales: 0, customers: 0, bestSale: null, requests: 0, opened: 0, wholesale: 0, furniture: 0, rent: 0, bills: 0, moves: 0, theft: 0 },
      today: null, reports: [], seenSets: ['stwory'], events: [] };
  }
  function key(slot) { return 'paczki.shop.' + slot; }

  function createShop(deps) {
    var D = deps.D, CAT = deps.CAT, Hero = deps.Hero, Econ = deps.Economy, storage = deps.storage, slot = deps.slot || 1, rng = deps.rng || Math.random;
    var st = null, E = null, cust = [], cid = 0, spawnAcc = 0, arcAcc = 0, restockAcc = 0;
    var self = {};
    function trait() { return Hero.trait(st && st.hero.trait); }
    function makeEco() { var t = trait(); return Econ.createEconomy(D, storage, key(slot) + '.eco', CAT, { startWallet: START_WALLET, sellRate: BULK_SELL, luck: t.luck, valueScale: K }); }
    function cv(id) { return E.cardValue(id); }
    function save() { try { storage && storage.setItem(key(slot), JSON.stringify(st)); } catch (e) { } }
    function load() {
      var o = null; try { var raw = storage && storage.getItem(key(slot)); o = raw && JSON.parse(raw); } catch (e) { o = null; }
      if (!o || (o.v !== VERSION && o.v !== 1)) { st = null; return false; }
      st = o; E = makeEco(); E.load(); cust = [];
      if (o.v === 1) migrate();
      if (st.phase === 'open') { st.phase = 'prep'; st.time = 0; }
      return true;
    }
    function start(hero) {
      st = fresh(slot, { name: String(hero.name || 'Mike').slice(0, 16), age: Math.max(18, Math.min(45, hero.age | 0 || 24)), look: Hero.sanitize(hero.look, 1), trait: Hero.trait(hero.trait).id, shopName: String(hero.shopName || 'Turbo Cards & Comics').slice(0, 26) });
      E = makeEco(); E.reset(); E.save();
      st.deposit = loc().deposit; E.pay(st.deposit);
      // kiosk w pasażu (Artist #1): lada z paczkami, gablota, stojak z komiksami, automat z gumami
      add('counter', 2, 3, 0); add('showcase', 2, 1, 0); add('spinner', 1, 1); add('gumball', 1, 3);
      st.inv.comic = 12; st.furn.forEach(function (f) { if (f.type === 'counter') stockPacks(f.uid, 'stwory', 6); if (f.type === 'spinner') stockComics(f.uid); });
      save(); return self;
    }
    function add(type, tx, ty, rot, fl, o) { var f = { uid: st.uid++, type: type, tx: tx, ty: ty, rot: rot ? 1 : 0, fl: fl || 0, lvl: 1, items: [], bulk: [], bulkPrice: st.markup.bulk }; if (o) { f.lvl = o.lvl || 1; f.paid = o.paid; f.upPaid = o.upPaid; } st.furn.push(f); return f; }
    /* ---------- poziomy, reputacja, odblokowania ---------- */
    function levelIdx() { var i = 0; while (i + 1 < LEVELS.length && st.xp >= LEVELS[i + 1].xp) i++; return i; }
    function level() { return levelIdx() + 1; }
    function addXp(n) { var b = levelIdx(); st.xp += Math.max(0, Math.round(n)); var a = levelIdx(); if (a > b) push('level', 'POZIOM ' + (a + 1) + ': ' + LEVELS[a].name + '!'); }
    function addRep(n) { st.rep = Math.max(0, Math.round((st.rep + n) * 100) / 100); }
    function push(t, txt) { st.events.push({ type: t, text: txt }); }
    function drain() { var e = st.events; st.events = []; return e; }
    function setUnlocked(id) { return st.day >= UNLOCK_DAY[id]; }
    function unlockedSets() { return CAT.list.filter(function (s) { return setUnlocked(s.id); }).map(function (s) { return s.id; }); }
    /* ---------- lokal i siatka ---------- */
    function loc(i) { return LOC[i == null ? st.loc : i]; }
    function perk(id) { return loc().perk_id === id; }
    function floors(L) { L = L || loc(); return L.upper_grid ? 2 : 1; }
    function rows(fl, L) { L = L || loc(); return fl ? L.upper_grid : L.grid; }
    function grid(L) { L = L || loc(); return { w: L.size[0], h: L.size[1], floors: floors(L) }; }
    function cell(x, y, fl, L) { L = L || loc(); var g = rows(fl, L); if (!g || y < 0 || x < 0 || y >= g.length || x >= g[y].length) return '#'; return g[y][x]; }
    function inside(x, y, fl) { return cell(x, y, fl) !== '#'; }
    function openings(fl, L) { L = L || loc(); return (fl ? L.upper_openings : L.openings) || {}; }
    function hasWalls(fl, L) { L = L || loc(); return fl ? true : !!L.walls; }
    function partitionAt(x, y, edge, fl, L) { L = L || loc(); if (fl) return null; var p = (L.partition || []).filter(function (q) { return q.tx === x && q.ty === y && (q.edge || 'R') === edge; })[0]; return p ? p.kind : null; }
    // co jest na krawędzi pola: 'wall' | 'window' | 'door' | 'door2' | 'storage' | 'partition' | 'doorway' | null
    function edgeAt(x, y, edge, fl, L) {
      L = L || loc(); var pk = partitionAt(x, y, edge, fl, L); if (pk) return pk === 'wall' ? 'partition' : 'doorway';
      if (!hasWalls(fl, L)) return null;
      var out = edge === 'L' ? cell(x - 1, y, fl, L) === '#' : cell(x, y - 1, fl, L) === '#';
      if (!out || cell(x, y, fl, L) === '#') return null;
      return openings(fl, L)[x + ',' + y + ',' + edge] || 'wall';
    }
    function stairs(L) { L = L || loc(); if (!L.upper_grid) return null; var t = []; L.grid.forEach(function (r, y) { for (var x = 0; x < r.length; x++) if (r[x] === 'U') t.push([x, y]); }); if (!t.length) return null;
      var x0 = t[0][0], y0 = Math.min.apply(null, t.map(function (q) { return q[1]; })), y1 = Math.max.apply(null, t.map(function (q) { return q[1]; }));
      return { x: x0, y0: y0, y1: y1, land: [[x0, y1 + 1], [x0, y0 - 1]] }; }   // dół schodów z przodu (parter), wyjście na piętrze z tyłu
    function sources(fl, L) {   // pola wejścia/wyjścia klientów na danym piętrze
      L = L || loc(); if (fl) { var s = stairs(L); return s ? [s.land[1]] : []; }
      var out = [], op = openings(0, L); Object.keys(op).forEach(function (k) { if (op[k] === 'door' || op[k] === 'door2') { var p = k.split(','); out.push([+p[0], +p[1]]); } });
      if (!out.length) L.grid.forEach(function (r, y) { for (var x = 0; x < r.length; x++) if (r[x] === 'P' && (x === 0 || y === 0 || x === r.length - 1 || y === L.grid.length - 1)) out.push([x, y]); });
      return out;
    }
    function doorY() { var s = sources(0); return s.length ? s[0][1] : grid().h - 1; }
    /* ---------- kolizje ---------- */
    function fpOf(type, rot) { var p = TYPES[type].fp; return rot ? [p[1], p[0]] : p; }
    function fp(f) { return fpOf(f.type, f.rot); }
    function ownerTile(f) { return f.rot ? [f.tx - 1, f.ty] : [f.tx, f.ty - 1]; }
    function payTiles(f) { return f.rot ? [[f.tx + 1, f.ty], [f.tx + 1, f.ty + 1]] : [[f.tx, f.ty + 1], [f.tx + 1, f.ty + 1]]; }
    function occ(ignore, fl, furn) {
      fl = fl || 0; var g = grid(), m = [];
      for (var y = 0; y < g.h; y++) { m.push([]); for (var x = 0; x < g.w; x++) m[y].push(WALK[cell(x, y, fl)] ? 0 : -3); }
      (furn || st.furn).forEach(function (f) { if (f.uid === ignore || (f.fl || 0) !== fl) return; var p = fp(f); for (var a = 0; a < p[0]; a++) for (var b = 0; b < p[1]; b++) if (m[f.ty + b] && f.tx + a < g.w) m[f.ty + b][f.tx + a] = f.uid;
        if (f.type === 'counter') { var o = ownerTile(f); if (m[o[1]] && o[0] >= 0 && o[0] < g.w) m[o[1]][o[0]] = -2; } });
      return m;
    }
    function free(m, x, y) { return y >= 0 && x >= 0 && m[y] && x < m[y].length && !m[y][x]; }
    function bfs(m, srcs) { var q = [], prev = {}; srcs.forEach(function (s) { var k = s[0] + ',' + s[1]; if (free(m, s[0], s[1]) && !(k in prev)) { prev[k] = null; q.push(s); } });
      for (var qi = 0; qi < q.length; qi++) { var c = q[qi]; for (var d = 0; d < 4; d++) { var nx = c[0] + [1, -1, 0, 0][d], ny = c[1] + [0, 0, 1, -1][d], kk = nx + ',' + ny; if (!free(m, nx, ny) || kk in prev) continue; prev[kk] = c; q.push([nx, ny]); } }
      return prev; }
    function access(f, m) {   // wolne pola przy meblu (przód/boki), z których klient sięga po towar
      if (f.type === 'counter') return payTiles(f).filter(function (c) { return free(m, c[0], c[1]); });
      var p = fp(f), out = [];
      for (var a = -1; a <= p[0]; a++) for (var b = -1; b <= p[1]; b++) { if ((a === -1 || a === p[0]) && (b === -1 || b === p[1])) continue; if (a >= 0 && a < p[0] && b >= 0 && b < p[1]) continue; var x = f.tx + a, y = f.ty + b; if (free(m, x, y)) out.push([x, y]); }
      return out;
    }
    function canPlace(type, tx, ty, ignoreUid, rot, fl, furn) {
      fl = fl || 0; furn = furn || st.furn; var T = TYPES[type], p = fpOf(type, rot), m = occ(ignoreUid, fl, furn), a, b, x, y;
      if (fl >= floors()) return 'Tu nie ma piętra';
      for (a = 0; a < p[0]; a++) for (b = 0; b < p[1]; b++) { x = tx + a; y = ty + b; var ch = cell(x, y, fl);
        if (ch === '#') return 'Poza sklepem';
        if (ch === 'B') { if (!T.back) return 'Zaplecze: tylko kartony z towarem'; } else if (!BUILD[ch]) return ch === 'E' ? 'Przejście przy drzwiach' : ch === 'P' ? 'To korytarz mallu' : 'Tu nic nie stanie';
        if (m[y][x] && m[y][x] !== -3) return 'Zajęte'; }
      if (T.role === 'checkout') { if (fl) return 'Kasa tylko na parterze'; var ot = rot ? [tx - 1, ty] : [tx, ty - 1]; if (!BUILD[cell(ot[0], ot[1], fl)] || m[ot[1]][ot[0]]) return 'Za ladą musi być miejsce dla ciebie'; }
      if (T.wall) for (a = 0; a < p[0]; a++) for (b = 0; b < p[1]; b++) { var e = edgeAt(tx + a, ty + b, rot ? 'L' : 'R', fl); if (e !== 'wall' && e !== 'partition') return !hasWalls(fl) ? 'Tu nie ma ścian' : e ? 'Nie zasłaniaj okna ani drzwi' : rot ? 'Ten regał tylko przy lewej ścianie' : 'Ten regał tylko przy tylnej ścianie (obróć, by postawić przy lewej)'; }
      // po postawieniu wszystko musi być osiągalne od wejścia
      for (a = 0; a < p[0]; a++) for (b = 0; b < p[1]; b++) m[ty + b][tx + a] = -1;
      if (T.role === 'checkout') m[ot[1]][ot[0]] = -2;
      var src = sources(fl), reach = bfs(m, src), tmp = { tx: tx, ty: ty, type: type, rot: rot ? 1 : 0, fl: fl };
      if (!src.some(function (s) { return (s[0] + ',' + s[1]) in reach; })) return 'Zablokujesz wejście';
      var sx = stairs(); if (sx && !((sx.land[fl][0] + ',' + sx.land[fl][1]) in reach)) return 'Zablokujesz schody';
      var all = furn.filter(function (f) { return f.uid !== ignoreUid && (f.fl || 0) === fl && !TYPES[f.type].back; }).concat(T.back ? [] : [tmp]);
      for (var i = 0; i < all.length; i++) { var acc = access(all[i], m); if (!acc.some(function (c) { return (c[0] + ',' + c[1]) in reach; })) return 'Zablokujesz dojście'; }
      return null;
    }
    function furnCost(type) { return r2(TYPES[type].cost * (1 - (trait().furnDiscount || 0))); }
    function upgradeCost(f) { return f.lvl >= 3 || !TYPES[f.type].cap ? null : r2(TYPES[f.type].cost * 0.75 * f.lvl * (1 - (trait().furnDiscount || 0)) + 15); }
    function furnMax() { return loc().furniture_max; }
    function catalog() { return CAT_ORDER.map(function (t) { var T = TYPES[t], n = st.furn.filter(function (f) { return f.type === t; }).length; return { type: t, name: T.name, desc: T.desc, cost: furnCost(t), lvl: T.lvl || 1, locked: (T.lvl || 1) > level(), maxed: (T.max && n >= T.max) || st.furn.length >= furnMax(), owned: n }; }); }
    function need(c, m) { if (!c) throw new Error(m); }
    function buyFurniture(type, tx, ty, rot, fl) {
      var T = TYPES[type], c = catalog().filter(function (x) { return x.type === type; })[0];
      need(c, 'Nie ma takiego mebla'); need(st.phase !== 'open', 'Meble przestawiasz przy zamkniętym sklepie'); need(!c.locked, 'Wymaga poziomu ' + c.lvl);
      need(!(T.max && c.owned >= T.max), 'Masz już ' + T.name); need(st.furn.length < furnMax(), 'Limit mebli w tym lokalu: ' + furnMax());
      var why = canPlace(type, tx, ty, null, rot, fl); need(!why, why); need(E.pay(c.cost), 'Za mało kasy');
      st.stats.furniture = r2(st.stats.furniture + c.cost); spend(c.cost); var f = add(type, tx, ty, rot, fl); f.paid = c.cost; save(); return f;
    }
    function placeStored(i, tx, ty, rot, fl) {
      var s = st.stored[i]; need(s, 'Brak mebla w magazynie'); need(st.phase !== 'open', 'Sklep otwarty'); need(st.furn.length < furnMax(), 'Limit mebli w tym lokalu: ' + furnMax());
      var why = canPlace(s.type, tx, ty, null, rot, fl); need(!why, why); st.stored.splice(i, 1); var f = add(s.type, tx, ty, rot, fl, s); save(); return f;
    }
    function sellStored(i) { var s = st.stored[i]; need(s, 'Brak mebla w magazynie'); var back = refund(s); E.deposit(back); st.stored.splice(i, 1); save(); return back; }
    function refund(f) { return r2((f.paid != null ? f.paid : TYPES[f.type].cost) * 0.5 + (f.upPaid || 0) * 0.5); }
    function moveFurniture(uid, tx, ty, rot, fl) { var f = get(uid); need(st.phase !== 'open', 'Sklep otwarty'); if (rot == null) rot = f.rot; if (fl == null) fl = f.fl || 0; var why = canPlace(f.type, tx, ty, uid, rot, fl); need(!why, why); f.tx = tx; f.ty = ty; f.rot = rot ? 1 : 0; f.fl = fl; save(); }
    function rotateFurniture(uid) {   // obrót 2x1: A <-> B; próbuje w miejscu, potem szuka najbliższego wolnego pola
      var f = get(uid); need(TYPES[f.type].rot, 'Ten mebel ma jedną orientację'); var r = f.rot ? 0 : 1, best = null;
      for (var d = 0; d < 6 && !best; d++) for (var y = Math.max(0, f.ty - d); y <= f.ty + d && !best; y++) for (var x = Math.max(0, f.tx - d); x <= f.tx + d && !best; x++) if (!canPlace(f.type, x, y, uid, r, f.fl)) best = [x, y];
      need(best, 'Nie ma miejsca na obrót'); moveFurniture(uid, best[0], best[1], r); return best;
    }
    function sellFurniture(uid) {
      var f = get(uid); need(st.phase !== 'open', 'Sklep otwarty'); need(f.type !== 'counter', 'Kasy nie sprzedasz – musi być w sklepie');
      unstockAll(f); var back = refund(f); E.deposit(back); st.furn = st.furn.filter(function (x) { return x.uid !== uid; }); save(); return back;
    }
    function storeFurniture(uid) { var f = get(uid); need(st.phase !== 'open', 'Sklep otwarty'); need(f.type !== 'counter', 'Kasa zostaje w sklepie'); unstockAll(f); st.furn = st.furn.filter(function (x) { return x.uid !== uid; }); st.stored.push({ type: f.type, lvl: f.lvl, paid: f.paid, upPaid: f.upPaid }); save(); }
    function upgradeFurniture(uid) { var f = get(uid), c = upgradeCost(f); need(c != null, 'Maksymalny poziom'); need(E.pay(c), 'Za mało kasy'); f.lvl++; f.upPaid = (f.upPaid || 0) + c; st.stats.furniture = r2(st.stats.furniture + c); spend(c); save(); return f.lvl; }
    function get(uid) { var f = st.furn.filter(function (x) { return x.uid === uid; })[0]; need(f, 'Brak mebla'); return f; }
    function cap(f) { var T = TYPES[f.type]; return T.cap ? Math.round(T.cap * [1, 1.5, 2][f.lvl - 1]) : 0; }
    function spend(v) { ensureToday(); if (st.today) st.today.spent = r2(st.today.spent + v); }
    /* ---------- hurtownia i magazyn ---------- */
    function msrp(setId) { return msrpOf(CAT.get(setId).price); }
    function wholesale(setId, box) { var p = msrp(setId) * (perk('bulk') ? 0.85 : 1); return box ? r2(p * BOX * BOX_RATE) : r2(p * WHOLESALE); }
    function storageCap() { var L = loc(), c = L.idx === 0 ? 30 : Math.round(L.furniture_max * 8), op = openings(0); if (Object.keys(op).some(function (k) { return op[k] === 'storage'; })) c += 40;
      if (perk('parking')) c += 20; if (perk('back_room')) c += 200; st.furn.forEach(function (f) { c += TYPES[f.type].storage || 0; }); return c; }
    function invTotal() { var t = 0; for (var k in st.inv) if (k !== 'comic') t += st.inv[k]; return t; }
    function storageFree() { return storageCap() - invTotal(); }
    function buyStock(setId, box) {
      need(setUnlocked(setId), 'Hurtownia jeszcze nie ma tego zestawu'); var n = box ? BOX : 1; need(storageFree() >= n, 'Magazyn pełny (' + storageCap() + ' paczek)');
      var c = wholesale(setId, box); need(E.pay(c), 'Za mało kasy');
      st.inv[setId] = (st.inv[setId] || 0) + n; st.stats.wholesale = r2(st.stats.wholesale + c); spend(c); save(); return c;
    }
    function buyComics() { var c = r2(COMIC.cost * COMIC.bundle); need(E.pay(c), 'Za mało kasy'); st.inv.comic = (st.inv.comic || 0) + COMIC.bundle; st.stats.wholesale = r2(st.stats.wholesale + c); spend(c); save(); return c; }
    function stockComics(uid) { var f = get(uid); need(TYPES[f.type].kind === 'comic', 'Komiksy idą na obrotowy stojak'); var n = 0; while ((st.inv.comic || 0) > 0 && f.items.length < cap(f)) { f.items.push({ k: 'comic', price: nicePrice(COMIC.msrp * (st.markup.comic || 1)) }); st.inv.comic--; n++; } save(); return n; }
    function stockPacks(uid, setId, n) {
      var f = get(uid), T = TYPES[f.type]; need(T.kind === 'pack', 'Tu nie wystawisz paczek');
      var put = 0; while (put < (n || 999) && (st.inv[setId] || 0) > 0 && f.items.length < cap(f)) { f.items.push({ k: 'pack', set: setId, price: nicePrice(msrp(setId) * st.markup.pack) }); st.inv[setId]--; put++; }
      save(); return put;
    }
    function stockCard(uid, id, price) {
      var f = get(uid); need(TYPES[f.type].kind === 'card', 'Karty wystawiasz w gablocie'); need(f.items.length < cap(f), 'Gablota pełna'); need(E.removeCard(id), 'Nie masz tej karty');
      f.items.push({ k: 'card', id: id, price: price != null ? price : nicePrice(cv(id) * st.markup.card) }); save();
    }
    function fillBin(uid) {   // duplikaty pospolitych i niepospolitych (zostaje 1 sztuka do kolekcji)
      var f = get(uid); need(TYPES[f.type].kind === 'bulk', 'To nie kosz okazji'); var n = 0;
      Object.keys(E.state.collection).forEach(function (id) { var c = D.BY_ID[id]; if (c.tier !== 'C' && c.tier !== 'U') return; while (E.state.collection[id] > 1 && f.bulk.length < cap(f)) { E.removeCard(id); f.bulk.push(id); n++; } });
      save(); return n;
    }
    function unstock(uid, i) { var f = get(uid), it = f.items[i]; if (!it) return; f.items.splice(i, 1); if (it.k === 'pack') st.inv[it.set] = (st.inv[it.set] || 0) + 1; else if (it.k === 'comic') st.inv.comic = (st.inv.comic || 0) + 1; else E.addCard(it.id); save(); }
    function unstockAll(f) { while (f.items.length) { var it = f.items.shift(); if (it.k === 'pack') st.inv[it.set] = (st.inv[it.set] || 0) + 1; else if (it.k === 'comic') st.inv.comic = (st.inv.comic || 0) + 1; else E.addCard(it.id); } (f.bulk || []).forEach(function (id) { E.addCard(id); }); f.bulk = []; }
    function setPrice(uid, i, price) { var f = get(uid); if (i === 'bulk') f.bulkPrice = Math.max(0.01, r2(price)); else if (f.items[i]) f.items[i].price = Math.max(0.05, r2(price)); save(); }
    function value(it) { return it.k === 'pack' ? msrp(it.set) : it.k === 'comic' ? COMIC.msrp : cv(it.id); }
    function reprice(kind, mul) {   // „przeceń wszystko” – ten sam narzut dla wszystkich wystawionych rzeczy danego typu (bulk = cena za kartę)
      st.markup[kind] = mul; st.furn.forEach(function (f) { if (kind === 'bulk' && TYPES[f.type].kind === 'bulk') f.bulkPrice = mul; f.items.forEach(function (it) { if (it.k === kind) it.price = nicePrice(value(it) * mul); }); }); save();
    }
    function autoStock() {   // wygodny przycisk: paczki na regały, najlepsze single do gablot, duplikaty do kosza
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
    // w trakcie dnia właściciel co godzinę dokłada towar z magazynu na puste miejsca (paczki tego samego zestawu, komiksy)
    function refill() {
      var n = 0; st.furn.forEach(function (f) { var k = TYPES[f.type].kind, c = cap(f);
        if (k === 'comic') while (f.items.length < c && (st.inv.comic || 0) > 0) { f.items.push({ k: 'comic', price: nicePrice(COMIC.msrp * (st.markup.comic || 1)) }); st.inv.comic--; n++; }
        if (k === 'pack') { var pref = f.items.length ? [f.items[0].set] : []; pref.concat(unlockedSets()).forEach(function (s2) { while (f.items.length < c && (st.inv[s2] || 0) > 0) { f.items.push({ k: 'pack', set: s2, price: nicePrice(msrp(s2) * st.markup.pack) }); st.inv[s2]--; n++; } }); } });
      return n;
    }
    function revealSpeed() { return perk('back_room') ? 2 : 1; }
    /* ---------- atrakcyjność, pogoda, kalendarz ---------- */
    function attract() {
      var a = 0.03 * levelIdx(); st.furn.forEach(function (f) { var T = TYPES[f.type]; a += (T.attract || 0) * (1 + 0.5 * (f.lvl - 1)); if (T.kind && (f.items.length || f.bulk.length)) a += 0.025; });
      return Math.round(a * 100) / 100;
    }
    function rainy(day) { var d = day == null ? st.day : day, h = Math.sin(d * 12.9898 + slot * 78.233) * 43758.5453; return h - Math.floor(h) < 0.2; }
    function weekend() { var d = st.day % 7; return d === 6 || d === 0; }
    function tournament() { return perk('events') && st.day % 7 === 6; }
    function month() { return dateOf(st.day).getMonth(); }
    function dateLabel(day) { var d = dateOf(day == null ? st.day : day); return d.getDate() + ' ' + ['STY', 'LUT', 'MAR', 'KWI', 'MAJ', 'CZE', 'LIP', 'SIE', 'WRZ', 'PAŹ', 'LIS', 'GRU'][d.getMonth()] + ' ' + d.getFullYear(); }
    function trafficMul() {
      var m = (LECO.traffic_multiplier || 1) * (weekend() ? 1.25 : 1);
      if (perk('parking') && weekend()) m *= 1.15; if (perk('cheap') && rainy()) m *= 0.9; if (tournament()) m *= 2.5; return m;
    }
    function spawnRate() { return loc().foot_traffic_per_hour / 60 * ENTER * (1 + attract()) * trafficMul(); }
    function maxCust() { return perk('cheap') ? 3 : perk('starter') ? 6 : 12 + Math.round(furnMax() * 1.5); }
    function weeklyRent(L) { L = L || loc(); var r = L.rent_week * (LECO.rent_multiplier || 1); if (L.perk_id === 'arcade' && month() === 11) r *= 1.1; if (L.perk_id === 'starter' && st.day - st.locSince < 7 && st.stats.moves === 0) r = 0; return r2(r); }
    function utilities() { var g = grid(), cells = g.w * g.h * floors(); return r2((3 + 0.25 * cells + 0.75 * st.furn.length) * (perk('events') ? 2 : 1)); }
    /* ---------- dzień ---------- */
    function openShop() {
      need(st.phase === 'prep', 'Sklep już otwarty'); st.phase = 'open'; st.time = 0; cust = []; spawnAcc = 0; arcAcc = 0; restockAcc = 0;
      st.today = st.today && st.today.day === st.day ? st.today : newToday(); if (tournament()) push('info', 'Sobota = turniej na scenie! Tłumy w sklepie.'); save();
    }
    function newToday() { return { day: st.day, customers: 0, buyers: 0, sales: 0, revenue: 0, spent: 0, best: null, expensive: 0, missed: [], requests: 0, coins: 0, xp0: st.xp, rep0: st.rep, noStock: 0, theft: 0, items: {} }; }
    function ensureToday() { if (!st.today || st.today.day !== st.day) st.today = newToday(); }
    function pickKind() { var mix = loc().customer_mix, tot = 0, r; KINDS.forEach(function (k) { tot += mix[k] || 0; }); r = rng() * tot; for (var i = 0; i < KINDS.length; i++) { r -= mix[KINDS[i]] || 0; if (r < 0) return KIND1[KINDS[i]]; } return 'casual'; }
    function spawn() {
      var kind = pickKind(), t = trait();
      var budget = kind === 'kid' ? 1 + rng() * 7 : kind === 'casual' ? 3 + rng() * 15 : kind === 'tourist' ? 4 + rng() * 20 : kind === 'collector' ? 8 + Math.pow(rng(), 2) * 120 : 20 + Math.pow(rng(), 1.5) * 300;
      var src = sources(0), s = src[(rng() * src.length) | 0];
      var c = { id: ++cid, kind: kind, name: NAMES[(rng() * NAMES.length) | 0], x: s[0] + 0.5, y: s[1] + 0.5, fl: 0, path: [], st: 'enter', wait: 0, cart: [], budget: r2(budget), stops: 0, hue: (rng() * 360) | 0, face: 'se', bubble: null, bubbleT: 0, want: null, request: null, tried: false };
      var w = rng();
      if (kind === 'kid') c.want = w < 0.5 ? 'pack' : w < 0.8 ? 'bulk' : 'comic'; else if (kind === 'casual') c.want = w < 0.5 ? 'pack' : w < 0.8 ? 'comic' : 'card';
      else if (kind === 'tourist') c.want = w < 0.45 ? 'pack' : w < 0.8 ? 'comic' : 'card'; else if (kind === 'collector') c.want = w < 0.8 ? 'card' : 'pack'; else c.want = 'card';
      var rq = kind === 'collector' ? 0.22 : kind === 'pro' ? 0.45 : 0;
      if (rq && rng() < rq * (t.reqRate || 1)) {
        var pool = []; unlockedSets().forEach(function (s2) { pool = pool.concat(CAT.get(s2).cards.filter(function (x) { var k = D.TIERS[x.tier].rank; return k >= 2 && k <= (kind === 'pro' ? 5 : 4); })); });
        c.request = pool[(rng() * pool.length) | 0].id; say(c, 'Szukam: ' + D.BY_ID[c.request].name);
      }
      cust.push(c); st.today.customers++; st.stats.customers++; c.sheet = 'abc'[(rng() * 3) | 0];
      var cm = st.furn.filter(function (f) { return TYPES[f.type].coins; });   // jeden automat na klienta
      if (cm.length) { var f = cm[(rng() * cm.length) | 0], T = TYPES[f.type], mul = (kind === 'kid' ? 1.4 : 0.7) * (perk('arcade') && cell(f.tx, f.ty, f.fl) === 'A' ? 2 : 1);
        if (rng() < Math.min(0.95, T.coins * mul)) coin(T.coin * (T.multi ? 1 + ((rng() * T.multi) | 0) : 1)); }
      planNext(c);
    }
    function coin(v) { E.deposit(v); st.today.coins = r2(st.today.coins + v); }
    function say(c, t) { c.bubble = t; c.bubbleT = 40; }
    function pathTo(c, targets) {
      var m = occ(null, c.fl), sx = Math.floor(c.x), sy = Math.floor(c.y), m2 = m.map(function (r) { return r.slice(); }); if (m2[sy]) m2[sy][sx] = 0;
      var prev = bfs(m2, [[sx, sy]]), best = null;
      targets.forEach(function (t) { if ((t[0] + ',' + t[1]) in prev && (!best || rng() < 0.4)) best = t; });
      if (!best) return false;
      var p = [], cur = best; while (cur) { p.unshift(cur); cur = prev[cur[0] + ',' + cur[1]]; } p.shift(); c.path = p; return true;
    }
    // idź do celu na dowolnym piętrze (przez schody, jeśli trzeba)
    function go(c, fl, targets, next) {
      c.st = 'walk';
      if (c.fl === fl) { c.next = next; return pathTo(c, targets); }
      var sx = stairs(); if (!sx) return false; c.after = { fl: fl, targets: targets, next: next }; c.next = 'stairs'; return pathTo(c, [sx.land[c.fl]]);
    }
    function displays(want) {
      return st.furn.filter(function (f) { var k = TYPES[f.type].kind; if (want === 'bulk') return k === 'bulk' && f.bulk.length; if (want === 'pack') return k === 'pack' && f.items.length; if (want === 'comic') return k === 'comic' && f.items.length; return k === 'card' && f.items.length; });
    }
    function counter() { return st.furn.filter(function (f) { return f.type === 'counter'; })[0]; }
    function planNext(c) {
      if (c.stops < 2 && !(c.stops && c.cart.length && rng() < 0.6)) {
        var ds = displays(c.want); if (!ds.length && c.stops === 0) { ds = displays(c.want === 'pack' ? 'card' : 'pack'); }
        if (ds.length) { var f = ds[(rng() * ds.length) | 0]; c.target = f.uid; if (go(c, f.fl || 0, access(f, occ(null, f.fl || 0)), 'browse')) return; }
        if (!c.stops) { st.today.noStock++; addRep(-0.02); say(c, c.want === 'pack' ? 'Nie macie paczek?!' : 'Pusto tu...'); }
      }
      var k = counter();
      if ((c.cart.length || c.request) && k && go(c, 0, access(k, occ(null, 0)), 'pay')) return;
      leave(c);
    }
    function leave(c) { if (!go(c, 0, sources(0), 'gone')) c.st = 'gone'; }
    function accept(ratio) { if (ratio <= 0.7) return 1; if (ratio >= 1.5) return 0; return Math.pow((1.5 - ratio) / 0.8, 1.3); }
    function boostAt(c) { var b = 0; st.furn.forEach(function (f) { var T = TYPES[f.type]; if (T.boost && (f.fl || 0) === c.fl && Math.abs(f.tx + 1 - c.x) + Math.abs(f.ty + 0.5 - c.y) <= 3) b = Math.max(b, T.boost + 0.1 * (f.lvl - 1)); }); return b; }
    function nearWindow(f) { var p = fp(f), fl = f.fl || 0; for (var a = -1; a <= p[0]; a++) for (var b = -1; b <= p[1]; b++) { var x = f.tx + a, y = f.ty + b; if (edgeAt(x, y, 'L', fl) === 'window' || edgeAt(x, y, 'R', fl) === 'window') return true; } return false; }
    function browse(c) {
      var f = st.furn.filter(function (x) { return x.uid === c.target; })[0]; c.stops++;
      if (!f) return;
      var tol = (1 + (trait().priceTol || 0)) * (c.kind === 'tourist' ? 1.15 : c.kind === 'pro' ? 0.95 : 1), boost = 1 + (c.kind === 'collector' || c.kind === 'pro' ? boostAt(c) : 0), took = 0, pricey = false;
      var sat = perk('bulk') && !st.heat ? 0.95 : 1, imp = perk('corner_window') && nearWindow(f) ? 1.25 : 1;
      if (perk('downtown') && f.items.length && (TYPES[f.type].kind === 'pack' || TYPES[f.type].kind === 'comic') && rng() < 0.05) { var lost = f.items.splice((rng() * f.items.length) | 0, 1)[0]; st.today.theft++; st.stats.theft++; st.today.theftValue = r2((st.today.theftValue || 0) + lost.price); }
      if (TYPES[f.type].kind === 'bulk') {
        var want = 1 + ((rng() * (c.kind === 'kid' ? 6 : 3)) | 0), a = accept(f.bulkPrice / (BULK_REF * tol)) * sat;
        for (var i = 0; i < want && f.bulk.length; i++) { if (c.budget < f.bulkPrice) break; if (rng() < a) { var id = f.bulk.splice((rng() * f.bulk.length) | 0, 1)[0]; c.cart.push({ k: 'bulk', id: id, price: f.bulkPrice, value: cv(id) }); c.budget = r2(c.budget - f.bulkPrice); took++; } else pricey = true; }
      } else {
        var idx = f.items.map(function (_, i) { return i; }); idx.sort(function () { return rng() - 0.5; });
        var maxTake = c.kind === 'collector' ? 2 : c.kind === 'pro' ? 3 : 1 + ((rng() * 3) | 0);
        for (var j = 0; j < idx.length && took < maxTake; j++) {
          var it = f.items[idx[j]]; if (!it || it.price > c.budget) continue;
          var v = value(it), serious = c.kind === 'collector' || c.kind === 'pro';
          var interest = it.k === 'comic' ? 0.8 : it.k === 'pack' ? (c.kind === 'collector' ? 0.5 : c.kind === 'pro' ? 0.3 : 1) : (serious ? 1 : v <= 0.65 ? 0.8 : 0.35);
          var t2 = tol; if (perk('downtown') && serious && it.k === 'card' && D.TIERS[D.BY_ID[it.id].tier].rank >= 3) t2 *= 1.15;
          var p = Math.min(1, accept(it.price / (v * t2)) * boost * sat * imp) * interest;
          if (rng() < p) { c.cart.push({ k: it.k, set: it.set, id: it.id, price: it.price, value: v }); c.budget = r2(c.budget - it.price); f.items[idx[j]] = null; took++; }
          else if (it.price > v * t2 * 1.1) pricey = true;
        }
        f.items = f.items.filter(Boolean);
      }
      if (!took && pricey) { st.today.expensive++; addRep(-0.05); say(c, rng() < 0.5 ? 'Za drogo!' : 'Zdzierstwo...'); }
      else if (took) say(c, took > 1 ? 'Biorę ' + took + '!' : 'O, to biorę!');
    }
    function pay(c) {
      var k = counter(), sum = 0, t = trait();
      if (c.request) {
        var have = E.state.collection[c.request] > 0;
        if (have) { var price = r2(cv(c.request) * (1 + (t.reqBonus || 0.25)) * (c.kind === 'pro' ? 1.35 : 1)); E.removeCard(c.request); c.cart.push({ k: 'card', id: c.request, price: price, value: cv(c.request), req: true }); st.today.requests++; st.stats.requests++; addXp(10); addRep(1); say(c, 'Masz ją! Biorę!'); }
        else if (!c.cart.some(function (x) { return x.id === c.request; })) { st.today.missed.push(c.request); say(c, 'Szkoda, nie ma...'); }
      }
      c.cart.forEach(function (x) { sum += x.price; var nm = x.k === 'pack' ? CAT.get(x.set).name + ' (paczka)' : x.k === 'comic' ? 'Komiks' : D.BY_ID[x.id].name;
        if (!st.today.best || x.price > st.today.best.price) st.today.best = { name: nm, price: x.price };
        if (!st.stats.bestSale || x.price > st.stats.bestSale.price) st.stats.bestSale = { name: nm, price: x.price, day: st.day };
        var key2 = x.k === 'pack' ? 'pack:' + x.set : x.k; st.today.items[key2] = (st.today.items[key2] || 0) + 1; });
      sum = r2(sum);
      if (sum > 0) { E.deposit(sum); st.today.revenue = r2(st.today.revenue + sum); st.today.sales += c.cart.length; st.today.buyers++; st.stats.revenue = r2(st.stats.revenue + sum); st.stats.sales += c.cart.length; addXp(sum + 1); addRep(0.05); c.paid = sum; }
      c.cart = []; c.wait = Math.max(1, 4 - (k ? k.lvl : 1));
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
          if (c.next === 'browse') { c.st = 'look'; c.wait = 3 + rng() * 5 + (perk('arcade') && c.kind === 'kid' ? 3 : 0); }
          else if (c.next === 'pay') { c.st = 'paying'; pay(c); }
          else if (c.next === 'stairs') { var sx = stairs(), a = c.after; c.fl = 1 - c.fl; c.x = sx.land[c.fl][0] + 0.5; c.y = sx.land[c.fl][1] + 0.5; c.wait = c.kind === 'kid' ? 0.5 : 2.5; c.after = null;
            if (!go(c, a.fl, a.fl === c.fl && a.next === 'browse' ? (function () { var f = st.furn.filter(function (x) { return x.uid === c.target; })[0]; return f ? access(f, occ(null, f.fl || 0)) : a.targets; })() : a.targets, a.next)) leave(c); }
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
      if (st.time < DAY_MIN - 40) { spawnAcc += dt * spawnRate(); while (spawnAcc >= 1) { spawnAcc -= 1; if (cust.length < maxCust()) spawn(); } }
      restockAcc += dt; if (restockAcc >= 60) { restockAcc -= 60; refill(); }
      if (perk('arcade')) { arcAcc += dt; while (arcAcc >= 60) { arcAcc -= 60; st.furn.forEach(function (f) { if (f.type === 'arcade' && cell(f.tx, f.ty, f.fl) === 'A') coin(0.25 * (1 + ((rng() * 4) | 0))); }); } }
      cust.forEach(function (c) { step(c, dt); });
      cust = cust.filter(function (c) { return c.st !== 'gone'; });
      if (st.time >= DAY_MIN && !cust.length) close();
    }
    function close() {
      ensureToday(); var T = st.today, bills = 0, lines = [];
      if (tournament()) addRep(3);
      if (st.day % 7 === 0) {   // tygodniowe opłaty
        var rent = weeklyRent(), util = utilities(); bills = rent + util;
        lines.push({ name: 'Czynsz: ' + loc().name_pl + (rent ? '' : ' (1. tydzień gratis)'), v: rent }, { name: 'Prąd i woda', v: util });
        if (perk('back_room')) { lines.push({ name: 'Pensja pomocnika (zaplecze)', v: WAGE }); bills += WAGE; }
        if (st.loan) { lines.push({ name: 'Spłata pożyczki od wujka Boba', v: st.loan }); bills += st.loan; st.loan = 0; }
        bills = r2(bills); E.state.wallet = r2(E.state.wallet - bills); E.save(); st.stats.rent = r2(st.stats.rent + bills);
      }
      // brak softlocka: niezapłacone rachunki idą na „zeszyt” właściciela (dług), kasa nie spada poniżej zera; dług spłaca 25% dziennego obrotu
      if ((st.debt || 0) > 0 && E.state.wallet > 0 && T.revenue > 0) { var pay = r2(Math.min(st.debt, T.revenue * 0.25, E.state.wallet)); if (pay > 0) { E.state.wallet = r2(E.state.wallet - pay); st.debt = r2(st.debt - pay); lines.push({ name: 'Spłata długu (zeszyt właściciela)', v: pay }); bills = r2(bills + pay); E.save(); } }
      if (E.state.wallet < 0) { st.debt = r2((st.debt || 0) - E.state.wallet); push('info', 'Brakło na rachunki: $' + (-E.state.wallet).toFixed(2) + ' dopisane do długu. Spłacisz z obrotu (25% dziennie).'); E.state.wallet = 0; E.save(); }
      st.phase = 'report';
      var rep = { day: st.day, date: dateLabel(), rainy: rainy(), customers: T.customers, buyers: T.buyers, sales: T.sales, revenue: T.revenue, spent: T.spent, bills: bills, billLines: lines, coins: T.coins,
        profit: r2(T.revenue + T.coins - T.spent - bills), best: T.best, expensive: T.expensive, missed: T.missed.slice(0, 5), requests: T.requests, xp: st.xp - T.xp0, rep: r2(st.rep - (T.rep0 || 0)), wallet: E.state.wallet, items: T.items, noStock: T.noStock, theft: T.theft || 0, theftValue: T.theftValue || 0, attract: attract() };
      st.reports.push(rep); if (st.reports.length > 30) st.reports.shift();
      st.today = null; cust = []; save(); return rep;
    }
    function nextDay() {
      need(st.phase === 'report' || st.phase === 'prep', 'Najpierw zamknij sklep'); var was = locStatus(st.loc + 1); st.day++; st.phase = 'prep'; st.time = 0;
      CAT.list.forEach(function (s) { if (setUnlocked(s.id) && st.seenSets.indexOf(s.id) < 0) { st.seenSets.push(s.id); push('unlock', 'Hurtownia ma nowy zestaw: ' + s.name + '!'); } });
      var nx = locStatus(st.loc + 1); if (nx && nx.unlocked && !(st.notified || {})[nx.idx]) { st.notified = st.notified || {}; st.notified[nx.idx] = 1; push('unlock', 'Nowy lokal do wynajęcia: ' + nx.loc.name_pl + '! Zajrzyj do ogłoszeń.'); }
      save();
    }
    function skipDay() { if (st.phase === 'prep') openShop(); var g = 0; while (st.phase === 'open' && g++ < 10000) tick(1); return st.reports[st.reports.length - 1]; }
    // pożyczka – zawsze jest wyjście z dołka (spłata z najbliższym czynszem, +10%)
    function canLoan() { return !st.loan && E.state.wallet < 30; }
    function takeLoan() { need(canLoan(), 'Wujek Bob już ci pożyczył'); st.loan = 110; E.deposit(100); push('info', 'Wujek Bob pożyczył $100. Odda się z czynszem ($110).'); save(); }
    function buyHeating() { need(perk('bulk'), 'Ogrzewanie dotyczy hali'); need(!st.heat, 'Już masz ogrzewanie'); need(E.pay(HEAT_COST), 'Za mało kasy'); st.heat = true; spend(HEAT_COST); save(); }
    /* ---------- lokale: wymagania, przeprowadzka ---------- */
    function locStatus(i) {
      var L = LOC[i]; if (!L) return null; var u = L.unlock || {};
      var req = [{ k: 'money', label: 'Obrót łącznie', need: u.money || 0, have: r2(st.stats.revenue) }, { k: 'rep', label: 'Reputacja', need: u.reputation || 0, have: Math.floor(st.rep) }, { k: 'level', label: 'Poziom', need: u.level || 1, have: level() }];
      req.forEach(function (r) { r.ok = r.have >= r.need; });
      var deposit = r2(L.deposit * (LECO.deposit_multiplier || 1)), notice = 0;   // weeks_notice_to_move: przeprowadzka zawsze „od jutra”, bez dopłaty (wypowiedzenie liczone w kaucji)
      var net = r2(deposit + notice - st.deposit);
      return { idx: i, loc: L, current: i === st.loc, unlocked: req.every(function (r) { return r.ok; }), req: req, deposit: deposit, notice: notice, refund: st.deposit, net: net, cashOk: net <= 0 || E.state.wallet >= net, rent: L.rent_week };
    }
    function locations() { return LOC.map(function (_, i) { return locStatus(i); }); }
    var KIT2TYPE = {}; Object.keys(TYPES).forEach(function (t) { KIT2TYPE[TYPES[t].kit] = t; if (TYPES[t].kitEmpty) KIT2TYPE[TYPES[t].kitEmpty] = t; });
    // rozkład mebli w nowym lokalu: lada najpierw (pozycja Artist albo pierwsza wolna), reszta zostaje w miejscu jeśli pasuje, inaczej pierwsze wolne pole
    function relayout(i, pieces) {
      var oldLoc = st.loc, oldFurn = st.furn; st.loc = i; var L = LOC[i], placed = [], left = [], fls = floors(L);
      var samples = (L.sample_furniture || []).map(function (s) { return { type: KIT2TYPE[s.item], tx: s.tx, ty: s.ty, rot: s.orientation === 'B' ? 1 : 0 }; }).filter(function (s) { return s.type; });
      var rank = function (f) { return f.type === 'counter' ? 0 : TYPES[f.type].wall ? 1 : 2; };
      var order = pieces.slice().sort(function (a, b) { return rank(a) - rank(b) || (TYPES[b.type].cost - TYPES[a.type].cost); });
      st.furn = placed;
      order.forEach(function (f) {
        if (TYPES[f.type].legacy || placed.length >= L.furniture_max) { left.push(f); return; }
        var cand = [[f.tx, f.ty, f.rot, f.fl || 0]], g = grid(L);
        samples.forEach(function (s) { if (s.type === f.type) cand.unshift([s.tx, s.ty, s.rot, 0]); });
        var spot = null;
        for (var c = 0; c < cand.length && !spot; c++) if (cand[c][3] < fls && !canPlace(f.type, cand[c][0], cand[c][1], null, cand[c][2], cand[c][3], placed)) spot = cand[c];
        spot = scan(f.type, placed, fls);
        if (spot) { f.tx = spot[0]; f.ty = spot[1]; f.rot = spot[2]; f.fl = spot[3]; placed.push(f); } else left.push(f);
      });
      st.furn = oldFurn; st.loc = oldLoc;
      return { placed: placed, left: left, counter: placed.some(function (f) { return f.type === 'counter'; }) };
    }
    // wolne miejsce: regały ścienne od tyłu, reszta od frontu (żeby nie zajmować ścian)
    function scan(type, furn, fls) {
      var g = grid(), wall = TYPES[type].wall, nr = TYPES[type].rot ? 2 : 1;
      for (var fl = 0; fl < (fls || floors()); fl++) for (var i = 0; i < g.h; i++) { var y = wall ? i : g.h - 1 - i; for (var j = 0; j < g.w; j++) { var x = wall ? j : g.w - 1 - j;
        for (var r = 0; r < nr; r++) if (!canPlace(type, x, y, null, r, fl, furn)) return [x, y, r, fl]; } }
      return null;
    }
    function previewMove(i) { var copy = JSON.parse(JSON.stringify(st.furn)), r = relayout(i, copy); return { placed: r.placed.length, left: r.left.map(function (f) { return f.type; }), counter: r.counter }; }
    function moveTo(i, opts) {
      opts = opts || {}; var s = locStatus(i); need(s, 'Nie ma takiego lokalu'); need(!s.current, 'Już tu jesteś'); need(st.phase === 'prep', 'Przeprowadzka tylko rano, przed otwarciem');
      need(s.unlocked, 'Lokal jeszcze niedostępny'); need(s.cashOk, 'Za mało kasy na kaucję (' + s.net + ')');
      var r = relayout(i, JSON.parse(JSON.stringify(st.furn))); need(r.counter, 'Lada się nie mieści');
      E.state.wallet = r2(E.state.wallet - s.net); E.save(); spend(Math.max(0, s.net));
      var keep = {}; r.placed.forEach(function (f) { keep[f.uid] = 1; });
      var sold = 0; st.furn.filter(function (f) { return !keep[f.uid]; }).forEach(function (f) { unstockAll(f); if (opts.sell || TYPES[f.type].legacy) { var b = refund(f); sold = r2(sold + b); E.deposit(b); } else st.stored.push({ type: f.type, lvl: f.lvl, paid: f.paid, upPaid: f.upPaid }); });
      r.placed.forEach(function (f) { var o = get(f.uid); o.tx = f.tx; o.ty = f.ty; o.rot = f.rot; o.fl = f.fl; });
      st.furn = st.furn.filter(function (f) { return keep[f.uid]; });
      st.loc = i; st.deposit = s.deposit; st.locSince = st.day; st.stats.moves++;
      var over = invTotal() - storageCap(); if (over > 0) unlockedSets().concat(Object.keys(st.inv)).forEach(function (k) { while (over > 0 && k !== 'comic' && st.inv[k] > 0) { st.inv[k]--; E.deposit(r2(wholesale(k) * 0.8)); over--; } });
      push('info', 'Przeprowadzka: ' + LOC[i].name_pl + '! Meble w nowym lokalu: ' + r.placed.length + (r.left.length ? ', ' + (opts.sell ? 'sprzedane: ' : 'w magazynie: ') + r.left.length : '') + '.');
      save(); return { placed: r.placed.length, left: r.left.length, sold: sold, paid: s.net };
    }
    /* ---------- migracja zapisów v1 (3 rozmiary sklepu, ceny w „dolarach” 1:1 ze złotówkami) ---------- */
    function migrate() {
      var o = st, map = [4, 5, 6], i = map[o.size | 0] || 4, oldLvl = 0, OLDXP = [0, 300, 900, 2200, 4500, 8000];
      while (oldLvl + 1 < OLDXP.length && o.xp >= OLDXP[oldLvl + 1]) oldLvl++;
      var L = LOC[i], s = E.state; ['wallet', 'pulled', 'spent', 'sold', 'deposits'].forEach(function (k) { if (typeof s[k] === 'number') s[k] = r2(s[k] * K); }); if (s.best) s.best.price = r2(s.best.price * K); E.save();
      var nst = fresh(o.slot || slot, o.hero); nst.day = o.day || 1; nst.inv = o.inv || nst.inv; nst.seenSets = o.seenSets || nst.seenSets; nst.uid = o.uid || 1; nst.loan = o.loan ? r2(o.loan * K) : 0;
      Object.keys(nst.stats).forEach(function (k) { var v = (o.stats || {})[k]; if (typeof v === 'number') nst.stats[k] = ['revenue', 'wholesale', 'furniture', 'rent', 'bills'].indexOf(k) >= 0 ? r2(v * K) : v; });
      if (o.stats && o.stats.bestSale) nst.stats.bestSale = { name: o.stats.bestSale.name, price: r2(o.stats.bestSale.price * K), day: o.stats.bestSale.day };
      nst.markup = { pack: (o.markup || {}).pack || 1, card: (o.markup || {}).card || 1, comic: (o.markup || {}).comic || 1, bulk: 0.1 };
      var lv = Math.max(L.unlock.level, [1, 3, 5, 8, 11, 14][oldLvl]); nst.xp = Math.max(LEVELS[lv - 1].xp, 0); nst.rep = Math.max(L.unlock.reputation, Math.round((nst.stats.customers || 0) * 0.05));
      nst.stats.revenue = Math.max(nst.stats.revenue, 0);
      nst.loc = i; nst.deposit = L.deposit; nst.locSince = nst.day; nst.migrated = 1;
      st = nst;
      var pieces = (o.furn || []).map(function (f) { if (!TYPES[f.type]) return null; var g = { uid: f.uid, type: f.type, tx: f.tx, ty: f.ty, rot: f.rot ? 1 : 0, fl: 0, lvl: f.lvl || 1, paid: TYPES[f.type].cost, upPaid: f.upPaid ? r2(f.upPaid * K) : 0, items: f.items || [], bulk: f.bulk || [], bulkPrice: 0.1 };
        g.items.forEach(function (it) { it.price = it.k === 'pack' ? nicePrice(msrp(it.set) * nst.markup.pack) : it.k === 'comic' ? nicePrice(COMIC.msrp * nst.markup.comic) : nicePrice(cv(it.id) * nst.markup.card); }); return g; }).filter(Boolean);
      if (!pieces.some(function (f) { return f.type === 'counter'; })) pieces.unshift({ uid: st.uid++, type: 'counter', tx: 0, ty: 0, rot: 0, fl: 0, lvl: 1, items: [], bulk: [], bulkPrice: 0.1 });
      var r = relayout(i, pieces); st.furn = r.placed;
      r.left.forEach(function (f) { unstockAll(f); if (TYPES[f.type].legacy) E.deposit(refund(f)); else st.stored.push({ type: f.type, lvl: f.lvl, paid: f.paid, upPaid: f.upPaid }); });
      push('info', 'Nowa wersja kariery: twój sklep przeniósł się do lokalu „' + L.name_pl + '” (ceny przeliczone na dolary z 1991).');
      save();
    }
    function nextGoal() {
      var L = LEVELS[levelIdx() + 1], locked = CAT.list.filter(function (s) { return !setUnlocked(s.id); })[0], nx = locStatus(st.loc + 1);
      return { level: L ? { name: L.name, need: L.xp - st.xp } : null, set: locked ? { name: locked.name, day: UNLOCK_DAY[locked.id] } : null, loc: nx };
    }
    function summary() { return { slot: slot, name: st.hero.name, shopName: st.hero.shopName, day: st.day, level: LEVELS[levelIdx()].name, wallet: E.state.wallet, look: st.hero.look, loc: loc().name_pl }; }
    function remove() { try { storage.removeItem(key(slot)); storage.removeItem(key(slot) + '.eco'); } catch (e) { } st = null; }
    Object.defineProperty(self, 'st', { get: function () { return st; } }); Object.defineProperty(self, 'E', { get: function () { return E; } }); Object.defineProperty(self, 'customers', { get: function () { return cust; } });
    Object.assign(self, { slot: slot, load: load, start: start, save: save, drain: drain, level: level, levelName: function () { return LEVELS[levelIdx()].name; },
      levelProgress: function () { var i = levelIdx(), a = LEVELS[i].xp, b = LEVELS[i + 1] ? LEVELS[i + 1].xp : a; return { cur: st.xp - a, need: b - a, max: !LEVELS[i + 1] }; },
      grid: grid, cell: cell, edgeAt: edgeAt, openings: openings, hasWalls: hasWalls, stairs: stairs, sources: sources, floors: floors, loc: loc, perk: perk,
      doorY: doorY, ownerTile: ownerTile, occ: occ, canPlace: canPlace, catalog: catalog, furnCost: furnCost, upgradeCost: upgradeCost, buyFurniture: buyFurniture, moveFurniture: moveFurniture, rotateFurniture: rotateFurniture, buyComics: buyComics, stockComics: stockComics, COMIC: COMIC, fp: fp, sellFurniture: sellFurniture, upgradeFurniture: upgradeFurniture,
      storeFurniture: storeFurniture, findSpot: function (type) { return scan(type, st.furn); }, placeStored: placeStored, sellStored: sellStored, furnMax: furnMax, storageCap: storageCap, storageFree: storageFree, buyHeating: buyHeating, HEAT_COST: HEAT_COST,
      get: get, cap: cap, wholesale: wholesale, buyStock: buyStock, invTotal: invTotal, msrp: msrp, stockPacks: stockPacks, stockCard: stockCard, fillBin: fillBin, unstock: unstock, setPrice: setPrice, reprice: reprice, autoStock: autoStock, value: value, cardValue: function (id) { return cv(id); },
      takePackToOpen: takePackToOpen, revealSpeed: revealSpeed, attract: attract, spawnRate: spawnRate, openShop: openShop, tick: tick, close: close, nextDay: nextDay, skipDay: skipDay, canLoan: canLoan, takeLoan: takeLoan, unlockedSets: unlockedSets, setUnlocked: setUnlocked,
      locations: locations, locStatus: locStatus, previewMove: previewMove, moveTo: moveTo, weeklyRent: weeklyRent, utilities: utilities, rainy: rainy, dateLabel: dateLabel, tournament: tournament,
      nextGoal: nextGoal, summary: summary, remove: remove, trait: trait, clock: function () { var m = Math.floor(st.time), h = OPEN_H + Math.floor(m / 60); return (h > 12 ? h - 12 : h) + ':' + ('0' + m % 60).slice(-2) + (h >= 12 ? ' PM' : ' AM'); },
      setLook: function (look) { st.hero.look = Hero.sanitize(look, level()); save(); }, nicePrice: nicePrice });
    return self;
  }
  function listSlots(deps) { var out = []; for (var s = 1; s <= SLOTS; s++) { var c = createShop(Object.assign({}, deps, { slot: s })); out.push(c.load() ? c.summary() : { slot: s, empty: true }); } return out; }
  var API = { COMIC: COMIC, CAT_ORDER: CAT_ORDER, createShop: createShop, listSlots: listSlots, TYPES: TYPES, LEVELS: LEVELS, LOC: LOC, UNLOCK_DAY: UNLOCK_DAY, DAY_MIN: DAY_MIN, WHOLESALE: WHOLESALE, BOX: BOX, BOX_RATE: BOX_RATE, SLOTS: SLOTS, key: key, VERSION: VERSION, K: K, msrpOf: msrpOf, START_WALLET: START_WALLET };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.PZShop = API;
})(typeof window !== 'undefined' ? window : this);
