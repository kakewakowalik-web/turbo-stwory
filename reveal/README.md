# TURBO STWORY – odkrycie karty („reveal”)

Pakiet dla Game Makera: sekwencja odkrywania karty w 6 poziomach (po jednym na każdą rzadkość z `js/data.js`). Im rzadsza karta, tym dłuższe napięcie i większy wybuch. Wszystko jest wygenerowane z kodu: grafika w Pillow, dźwięki w numpy (chiptune), animacja w vanilla JS z Canvas i DOM. Nie trzeba niczego budować, działa też z `file://`.

* `demo.html` – otwórz w przeglądarce. Przyciski u góry odtwarzają każdy poziom na karcie Złoty Smokator.
* `preview_top.gif` / `preview_top.mp4` (z dźwiękiem) – podgląd najwyższego poziomu (SR).
* `frames_top.png` – plansza kluczowych klatek SR z czasami.

Styl: naklejka z gumy do żucia z lat 90. (styl C), czyli grube kontury `#1a1220`, raster halftone, komiksowe gwiazdy i kremowy papier. Kolory pasują do sklepu V4.

---

## 1. Poziomy

| Klucz | Rzadkość (data.js) | Do kliknięcia | Co się dzieje |
|---|---|---|---|
| `C`  | Pospolita    | 420 ms  | Szybki obrót karty, mały szary baner, „blip”. Bez czekania na klik. |
| `U`  | Niepospolita | 760 ms  | Obrót, biały błysk po karcie, zielona poświata, 5 iskierek, baner NIEPOSPOLITA, 2 nuty. |
| `R`  | Rzadka       | 1300 ms | 450 ms drżenia z niebieskim glow, potem karta i gwiazda **PYK!** za nią, niebieskie promienie, iskry, baner RZADKA!, arpeggio. |
| `H`  | Holo         | 2200 ms | 0,9 s napięcia (riser, lekkie ściemnienie), flash, **TRACH!**, fala halftone, białe promienie, tęczowe holo przesuwa się po karcie, iskry i trochę konfetti, baner HOLO!. Czeka na klik. |
| `UR` | Ultra        | 3200 ms | 1,4 s napięcia, ściemnienie 65%, światło ucieka z krawędzi paczki, **BACH!** z przodu, wstrząs ekranu, tęczowe promienie, holo, 90 konfetti, baner ULTRA RZADKA! z mini-wstrząsem. |
| `SR` | Sekretna     | 4800 ms | Pełny spektakl (rozpisany niżej): **BUM!**, złote i tęczowe promienie, złota folia, armatki konfetti z obu rogów, baner SEKRETNA!. |

Każdy kolejny poziom dokłada coś nowego: dłuższe napięcie, mocniejsze ściemnienie, promienie, flash, wstrząs, holo, konfetti i dłuższą fanfarę.
Baner SR ma 2 wersje zapasowe: `banner_SR_alt` (LEGENDARNA!) i `banner_SR_super` (SUPER RZADKA!), np. `opts.banner = 'banner_SR_alt'`.

## 2. Sekwencja SR (czasy w ms od startu)

| ms | Faza (`onPhase`) | Obraz | Dźwięk |
|---|---|---|---|
| 0–1600 | `anticipation` | Paczka (lub rewers) drży coraz mocniej i szybciej, rośnie, za nią pulsuje złoty pierścień plus tęczowy | `riser_long` (2,4 s, w drugiej połowie bicie serca) |
| 1600–2400 | `dim` | Ekran ciemnieje do 86% z rastrem halftone na brzegach. Z krawędzi paczki uciekają smugi światła, paczka unosi się i jaśnieje | riser trwa |
| 2400 | `burst` | Biały flash 100% → 0 w 300 ms. Paczka znika. Gwiazda **BUM!** wyskakuje (overshoot) i znika do 3020. Wstrząs ekranu 18 px przez 320 ms | `burst` |
| 2400–2900 | | Złote promienie (obrót w prawo) i tęczowe (w lewo) narastają. 2 fale halftone (2400 i 2520), każda po 650 ms | |
| 2650–3250 | `flip` | Karta wylatuje z 35% skali z rewersem do przodu, obraca się o 180° z overshootem | `flip` |
| 3300–4100 | `holo` | Tęczowe pasmo przesuwa się po karcie, pod nim złota folia (`overlay`) | `shimmer` |
| 3400–4100 | | 60 iskier wokół karty, 170 konfetti (prostokąty i gwiazdki) z armatek w dolnych rogach i ze środka | |
| 3600 | `banner` | Baner SEKRETNA! wskakuje pod kartę. Krótki wstrząs 9 px / 220 ms i flash 60% | `fanfare_SR` (2,9 s) |
| 4800 | `ready` | Napis „▶ KLIKNIJ, ABY KONTYNUOWAĆ ◀” mruga. Pętla: holo co 2,4 s, iskry co 200 ms, karta lekko się buja i przechyla za myszką | |
| klik | `done` | Overlay znika w 220 ms | `tap` |

Pozostałe poziomy mają czasy w `TurboReveal.TIERS` (reveal.js, na górze pliku). Strojenie odbywa się tylko tam.

### Zasada pomijania (skip)

1. Klik, dotyk, **Spacja**, **Enter** lub **Esc** w trakcie sekwencji **pomija ją**, ale nie zabiera nagrody. Ekran od razu przechodzi do stanu końcowego (karta, baner, promienie), z krótkim flashem i fanfarą danego poziomu. Napięcie i BUM! przepadają.
2. Pierwsze **250 ms** jest zablokowane (`skipLockMs`), żeby to samo kliknięcie, które otworzyło kartę, jej nie przeskoczyło.
3. Drugi klik w stanie `ready` zamyka overlay (Promise się rozwiązuje).
4. Poziomy C, U i R nie czekają na klik, kończą się same (`waitForTap` można zmienić). H, UR i SR czekają.
5. Propozycja: dla karty, która już jest w kolekcji (duplikat), wołaj z `fast: true`, czyli tempo ×1,7. Napis „kliknij, aby pominąć” pokazuje się w rogu przy sekwencjach od 1,5 s.
6. `skippable: false` wyłącza pomijanie (np. przy pierwszej SR w życiu gracza, jeśli tak zdecydujecie).
7. Przy `prefers-reduced-motion` wstrząsy są osłabione do 20%, a flash ograniczony do 35%.

Podczas odkrycia overlay przechwytuje klik i klawiaturę (`stopPropagation`, keydown w fazie capture), więc gra w tym czasie nie dostaje kliknięć.

## 3. API (`reveal.js`)

```html
<script src="reveal/reveal.js"></script>
<script>
  TurboReveal.init({ base: 'reveal/' });   // ścieżka do folderu z assets/, audio/, fonts/. Zwraca Promise (preload)
</script>
```

```js
TurboReveal.play(card, tier, opts) -> Promise<{ tier, skipped, ms }>
```
* `card`: element DOM karty (zostanie **sklonowany** i przeskalowany do 300×391), URL obrazka, `{ img: 'url' }`, albo `{ id: '155' }`. Przy `{ id }` używany jest `PZArt.cardHTML`, czyli prawdziwa karta z gry.
* `tier`: `'C' | 'U' | 'R' | 'H' | 'UR' | 'SR'`, rank `0..5` albo nazwa PL (`'Sekretna'`, `'Holo'`…).
* `opts`:
  * `container`: element, w którym gra overlay (domyślnie cały ekran, `position:fixed`). Scena 1280×720 skaluje się do kontenera.
  * `from`: `'pack'` (paczka) albo `'back'` (rewers karty, pasuje do stosu w grze). Domyślnie `'pack'`, gdy poziom ma napięcie. `packEl`: własny element paczki do sklonowania.
  * `waitForTap`, `skippable`, `skipLockMs`, `speed`, `fast`, `banner`, `seed`.
  * `onPhase(name, tier)`: `anticipation`, `dim`, `burst`, `flip`, `holo`, `banner`, `ready`, `skip`, `done`.

Pozostałe metody:
* `TurboReveal.skip()`: działa jak klik gracza.
* `TurboReveal.cancel()`: natychmiastowe zamknięcie, np. przy zmianie ekranu.
* `TurboReveal.active`: czy coś trwa.
* `TurboReveal.setSound(bool)`: włącza lub wyłącza dźwięki.
* `TurboReveal.duration(tier)`: ms do stanu „ready”.
* `init({ onSfx: name => … })`: jeśli wolicie puszczać dźwięki własnym silnikiem (np. `PZAudio`), dajcie `sound: false` i `onSfx`, a dostaniecie nazwy efektów w odpowiednich momentach.
* `TurboReveal.debug.manual(true)` + `debug.seek(ms)`: ręczny zegar (nagrywanie klatek, testy).

### Jak podpiąć w `js/app.js` (propozycja)

Dziś `flipNext()` robi własne „charge” (`pre` = 550/1100/2000 ms) i efekty w `onRevealed()`. Proponuję dla `rank >= 2` oddać całość do TurboReveal:

```js
function flipNext() {
  var p = E.state.pending, idx = p.revealed, el = cardEls[idx], c = D.BY_ID[p.cards[idx]], rank = D.TIERS[c.tier].rank;
  restack(idx); busy = true;
  if (rank >= 2) {
    var res = E.revealNext();
    TurboReveal.play({ id: c.id }, c.tier, { from: 'back', fast: (E.state.collection[c.id] || 0) > 1 })
      .then(function () {
        el.classList.add('up'); currentUp = el;
        onRevealed(res, /*bezFx*/ true);   // tag z ceną, rekord, HUD – bez starego FX.burst/flash/pop
        busy = false;
      });
    return;
  }
  // C/U – zostaje obecny szybki flip (9 kart na paczkę nie powinno blokować ekranu)
  ...
}
```
* C i U można też grać przez API (`TurboReveal.play(el, 'U', { container: slotEl })`), ale przy 9 takich kartach na paczkę lepiej zostawić obecny flip. Ich fanfary `fanfare_C` / `fanfare_U` można podpiąć pod `S.reveal(0/1)`.
* `PZAudio.setEnabled(x)` → `TurboReveal.setSound(x)`.
* Karta SR w grze ma swoją warstwę `.holo`, a na nią nakłada się złota folia z reveal. Wygląda dobrze, ale jeśli będzie za mocno, zmniejszcie `fa` w `render()` (szukaj `trv-foil`).

## 4. Pliki (`manifest.json` / `manifest.js` → `window.TURBO_REVEAL_MANIFEST`)

```
reveal.js                 API + silnik (≈30 KB, bez zależności)
demo.html                 demo wszystkich poziomów
manifest.json|js          lista plików z rozmiarami
fonts/LuckiestGuy-Regular.ttf   font napisu „kliknij” (Apache 2.0, Google Fonts)
card/zloty_smokator.png   placeholder karty (wycięty z referencji)
assets/
  starburst/  burst_{yellow,red,blue,gold,magenta}.png (512) – puste gwiazdy
              burst_PYK / burst_TRACH / burst_BACH / burst_BUM / burst_ZIUUU(„ŁUUUP!”).png – z napisem
  rays/       rays_white_16, rays_white_24_soft, rays_gold, rays_comic, rays_rainbow, rays_blue (1024, przezroczysty środek)
  halftone/   shockwave_{white,yellow,cyan}.png (1024, pierścień z rastra), dim_vignette_halftone.png (1280×720), halftone_tile_32.png
  particles/  sparkle_sheet.png, sparkle_sheet_gold.png (8 klatek × 64 px, 16 fps)
              confetti_sheet.png (8 klatek obrotu × 6 kolorów, 32 px), confetti_stars.png (6 × 32 px), sheets.json
  holo/       holo_foil.png (512×1024 tęczowa folia z gwiazdkami), gold_foil.png, holo_sweep_band.png (pasmo do przesuwania),
              card_mask_480x625.png
  banners/    banner_{C,U,R,H,UR,SR}.png + banner_SR_alt (LEGENDARNA!) + banner_SR_super (SUPER RZADKA!) – 760×180
  glow/       glow_ring_{white,gold,blue,cyan,magenta,green,rainbow}.png (512), light_leak.png (poświata krawędzi paczki), light_beam.png
  card/       card_back.png (480×625), pack_standin.png (420×560) – zastępcze, gra może dać własne (packEl)
audio/ (OGG Vorbis, mono 44,1 kHz, chiptune)
  riser_short (0,8 s, H) · riser_mid (1,4 s, UR) · riser_long (2,4 s, SR)
  burst · burst_small · flip · whoosh · shimmer · sparkle · tap
  fanfare_C · fanfare_U · fanfare_R · fanfare_H · fanfare_UR · fanfare_SR (0,25 → 2,9 s)
tools/  gen_assets.py, gen_sfx.py (regeneracja), capture.py (test headless + klatki), make_previews.sh, frame_sheet.py
```

Regeneracja: `python3 tools/gen_assets.py && python3 tools/gen_sfx.py`, potem `VW=1280 VH=720 python3 tools/capture.py SR 6400 33 && bash tools/make_previews.sh`.

Test (headless Chrome): wszystkie 6 poziomów w czasie rzeczywistym, pomijanie, czekanie na klik i karta z gry przez `{ id: '155' }` na prawdziwym `paczki/index.html`. W konsoli 0 błędów.
