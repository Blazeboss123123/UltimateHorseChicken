// ===================== ITEM ARTWORK (painted versions; baked into textures) =====================
function nails(ctx, pts) { for (const [x, y] of pts) { ctx.beginPath(); ctx.arc(x, y, 1.2, 0, TAU); ctx.fillStyle = '#6a5a4e'; ctx.fill(); ctx.beginPath(); ctx.arc(x - .3, y - .3, .5, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fill(); } }
function crateArt(ctx, w, h, seed) {
  drawWood(ctx, 0, 0, w, h, seed, '#c8935a');
  const b = Math.max(3.5, w * .11);
  ctx.save(); ctx.lineCap = 'round';
  for (const [x1, y1, x2, y2] of [[b, b, w - b, h - b], [w - b, b, b, h - b]]) { line(ctx, x1, y1, x2, y2, '#7c5432', b * .95); line(ctx, x1, y1, x2, y2, '#b98450', b * .6); }
  ctx.restore();
  rr(ctx, 1.5, 1.5, w - 3, h - 3, 2); ctx.lineWidth = b * .9; ctx.strokeStyle = '#a8763f'; ctx.stroke();
  rr(ctx, 0, 0, w, h, 2); ctx.lineWidth = 1.5; ctx.strokeStyle = '#5e3c22'; ctx.stroke();
  for (const [x, y, sx, sy] of [[0, 0, 1, 1], [w, 0, -1, 1], [0, h, 1, -1], [w, h, -1, -1]]) poly(ctx, [[x, y], [x + sx * b * 1.6, y], [x, y + sy * b * 1.6]], '#9aa3ae', 1.4);
  nails(ctx, [[b * .7, h / 2], [w - b * .7, h / 2], [w / 2, b * .7], [w / 2, h - b * .7]]);
}
const ITEM_ART = {
  crate(ctx, w, h) { crateArt(ctx, w, h, 3); },
  bigcrate(ctx, w, h) { crateArt(ctx, w, h, 5); },
  ice(ctx, w, h) {
    wob(ctx, 0, 0, w, h, 21, 1.4); const g = ctx.createLinearGradient(0, 0, w * .3, h); g.addColorStop(0, '#e6fbff'); g.addColorStop(1, '#8fd3ee'); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = '#5aa8c8'; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.2; line(ctx, 5, 4, w * .45, 4, 'rgba(255,255,255,.85)', 2.4); line(ctx, w * .6, h - 7, w - 6, h - 9, 'rgba(255,255,255,.6)', 1.6);
    for (const [x1, y1, x2, y2] of [[w * .3, 0, w * .2, h], [w * .62, 0, w * .75, h], [w * .2, h * .5, w * .62, h * .3]]) line(ctx, x1, y1, x2, y2, 'rgba(90,168,200,.35)', 1);
    for (let i = 0; i < 6; i++) { const x = 4 + i * (w - 8) / 6; poly(ctx, [[x, h - 1], [x + 3.5, h + 9 + (i % 2) * 3], [x + 7, h - 1]], '#d6f6ff', 1.4); line(ctx, x + 2.5, h + 1, x + 3.3, h + 6, 'rgba(255,255,255,.9)', 1); }
    ctx.fillStyle = '#fff'; starPath(ctx, w - 9, 7, 3, 1, 4); ctx.fill();
  },
  honey(ctx, w, h, t) {
    drawWood(ctx, 0, 6, w, h - 6, 31, '#a8743e');
    ctx.save(); ctx.beginPath(); ctx.moveTo(0, 0); for (let x = 0; x <= w; x += 6) ctx.lineTo(x, 7 + Math.sin(x * .7 + t * 2) * 1.5 + (x % 18 === 6 ? 6 : 0)); ctx.lineTo(w, 0); ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, 0, 14); g.addColorStop(0, '#ffd45a'); g.addColorStop(1, '#e89a1a'); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = '#a8620e'; ctx.stroke(); ctx.clip();
    ctx.strokeStyle = 'rgba(160,90,10,.45)'; ctx.lineWidth = .8; for (let y = 0; y < 10; y += 4.5) for (let x = (y / 4.5 % 2) * 3; x < w; x += 6) { ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; ctx.lineTo(x + Math.cos(a) * 2.6, y + Math.sin(a) * 2.6); } ctx.closePath(); ctx.stroke(); }
    ctx.restore(); line(ctx, 4, 2.5, w * .4, 2.5, 'rgba(255,255,255,.6)', 1.5);
  },
  trampoline(ctx, w, h) {
    for (const x of [5, w - 5]) { line(ctx, x, h + 2, x, 6, '#6c7480', 2.4); }
    ctx.strokeStyle = '#9aa3ae'; ctx.lineWidth = 1.2; ctx.beginPath(); for (let x = 8; x < w - 8; x += 3) { ctx.lineTo(x, 7 + ((x / 3) % 2) * 4); } ctx.stroke();
    rr(ctx, 0, 0, w, 6, 3); const g = ctx.createLinearGradient(0, 0, w, 0); for (let i = 0; i <= 6; i++) { g.addColorStop(i / 6, i % 2 ? '#ffffff' : '#e8473f'); g.addColorStop(Math.min(1, i / 6 + .08), i % 2 ? '#ffffff' : '#e8473f'); } ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 1.3; ctx.strokeStyle = '#8a2420'; ctx.stroke();
    rr(ctx, 1, h - 4, w - 2, 4, 2); fillStroke(ctx, '#7a828e', 1.6);
  },
  cloud(ctx, w, h) { const s = w / 132; ctx.save(); ctx.translate(32 * s, 46 * s * .4); ctx.scale(1, .4); ctx.beginPath(); for (const [dx, dy, r] of [[0, 0, 26], [30, -14, 32], [66, -2, 26], [34, 8, 26], [-14, 10, 18], [84, 12, 16]]) { ctx.moveTo(dx * s + r * s, dy * s); ctx.arc(dx * s, dy * s, r * s, 0, TAU); } ctx.strokeStyle = 'rgba(110,140,185,.8)'; ctx.lineWidth = 2.6; ctx.stroke(); drawCloud(ctx, 0, 0, s, '#ffffff'); ctx.restore(); },
  spikes(ctx, w, h) {
    for (const x of [2.5, w - 2.5]) { rr(ctx, x - 2.5, -2, 5, h + 4, 1.4); fillStroke(ctx, '#8a5a30', 1.6); }
    for (let k = 0; k < 2; k++) { ctx.beginPath(); for (let x = 3; x <= w - 3; x += 2) ctx.lineTo(x, h / 2 + Math.sin(x * .55 + k * Math.PI) * (h / 2 - 2.5)); ctx.strokeStyle = '#4c525c'; ctx.lineWidth = 1.6; ctx.stroke(); }
    for (let x = 7; x < w - 5; x += 7) { line(ctx, x - 2.4, h / 2 - 4, x + 2.4, h / 2 + 4, '#2e333a', 1.3); line(ctx, x + 2.4, h / 2 - 4, x - 2.4, h / 2 + 4, '#2e333a', 1.3); }
  },
  crossbow(ctx, w, h) {
    rr(ctx, 1, 6, w * .55, h - 12, 3); fillStroke(ctx, '#9a6a3c', 1.8); nails(ctx, [[5, 10], [5, h - 10]]);
    rr(ctx, 4, h / 2 - 2.5, w - 6, 5, 2); fillStroke(ctx, '#7a4e28', 1.6);
    ctx.beginPath(); ctx.moveTo(w - 9, 1); ctx.quadraticCurveTo(w + 1, h / 2, w - 9, h - 1); ctx.strokeStyle = '#4e3018'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.stroke(); ctx.strokeStyle = '#a8763f'; ctx.lineWidth = 2.2; ctx.stroke();
    line(ctx, w - 9, 1.5, w - 14, h / 2, '#f2efe6', .9); line(ctx, w - 14, h / 2, w - 9, h - 1.5, '#f2efe6', .9);
  },
  cannon(ctx, w, h) {
    ctx.save(); ctx.translate(w * .45, h * .5); ctx.rotate(-.08);
    rr(ctx, -w * .38, -h * .2, w * .8, h * .4, h * .18); const g = ctx.createLinearGradient(0, -h * .2, 0, h * .2); g.addColorStop(0, '#5a68a0'); g.addColorStop(1, '#2b3460'); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = '#1a2040'; ctx.stroke();
    for (const x of [-w * .18, w * .1]) { rr(ctx, x, -h * .21, 4, h * .42, 1.5); fillStroke(ctx, '#f2c230', 1.2); }
    rr(ctx, w * .36, -h * .25, 6, h * .5, 2.5); fillStroke(ctx, '#2b3460', 1.6);
    ctx.restore();
    circ(ctx, w * .36, h * .74, h * .2, '#a8763f', 1.8); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; line(ctx, w * .36, h * .74, w * .36 + Math.cos(a) * h * .17, h * .74 + Math.sin(a) * h * .17, '#6a4626', 1.2); } circ(ctx, w * .36, h * .74, 2.4, '#5a3a1e', 1);
  },
  flame(ctx, w, h) {
    rr(ctx, 2, 4, w - 10, h - 8, 4); const g = ctx.createLinearGradient(0, 4, 0, h - 4); g.addColorStop(0, '#f2584a'); g.addColorStop(1, '#a8241c'); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = '#6a1410'; ctx.stroke();
    ctx.save(); rr(ctx, 2, h * .55, w - 10, 5, 0); ctx.clip(); for (let x = -8; x < w; x += 6) poly(ctx, [[x, h * .55 + 5], [x + 3, h * .55], [x + 6, h * .55], [x + 3, h * .55 + 5]], '#ffd34d', 0); ctx.fillStyle = 'rgba(30,20,10,.85)'; for (let x = -5; x < w; x += 6) { ctx.beginPath(); ctx.moveTo(x, h * .55 + 5); ctx.lineTo(x + 3, h * .55); ctx.lineTo(x + 6, h * .55); ctx.lineTo(x + 3, h * .55 + 5); ctx.fill(); } ctx.restore();
    rr(ctx, w - 9, h / 2 - 4, 8, 8, 2); fillStroke(ctx, '#c9a24a', 1.4); line(ctx, 6, 7, w * .45, 7, 'rgba(255,255,255,.45)', 1.6);
  },
  laser(ctx, w, h) {
    rr(ctx, 2, 2, w - 4, h - 4, 4); const g = ctx.createLinearGradient(0, 2, 0, h - 2); g.addColorStop(0, '#6a7080'); g.addColorStop(1, '#30343e'); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = '#1c1e26'; ctx.stroke();
    for (let y = 8; y < h - 6; y += 4) line(ctx, 6, y, w * .5, y, 'rgba(0,0,0,.35)', 1.2);
    circ(ctx, w - 7, h / 2, 4.5, '#3a0a14', 1.2); circ(ctx, w - 7, h / 2, 2.6, '#ff4a6a', 0); nails(ctx, [[5, 5], [5, h - 5]]);
  },
  puncher(ctx, w, h) { crateArt(ctx, w - 4, h, 9); ctx.strokeStyle = '#9aa3ae'; ctx.lineWidth = 1.4; ctx.beginPath(); for (let y = 6; y < h - 6; y += 2) ctx.lineTo(w - 4 + ((y / 2) % 2) * 3, y); ctx.stroke(); },
  fan(ctx, w, h, t) {
    rr(ctx, 2, 3, w * .52, h - 6, 3); const g = ctx.createLinearGradient(0, 3, 0, h - 3); g.addColorStop(0, '#9fd0f2'); g.addColorStop(1, '#4a8ac2'); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = '#2a4e70'; ctx.stroke();
    ctx.save(); ctx.translate(w * .74, h / 2); ctx.scale(.42, 1);
    ctx.beginPath(); ctx.arc(0, 0, h / 2 - 1.5, 0, TAU); ctx.fillStyle = '#e8eef4'; ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = '#4a5664'; ctx.stroke();
    const a0 = t * 30; for (let i = 0; i < 3; i++) { const a = a0 + i * TAU / 3; ctx.beginPath(); ctx.ellipse(Math.cos(a) * 6, Math.sin(a) * 6, 6, 2.6, a, 0, TAU); ctx.fillStyle = '#9aa6b4'; ctx.fill(); }
    ctx.restore(); circ(ctx, w * .74, h / 2, 1.8, '#4a5664', 0);
  },
};
for (const id in ITEM_ART) { const d = ITEMS[id], art = ITEM_ART[id]; d.draw = function (ctx, it, t) { withRot(ctx, it, this, (w, h) => art(ctx, w, h, t || 0)); }; }
// Shinier saw blade and spike ball
function drawSaw(ctx, x, y, r, a) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.beginPath(); const n = 16; for (let i = 0; i < n; i++) { const a1 = i / n * TAU, a2 = (i + .55) / n * TAU; ctx.lineTo(Math.cos(a1) * r, Math.sin(a1) * r); ctx.lineTo(Math.cos(a2) * r * .8, Math.sin(a2) * r * .8); } ctx.closePath();
  if (!ctx.isG) { const g = ctx.createRadialGradient(-r * .3, -r * .3, r * .1, 0, 0, r); g.addColorStop(0, '#f4f6f8'); g.addColorStop(1, '#9aa2ac'); ctx.fillStyle = g; } else ctx.fillStyle = '#c4c9d0';
  ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = '#4e5660'; ctx.stroke();
  circ(ctx, 0, 0, r * .5, '#b4bac2', 1.5); circ(ctx, 0, 0, r * .16, '#4e5660', 1);
  for (let i = 0; i < 4; i++) { const aa = i * TAU / 4; line(ctx, Math.cos(aa) * r * .22, Math.sin(aa) * r * .22, Math.cos(aa) * r * .44, Math.sin(aa) * r * .44, '#6b727c', 1.6); }
  ctx.beginPath(); ctx.arc(0, 0, r * .72, -2.4, -1.2); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.restore();
}
function drawSpikeball(ctx, x, y, r, t) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(t * .8);
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; poly(ctx, [[Math.cos(a - .18) * r * .62, Math.sin(a - .18) * r * .62], [Math.cos(a) * r * 1.18, Math.sin(a) * r * 1.18], [Math.cos(a + .18) * r * .62, Math.sin(a + .18) * r * .62]], i % 2 ? '#d6dde6' : '#b8c0ca', 1.3); }
  ctx.beginPath(); ctx.arc(0, 0, r * .7, 0, TAU);
  if (!ctx.isG) { const g = ctx.createRadialGradient(-r * .25, -r * .25, r * .05, 0, 0, r * .7); g.addColorStop(0, '#c8ced6'); g.addColorStop(1, '#5c626c'); ctx.fillStyle = g; } else ctx.fillStyle = '#8a8f99';
  ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = '#3a3f48'; ctx.stroke();
  ctx.restore();
}
