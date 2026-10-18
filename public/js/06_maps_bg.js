// ===================== MAP BACKGROUNDS (painted parallax layers) =====================
// Four layers per map, painted once and baked: sky (sun/moon/clouds), far (mountains/skyline),
// land (themed landmarks) and near (foreground hills). Far layers are mixed toward the haze colour.
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; }
function nz(x, s) { return Math.sin(x * .0023 + s) * .5 + Math.sin(x * .0061 + s * 1.7) * .3 + Math.sin(x * .017 + s * 2.9) * .2; }
function hillPts(x0, x1, base, amp, seed, step = 14) { const p = []; for (let x = x0; x <= x1 + step; x += step) p.push([x, base - amp * (.5 + .5 * nz(x, seed))]); return p; }
function mesaPts(x0, x1, base, amp, seed, step = 8) { const p = []; for (let x = x0; x <= x1 + step; x += step) p.push([x, base - amp * (.5 + .5 * Math.tanh(nz(x * 1.4, seed) * 5))]); return p; }
function peakPts(x0, x1, base, amp, seed, step = 10, sharp = 1) {
  const R = mulberry(seed * 131 + 7), pk = [];
  for (let x = x0 - 300; x < x1 + 400; x += 220 + R() * 300) pk.push([x, amp * (.4 + R() * .6), (.75 + R() * .6) * sharp]);
  const p = []; for (let x = x0; x <= x1 + step; x += step) { let h = 0; for (const [c, ph, sl] of pk) h = Math.max(h, ph - Math.abs(x - c) * sl); h += nz(x * 4, seed) * amp * .035; p.push([x, base - Math.max(0, h)]); }
  p.peaks = pk.map(([c, ph, sl]) => [c, base - ph, ph, sl]); p.base = base; return p;
}
function ptsY(p, x) { const st = p[1][0] - p[0][0]; const i = Math.max(0, Math.min(p.length - 2, Math.floor((x - p[0][0]) / st))); const k = (x - p[i][0]) / st; return p[i][1] * (1 - k) + p[i + 1][1] * k; }
function bandPath(g, p, bottom = 4000) { g.beginPath(); g.moveTo(p[0][0], bottom); for (const q of p) g.lineTo(q[0], q[1]); g.lineTo(p[p.length - 1][0], bottom); g.closePath(); }
function band(g, p, col, o = {}) {
  let top = 1e9; for (const q of p) top = Math.min(top, q[1]);
  bandPath(g, p); const gr = g.createLinearGradient(0, top, 0, top + (o.depth || 520)); gr.addColorStop(0, o.topCol || shade(col, .07)); gr.addColorStop(1, o.botCol || shade(col, -.1)); g.fillStyle = gr; g.fill();
  if (o.rim !== false) { g.beginPath(); p.forEach((q, i) => i ? g.lineTo(q[0], q[1] + 1) : g.moveTo(q[0], q[1] + 1)); g.strokeStyle = o.rim || shade(col, .2); g.lineWidth = o.rimW || 3; g.lineJoin = 'round'; g.stroke(); }
}
function facets(g, p, dark = .13, snow = null, snowMin = 0) {
  g.save(); bandPath(g, p); g.clip();
  for (const [c, py, ph, sl] of p.peaks) {
    const half = ph / sl, b = p.base;
    g.fillStyle = 'rgba(30,20,50,' + dark + ')'; g.beginPath(); g.moveTo(c, py); g.lineTo(c + half * 1.05, b); g.lineTo(c + half * .12, b); g.closePath(); g.fill();
    if (snow && ph > snowMin) {
      const d = ph * .3; g.beginPath(); g.moveTo(c, py - 2);
      g.lineTo(c + half * .3, py + d * .9); g.lineTo(c + half * .18, py + d * .7); g.lineTo(c + half * .05, py + d * 1.05); g.lineTo(c - half * .08, py + d * .75); g.lineTo(c - half * .2, py + d); g.lineTo(c - half * .3, py + d * .85);
      g.closePath(); g.fillStyle = snow; g.fill();
      g.fillStyle = 'rgba(120,150,200,.25)'; g.beginPath(); g.moveTo(c, py - 2); g.lineTo(c + half * .3, py + d * .9); g.lineTo(c + half * .05, py + d * 1.05); g.closePath(); g.fill();
    }
  }
  g.restore();
}
function blobs(g, list, col) { g.fillStyle = col; g.beginPath(); for (const [x, y, r] of list) { g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); } g.fill(); }
function treeSil(g, x, y, s, col, kind = 'round', R = Math.random) {
  if (kind === 'round') { g.fillStyle = shade(col, -.15); g.fillRect(x - s * .07, y - s * .8, s * .14, s * .82); blobs(g, [[x, y - s * 1.02, s * .5], [x - s * .36, y - s * .72, s * .38], [x + s * .36, y - s * .74, s * .4]], col); blobs(g, [[x - s * .14, y - s * 1.14, s * .26], [x - s * .42, y - s * .82, s * .17]], shade(col, .12)); }
  else if (kind === 'pine') { g.fillStyle = col; for (let i = 0; i < 3; i++) { const w = s * (.46 - i * .1), yy = y - s * .15 - i * s * .32; g.beginPath(); g.moveTo(x - w, yy); g.lineTo(x, yy - s * .55); g.lineTo(x + w, yy); g.closePath(); g.fill(); } g.fillStyle = shade(col, .12); g.beginPath(); g.moveTo(x, y - s * 1.2); g.lineTo(x - s * .2, y - s * .8); g.lineTo(x, y - s * .85); g.fill(); }
  else if (kind === 'palm') { g.strokeStyle = col; g.lineWidth = s * .08; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x - s * .15, y - s * .5, x + s * .1, y - s); g.stroke(); g.fillStyle = col; for (const a of [-2.7, -2.1, -1.4, -.8, -.2]) { g.save(); g.translate(x + s * .1, y - s); g.rotate(a); g.beginPath(); g.ellipse(s * .3, 0, s * .32, s * .07, 0, 0, TAU); g.fill(); g.restore(); } }
  else if (kind === 'cactus') { g.fillStyle = col; rr(g, x - s * .08, y - s * .7, s * .16, s * .7, s * .08); g.fill(); rr(g, x - s * .3, y - s * .5, s * .12, s * .26, s * .06); g.fill(); rr(g, x + s * .18, y - s * .58, s * .12, s * .3, s * .06); g.fill(); g.fillRect(x - s * .24, y - s * .3, s * .2, s * .07); g.fillRect(x + s * .04, y - s * .34, s * .2, s * .07); }
  else if (kind === 'dead') { g.strokeStyle = col; g.lineCap = 'round'; g.lineWidth = s * .08; g.beginPath(); g.moveTo(x, y); g.lineTo(x + s * .03, y - s * .8); g.moveTo(x + s * .02, y - s * .5); g.lineTo(x - s * .3, y - s * .85); g.moveTo(x + s * .03, y - s * .65); g.lineTo(x + s * .32, y - s * .95); g.moveTo(x - s * .18, y - s * .7); g.lineTo(x - s * .22, y - s * .98); g.stroke(); }
}
function treesOn(g, p, x0, x1, every, size, col, seed, kind = 'round', skip = .3) { const R = mulberry(seed); for (let x = x0; x < x1; x += every * (.5 + R())) { if (R() < skip) continue; treeSil(g, x, ptsY(p, x) + size * .12, size * (.6 + R() * .7), col, kind, R); } }
function skyline(g, x0, x1, base, hmin, hmax, wmin, wmax, col, seed, win) {
  const R = mulberry(seed);
  for (let x = x0; x < x1;) {
    const w = wmin + R() * (wmax - wmin), h = hmin + R() * (hmax - hmin), top = base - h;
    g.fillStyle = col; g.fillRect(x, top, w + 1, h + 3000);
    const k = R();
    if (k < .18) { g.beginPath(); g.moveTo(x - 2, top); g.lineTo(x + w / 2, top - w * .45); g.lineTo(x + w + 2, top); g.fill(); }
    else if (k < .28) { g.fillRect(x + w / 2 - 2, top - 40, 4, 40); }
    else if (k < .4) { g.fillRect(x + w * .2, top - 26, w * .6, 26); g.fillRect(x + w * .2 + 4, top - 10, 3, 12); }
    else if (k < .5) { rr(g, x + w * .3, top - 30, w * .4, 24, 4); g.fill(); g.fillRect(x + w * .35, top - 8, 3, 8); g.fillRect(x + w * .62, top - 8, 3, 8); }
    if (win) { for (let yy = top + 14; yy < base + 200; yy += 22) for (let xx = x + 8; xx < x + w - 10; xx += 16) if (R() < win[1]) { g.fillStyle = win[0]; g.fillRect(xx, yy, 7, 10); } g.fillStyle = col; }
    x += w + R() * 8;
  }
}
function seaBand(g, x0, x1, y, col, depth = 800, crest = 'rgba(255,255,255,.45)', seed = 3) {
  const gr = g.createLinearGradient(0, y, 0, y + depth); gr.addColorStop(0, shade(col, .18)); gr.addColorStop(1, shade(col, -.2)); g.fillStyle = gr; g.fillRect(x0, y, x1 - x0, depth + 2000);
  g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(x0, y, x1 - x0, 3);
  const R = mulberry(seed); g.strokeStyle = crest; g.lineCap = 'round';
  for (let yy = y + 14; yy < y + depth; yy += 14 + (yy - y) * .08) { g.lineWidth = 1.5 + (yy - y) * .006; for (let i = 0; i < (x1 - x0) / 120; i++) { const xx = x0 + R() * (x1 - x0), l = 16 + R() * 40 + (yy - y) * .1; g.beginPath(); g.moveTo(xx, yy); g.quadraticCurveTo(xx + l / 2, yy - 3, xx + l, yy); g.stroke(); } }
}
function softCloud(g, x, y, s, col, a = 1) { g.save(); g.globalAlpha = a; drawCloud(g, x, y, s, col); g.restore(); }
function sparkle(g, x, y, r, col) { g.fillStyle = col; g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r); g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r); g.fill(); }
function glow(g, x, y, r, col, a) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, hexA(col, a)); gr.addColorStop(1, hexA(col, 0)); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }

// ---------- sky ----------
const SKY_FX = {
  day: { sun: [.78, 110, 46, '#fff6d6', 1], clouds: 9, cloudCol: '#ffffff', cloudA: .85, bank: '#ffffff' },
  hot: { sun: [.72, 130, 64, '#fffbe8', 1.4], clouds: 3, cloudCol: '#fff8ec', cloudA: .55, bands: '#fff4dc' },
  cold: { sun: [.24, 120, 40, '#ffffff', 1], clouds: 6, cloudCol: '#ffffff', cloudA: .8, sparkle: 50, bank: '#f4fbff' },
  dusk: { sun: [.62, 420, 110, '#ffd890', 1.6], clouds: 6, cloudCol: '#ffd8cc', cloudA: .8, streaks: ['#ffb4a0', '#ffd2b0', '#f49a9a'] },
  night: { moon: [.76, 150, 54], stars: 220, clouds: 4, cloudCol: '#8a76b0', cloudA: .45 },
  smoke: { sun: [.36, 210, 70, '#ffdcae', 1.2], plumes: '#6a4a48', ash: 160, clouds: 0, glowBottom: '#ff7a3a' },
  jungle: { sun: [.16, 60, 40, '#fffbe0', .9], rays: '#fffbe0', clouds: 6, cloudCol: '#ffffff', cloudA: .7, mist: '#ffffff' },
  party: { beams: ['#ff5fa2', '#5fc8ff', '#ffd34d', '#9a7aff'], stars: 90, clouds: 0, confetti: 120 },
  factory: { sun: [.6, 160, 56, '#fff4e6', 1], smog: '#b8b0a8', clouds: 5, cloudCol: '#e2e0de', cloudA: .7 },
  toxic: { sun: [.7, 140, 50, '#f4ffe0', 1], bubbles: '#9affb0', clouds: 5, cloudCol: '#eaffef', cloudA: .7 },
  digital: { grid: '#3fd08a', stars: 60, clouds: 0 },
  dream: { sun: [.84, 120, 44, '#fffaf0', 1], rainbow: true, sparkle: 70, clouds: 12, cloudCol: '#ffffff', cloudA: .95, bank: '#ffffff' },
};
function paintSky(g, m, x0, x1, y0, y1) {
  const MW = m.w * T, MH = m.h * T, P = m.pal, S = SKY_FX[m.sky] || SKY_FX.day, R = mulberry(m.id.length * 77 + 3);
  const gr = g.createLinearGradient(0, -500, 0, MH - 120); gr.addColorStop(0, shade(P.sky[0], -.14)); gr.addColorStop(.45, P.sky[0]); gr.addColorStop(1, P.sky[1]);
  g.fillStyle = gr; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  glow(g, MW / 2, MH - 100, 1250, P.haze, .38);
  if (S.glowBottom) glow(g, MW * .45, MH + 100, 1300, S.glowBottom, .55);
  if (S.stars) for (let i = 0; i < S.stars; i++) { const x = x0 + R() * (x1 - x0), y = y0 + R() * (MH - y0 - 200), r = .8 + R() * 2.2; g.fillStyle = 'rgba(255,255,240,' + (.35 + R() * .6) + ')'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); if (R() < .08) sparkle(g, x, y, 7 + R() * 6, 'rgba(255,255,240,.85)'); }
  if (S.rays) { g.save(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 7; i++) { const a = .5 + i * .14 + R() * .05, w = .03 + R() * .04; g.fillStyle = hexA(S.rays, .03 + R() * .035); g.beginPath(); g.moveTo(MW * .12, y0); g.lineTo(MW * .12 + Math.cos(a - w) * 3000, y0 + Math.sin(a - w) * 3000); g.lineTo(MW * .12 + Math.cos(a + w) * 3000, y0 + Math.sin(a + w) * 3000); g.fill(); } g.restore(); }
  if (S.sun) { const [fx, sy, r, col, k] = S.sun, sx = MW * fx; glow(g, sx, sy, r * 7 * k, col, .55); glow(g, sx, sy, r * 2.6, col, .7); const sg = g.createRadialGradient(sx - r * .3, sy - r * .3, r * .1, sx, sy, r); sg.addColorStop(0, '#ffffff'); sg.addColorStop(1, col); g.fillStyle = sg; g.beginPath(); g.arc(sx, sy, r, 0, TAU); g.fill(); }
  if (S.moon) { const [fx, sy, r] = S.moon, sx = MW * fx; glow(g, sx, sy, r * 6, '#e8dcff', .35); g.fillStyle = '#fff6dc'; g.beginPath(); g.arc(sx, sy, r, 0, TAU); g.fill(); for (const [dx, dy, cr] of [[-.3, -.2, .22], [.25, .15, .16], [-.05, .4, .12], [.35, -.35, .1]]) { g.fillStyle = 'rgba(200,180,150,.35)'; g.beginPath(); g.arc(sx + dx * r, sy + dy * r, cr * r, 0, TAU); g.fill(); } g.fillStyle = 'rgba(60,40,90,.18)'; g.beginPath(); g.arc(sx + r * .35, sy + r * .1, r * .95, 0, TAU); g.arc(sx, sy, r, 0, TAU, true); g.fill(); }
  if (S.rainbow) { const cx = MW * .3, cy = MH - 80; ['#ff8a8a', '#ffc47a', '#fff27a', '#9ae68a', '#8acfff', '#c09aff'].forEach((c, i) => { g.beginPath(); g.arc(cx, cy, 760 - i * 26, Math.PI, 0); g.strokeStyle = hexA(c, .38); g.lineWidth = 27; g.stroke(); }); }
  if (S.beams) { g.save(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 10; i++) { const bx = (i + .5) / 10 * MW, a = -Math.PI / 2 + (R() - .5) * 1.1, w = .06 + R() * .04, c = S.beams[i % S.beams.length]; const bg = g.createLinearGradient(bx, MH, bx + Math.cos(a) * 1500, MH + Math.sin(a) * 1500); bg.addColorStop(0, hexA(c, .3)); bg.addColorStop(1, hexA(c, 0)); g.fillStyle = bg; g.beginPath(); g.moveTo(bx, MH); g.lineTo(bx + Math.cos(a - w) * 1700, MH + Math.sin(a - w) * 1700); g.lineTo(bx + Math.cos(a + w) * 1700, MH + Math.sin(a + w) * 1700); g.fill(); } g.restore(); }
  if (S.confetti) for (let i = 0; i < S.confetti; i++) { g.save(); g.translate(x0 + R() * (x1 - x0), y0 + R() * (MH - y0)); g.rotate(R() * 3); g.fillStyle = hexA(pick(S.beams), .5); g.fillRect(-4, -2, 8, 4); g.restore(); }
  if (S.grid) { g.strokeStyle = hexA(S.grid, .14); g.lineWidth = 2; for (let x = Math.floor(x0 / 64) * 64; x < x1; x += 64) { g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y1); g.stroke(); } for (let y = Math.floor(y0 / 64) * 64; y < y1; y += 64) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); } for (let i = 0; i < 70; i++) { g.fillStyle = hexA(S.grid, .25 + R() * .5); g.fillRect(Math.floor((x0 + R() * (x1 - x0)) / 64) * 64 - 3, Math.floor((y0 + R() * (y1 - y0)) / 64) * 64 - 3, 6, 6); } glow(g, MW / 2, MH * .4, 900, S.grid, .12); }
  if (S.streaks) for (let i = 0; i < 9; i++) { const y = 140 + i * 58 + R() * 30, x = x0 + R() * (x1 - x0), w = 260 + R() * 520; g.fillStyle = hexA(S.streaks[i % S.streaks.length], .55); g.beginPath(); g.ellipse(x, y, w, 9 + R() * 9, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,240,230,.4)'; g.beginPath(); g.ellipse(x - w * .1, y - 4, w * .7, 4, 0, 0, TAU); g.fill(); }
  if (S.bands) for (let i = 0; i < 6; i++) { g.fillStyle = hexA(S.bands, .18); g.fillRect(x0, MH - 520 + i * 46, x1 - x0, 10 + i * 3); }
  if (S.smog) for (let i = 0; i < 5; i++) { g.fillStyle = hexA(S.smog, .16); g.beginPath(); g.ellipse(MW / 2 + (R() - .5) * 800, 260 + i * 90, 1600, 34, 0, 0, TAU); g.fill(); }
  if (S.plumes) { const L = []; for (let i = 0; i < 40; i++) { const k = i / 40; L.push([MW * .46 + Math.sin(k * 5) * 120 + (R() - .5) * 140 + k * 700, MH - 760 - k * 700, 50 + k * 160 + R() * 40]); } blobs(g, L, hexA(S.plumes, .5)); blobs(g, L.map(([x, y, r]) => [x - r * .25, y - r * .25, r * .6]), hexA('#9a7a72', .25)); }
  if (S.ash) for (let i = 0; i < S.ash; i++) { g.fillStyle = R() < .3 ? 'rgba(255,170,90,.7)' : 'rgba(80,60,60,.45)'; g.beginPath(); g.arc(x0 + R() * (x1 - x0), y0 + R() * (MH - y0), 1 + R() * 2.5, 0, TAU); g.fill(); }
  if (S.bubbles) for (let i = 0; i < 40; i++) { const x = x0 + R() * (x1 - x0), y = 100 + R() * (MH - 300), r = 6 + R() * 26; g.strokeStyle = hexA(S.bubbles, .35); g.lineWidth = 2; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); g.fillStyle = hexA(S.bubbles, .1); g.fill(); g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(x - r * .35, y - r * .35, r * .2, 0, TAU); g.fill(); }
  if (S.sparkle) for (let i = 0; i < S.sparkle; i++) sparkle(g, x0 + R() * (x1 - x0), y0 + 300 + R() * (MH - y0 - 400), 3 + R() * 7, 'rgba(255,255,255,' + (.4 + R() * .5) + ')');
  if (S.bank) for (let i = 0; i < 9; i++) softCloud(g, x0 + i * (x1 - x0) / 8 + (R() - .5) * 100, MH - 300 + R() * 60, 2.2 + R() * 1.3, S.bank, .55);
  for (let i = 0; i < (S.clouds || 0); i++) softCloud(g, x0 + R() * (x1 - x0), 60 + R() * (MH * .42), .7 + R() * .9, S.cloudCol, S.cloudA * (.5 + R() * .5));
  if (S.mist) for (let i = 0; i < 6; i++) { g.fillStyle = hexA(S.mist, .14); g.beginPath(); g.ellipse(x0 + R() * (x1 - x0), MH - 420 + R() * 200, 700, 50, 0, 0, TAU); g.fill(); }
}

// ---------- per-map far / land / near painters ----------
// F(col, k) mixes a colour toward the haze for aerial perspective.
const BG = {
  farm: {
    far(g, m, F, x0, x1) { const MH = m.h * T; const a = hillPts(x0, x1, MH - 330, 200, 3); band(g, a, F(m.pal.far, .45)); treesOn(g, a, x0, x1, 60, 22, F('#7ab07a', .5), 5);
      const b = hillPts(x0, x1, MH - 200, 170, 9); band(g, b, F(m.pal.far, .2)); g.save(); bandPath(g, b); g.clip(); for (let x = x0; x < x1; x += 150) { g.fillStyle = (x / 150) % 3 < 1 ? 'rgba(255,230,120,.25)' : (x / 150) % 3 < 2 ? 'rgba(80,140,60,.16)' : 'rgba(255,255,255,.08)'; g.beginPath(); g.moveTo(x, MH - 450); g.lineTo(x + 150, MH - 450); g.lineTo(x + 60, MH + 200); g.lineTo(x - 90, MH + 200); g.fill(); } g.restore(); treesOn(g, b, x0, x1, 90, 34, F('#6aa860', .3), 11); },
    land(g, m, F) { const y = m.h * T - 130; g.fillStyle = F('#c8564a', .3); rr(g, 1180, y - 190, 150, 190, 4); g.fill(); g.fillStyle = F('#8a4a46', .3); g.beginPath(); g.moveTo(1165, y - 185); g.lineTo(1255, y - 250); g.lineTo(1345, y - 185); g.fill(); g.fillStyle = F('#f4ecdc', .3); g.fillRect(1235, y - 110, 40, 110); rr(g, 1380, y - 260, 54, 260, 26); g.fillStyle = F('#b4bac4', .3); g.fill();
      g.strokeStyle = F('#8a7a6a', .3); g.lineWidth = 6; g.beginPath(); g.moveTo(640, y); g.lineTo(680, y - 250); g.lineTo(720, y); g.stroke(); g.fillStyle = F('#e8e0d0', .3); for (let i = 0; i < 8; i++) { g.save(); g.translate(680, y - 260); g.rotate(i / 8 * TAU); g.fillRect(0, -5, 44, 10); g.restore(); }
      const p = hillPts(-900, m.w * T + 900, y + 30, 50, 21); band(g, p, F(m.pal.near, .22)); treesOn(g, p, -900, m.w * T + 900, 140, 70, F('#5f9f55', .25), 13, 'round', .45); },
    near(g, m) { const MH = m.h * T, p = hillPts(-900, m.w * T + 900, MH + 30, 150, 27); band(g, p, m.pal.near); treesOn(g, p, -900, m.w * T + 900, 120, 60, shade(m.pal.near, -.18), 29, 'round', .4); },
  },
  pyramid: {
    far(g, m, F, x0, x1) { const MH = m.h * T; for (const [cx, h] of [[200, 330], [520, 230], [1500, 300], [1880, 200]]) { g.fillStyle = F('#f2d49a', .45); g.beginPath(); g.moveTo(cx - h * 1.1, MH - 200); g.lineTo(cx, MH - 200 - h); g.lineTo(cx + h * 1.1, MH - 200); g.fill(); g.fillStyle = F('#d4a868', .45); g.beginPath(); g.moveTo(cx, MH - 200 - h); g.lineTo(cx + h * 1.1, MH - 200); g.lineTo(cx + h * .25, MH - 200); g.fill(); }
      band(g, hillPts(x0, x1, MH - 150, 110, 4), F(m.pal.far, .3), { rim: F('#fff0d0', .2) }); },
    land(g, m, F) { const y = m.h * T - 120; const cx = 980, h = 420; for (let i = 0; i < 9; i++) { const w = (h - i * 46) * 1.15; g.fillStyle = F(i % 2 ? '#e6c286' : '#ecca90', .3); g.fillRect(cx - w, y - (i + 1) * 46, w * 2, 47); } g.fillStyle = F('#c89a5e', .3); for (let i = 0; i < 9; i++) { const w = (h - i * 46) * 1.15; g.fillRect(cx + w * .55, y - (i + 1) * 46, w * .45, 47); }
      const p = hillPts(-900, m.w * T + 900, y + 30, 40, 13); band(g, p, F(m.pal.near, .2)); treesOn(g, p, 300, 700, 50, 90, F('#5a9a4a', .25), 7, 'palm', .2); treesOn(g, p, 1400, 1800, 80, 60, F('#6aa060', .25), 9, 'cactus', .4); },
    near(g, m) { const MH = m.h * T, p = hillPts(-900, m.w * T + 900, MH + 20, 140, 31); band(g, p, m.pal.near, { rim: '#fbe2b0' }); g.save(); bandPath(g, p); g.clip(); g.strokeStyle = 'rgba(160,100,40,.2)'; g.lineWidth = 2; for (let y = MH - 120; y < MH + 200; y += 14) { g.beginPath(); for (let x = -900; x < m.w * T + 900; x += 30) g.lineTo(x, y + Math.sin(x * .02 + y) * 4); g.stroke(); } g.restore(); treesOn(g, p, -900, m.w * T + 900, 260, 70, shade(m.pal.near, -.2), 33, 'cactus', .4); },
  },
  iceberg: {
    far(g, m, F, x0, x1) { const MH = m.h * T; const a = peakPts(x0, x1, MH - 260, 440, 5); band(g, a, F('#c8e2f2', .4), { rim: '#ffffff' }); facets(g, a, .1, '#ffffff', 150); const b = peakPts(x0, x1, MH - 160, 260, 12, 10, 1.3); band(g, b, F('#d8eef8', .15), { rim: '#ffffff' }); facets(g, b, .12, '#ffffff', 90); },
    land(g, m, F) { const y = m.h * T - 150; seaBand(g, -900, m.w * T + 900, y, F('#5ab0d8', .25), 600, 'rgba(255,255,255,.4)', 4); for (const [x, w, h] of [[300, 180, 200], [900, 120, 110], [1500, 220, 260]]) { g.fillStyle = F('#ffffff', .1); g.beginPath(); g.moveTo(x - w, y + 4); g.lineTo(x - w * .6, y - h * .6); g.lineTo(x - w * .1, y - h); g.lineTo(x + w * .4, y - h * .7); g.lineTo(x + w, y + 4); g.fill(); g.fillStyle = F('#a8d4ec', .1); g.beginPath(); g.moveTo(x - w * .1, y - h); g.lineTo(x + w * .4, y - h * .7); g.lineTo(x + w, y + 4); g.lineTo(x + w * .1, y + 4); g.fill(); g.fillStyle = 'rgba(80,160,210,.35)'; g.beginPath(); g.ellipse(x, y + 18, w * .9, 14, 0, 0, TAU); g.fill(); } },
    near(g, m) { const MH = m.h * T, p = hillPts(-900, m.w * T + 900, MH + 30, 140, 37); band(g, p, '#eef8ff', { rim: '#ffffff', botCol: '#b8daee' }); treesOn(g, p, -900, m.w * T + 900, 150, 80, '#6a9ab0', 41, 'pine', .45); },
  },
  rooftops: {
    far(g, m, F, x0, x1) { const MH = m.h * T; skyline(g, x0, x1, MH - 200, 160, 420, 60, 140, F(m.pal.far, .45), 7, [F('#ffe8b0', .4), .18]); },
    land(g, m, F) { const MH = m.h * T; skyline(g, -900, m.w * T + 900, MH - 80, 140, 360, 90, 180, F('#9a6a74', .25), 17, [F('#ffe2a0', .2), .35]); g.fillStyle = F('#8a5a64', .25); g.fillRect(860, MH - 560, 70, 480); g.beginPath(); g.moveTo(850, MH - 560); g.lineTo(895, MH - 660); g.lineTo(940, MH - 560); g.fill(); g.fillStyle = F('#fff2d0', .2); g.beginPath(); g.arc(895, MH - 500, 22, 0, TAU); g.fill(); g.strokeStyle = F('#8a5a64', .25); g.lineWidth = 3; g.beginPath(); g.moveTo(895, MH - 500); g.lineTo(895, MH - 514); g.moveTo(895, MH - 500); g.lineTo(906, MH - 500); g.stroke(); },
    near(g, m) { const MH = m.h * T; skyline(g, -900, m.w * T + 900, MH + 60, 80, 200, 120, 220, m.pal.near, 23, ['#ffd890', .2]); },
  },
  manor: {
    far(g, m, F, x0, x1) { const MH = m.h * T; const a = hillPts(x0, x1, MH - 220, 220, 6); band(g, a, F(m.pal.far, .3), { rim: F('#c8a8d8', .3) }); treesOn(g, a, x0, x1, 120, 60, F('#4a3a5a', .3), 9, 'dead', .4); },
    land(g, m, F) { const MH = m.h * T, y = MH - 110, c = F('#3a2c4a', .2); g.fillStyle = c; g.fillRect(560, y - 380, 680, 380); g.beginPath(); g.moveTo(520, y - 380); g.lineTo(900, y - 600); g.lineTo(1280, y - 380); g.fill(); g.fillRect(1060, y - 640, 70, 220); g.fillRect(600, y - 520, 120, 160); g.beginPath(); g.moveTo(585, y - 520); g.lineTo(660, y - 600); g.lineTo(735, y - 520); g.fill();
      const R = mulberry(5); for (let yy = y - 330; yy < y - 40; yy += 90) for (let xx = 610; xx < 1200; xx += 90) if (R() < .55) { g.fillStyle = '#ffcf6a'; g.fillRect(xx, yy, 34, 50); glow(g, xx + 17, yy + 25, 60, '#ffcf6a', .25); g.fillStyle = c; g.fillRect(xx + 15, yy, 4, 50); g.fillRect(xx, yy + 22, 34, 4); }
      for (let i = 0; i < 6; i++) { const bx = 300 + R() * 1300, by = 150 + R() * 300; g.fillStyle = c; g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx - 14, by - 12, bx - 26, by - 2); g.quadraticCurveTo(bx - 14, by - 4, bx, by + 4); g.quadraticCurveTo(bx + 14, by - 4, bx + 26, by - 2); g.quadraticCurveTo(bx + 14, by - 12, bx, by); g.fill(); } },
    near(g, m) { const MH = m.h * T, p = hillPts(-900, m.w * T + 900, MH + 30, 130, 43); band(g, p, m.pal.near, { rim: shade(m.pal.near, .25) }); const R = mulberry(9); for (let x = -900; x < m.w * T + 900; x += 70 + R() * 90) { const y = ptsY(p, x) + 8; g.fillStyle = shade(m.pal.near, -.25); rr(g, x - 12, y - 34, 24, 40, 12); g.fill(); if (R() < .3) { g.fillRect(x - 2, y - 52, 4, 26); g.fillRect(x - 10, y - 44, 20, 4); } } },
  },
  pier: {
    far(g, m, F, x0, x1) { const MH = m.h * T; seaBand(g, x0, x1, MH - 330, F('#4aa8d4', .35), 900, 'rgba(255,255,255,.35)', 8); for (const [x, w, h] of [[150, 300, 90], [1300, 420, 130], [1900, 260, 70]]) { const p = hillPts(x - w, x + w, MH - 330, h, x); g.save(); g.beginPath(); g.rect(x - w, MH - 700, w * 2, 370); g.clip(); band(g, p, F('#6ab08a', .45), { rim: false }); g.restore(); } },
    land(g, m, F) { const MH = m.h * T, y = MH - 230; g.fillStyle = F('#f4ecdc', .25); g.beginPath(); g.moveTo(520, y - 10); g.lineTo(520, y - 150); g.lineTo(600, y - 14); g.fill(); g.beginPath(); g.moveTo(515, y - 140); g.lineTo(460, y - 20); g.lineTo(515, y - 20); g.fill(); g.fillStyle = F('#c8563c', .25); g.beginPath(); g.moveTo(440, y - 12); g.lineTo(610, y - 12); g.lineTo(585, y + 10); g.lineTo(460, y + 10); g.fill();
      g.fillStyle = F('#d8c08a', .25); g.beginPath(); g.ellipse(1450, y + 10, 260, 40, 0, Math.PI, 0); g.fill(); g.fillStyle = F('#6aa86a', .25); g.beginPath(); g.ellipse(1450, y, 200, 70, 0, Math.PI, 0); g.fill(); g.fillStyle = F('#f4ecdc', .25); g.fillRect(1420, y - 110, 60, 50); g.fillStyle = F('#c8563c', .25); g.beginPath(); g.moveTo(1410, y - 108); g.lineTo(1450, y - 140); g.lineTo(1490, y - 108); g.fill(); treeSil(g, 1350, y - 40, 110, F('#4f9a5a', .25), 'palm'); treeSil(g, 1560, y - 30, 90, F('#4f9a5a', .25), 'palm');
      g.strokeStyle = F('#5a5a62', .3); g.lineWidth = 3; for (const [bx, by] of [[800, 260], [840, 230], [1150, 300]]) { g.beginPath(); g.moveTo(bx - 14, by); g.quadraticCurveTo(bx - 6, by - 9, bx, by); g.quadraticCurveTo(bx + 6, by - 9, bx + 14, by); g.stroke(); } },
    near(g, m) { const MH = m.h * T; seaBand(g, -900, m.w * T + 900, MH - 140, '#3a9ccc', 600, 'rgba(255,255,255,.55)', 12); },
  },
  falls: {
    far(g, m, F, x0, x1) { const MH = m.h * T; const a = mesaPts(x0, x1, MH - 260, 420, 8); band(g, a, F('#8ab09a', .45), { rim: F('#c8e8c8', .3) }); g.fillStyle = F('#ffffff', .3); for (const x of [380, 1260, 1690]) { const y = ptsY(a, x); g.globalAlpha = .7; g.fillRect(x, y, 16, 900); g.globalAlpha = 1; } treesOn(g, a, x0, x1, 50, 26, F('#4f8a60', .45), 3, 'pine', .3); },
    land(g, m, F) { const MH = m.h * T; for (const [x0, x1, s] of [[-900, 520, 3], [1380, 2700, 7]]) { const p = mesaPts(x0, x1, MH - 120, 520, s); g.save(); g.beginPath(); g.rect(x0, -1000, x1 - x0, 3000); g.clip(); band(g, p, F('#8a8f98', .25), { rim: F('#c8d0d8', .2) }); g.restore(); treesOn(g, p, x0 + 40, x1 - 40, 60, 60, F('#4f8a60', .25), s, 'pine', .3); } for (let i = 0; i < 5; i++) softCloud(g, 300 + i * 320, MH - 200 + (i % 2) * 40, 2.4, '#ffffff', .35); },
    near(g, m) { const MH = m.h * T, p = hillPts(-900, m.w * T + 900, MH + 30, 120, 47); band(g, p, m.pal.near); treesOn(g, p, -900, m.w * T + 900, 110, 90, shade(m.pal.near, -.25), 49, 'pine', .35); },
  },
  mill: {
    far(g, m, F, x0, x1) { BG.farm.far(g, m, F, x0, x1); },
    land(g, m, F) { const MH = m.h * T, y = MH - 140; const p = hillPts(-900, m.w * T + 900, y + 20, 80, 17); band(g, p, F(m.pal.near, .3)); for (const [x, s] of [[260, 1], [1560, .8], [1820, .6]]) { const by = ptsY(p, x) + 6; g.fillStyle = F('#efe2c8', .3); g.beginPath(); g.moveTo(x - 40 * s, by); g.lineTo(x - 24 * s, by - 170 * s); g.lineTo(x + 24 * s, by - 170 * s); g.lineTo(x + 40 * s, by); g.fill(); g.fillStyle = F('#c8564a', .3); g.beginPath(); g.moveTo(x - 30 * s, by - 168 * s); g.lineTo(x, by - 210 * s); g.lineTo(x + 30 * s, by - 168 * s); g.fill(); g.fillStyle = F('#f8f0e0', .3); for (let i = 0; i < 4; i++) { g.save(); g.translate(x, by - 175 * s); g.rotate(.4 + i * TAU / 4); g.fillRect(8 * s, -9 * s, 110 * s, 18 * s); g.restore(); } } treesOn(g, p, -900, m.w * T + 900, 150, 70, F('#5f9f55', .3), 19, 'round', .5); },
    near(g, m) { BG.farm.near(g, m); },
  },
  volcano: {
    far(g, m, F, x0, x1) { const MH = m.h * T, cx = 820, top = MH - 760; g.fillStyle = F('#6a3e3a', .3); g.beginPath(); g.moveTo(cx - 900, MH); g.quadraticCurveTo(cx - 250, MH - 300, cx - 90, top); g.lineTo(cx + 90, top); g.quadraticCurveTo(cx + 250, MH - 300, cx + 900, MH); g.fill(); g.fillStyle = 'rgba(40,10,10,.18)'; g.beginPath(); g.moveTo(cx + 20, top); g.lineTo(cx + 90, top); g.quadraticCurveTo(cx + 250, MH - 300, cx + 900, MH); g.lineTo(cx + 200, MH); g.fill();
      glow(g, cx, top, 220, '#ff8a3a', .6); g.fillStyle = '#ffb04a'; g.beginPath(); g.ellipse(cx, top + 4, 92, 14, 0, 0, TAU); g.fill(); g.strokeStyle = '#ff7a2a'; g.lineCap = 'round'; for (const [dx, k] of [[-40, 1], [30, .8], [60, .6]]) { g.lineWidth = 9 * k; g.beginPath(); g.moveTo(cx + dx, top + 10); g.quadraticCurveTo(cx + dx * 3, top + 200, cx + dx * 4 + 30, top + 360 * k); g.stroke(); }
      const a = peakPts(x0, x1, MH - 160, 260, 4, 10, 1.2); band(g, a, F('#5a3634', .25), { rim: '#a8604a' }); facets(g, a, .15); },
    land(g, m, F) { const MH = m.h * T, p = peakPts(-900, m.w * T + 900, MH - 70, 300, 9, 8, 1.6); band(g, p, F('#4a3030', .15), { rim: '#c8603a' }); facets(g, p, .18); g.save(); bandPath(g, p); g.clip(); g.strokeStyle = 'rgba(255,120,40,.5)'; g.lineWidth = 3; const R = mulberry(4); for (let i = 0; i < 30; i++) { let x = -900 + R() * (m.w * T + 1800), y = ptsY(p, x) + 30 + R() * 100; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (R() - .5) * 30; y += 14 + R() * 16; g.lineTo(x, y); } g.stroke(); } g.restore(); },
    near(g, m) { const MH = m.h * T, p = peakPts(-900, m.w * T + 900, MH + 30, 170, 15, 8, 1.8); band(g, p, '#3a2a2a', { rim: '#8a4a3a' }); facets(g, p, .2); const gr = g.createLinearGradient(0, MH - 160, 0, MH + 80); gr.addColorStop(0, 'rgba(255,110,40,0)'); gr.addColorStop(1, 'rgba(255,110,40,.6)'); g.fillStyle = gr; g.fillRect(-900, MH - 160, m.w * T + 1800, 600); },
  },
  temple: {
    far(g, m, F, x0, x1) { const MH = m.h * T; const a = peakPts(x0, x1, MH - 250, 420, 3, 10, .9); band(g, a, F('#5a9a72', .5), { rim: F('#b8e8c0', .4) }); facets(g, a, .1); const b = hillPts(x0, x1, MH - 160, 160, 8); band(g, b, F('#4f8a5a', .3)); g.save(); g.globalAlpha = .9; treesOn(g, b, x0, x1, 40, 50, F('#3f7a4a', .3), 9, 'round', .1); g.restore(); },
    land(g, m, F) { const MH = m.h * T, y = MH - 120, cx = 1250; for (let i = 0; i < 6; i++) { const w = 260 - i * 38; g.fillStyle = F(i % 2 ? '#8a8a76' : '#96967e', .3); g.fillRect(cx - w, y - (i + 1) * 60, w * 2, 61); g.fillStyle = F('#6a6a5a', .3); g.fillRect(cx + w * .6, y - (i + 1) * 60, w * .4, 61); } g.fillStyle = F('#3a3a2a', .3); g.fillRect(cx - 34, y - 420, 68, 60); g.fillStyle = F('#8a8a76', .3); g.fillRect(cx - 60, y - 440, 120, 22);
      g.strokeStyle = F('#3f8a3a', .3); g.lineWidth = 5; for (let i = 0; i < 8; i++) { const x = cx - 220 + i * 60; g.beginPath(); g.moveTo(x, y - 300 + Math.abs(i - 4) * 50); g.quadraticCurveTo(x + 10, y - 200, x - 6, y - 120 + i * 9); g.stroke(); }
      const p = hillPts(-900, m.w * T + 900, y + 30, 70, 31); band(g, p, F('#3f8a4a', .25)); treesOn(g, p, -900, m.w * T + 900, 70, 110, F('#3a7a42', .22), 33, 'round', .25); treesOn(g, p, -900, m.w * T + 900, 260, 120, F('#4a8a4a', .2), 35, 'palm', .3); },
    near(g, m) { const MH = m.h * T, p = hillPts(-900, m.w * T + 900, MH + 10, 150, 53); band(g, p, '#356e3e', { rim: '#5aa860' }); g.save(); treesOn(g, p, -900, m.w * T + 900, 60, 90, '#2f6438', 55, 'round', .1); g.restore(); },
  },
  disco: {
    far(g, m, F, x0, x1) { const MH = m.h * T, cx = m.w * T / 2; g.strokeStyle = F('#6a4aa8', .3); g.lineWidth = 14; for (let i = -6; i <= 6; i++) { g.beginPath(); g.moveTo(cx + i * 230, MH); g.quadraticCurveTo(cx + i * 120, -500, cx, -600); g.stroke(); } for (let k = 0; k < 4; k++) { g.lineWidth = 8; g.beginPath(); g.ellipse(cx, MH, 1700 - k * 300, 1500 - k * 330, 0, Math.PI, 0); g.stroke(); } },
    land(g, m, F) { const MH = m.h * T, cx = m.w * T / 2; g.strokeStyle = F('#3a2a5a', .2); g.lineWidth = 4; g.beginPath(); g.moveTo(cx, -500); g.lineTo(cx, 40); g.stroke(); glow(g, cx, 100, 300, '#ffffff', .25); g.fillStyle = '#c8d0e8'; g.beginPath(); g.arc(cx, 100, 64, 0, TAU); g.fill(); g.save(); g.beginPath(); g.arc(cx, 100, 63, 0, TAU); g.clip(); const R = mulberry(2); for (let x = cx - 70; x < cx + 70; x += 14) for (let y = 30; y < 170; y += 14) { g.fillStyle = R() < .25 ? '#ffffff' : R() < .5 ? '#9aa8c8' : R() < .7 ? '#ffb4dc' : '#b4e4ff'; g.fillRect(x, y, 12, 12); } const sg = g.createRadialGradient(cx - 20, 80, 10, cx, 100, 64); sg.addColorStop(0, 'rgba(255,255,255,.3)'); sg.addColorStop(1, 'rgba(40,20,80,.45)'); g.fillStyle = sg; g.fillRect(cx - 70, 30, 140, 140); g.restore();
      skyline(g, -900, m.w * T + 900, MH - 60, 40, 120, 30, 60, F('#2a1e44', .1), 41, null); },
    near(g, m) { const MH = m.h * T, R = mulberry(77); g.fillStyle = '#1e1634'; for (let x = -900; x < m.w * T + 900; x += 26 + R() * 18) { const y = MH - 40 + R() * 40, r = 18 + R() * 8; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.fillRect(x - r, y, r * 2, 300); if (R() < .3) { g.save(); g.translate(x + r * .6, y - r * .3); g.rotate(-.3 - R() * .6); rr(g, -4, -60, 8, 62, 4); g.fill(); g.restore(); } } },
  },
  gears: {
    far(g, m, F, x0, x1) { const MH = m.h * T; skyline(g, x0, x1, MH - 180, 120, 300, 100, 220, F('#8a96a4', .45), 13, null); const R = mulberry(8); for (let i = 0; i < 6; i++) { const x = x0 + 300 + i * 520 + R() * 100, h = 380 + R() * 180; g.fillStyle = F('#7a8490', .4); g.fillRect(x, MH - 180 - h, 40, h); g.fillStyle = F('#c86a5a', .4); g.fillRect(x, MH - 180 - h + 20, 40, 14); const L = []; for (let k = 0; k < 8; k++) L.push([x + 20 + k * 22 + Math.sin(k) * 10, MH - 200 - h - k * 34, 20 + k * 7]); blobs(g, L, 'rgba(225,225,230,.5)'); } },
    land(g, m, F) { const MH = m.h * T; for (const [x, y, r] of [[360, MH - 380, 140], [560, MH - 240, 90], [1420, MH - 420, 170], [1650, MH - 220, 80]]) { g.fillStyle = F('#7a8494', .3); g.beginPath(); for (let i = 0; i < 32; i++) { const a = i / 32 * TAU, rr2 = i % 2 ? r : r * .86; g.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); } g.closePath(); g.fill(); g.fillStyle = F('#5a6474', .3); g.beginPath(); g.arc(x, y, r * .6, 0, TAU); g.fill(); g.fillStyle = F('#7a8494', .3); g.beginPath(); g.arc(x, y, r * .45, 0, TAU); g.fill(); for (let i = 0; i < 6; i++) { g.save(); g.translate(x, y); g.rotate(i / 6 * TAU); g.fillStyle = F('#5a6474', .3); g.fillRect(r * .5, -r * .07, r * .3, r * .14); g.restore(); } g.fillStyle = F('#5a6474', .3); g.beginPath(); g.arc(x, y, r * .15, 0, TAU); g.fill(); }
    },
    near(g, m) { const MH = m.h * T, R = mulberry(31), c = m.pal.near, d = shade(c, -.15); for (let x = -900; x < m.w * T + 900;) { const k = R(), w = 90 + R() * 140; if (k < .4) { const h = 120 + R() * 120; g.fillStyle = c; rr(g, x, MH - h, w, h + 400, w * .3); g.fill(); g.fillStyle = d; g.fillRect(x, MH - h * .6, w, 10); g.fillRect(x, MH - h * .3, w, 10); } else if (k < .7) { const h = 80 + R() * 80; g.fillStyle = c; g.fillRect(x, MH - h, w, h + 400); g.fillStyle = d; for (let yy = MH - h + 14; yy < MH; yy += 22) g.fillRect(x + 8, yy, w - 16, 6); } else { g.fillStyle = c; g.fillRect(x + w * .4, MH - 260 - R() * 120, 22, 600); g.fillRect(x, MH - 70, w, 500); } x += w + R() * 30; } g.fillStyle = d; g.fillRect(-900, MH - 150, m.w * T + 1800, 16); g.fillRect(-900, MH - 60, m.w * T + 1800, 12); },
  },
  reactor: {
    far(g, m, F, x0, x1) { const MH = m.h * T; band(g, hillPts(x0, x1, MH - 180, 120, 6), F(m.pal.far, .45)); for (const [x, s] of [[150, 1], [420, .8], [1450, 1.1], [1800, .7]]) { const b = MH - 200, h = 380 * s, w = 130 * s; g.fillStyle = F('#c8d4ce', .45); g.beginPath(); g.moveTo(x - w, b); g.quadraticCurveTo(x - w * .45, b - h * .55, x - w * .6, b - h); g.lineTo(x + w * .6, b - h); g.quadraticCurveTo(x + w * .45, b - h * .55, x + w, b); g.fill(); g.fillStyle = 'rgba(40,60,50,.1)'; g.beginPath(); g.moveTo(x + w * .2, b - h); g.lineTo(x + w * .6, b - h); g.quadraticCurveTo(x + w * .45, b - h * .55, x + w, b); g.lineTo(x + w * .3, b); g.fill(); const L = []; for (let k = 0; k < 7; k++) L.push([x + k * 18 * s + Math.sin(k * 2) * 10, b - h - 30 - k * 46 * s, (40 + k * 16) * s]); blobs(g, L, 'rgba(255,255,255,.75)'); blobs(g, L.map(([a, c, r]) => [a + r * .2, c + r * .3, r * .6]), 'rgba(200,220,210,.35)'); } },
    land(g, m, F) { const MH = m.h * T, y = MH - 110; g.strokeStyle = F('#5a6a64', .3); g.lineWidth = 6; const towers = [-200, 340, 880, 1420, 1960]; for (const x of towers) { g.beginPath(); g.moveTo(x - 50, y); g.lineTo(x, y - 300); g.lineTo(x + 50, y); g.moveTo(x - 60, y - 230); g.lineTo(x + 60, y - 230); g.moveTo(x - 40, y - 150); g.lineTo(x + 40, y - 150); g.moveTo(x - 30, y - 80); g.lineTo(x + 30, y - 220); g.moveTo(x + 30, y - 80); g.lineTo(x - 30, y - 220); g.stroke(); } g.lineWidth = 2; for (let i = 0; i < towers.length - 1; i++) for (const d of [-60, 60]) { g.beginPath(); g.moveTo(towers[i] + d, y - 230); g.quadraticCurveTo((towers[i] + towers[i + 1]) / 2 + d, y - 170, towers[i + 1] + d, y - 230); g.stroke(); }
      const p = hillPts(-900, m.w * T + 900, y + 30, 50, 8); band(g, p, F(m.pal.near, .25)); glow(g, 660, y - 60, 300, '#6aff6a', .18); glow(g, 1250, y - 60, 300, '#6aff6a', .18); },
    near(g, m) { const MH = m.h * T; skyline(g, -900, m.w * T + 900, MH + 40, 60, 160, 100, 220, m.pal.near, 51, ['#9affb0', .1]); },
  },
  circuit: {
    far(g, m, F, x0, x1) { const MH = m.h * T, R = mulberry(5); g.strokeStyle = F('#2f6a50', .2); g.lineWidth = 6; for (let i = 0; i < 26; i++) { let x = x0 + R() * (x1 - x0), y = -400 + R() * (MH + 400); g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { if (k % 2) y += (R() - .5) * 400; else x += (R() - .5) * 500; g.lineTo(x, y); } g.stroke(); g.fillStyle = F('#5affb0', .3); g.beginPath(); g.arc(x, y, 8, 0, TAU); g.fill(); } for (let i = 0; i < 9; i++) { const x = x0 + R() * (x1 - x0), y = 100 + R() * (MH - 300), w = 120 + R() * 160, h = 70 + R() * 100; g.fillStyle = F('#1a3a30', .2); g.fillRect(x, y, w, h); g.fillStyle = F('#4a7a68', .2); for (let k = 8; k < w - 6; k += 14) { g.fillRect(x + k, y - 10, 6, 10); g.fillRect(x + k, y + h, 6, 10); } } },
    land(g, m, F) { const MH = m.h * T, cx = 880, cy = MH - 520; glow(g, cx, cy, 500, '#3fd08a', .18); g.fillStyle = F('#22263a', .15); rr(g, cx - 200, cy - 200, 400, 400, 16); g.fill(); g.fillStyle = F('#b8a868', .2); for (let k = -180; k <= 170; k += 26) { g.fillRect(cx + k, cy - 224, 12, 24); g.fillRect(cx + k, cy + 200, 12, 24); g.fillRect(cx - 224, cy + k, 24, 12); g.fillRect(cx + 200, cy + k, 24, 12); } g.fillStyle = F('#32364a', .15); rr(g, cx - 150, cy - 150, 300, 300, 10); g.fill(); g.fillStyle = hexA('#7affc0', .8); g.font = '700 84px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('UHC', cx, cy - 10); g.font = '600 26px Fredoka, sans-serif'; g.fillStyle = hexA('#7affc0', .5); g.fillText('9000 MHz', cx, cy + 60); },
    near(g, m) { const MH = m.h * T, R = mulberry(61); for (let x = -900; x < m.w * T + 900; x += 90 + R() * 120) { const h = 60 + R() * 140, w = 40 + R() * 50, col = R() < .5 ? '#1a3a5a' : '#12302a'; g.fillStyle = col; rr(g, x, MH - h, w, h + 400, R() < .5 ? w / 2 : 6); g.fill(); g.fillStyle = 'rgba(122,255,192,.18)'; g.fillRect(x + 6, MH - h + 10, 6, h - 20); } },
  },
  bridge: {
    far(g, m, F, x0, x1) { const MH = m.h * T; const a = mesaPts(x0, x1, MH - 330, 360, 2); band(g, a, F('#e0a07a', .5), { rim: F('#ffe0c0', .4) }); g.save(); bandPath(g, a); g.clip(); for (let y = MH - 700; y < MH; y += 36) { g.fillStyle = 'rgba(160,80,40,.08)'; g.fillRect(x0, y, x1 - x0, 14); } g.restore(); const b = mesaPts(x0, x1, MH - 200, 280, 6); band(g, b, F('#cc8a5e', .3), { rim: F('#ffd0a0', .3) }); g.save(); bandPath(g, b); g.clip(); for (let y = MH - 500; y < MH; y += 30) { g.fillStyle = 'rgba(140,60,30,.1)'; g.fillRect(x0, y, x1 - x0, 12); } g.restore(); },
    land(g, m, F) { const MH = m.h * T, y = MH - 110; g.fillStyle = F('#b8704a', .25); g.beginPath(); g.moveTo(1180, y); g.lineTo(1200, y - 330); g.quadraticCurveTo(1400, y - 420, 1600, y - 330); g.lineTo(1620, y); g.lineTo(1540, y); g.lineTo(1530, y - 230); g.quadraticCurveTo(1400, y - 300, 1270, y - 230); g.lineTo(1260, y); g.fill(); g.fillRect(250, y - 360, 90, 360); g.fillRect(230, y - 380, 130, 30); const p = hillPts(-900, m.w * T + 900, y + 30, 50, 4); band(g, p, F(m.pal.near, .25)); treesOn(g, p, -900, m.w * T + 900, 150, 70, F('#6a9a60', .3), 5, 'cactus', .4); },
    near(g, m) { const MH = m.h * T, p = mesaPts(-900, m.w * T + 900, MH + 40, 180, 11); band(g, p, '#a8603c', { rim: '#e8a070' }); },
  },
  cloud: {
    far(g, m, F, x0, x1) { const MH = m.h * T, R = mulberry(4); for (let i = 0; i < 14; i++) softCloud(g, x0 + i * 280 + R() * 80, MH - 260 + R() * 80, 2.6 + R(), F('#ffffff', .2), .9); for (const [x, s] of [[300, 1], [1550, 1.2]]) { const b = MH - 300; g.fillStyle = F('#e8e0ff', .35); g.fillRect(x - 90 * s, b - 200 * s, 180 * s, 200 * s); for (const dx of [-90, 50]) { g.fillRect(x + dx * s, b - 300 * s, 40 * s, 300 * s); g.beginPath(); g.moveTo(x + (dx - 10) * s, b - 300 * s); g.lineTo(x + (dx + 20) * s, b - 370 * s); g.lineTo(x + (dx + 50) * s, b - 300 * s); g.fill(); } g.fillStyle = F('#ffc8e8', .35); g.beginPath(); g.moveTo(x - 30 * s, b - 200 * s); g.lineTo(x, b - 260 * s); g.lineTo(x + 30 * s, b - 200 * s); g.fill(); } },
    land(g, m, F) { const MH = m.h * T, R = mulberry(8); for (const [x, y, s] of [[650, 300, 1], [1250, 220, .8], [150, 420, .7]]) { g.fillStyle = F('#a8805a', .3); g.beginPath(); g.moveTo(x - 90 * s, y); g.lineTo(x + 90 * s, y); g.lineTo(x, y + 120 * s); g.fill(); g.fillStyle = F('#8ad07a', .3); rr(g, x - 95 * s, y - 14 * s, 190 * s, 22 * s, 10 * s); g.fill(); treeSil(g, x - 30 * s, y - 10 * s, 70 * s, F('#7ac06a', .3), 'round'); } for (let i = 0; i < 10; i++) softCloud(g, -900 + i * 380 + R() * 100, MH - 150 + R() * 40, 3 + R(), '#ffffff', .85); },
    near(g, m) { const MH = m.h * T, R = mulberry(15); for (let i = 0; i < 16; i++) softCloud(g, -900 + i * 240 + R() * 60, MH + 30 + R() * 30, 3.4 + R() * 1.2, '#fbeefa', 1); },
  },
};
function paintBgLayer(kind, g, m, x0, x1) {
  const P = m.pal, F = (c, k = .35) => mix(c, P.haze, k), B = BG[m.id];
  if (B && B[kind]) { try { B[kind](g, m, F, x0, x1); } catch (e) { console.warn('bg', m.id, kind, e); } return; }
  const MH = m.h * T;
  if (kind === 'far') band(g, hillPts(x0, x1, MH - 200, 220, m.id.length), F(P.far, .3));
  if (kind === 'near') band(g, hillPts(x0, x1, MH + 30, 140, m.id.length * 3), P.near);
}
// Used for thumbnails: the whole background in one pass, no parallax.
function drawMapBackground(ctx, m) {
  const W = m.w * T, H = m.h * T;
  paintSky(ctx, m, -400, W + 400, -800, H + 400);
  for (const k of ['far', 'land', 'near']) paintBgLayer(k, ctx, m, -400, W + 400);
}
