/* Właściciel sklepu (kariera): wygląd składany z warstw sprite’ów Artist (kit/owner, manifest.owner) + przemalowania palety,
 * cechy-perki sklepu i losowanie. W przeglądarce PZHero.draw(canvas, look, {dir, frame, scale}) i PZHero.dataURL(...).
 * lvl = poziom reputacji sklepu, od którego dana opcja jest dostępna (kosmetyki do odblokowania).
 */
(function (root) {
  'use strict';
  var PARTS = {
    body: { label: 'Karnacja', items: [{ id: 'skin_light', name: 'Jasna' }, { id: 'skin_medium', name: 'Średnia' }, { id: 'skin_tan', name: 'Opalona' }, { id: 'skin_dark', name: 'Ciemna' }] },
    hair: { label: 'Fryzura', items: [{ id: 'mullet', name: 'Mullet' }, { id: 'short', name: 'Krótkie' }, { id: 'long', name: 'Długie rockowe' }, { id: 'cap', name: 'Czapka z daszkiem' }] },
    hairColor: { label: 'Kolor włosów', items: [{ id: 'brown', name: 'Brązowe', c: '#6b3d1e' }, { id: 'blonde', name: 'Blond', c: '#f0c75a' }, { id: 'black', name: 'Czarne', c: '#2a2230' }, { id: 'red', name: 'Rude', c: '#c4512a' },
      { id: 'platinum', name: 'Platynowe', c: '#efe8d0', lvl: 2 }, { id: 'pink', name: 'Neonowy róż', c: '#ff4fb0', lvl: 4 }, { id: 'cyan', name: 'Neonowy cyjan', c: '#2fe0e8', lvl: 5 }] },
    top: { label: 'Góra', items: [{ id: 'denim_jacket', name: 'Kurtka jeansowa' }, { id: 'tee', name: 'T-shirt' }, { id: 'flannel', name: 'Flanela' }] },
    topColor: { label: 'Kolor góry', items: [{ id: 'orig', name: 'Oryginalny' }, { id: 'red', name: 'Czerwony', c: '#d8352a' }, { id: 'teal', name: 'Turkusowy', c: '#1fb5a8', lvl: 2 }, { id: 'purple', name: 'Fioletowy', c: '#7b3fc9', lvl: 3 },
      { id: 'neon', name: 'Neonowy róż', c: '#ff3fa4', lvl: 4 }, { id: 'gold', name: 'Złoty (szef mallu)', c: '#e8b020', lvl: 6 }] },
    pants: { label: 'Spodnie', items: [{ id: 'jeans', name: 'Jeansy' }, { id: 'shorts', name: 'Szorty' }] },
    pantsColor: { label: 'Kolor spodni', items: [{ id: 'orig', name: 'Oryginalny' }, { id: 'black', name: 'Czarne', c: '#2a2830' }, { id: 'khaki', name: 'Khaki', c: '#b59a6a', lvl: 2 }, { id: 'acid', name: 'Marmurkowe', c: '#9ab4d8', lvl: 3 }] },
    shoes: { label: 'Sneakersy', items: [{ id: 'sneakers_white', name: 'Białe' }, { id: 'sneakers_red', name: 'Czerwone' }] }
  };
  var ORDER = ['body', 'hair', 'hairColor', 'top', 'topColor', 'pants', 'pantsColor', 'shoes'];
  var TRAITS = [
    { id: 'sprzedawca', name: 'Sprzedawca', en: 'Salesman', desc: 'Gadane jak z reklamy TV: klienci akceptują o 10% wyższe ceny.', priceTol: 0.10 },
    { id: 'kolekcjoner', name: 'Kolekcjoner', en: 'Collector', desc: 'Kolekcjonerzy cię znają: 60% częściej pytają o konkretne karty i płacą za nie 40% ponad wartość (zamiast 25%).', reqBonus: 0.4, reqRate: 1.6 },
    { id: 'szczesciarz', name: 'Szczęściarz', en: 'Lucky', desc: '12% otwieranych paczek dostaje drugą szansę na ostatniej (rzadkiej) karcie.', luck: 0.12 },
    { id: 'zlota_raczka', name: 'Złota rączka', en: 'Handyman', desc: 'Sam skręcasz meble: zakup i ulepszenia mebli 25% taniej.', furnDiscount: 0.25 }
  ];
  function part(k, id) { var a = PARTS[k].items; for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i]; return a[0]; }
  function trait(id) { for (var i = 0; i < TRAITS.length; i++) if (TRAITS[i].id === id) return TRAITS[i]; return TRAITS[0]; }
  function available(k, lvl) { return PARTS[k].items.filter(function (x) { return (x.lvl || 1) <= (lvl || 1); }); }
  function random(rng, lvl) { rng = rng || Math.random; var L = {}; ORDER.forEach(function (k) { var a = available(k, lvl); L[k] = a[(rng() * a.length) | 0].id; }); if (rng() < 0.5) L.topColor = 'orig'; if (rng() < 0.6) L.pantsColor = 'orig'; return L; }
  function defaults() { return { body: 'skin_light', hair: 'mullet', hairColor: 'brown', top: 'denim_jacket', topColor: 'orig', pants: 'jeans', pantsColor: 'orig', shoes: 'sneakers_white' }; }
  function sanitize(L, lvl) { var o = {}; L = L || {}; ORDER.forEach(function (k) { var p = part(k, L[k]); o[k] = (p.lvl || 1) <= (lvl || 99) ? p.id : PARTS[k].items[0].id; }); return o; }
  var NAMES = ['Mike', 'Dave', 'Rick', 'Tony', 'Jenny', 'Lisa', 'Steve', 'Kevin', 'Tina', 'Gary', 'Wendy', 'Chuck', 'Brenda', 'Ray', 'Donna', 'Łukasz'];
  function randomName(rng) { rng = rng || Math.random; return NAMES[(rng() * NAMES.length) | 0]; }

  /* ---------- rysowanie (tylko przeglądarka) ---------- */
  var IMG = {}, MAIN = {}, cache = {};
  function hex(c) { var n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function kit() { return root.SHOP_KIT && root.SHOP_KIT.owner; }
  function img(src, cb) { if (IMG[src]) { if (IMG[src].complete && IMG[src].naturalWidth) cb && cb(); else IMG[src].addEventListener('load', function () { cb && cb(); }); return IMG[src]; } var i = new Image(); i.src = 'kit/' + src; IMG[src] = i; i.addEventListener('load', function () { cb && cb(); }); return i; }
  function preload(cb) { var O = kit(), n = 0, need = 0; Object.keys(O.parts).forEach(function (L) { Object.keys(O.parts[L]).forEach(function (p) { need++; img(O.parts[L][p].src, function () { if (++n === need && cb) cb(); }); }); }); }
  // przemalowanie warstwy: włosy = dokładny piksel #6b3d1e (i jego cienie), góra/spodnie = dominujący kolor warstwy
  function layer(L, pid, look) {
    var O = kit(), src = O.parts[L][pid].src, im = IMG[src]; if (!im || !im.complete || !im.naturalWidth) return null;
    var tint = L === 'hair' ? part('hairColor', look.hairColor) : L === 'top' ? part('topColor', look.topColor) : L === 'pants' ? part('pantsColor', look.pantsColor) : null;
    if (!tint || !tint.c || (L === 'hair' && tint.id === 'brown')) return im;
    var k = src + '|' + tint.c; if (cache[k]) return cache[k];
    var cv = document.createElement('canvas'); cv.width = im.naturalWidth; cv.height = im.naturalHeight; var x = cv.getContext('2d'); x.drawImage(im, 0, 0);
    var d; try { d = x.getImageData(0, 0, cv.width, cv.height); } catch (e) { d = null; }
    if (!d) { // file:// – płótno „skażone”: zamiast pikseli przemalowanie mieszaniem 'color' (zachowuje jasność, alfa z warstwy)
      x.globalCompositeOperation = 'color'; x.fillStyle = tint.c; x.fillRect(0, 0, cv.width, cv.height);
      x.globalCompositeOperation = 'destination-in'; x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-over'; cache[k] = cv; return cv;
    }
    var p = d.data, to = hex(tint.c), from;
    if (L === 'hair') from = [hex('#6b3d1e')];
    else { if (!MAIN[src]) { var cnt = {}; for (var i = 0; i < p.length; i += 4) { if (p[i + 3] < 200) continue; var s = p[i] + ',' + p[i + 1] + ',' + p[i + 2]; if (p[i] + p[i + 1] + p[i + 2] < 120) continue; cnt[s] = (cnt[s] || 0) + 1; } MAIN[src] = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; }).slice(0, 2).map(function (s) { return s.split(',').map(Number); }); } from = MAIN[src]; }
    var base = from[0];
    for (var j = 0; j < p.length; j += 4) { if (p[j + 3] < 10) continue; for (var f = 0; f < from.length; f++) { var c = from[f]; if (Math.abs(p[j] - c[0]) + Math.abs(p[j + 1] - c[1]) + Math.abs(p[j + 2] - c[2]) < 6) { var kk = f === 0 ? 1 : (c[0] + c[1] + c[2]) / Math.max(1, base[0] + base[1] + base[2]); p[j] = Math.min(255, to[0] * kk); p[j + 1] = Math.min(255, to[1] * kk); p[j + 2] = Math.min(255, to[2] * kk); break; } } }
    x.putImageData(d, 0, 0); cache[k] = cv; return cv;
  }
  // rysuje jedną klatkę (dir: SE/SW/NE/NW, frame 0 = idle, 1-4 chód) z dołem stóp w (x,y), scale względem 1x
  function draw(ctx, look, x, y, o) {
    o = o || {}; var O = kit(); if (!O) return false; look = sanitize(look);
    var fw = O.sheet.frame_size[0] * 2, fh = O.sheet.frame_size[1] * 2, ax = O.sheet.anchor[0] * 2, ay = O.sheet.anchor[1] * 2, sc = (o.scale || 1) / 2;
    var row = O.sheet.rows.indexOf(o.dir || 'SE'), col = o.frame || 0, ok = true;
    O.layer_order.forEach(function (L) {
      var pid = L === 'shadow' ? 'default' : look[L]; if (!O.parts[L][pid]) return;
      var src = layer(L, pid, look); if (!src) { img(O.parts[L][pid].src); ok = false; return; }
      ctx.drawImage(src, col * fw, row * fh, fw, fh, x - ax * sc, y - ay * sc, fw * sc, fh * sc);
    });
    return ok;
  }
  function portrait(canvas, look, o) {
    o = o || {}; var c = canvas.getContext('2d'); c.imageSmoothingEnabled = false; c.clearRect(0, 0, canvas.width, canvas.height);
    var sc = o.scale || Math.floor(canvas.height / 58);
    var ok = draw(c, look, canvas.width / 2, canvas.height - 2 * sc, { scale: sc, dir: o.dir || 'SE', frame: o.frame || 0 });
    if (!ok) preload(function () { portrait(canvas, look, o); });
  }
  var API = { PARTS: PARTS, ORDER: ORDER, TRAITS: TRAITS, part: part, trait: trait, available: available, random: random, defaults: defaults, sanitize: sanitize, randomName: randomName, draw: draw, portrait: portrait, preload: preload };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.PZHero = API;
})(typeof window !== 'undefined' ? window : this);
