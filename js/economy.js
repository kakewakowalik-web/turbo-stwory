/* Ekonomia sesji: portfel, statystyki, kolekcja (wszystkie zestawy), sprzedaż, zapis do localStorage.
 * createEconomy(data, storage, key, catalog) – storage z getItem/setItem (localStorage albo atrapa w testach),
 * catalog = PZCat (gdy brak: tylko TURBO STWORY z data.js).
 */
(function (root) {
  'use strict';
  function createEconomy(D, storage, key, cat, opts) {
    opts = opts || {};
    key = key || 'paczki.v1';
    if (!cat) { var C = (typeof module !== 'undefined' && module.exports) ? require('./catalog.js') : root.PZCatalog; cat = C.create(D, null); }
    var r2 = D.round2;
    function fresh() {
      var w0 = opts.startWallet != null ? opts.startWallet : D.PACK.startWallet;
      return { v: 1, wallet: w0, deposits: w0, spent: 0, pulled: 0, sold: 0, packs: 0, packsBySet: {}, lastSet: 'stwory',
        best: null, collection: {}, pending: null, sound: true, tierHits: {} };
    }
    var S = fresh();
    function migrate(o) {
      // zapisy sprzed zestawów: wszystkie karty to TURBO STWORY, paczki liczone jako stwory
      if (!o.packsBySet) o.packsBySet = o.packs ? { stwory: o.packs } : {};
      if (o.pending && !o.pending.set) { o.pending.set = 'stwory'; o.pending.price = D.PACK.price; }
      if (o.pending && !cat.has(o.pending.set)) o.pending = null;
      Object.keys(o.collection || {}).forEach(function (id) { if (!D.BY_ID[id]) delete o.collection[id]; });
      if (o.best && !D.BY_ID[o.best.id]) o.best = null;
      if (!cat.has(o.lastSet)) o.lastSet = 'stwory';
      return o;
    }
    function load() {
      try { var raw = storage && storage.getItem(key); if (raw) { var o = JSON.parse(raw); if (o && o.v === 1) S = Object.assign(fresh(), migrate(o)); } } catch (e) { S = fresh(); }
      return S;
    }
    function save() { try { storage && storage.setItem(key, JSON.stringify(S)); } catch (e) { /* brak miejsca – trudno */ } }
    function price(setId) { return cat.get(setId || 'stwory').price; }
    function canBuy(setId) { return !S.pending && S.wallet + 1e-9 >= price(setId); }
    function cheapest() { return Math.min.apply(null, cat.list.map(function (s) { return s.price; })); }
    function buy(rng, bo) {
      var opts = bo || {}; var sid = cat.has(opts.set) ? opts.set : 'stwory', set = cat.get(sid);
      if (S.pending) throw new Error('Najpierw otwórz poprzednią paczkę');
      if (!canBuy(sid)) throw new Error('Za mało pieniędzy');
      S.wallet = r2(S.wallet - set.price); S.spent = r2(S.spent + set.price); S.packs++;
      S.packsBySet[sid] = (S.packsBySet[sid] || 0) + 1; S.lastSet = sid;
      var cards = set.roll(rng, opts.force ? { force: opts.force } : undefined);
      cards = lucky(set, cards, rng);
      S.pending = { set: sid, price: set.price, cards: cards, revealed: 0, pulled: false, value: 0 };
      save(); return S.pending;
    }
    // cecha „Szczęściarz”: z szansą opts.luck ostatni (rzadki) slot losowany drugi raz, zostaje lepsza karta
    function lucky(set, cards, rng) {
      if (!opts.luck || rng() >= opts.luck) return cards;
      var alt = set.roll(rng), i = cards.length - 1;
      if (D.BY_ID[alt[i]].price > D.BY_ID[cards[i]].price) { cards = cards.slice(); cards[i] = alt[i]; }
      return cards;
    }
    // kariera sklepu: paczka z własnego magazynu (bez płacenia – koszt poniesiony w hurtowni)
    function grant(rng, o) {
      o = o || {}; var sid = cat.has(o.set) ? o.set : 'stwory', set = cat.get(sid);
      if (S.pending) throw new Error('Najpierw otwórz poprzednią paczkę');
      S.packs++; S.packsBySet[sid] = (S.packsBySet[sid] || 0) + 1; S.lastSet = sid;
      S.pending = { set: sid, price: o.cost != null ? o.cost : set.price, cards: lucky(set, set.roll(rng), rng), revealed: 0, pulled: false, value: 0, owned: true };
      S.spent = r2(S.spent + (o.cost || 0)); save(); return S.pending;
    }
    // kariera: wartości kart w realnych dolarach z 1991 (opts.valueScale), gra swobodna = 1 (zł)
    function cv(id) { var c = typeof id === 'object' ? id : D.BY_ID[id]; return opts.valueScale ? Math.max(0.05, r2(c.price * opts.valueScale)) : c.price; }
    function markPulled() { if (S.pending) { S.pending.pulled = true; save(); } }
    function revealNext() {
      var p = S.pending; if (!p || p.revealed >= p.cards.length) return null;
      var c = D.BY_ID[p.cards[p.revealed++]];
      S.collection[c.id] = (S.collection[c.id] || 0) + 1;
      var cp = cv(c); S.pulled = r2(S.pulled + cp); p.value = r2(p.value + cp);
      S.tierHits[c.tier] = (S.tierHits[c.tier] || 0) + 1;
      var isBest = !S.best || cp > S.best.price;
      if (isBest) S.best = { id: c.id, price: cp };
      save(); return { card: c, isBest: isBest };
    }
    function finishPack() { var p = S.pending; if (!p) return null; while (p.revealed < p.cards.length) revealNext(); S.pending = null; save(); return p; }
    function sellPrice(id) { var c = D.BY_ID[id]; return r2(cv(c) * (opts.sellRate || cat.get(cat.setOf(c)).sellRate)); }
    function sellRate(id) { return opts.sellRate || cat.get(cat.setOf(id)).sellRate; }
    function sell(id, n) {
      n = n || 1; var have = S.collection[id] || 0; n = Math.min(n, have); if (!n) return 0;
      var got = r2(sellPrice(id) * n);
      S.collection[id] = have - n; if (!S.collection[id]) delete S.collection[id];
      S.wallet = r2(S.wallet + got); S.sold = r2(S.sold + got); save(); return got;
    }
    function ids(setId) { return Object.keys(S.collection).filter(function (id) { return !setId || cat.setOf(id) === setId; }); }
    function duplicatesValue(setId) { var t = 0; ids(setId).forEach(function (id) { if (S.collection[id] > 1) t += sellPrice(id) * (S.collection[id] - 1); }); return r2(t); }
    function duplicatesCount(setId) { var t = 0; ids(setId).forEach(function (id) { t += S.collection[id] - 1; }); return t; }
    function sellDuplicates(setId) { var t = 0; ids(setId).forEach(function (id) { if (S.collection[id] > 1) t += sell(id, S.collection[id] - 1); }); return r2(t); }
    function pocketMoney() { if (S.wallet >= cheapest()) return 0; S.wallet = r2(S.wallet + D.PACK.pocketMoney); S.deposits = r2(S.deposits + D.PACK.pocketMoney); save(); return D.PACK.pocketMoney; }
    function collectionValue(setId) { var t = 0; ids(setId).forEach(function (id) { t += cv(id) * S.collection[id]; }); return r2(t); }
    function uniqueCount(setId) { return ids(setId).length; }
    // kariera: przychody z pracy/nagród, wydatki poza paczkami, wymiany kart bez pieniędzy
    function deposit(v) { v = r2(v); S.wallet = r2(S.wallet + v); S.deposits = r2(S.deposits + v); save(); return v; }
    function pay(v) { v = r2(v); if (S.wallet + 1e-9 < v) return false; S.wallet = r2(S.wallet - v); save(); return true; }
    function addCard(id) { S.collection[id] = (S.collection[id] || 0) + 1; save(); }
    function removeCard(id) { if (!S.collection[id]) return false; if (!--S.collection[id]) delete S.collection[id]; save(); return true; }
    function profit() { return r2(S.pulled - S.spent); }
    function reset() { var snd = S.sound; S = fresh(); S.sound = snd; save(); }
    function setSound(on) { S.sound = !!on; save(); }
    return { get state() { return S; }, catalog: cat, load: load, save: save, price: price, canBuy: canBuy, cheapest: cheapest, buy: buy, grant: grant, markPulled: markPulled, revealNext: revealNext,
      finishPack: finishPack, sell: sell, sellPrice: sellPrice, sellDuplicates: sellDuplicates, duplicatesValue: duplicatesValue, duplicatesCount: duplicatesCount,
      pocketMoney: pocketMoney, deposit: deposit, pay: pay, addCard: addCard, removeCard: removeCard, sellRate: sellRate, cardValue: cv, opts: opts, collectionValue: collectionValue, uniqueCount: uniqueCount, profit: profit, reset: reset, setSound: setSound };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { createEconomy: createEconomy }; else root.PZEconomy = { createEconomy: createEconomy };
})(typeof window !== 'undefined' ? window : this);
