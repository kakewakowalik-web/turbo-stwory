/* Katalog zestawów: oryginalne TURBO STWORY (data.js) + zestawy Artist (sets/sets.js).
 * Jedno miejsce z ceną, losowaniem i kartami każdego zestawu. Działa w przeglądarce (window.PZCat) i w Node (create).
 */
(function (root) {
  'use strict';
  function create(D, Sets) {
    var list = [{
      id: 'stwory', name: D.SET.name, sub: D.SET.series, tagline: 'KRYSZTAŁOWA GALAKTYKA', code: D.SET.code, price: D.PACK.price, size: D.CARDS.length, numSize: D.SET.size,
      perPack: D.PACK.slots.length, pack: D.PACK, cards: D.CARDS, sellRate: D.PACK.sellRate, packImage: null, cardBack: null,
      roll: function (rng, o) { return D.rollPack(rng, o); }
    }];
    if (Sets && Sets.SETS) Object.keys(Sets.SETS).forEach(function (k) {
      var S = Sets.SETS[k], m = S.meta;
      S.cards.forEach(function (c) { D.BY_ID[c.id] = c; });
      list.push({ id: k, name: m.name, sub: m.series, tagline: m.pack.tagline, code: m.code, price: m.pack.price, size: m.size, numSize: m.size,
        perPack: m.pack.slots.length, pack: m.pack, cards: S.cards, sellRate: m.pack.sellRate || D.PACK.sellRate,
        packImage: 'sets/' + m.packImage, cardBack: 'sets/' + m.cardBack,
        roll: function (rng, o) { return Sets.rollSetPack(k, rng, o); } });
    });
    var by = {}; list.forEach(function (s) { by[s.id] = s; });
    function get(id) { return by[id] || by.stwory; }
    function setOf(card) { if (typeof card === 'string') card = D.BY_ID[card]; return (card && card.set) || 'stwory'; }
    function expectedValue(id) {
      var s = get(id), tiers = {};
      s.cards.forEach(function (c) { (tiers[c.tier] = tiers[c.tier] || []).push(c.price); });
      function avg(t) { var a = tiers[t]; return a.reduce(function (x, y) { return x + y; }, 0) / a.length; }
      var ev = 0;
      s.pack.slots.forEach(function (sl) { if (sl === 'RARE') s.pack.rareSlot.forEach(function (o) { ev += o.p * avg(o.tier); }); else ev += avg(sl); });
      return ev;
    }
    function cardNo(c) { var s = get(setOf(c)); return c.set ? s.code + ' ' + D.pad3(c.num) + '/' + s.numSize : c.id + '/' + s.numSize; }
    return { list: list, get: get, has: function (id) { return !!by[id]; }, setOf: setOf, expectedValue: expectedValue, cardNo: cardNo };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { create: create };
  else { root.PZCatalog = { create: create }; root.PZCat = create(root.PZData, root.PZSets); }
})(typeof window !== 'undefined' ? window : this);
