/* TURBO STWORY – Seria I "Kryształowa Galaktyka" (1993)
 * Dane zestawu, rzadkości i szanse. Działa w przeglądarce (window.PZData) i w Node (module.exports).
 * Wszystko, co dotyczy ekonomii paczki, stroi się TUTAJ.
 */
(function (root) {
  'use strict';

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var SET = { name: 'TURBO STWORY', series: 'Seria I · Kryształowa Galaktyka', year: 1993, size: 150, code: 'KG' };

  /* Rzadkości: min/max = zakres cen rynkowych (zł) w danym poziomie. */
  var TIERS = {
    C:  { key: 'C',  name: 'Pospolita',    short: 'P',  sym: '●',  count: 65, min: 0.10, max: 0.30, rank: 0 },
    U:  { key: 'U',  name: 'Niepospolita', short: 'N',  sym: '◆',  count: 40, min: 0.40, max: 1.20, rank: 1 },
    R:  { key: 'R',  name: 'Rzadka',       short: 'R',  sym: '★',  count: 22, min: 1.80, max: 5.20, rank: 2 },
    H:  { key: 'H',  name: 'Holo',         short: 'H',  sym: '★',  count: 15, prices: [8, 9, 10, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 25, 30], rank: 3 },
    UR: { key: 'UR', name: 'Ultra',        short: 'U',  sym: '★★', count: 8,  prices: [25, 30, 35, 40, 50, 60, 80, 120], rank: 4 },
    SR: { key: 'SR', name: 'Sekretna',     short: 'S',  sym: '✦',  count: 5,  prices: [280, 420, 550, 750, 1200], rank: 5 }
  };
  var TIER_ORDER = ['C', 'U', 'R', 'H', 'UR', 'SR'];

  /* Paczka: 10 kart = 6 pospolitych, 3 niepospolite, 1 slot "rzadki" (zawsze na końcu, jak w prawdziwych paczkach). */
  var PACK = {
    price: 20,
    sellRate: 0.85,          // skup w sklepiku płaci 85% ceny rynkowej
    startWallet: 200,
    pocketMoney: 50,
    slots: ['C', 'C', 'C', 'C', 'C', 'C', 'U', 'U', 'U', 'RARE'],
    rareSlot: [               // szanse w slocie rzadkim (suma = 1)
      { tier: 'R',  p: 0.825 },
      { tier: 'H',  p: 0.14 },
      { tier: 'UR', p: 0.03 },
      { tier: 'SR', p: 0.005 } // 1 na 200 paczek
    ]
  };

  var ELEMENTS = [
    { key: 'ogien',  name: 'Ognia',  bg: ['#ffd27a', '#e4572e'], body: ['#ff6b35', '#d7263d', '#ffa600', '#ff8c42'] },
    { key: 'woda',   name: 'Wody',   bg: ['#bfe6ff', '#2e86de'], body: ['#3fa7d6', '#2a6fdb', '#59c3c3', '#4cc9f0'] },
    { key: 'las',    name: 'Lasu',   bg: ['#dff5b5', '#3aa655'], body: ['#6abf4b', '#2f9e44', '#a3c552', '#40916c'] },
    { key: 'prad',   name: 'Prądu',  bg: ['#fff7b0', '#f4b400'], body: ['#ffd23f', '#f9a620', '#ffe066', '#fcbf49'] },
    { key: 'mrok',   name: 'Mroku',  bg: ['#c9b6ef', '#40206e'], body: ['#7b4bc4', '#5a189a', '#9d4edd', '#3c096c'] },
    { key: 'kosmos', name: 'Kosmosu', bg: ['#ffc2e6', '#7b2ff7'], body: ['#e056fd', '#ff4fa3', '#7d5fff', '#c77dff'] }
  ];

  var SYL_A = ['Gro', 'Pyr', 'Bul', 'Zyg', 'Kra', 'Mru', 'Flo', 'Wol', 'Szu', 'Trz', 'Bzy', 'Lod', 'Pio', 'Grz', 'Dym', 'Żar', 'Ple', 'Kol', 'Bąb', 'Chr', 'Sko', 'Fik', 'Tur', 'Gul', 'Brum', 'Pst', 'Śli', 'Mgł', 'Kwa', 'Zgr'];
  var SYL_B = ['ma', 'zo', 'ku', 'ra', 'bi', 'lo', 'te', 'ni', 'pu', 'do', 'ge', 'fi', ''];
  var SYL_C = ['zaur', 'tek', 'bot', 'on', 'ik', 'nik', 'mon', 'rex', 'gryz', 'ak', 'ś', 'cz', 'lak', 'tor', 'mol', 'ciak', 'ozor', 'ątko'];
  var ATK_A = ['Turbo', 'Mega', 'Kosmiczny', 'Podwójny', 'Szalony', 'Błyskawiczny', 'Kryształowy', 'Neonowy', 'Dziki', 'Wściekły', 'Hiper', 'Cichy'];
  var ATK_B = ['Kopniak', 'Ryk', 'Ogon', 'Promień', 'Skok', 'Gryz', 'Wir', 'Taran', 'Pisk', 'Cios', 'Laser', 'Podmuch'];
  var FLAVOR = [
    'Mieszka pod łóżkiem i kradnie skarpetki.', 'Uwielbia gumę balonową o smaku coli.', 'Budzi się tylko przy dźwięku modemu.',
    'Potrafi przewinąć kasetę ołówkiem w 3 sekundy.', 'Nigdy nie oddaje pożyczonych kaset VHS.', 'Śpi zwinięty w kłębek na kineskopie.',
    'Zjada baterie AA na śniadanie.', 'Jego ryk słychać aż na drugim podwórku.', 'Kolekcjonuje kapsle i karteczki z gum.',
    'Ma rekord w grze o spadających klockach.', 'Świeci w ciemności jak zegarek z neonem.', 'Wychodzi tylko po Dobranocce.'
  ];
  var SPECIAL = {
    // ręcznie nazwane karty z górnej półki
    UR: ['Generał Burzomir', 'Lodowa Królowa Szronia', 'Mechagryz 3000', 'Wulkanor Starszy', 'Duch Kineskopu', 'Turbo Lisza', 'Kapitan Bąbelek', 'Pan Kasetowiec'],
    SR: ['Kosmiczny Ślimakor', 'Neonowy Feniks', 'Kryształowy Behemot', 'Mroczny Cesarz Gryzon', 'Złoty Smokator']
  };

  function round2(x) { return Math.round(x * 100) / 100; }

  function buildCards() {
    var rng = mulberry32(1993);
    var used = {};
    function name() {
      for (var k = 0; k < 200; k++) {
        var n = SYL_A[(rng() * SYL_A.length) | 0] + SYL_B[(rng() * SYL_B.length) | 0] + SYL_C[(rng() * SYL_C.length) | 0];
        if (!used[n]) { used[n] = 1; return n; }
      }
      return 'Stworek' + Object.keys(used).length;
    }
    var cards = [], num = 1;
    TIER_ORDER.forEach(function (tk) {
      var t = TIERS[tk];
      for (var i = 0; i < t.count; i++) {
        var price = t.prices ? t.prices[i] : round2(t.min + (t.max - t.min) * (t.count === 1 ? 0 : i / (t.count - 1)));
        var el = ELEMENTS[(rng() * ELEMENTS.length) | 0];
        var lvl = t.rank;
        var nm = (tk === 'UR' || tk === 'SR') ? SPECIAL[tk][i] : name();
        if (tk === 'SR') el = ELEMENTS[[5, 0, 1, 4, 3][i]];
        var c = {
          id: pad3(num), num: num, name: nm, tier: tk, el: el.key, elName: el.name,
          hp: 30 + lvl * 20 + ((rng() * 4) | 0) * 10,
          atk: { name: ATK_A[(rng() * ATK_A.length) | 0] + ' ' + ATK_B[(rng() * ATK_B.length) | 0], dmg: 10 + lvl * 15 + ((rng() * 4) | 0) * 10 },
          text: FLAVOR[(rng() * FLAVOR.length) | 0],
          price: price, seed: (rng() * 1e9) | 0
        };
        cards.push(c); num++;
      }
    });
    return cards;
  }
  function pad3(n) { return (n < 10 ? '00' : n < 100 ? '0' : '') + n; }

  var CARDS = buildCards();
  var BY_ID = {}; CARDS.forEach(function (c) { BY_ID[c.id] = c; });
  var BY_TIER = {}; TIER_ORDER.forEach(function (t) { BY_TIER[t] = CARDS.filter(function (c) { return c.tier === t; }); });

  function pickRareTier(rng) {
    var r = rng(), acc = 0;
    for (var i = 0; i < PACK.rareSlot.length; i++) { acc += PACK.rareSlot[i].p; if (r < acc) return PACK.rareSlot[i].tier; }
    return PACK.rareSlot[0].tier;
  }

  /* Losuje zawartość paczki. opts.force = 'R'|'H'|'UR'|'SR' wymusza poziom slotu rzadkiego (tryb demo). */
  function rollPack(rng, opts) {
    rng = rng || Math.random; opts = opts || {};
    var taken = {}, out = [];
    PACK.slots.forEach(function (slot) {
      var tier = slot === 'RARE' ? (opts.force || pickRareTier(rng)) : slot;
      var pool = BY_TIER[tier], c;
      for (var k = 0; k < 20; k++) { c = pool[(rng() * pool.length) | 0]; if (!taken[c.id]) break; }
      taken[c.id] = 1; out.push(c.id);
    });
    return out;
  }

  function avg(arr) { return arr.reduce(function (a, c) { return a + c.price; }, 0) / arr.length; }
  /* Wartość oczekiwana paczki, liczona analitycznie. */
  function expectedValue() {
    var ev = 0;
    PACK.slots.forEach(function (s) {
      if (s === 'RARE') PACK.rareSlot.forEach(function (o) { ev += o.p * avg(BY_TIER[o.tier]); });
      else ev += avg(BY_TIER[s]);
    });
    return ev;
  }

  var api = { SET: SET, TIERS: TIERS, TIER_ORDER: TIER_ORDER, PACK: PACK, ELEMENTS: ELEMENTS, CARDS: CARDS, BY_ID: BY_ID, BY_TIER: BY_TIER,
    rollPack: rollPack, expectedValue: expectedValue, mulberry32: mulberry32, pad3: pad3, round2: round2 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PZData = api;
})(typeof window !== 'undefined' ? window : this);
