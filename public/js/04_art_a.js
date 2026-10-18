// ===================== ART HELPERS (hand-painted look) =====================
// Everything visual is painted once with canvas code and baked into Phaser textures.
const INK = '#4a372c';            // warm dark brown instead of black outlines
const LINE_K = .68;               // global outline thinning for props/terrain
function rr(ctx, x, y, w, h, r) { if (w < 0) { x += w; w = -w; } if (h < 0) { y += h; h = -h; } r = Math.max(0, Math.min(r, w / 2, h / 2)); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
// Slightly irregular "hand-cut" rectangle
function wob(ctx, x, y, w, h, seed = 1, j = 1.6) {
  const R = mulberry(seed * 9973 + 7);
  const pts = [], n = Math.max(2, Math.round((w + h) / 40));
  for (let i = 0; i < n; i++) pts.push([x + w * i / n, y + (R() - .5) * j]);
  for (let i = 0; i < n; i++) pts.push([x + w + (R() - .5) * j, y + h * i / n]);
  for (let i = 0; i < n; i++) pts.push([x + w - w * i / n, y + h + (R() - .5) * j]);
  for (let i = 0; i < n; i++) pts.push([x + (R() - .5) * j, y + h - h * i / n]);
  ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
}
function fillStroke(ctx, fill, lw = 2.5, stroke = INK) { if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (lw) { ctx.lineWidth = lw * LINE_K; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.stroke(); } }
function ell(ctx, x, y, rx, ry, fill, lw = 2, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot, 0, TAU); fillStroke(ctx, fill, lw); }
function circ(ctx, x, y, r, fill, lw = 2) { ell(ctx, x, y, r, r, fill, lw); }
function poly(ctx, pts, fill, lw = 2) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); fillStroke(ctx, fill, lw); }
function line(ctx, x1, y1, x2, y2, col = INK, lw = 2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.stroke(); }
function shade(hex, amt) {
  let c = hex.replace('#', ''); if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const n = parseInt(c, 16); let r = n >> 16, g = n >> 8 & 255, b = n & 255;
  const f = amt < 0 ? 0 : 255, p = Math.abs(amt);
  r = Math.round((f - r) * p + r); g = Math.round((f - g) * p + g); b = Math.round((f - b) * p + b);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
function mix(a, b, k) { const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16); const r = Math.round((pa >> 16) * (1 - k) + (pb >> 16) * k), g = Math.round((pa >> 8 & 255) * (1 - k) + (pb >> 8 & 255) * k), bl = Math.round((pa & 255) * (1 - k) + (pb & 255) * k); return '#' + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1); }
// Inner soft shading for the path that was just filled (light from top-left)
function innerShade(ctx, x, y, w, h, light = .2, dark = .2) {
  if (ctx.isG) return;
  ctx.save(); ctx.clip();
  const g = ctx.createLinearGradient(x, y, x + w * .35, y + h);
  g.addColorStop(0, 'rgba(255,255,255,' + light + ')'); g.addColorStop(.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(50,25,10,' + dark + ')');
  ctx.fillStyle = g; ctx.fillRect(x - 4, y - 4, w + 8, h + 8); ctx.restore();
}
// Paper grain + soft top-light / bottom-shadow over everything already painted in a region
let _grain = null;
function grainPattern(ctx) {
  if (!_grain) {
    _grain = document.createElement('canvas'); _grain.width = _grain.height = 128; const g = _grain.getContext('2d'); const R = mulberry(4242);
    for (let i = 0; i < 1400; i++) { const v = R() < .5 ? 0 : 255; g.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + (.04 + R() * .1) + ')'; g.fillRect(R() * 128, R() * 128, 1 + R() * 1.4, 1 + R() * 1.4); }
    g.strokeStyle = 'rgba(0,0,0,.05)'; g.lineWidth = .6; for (let i = 0; i < 40; i++) { const x = R() * 128, y = R() * 128, a = R() * TAU, l = 3 + R() * 8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  }
  return ctx.createPattern(_grain, 'repeat');
}
function paintify(cv, x = 0, y = 0, w = cv.width, h = cv.height, o = {}) {
  const g = cv.getContext('2d'); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.globalCompositeOperation = 'source-atop';
  const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, 'rgba(255,250,235,' + (o.light != null ? o.light : .12) + ')'); gr.addColorStop(.55, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(40,22,10,' + (o.dark != null ? o.dark : .14) + ')');
  g.fillStyle = gr; g.fillRect(x, y, w, h);
  g.globalAlpha = o.grain != null ? o.grain : .5; g.fillStyle = grainPattern(g); g.fillRect(x, y, w, h);
  g.restore();
}
// Wooden plank / board with grain and nail heads
function drawWood(ctx, x, y, w, h, seed = 1, col = '#c48a52') {
  wob(ctx, x, y, w, h, seed, 1.2); fillStroke(ctx, col, 2.2, shade(col, -.55));
  if (ctx.isG) return;
  ctx.save(); wob(ctx, x, y, w, h, seed, 1.2); ctx.clip();
  const gr = ctx.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, 'rgba(255,240,210,.35)'); gr.addColorStop(.2, 'rgba(255,240,210,0)'); gr.addColorStop(1, 'rgba(60,30,10,.25)'); ctx.fillStyle = gr; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = shade(col, -0.28); ctx.lineWidth = .9; ctx.globalAlpha = .6;
  const R = mulberry(seed);
  if (w >= h) for (let yy = y + 4; yy < y + h - 2; yy += 4 + R() * 3) { ctx.beginPath(); ctx.moveTo(x + R() * 10, yy); ctx.bezierCurveTo(x + w * .3, yy + (R() - .5) * 2, x + w * .6, yy + (R() - .5) * 2, x + w - R() * 14, yy + R()); ctx.stroke(); }
  else for (let xx = x + 4; xx < x + w - 2; xx += 4 + R() * 3) { ctx.beginPath(); ctx.moveTo(xx, y + R() * 10); ctx.bezierCurveTo(xx + (R() - .5) * 2, y + h * .3, xx + (R() - .5) * 2, y + h * .6, xx + R(), y + h - R() * 10); ctx.stroke(); }
  ctx.globalAlpha = .5; for (let i = 0; i < (w * h) / 900; i++) { ell(ctx, x + R() * w, y + R() * h, 2 + R() * 2, 1 + R(), shade(col, -.3), 0); }
  ctx.globalAlpha = 1; ctx.restore();
}
function drawGirder(ctx, x, y, w, h, col = '#9aa3ae') {
  rr(ctx, x, y, w, h, 2); fillStroke(ctx, col, 2.2, shade(col, -.55));
  ctx.save(); if (!ctx.isG) { rr(ctx, x, y, w, h, 2); ctx.clip(); }
  ctx.strokeStyle = shade(col, -.32); ctx.lineWidth = 2.2;
  const s = Math.min(w, h);
  if (w >= h) for (let xx = x; xx < x + w; xx += s) { ctx.beginPath(); ctx.moveTo(xx + 3, y + 3); ctx.lineTo(xx + s - 3, y + h - 3); ctx.moveTo(xx + s - 3, y + 3); ctx.lineTo(xx + 3, y + h - 3); ctx.stroke(); ctx.strokeRect(xx + 2, y + 2, s - 4, h - 4); }
  else for (let yy = y; yy < y + h; yy += s) { ctx.beginPath(); ctx.moveTo(x + 3, yy + 3); ctx.lineTo(x + w - 3, yy + s - 3); ctx.moveTo(x + w - 3, yy + 3); ctx.lineTo(x + 3, yy + s - 3); ctx.stroke(); ctx.strokeRect(x + 2, yy + 2, w - 4, s - 4); }
  if (!ctx.isG) { const gr = ctx.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, 'rgba(255,255,255,.35)'); gr.addColorStop(.4, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,30,.18)'); ctx.fillStyle = gr; ctx.fillRect(x, y, w, h); }
  ctx.restore();
}
function drawFlag(ctx, x, y, t, col = '#e8473f') {
  line(ctx, x, y, x, y - 70, '#5a4636', 3.5);
  ctx.beginPath(); ctx.moveTo(x, y - 70);
  for (let i = 0; i <= 8; i++) { const fx = x + i * 5, fy = y - 70 + Math.sin(t * 6 + i * .8) * 3 * (i / 8); ctx.lineTo(fx, fy); }
  for (let i = 8; i >= 0; i--) { const fx = x + i * 5, fy = y - 46 + Math.sin(t * 6 + i * .8) * 3 * (i / 8) - i * 1.4; ctx.lineTo(fx, fy); }
  ctx.closePath(); fillStroke(ctx, col, 2.2, shade(col, -.5));
  circ(ctx, x, y - 72, 3.5, '#ffd34d', 2);
}
// Soft painted cloud: light top, shaded belly
function drawCloud(ctx, x, y, s, col = '#ffffff') {
  const blobs = [[0, 0, 26], [30, -14, 32], [66, -2, 26], [34, 8, 26], [-14, 10, 18], [84, 12, 16]];
  ctx.fillStyle = col; ctx.beginPath(); for (const [dx, dy, r] of blobs) { ctx.moveTo(x + dx * s + r * s, y + dy * s); ctx.arc(x + dx * s, y + dy * s, r * s, 0, TAU); } ctx.fill();
  if (ctx.isG) return;
  ctx.save(); ctx.beginPath(); for (const [dx, dy, r] of blobs) { ctx.moveTo(x + dx * s + r * s, y + dy * s); ctx.arc(x + dx * s, y + dy * s, r * s, 0, TAU); } ctx.clip();
  const g = ctx.createLinearGradient(0, y - 40 * s, 0, y + 36 * s); g.addColorStop(0, 'rgba(255,255,255,.6)'); g.addColorStop(.55, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(120,150,190,.28)'); ctx.fillStyle = g; ctx.fillRect(x - 40 * s, y - 50 * s, 150 * s, 90 * s); ctx.restore();
}
