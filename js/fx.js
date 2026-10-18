/* Efekty: konfetti/iskry na canvasie, błysk, wstrząs. */
(function (root) {
  'use strict';
  var cv, g, parts = [], running = false;
  function init(c) { cv = c; g = c.getContext('2d'); }
  function burst(x, y, n, opts) {
    opts = opts || {}; var cols = opts.colors || ['#ff4fa3', '#ffd23f', '#4cc9f0', '#7dff7d', '#ffffff', '#c77dff'];
    for (var i = 0; i < n; i++) {
      var a = opts.up ? (-Math.PI / 2 + (Math.random() - 0.5) * 1.6) : Math.random() * Math.PI * 2, v = (opts.power || 8) * (0.4 + Math.random());
      parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, decay: 0.006 + Math.random() * 0.012, size: 3 + Math.random() * 6,
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, col: cols[(Math.random() * cols.length) | 0], star: opts.stars ? Math.random() < 0.6 : Math.random() < 0.2, grav: opts.grav == null ? 0.18 : opts.grav });
    }
    if (!running) { running = true; requestAnimationFrame(tick); }
  }
  function star(r) { g.beginPath(); for (var i = 0; i < 8; i++) { var rr = i % 2 ? r * 0.35 : r, a = i * Math.PI / 4; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill(); }
  function tick() {
    g.clearRect(0, 0, cv.width, cv.height);
    parts = parts.filter(function (p) { return p.life > 0 && p.y < 900; });
    parts.forEach(function (p) {
      p.vy += p.grav; p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= p.decay;
      g.save(); g.globalAlpha = Math.max(0, Math.min(1, p.life * 1.5)); g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.col;
      if (p.star) { g.shadowColor = p.col; g.shadowBlur = 8; star(p.size); } else g.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      g.restore();
    });
    if (parts.length) requestAnimationFrame(tick); else { running = false; g.clearRect(0, 0, cv.width, cv.height); }
  }
  function flash(el, strong) { el.classList.remove('go', 'strong'); void el.offsetWidth; el.classList.add('go'); if (strong) el.classList.add('strong'); }
  function shake(el, cls) { cls = cls || 'shake'; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(function () { el.classList.remove(cls); }, 700); }
  root.PZFx = { init: init, burst: burst, flash: flash, shake: shake, get active() { return parts.length; } };
})(window);
