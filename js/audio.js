/* Dźwięki syntezowane WebAudio – bez plików. */
(function (root) {
  'use strict';
  var ctx = null, master = null, noiseBuf = null, enabled = true, lastCrinkle = 0;
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    var AC = root.AudioContext || root.webkitAudioContext; if (!AC) return null;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }
  function ok() { return enabled && init(); }
  function env(g, t, a, peak, dur) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
  function noise(t, dur, type, freq, q, peak, sweepTo) {
    var s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    var f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur); f.Q.value = q;
    var g = ctx.createGain(); env(g, t, 0.005, peak, dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  function tone(t, freq, dur, type, peak, slideTo) {
    var o = ctx.createOscillator(); o.type = type || 'square'; o.frequency.setValueAtTime(freq, t); if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    var g = ctx.createGain(); env(g, t, 0.01, peak || 0.15, dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  var A = {
    setEnabled: function (on) { enabled = !!on; if (!enabled) { A.stopSfx(); if (A.music) A.music.stop(); } },
    get enabled() { return enabled; },
    unlock: function () { if (enabled) init(); },
    crinkle: function (amt) { // szelest folii przy przeciąganiu
      if (!ok()) return; var now = ctx.currentTime; if (now - lastCrinkle < 0.035) return; lastCrinkle = now;
      var n = 1 + ((Math.random() * 3) | 0);
      for (var i = 0; i < n; i++) noise(now + i * 0.012, 0.03 + Math.random() * 0.05, 'bandpass', 2500 + Math.random() * 5000, 3, 0.25 + 0.4 * Math.min(1, amt || 0.5));
    },
    rip: function () { if (!ok()) return; var t = ctx.currentTime; noise(t, 0.35, 'bandpass', 5000, 1.2, 0.8, 1200); noise(t + 0.05, 0.25, 'highpass', 3000, 0.7, 0.4); for (var i = 0; i < 6; i++) A.crinkle(1); },
    whoosh: function () { if (!ok()) return; noise(ctx.currentTime, 0.28, 'bandpass', 600, 1, 0.35, 2600); },
    flip: function () { if (!ok()) return; var t = ctx.currentTime; noise(t, 0.06, 'highpass', 2000, 1, 0.5); tone(t, 320, 0.05, 'triangle', 0.08, 180); },
    reveal: function (rank) {
      if (!ok()) return; var t = ctx.currentTime;
      if (rank <= 0) tone(t, 440, 0.08, 'square', 0.05);
      else if (rank === 1) { tone(t, 523, 0.08, 'square', 0.06); tone(t + 0.07, 659, 0.1, 'square', 0.06); }
      else if (rank === 2) [659, 784, 988].forEach(function (f, i) { tone(t + i * 0.07, f, 0.14, 'square', 0.07); });
      else if (rank === 3) { [784, 988, 1175, 1568].forEach(function (f, i) { tone(t + i * 0.06, f, 0.35, 'triangle', 0.12); }); A.sparkle(); }
      else if (rank === 4) { [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(t + i * 0.08, f, 0.5, 'square', 0.08); tone(t + i * 0.08, f * 2, 0.4, 'triangle', 0.05); }); A.sparkle(); }
      else A.fanfare();
    },
    sparkle: function () { if (!ok()) return; var t = ctx.currentTime; for (var i = 0; i < 10; i++) tone(t + i * 0.045, 1800 + Math.random() * 2500, 0.12, 'sine', 0.05); },
    riser: function (dur) { if (!ok()) return; var t = ctx.currentTime; tone(t, 110, dur, 'sawtooth', 0.06, 880); tone(t, 165, dur, 'square', 0.03, 1320); noise(t, dur, 'bandpass', 400, 2, 0.15, 6000); },
    fanfare: function () {
      if (!ok()) return; var t = ctx.currentTime; noise(t, 0.6, 'lowpass', 900, 0.5, 0.6, 150); tone(t, 55, 0.6, 'sine', 0.4, 35);
      var seq = [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.36], [784, 0.52], [1047, 0.64]];
      seq.forEach(function (n) { tone(t + n[1], n[0], 0.22, 'square', 0.09); tone(t + n[1], n[0] / 2, 0.22, 'sawtooth', 0.05); });
      [1047, 1319, 1568, 2093].forEach(function (f) { tone(t + 0.8, f, 1.4, 'triangle', 0.07); });
      for (var i = 0; i < 24; i++) tone(t + 0.8 + i * 0.05, 2000 + Math.random() * 3000, 0.15, 'sine', 0.04);
    },
    coin: function () { if (!ok()) return; var t = ctx.currentTime; tone(t, 988, 0.08, 'square', 0.08); tone(t + 0.08, 1319, 0.25, 'square', 0.08); },
    register: function () { if (!ok()) return; var t = ctx.currentTime; noise(t, 0.08, 'bandpass', 3000, 4, 0.4); tone(t + 0.06, 2093, 0.5, 'triangle', 0.12); tone(t + 0.06, 2637, 0.4, 'sine', 0.06); },
    click: function () { if (!ok()) return; tone(ctx.currentTime, 1200, 0.03, 'square', 0.04); },
    page: function () { if (!ok()) return; noise(ctx.currentTime, 0.18, 'bandpass', 1500, 0.8, 0.3, 4000); },
    error: function () { if (!ok()) return; var t = ctx.currentTime; tone(t, 200, 0.15, 'square', 0.08); tone(t + 0.15, 150, 0.2, 'square', 0.08); }
  };
  /* Efekty z modułu odkrycia (TurboReveal.onSfx): pliki OGG z reveal/audio/, a gdy przeglądarka ich nie zagra – synteza. */
  var files = {}, filePlaying = [], fileBase = 'reveal/audio/';
  var canOgg = (function () { try { return !!new Audio().canPlayType('audio/ogg; codecs="vorbis"'); } catch (e) { return false; } })();
  function synthSfx(name) {
    if (!ok()) return; var t = ctx.currentTime;
    if (/^riser_/.test(name)) A.riser({ riser_short: 0.8, riser_mid: 1.4, riser_long: 2.4 }[name] || 1);
    else if (name === 'burst') { noise(t, 0.7, 'lowpass', 1200, 0.6, 0.9, 120); tone(t, 90, 0.6, 'sine', 0.5, 30); }
    else if (name === 'burst_small') { noise(t, 0.3, 'lowpass', 2500, 0.6, 0.5, 300); tone(t, 160, 0.25, 'sine', 0.25, 60); }
    else if (name === 'flip') A.flip(); else if (name === 'whoosh') A.whoosh();
    else if (name === 'shimmer' || name === 'sparkle') A.sparkle(); else if (name === 'tap') A.click();
    else if (name === 'fanfare_SR') A.fanfare();
    else if (/^fanfare_/.test(name)) A.reveal({ fanfare_C: 0, fanfare_U: 1, fanfare_R: 2, fanfare_H: 3, fanfare_UR: 4 }[name] || 0);
  }
  A.sfx = function (name, vol) {
    if (!enabled) return;
    var a = files[name];
    if (!a && canOgg) { a = files[name] = new Audio(fileBase + name + '.ogg'); a.preload = 'auto'; a.addEventListener('error', function () { a.failed = true; }); }
    if (!a || a.failed) { synthSfx(name); return; }
    try {
      var c = a.cloneNode(); c.volume = Math.max(0, Math.min(1, (vol || 1) * 0.8));
      var pr = c.play(); if (pr && pr.catch) pr.catch(function () { a.failed = true; synthSfx(name); });
      filePlaying.push(c); c.addEventListener('ended', function () { var i = filePlaying.indexOf(c); if (i >= 0) filePlaying.splice(i, 1); });
    } catch (e) { synthSfx(name); }
  };
  A.stopSfx = function () { filePlaying.forEach(function (c) { try { c.pause(); } catch (e) {} }); filePlaying = []; };
  /* muzyczka w menu i karierze: krótka pętla chiptune (WebAudio, bez plików) */
  var mus = { vol: 0.4, on: false, t: null, step: 0, next: 0, g: null };
  var BPM = 116, ST = 60 / BPM / 2;                  // ósemki
  var CH = [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]];   // Am F G Em
  var LEAD = [76, 0, 74, 72, 0, 72, 74, 76, 77, 0, 76, 74, 72, 0, 69, 0, 71, 0, 72, 74, 0, 79, 77, 76, 74, 0, 72, 71, 72, 0, 0, 0];
  function hz(n) { return 440 * Math.pow(2, (n - 69) / 12); }
  function mtone(t, f, d, type, v) { var o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(mus.g); o.start(t); o.stop(t + d + 0.02); }
  function tick() {
    if (!ctx || !mus.on) return;
    while (mus.next < ctx.currentTime + 0.25) {
      var i = mus.step % 32, ch = CH[(i / 8) | 0], t = mus.next;
      if (i % 2 === 0) mtone(t, hz(ch[0] - 24), ST * 1.8, 'triangle', 0.22);
      mtone(t, hz(ch[i % 3] + 12), ST * 0.5, 'square', 0.035);
      if (LEAD[i] && mus.step % 64 >= 32) mtone(t, hz(LEAD[i]), ST * 0.9, 'square', 0.06);
      if (i % 4 === 2) noise(t, 0.04, 'highpass', 7000, 1, 0.08);
      mus.next += ST; mus.step++;
    }
  }
  A.music = {
    start: function () { if (!enabled || !init() || mus.on || mus.vol <= 0) return; mus.on = true; if (!mus.g) { mus.g = ctx.createGain(); mus.g.connect(master); } mus.g.gain.value = mus.vol; mus.next = ctx.currentTime + 0.05; mus.t = setInterval(tick, 90); tick(); },
    stop: function () { mus.on = false; clearInterval(mus.t); },
    setVolume: function (v) { mus.vol = Math.max(0, Math.min(1, v)); if (mus.g) mus.g.gain.value = mus.vol; if (mus.vol <= 0) A.music.stop(); },
    get playing() { return mus.on; }
  };
  root.PZAudio = A;
})(window);
