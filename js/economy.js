/* Ekonomia sesji: portfel, statystyki, kolekcja, sprzedaż, zapis do localStorage.
 * createEconomy(data, storage, key) – storage to obiekt z getItem/setItem (localStorage albo atrapa w testach).
 */
(function (root) {
  'use strict';
  function createEconomy(D, storage, key) {
    key = key || 'paczki.v1';
    var r2 = D.round2;
    function fresh() {
      return { v: 1, wallet: D.PACK.startWallet, deposits: D.PACK.startWallet, spent: 0, pulled: 0, sold: 0, packs: 0,
        best: null, collection: {}, pending: null, sound: true, tierHits: {} };
    }
    var S = fresh();
    function load() {
      try { var raw = storage && storage.getItem(key); if (raw) { var o = JSON.parse(raw); if (o && o.v === 1) S = Object.assign(fresh(), o); } } catch (e) { S = fresh(); }
      return S;
    }
    function save() { try { storage && storage.setItem(key, JSON.stringify(S)); } catch (e) { /* brak miejsca – trudno */ } }

    function canBuy() { return !S.pending && S.wallet + 1e-9 >= D.PACK.price; }
    function buy(rng, opts) {
      if (S.pending) throw new Error('Najpierw otwórz poprzednią paczkę');
      if (!canBuy()) throw new Error('Za mało pieniędzy');
      S.wallet = r2(S.wallet - D.PACK.price); S.spent = r2(S.spent + D.PACK.price); S.packs++;
      S.pending = { cards: D.rollPack(rng, opts), revealed: 0, pulled: false, value: 0 };
      save(); return S.pending;
    }
    function markPulled() { if (S.pending) { S.pending.pulled = true; save(); } }
    /* Odsłania kolejną kartę: dopisuje do kolekcji i do wartości wyciągniętych kart. */
    function revealNext() {
      var p = S.pending; if (!p || p.revealed >= p.cards.length) return null;
      var c = D.BY_ID[p.cards[p.revealed++]];
      S.collection[c.id] = (S.collection[c.id] || 0) + 1;
      S.pulled = r2(S.pulled + c.price); p.value = r2(p.value + c.price);
      S.tierHits[c.tier] = (S.tierHits[c.tier] || 0) + 1;
      var isBest = !S.best || c.price > S.best.price;
      if (isBest) S.best = { id: c.id, price: c.price };
      save(); return { card: c, isBest: isBest };
    }
    function finishPack() { var p = S.pending; if (!p) return null; while (p.revealed < p.cards.length) revealNext(); S.pending = null; save(); return p; }
    function sellPrice(id) { return r2(D.BY_ID[id].price * D.PACK.sellRate); }
    function sell(id, n) {
      n = n || 1; var have = S.collection[id] || 0; n = Math.min(n, have); if (!n) return 0;
      var got = r2(sellPrice(id) * n);
      S.collection[id] = have - n; if (!S.collection[id]) delete S.collection[id];
      S.wallet = r2(S.wallet + got); S.sold = r2(S.sold + got); save(); return got;
    }
    function duplicatesValue() { var t = 0; for (var id in S.collection) if (S.collection[id] > 1) t += sellPrice(id) * (S.collection[id] - 1); return r2(t); }
    function sellDuplicates() { var t = 0; Object.keys(S.collection).forEach(function (id) { if (S.collection[id] > 1) t += sell(id, S.collection[id] - 1); }); return r2(t); }
    function pocketMoney() { if (S.wallet >= D.PACK.price) return 0; S.wallet = r2(S.wallet + D.PACK.pocketMoney); S.deposits = r2(S.deposits + D.PACK.pocketMoney); save(); return D.PACK.pocketMoney; }
    function collectionValue() { var t = 0; for (var id in S.collection) t += D.BY_ID[id].price * S.collection[id]; return r2(t); }
    function uniqueCount() { return Object.keys(S.collection).length; }
    function profit() { return r2(S.pulled - S.spent); }
    function reset() { var snd = S.sound; S = fresh(); S.sound = snd; save(); }
    function setSound(on) { S.sound = !!on; save(); }
    return { get state() { return S; }, load: load, save: save, canBuy: canBuy, buy: buy, markPulled: markPulled, revealNext: revealNext,
      finishPack: finishPack, sell: sell, sellPrice: sellPrice, sellDuplicates: sellDuplicates, duplicatesValue: duplicatesValue,
      pocketMoney: pocketMoney, collectionValue: collectionValue, uniqueCount: uniqueCount, profit: profit, reset: reset, setSound: setSound };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { createEconomy: createEconomy }; else root.PZEconomy = { createEconomy: createEconomy };
})(typeof window !== 'undefined' ? window : this);
