// ---------------- TERRAIN LAYER + THUMBNAILS ----------------
const NO_SHADOW = new Set(['cloud', 'log', 'pipe', 'catwalk', 'billboard', 'press', 'boat', 'lighthouse', 'cooling', 'tractor']);
const NO_EXTEND = new Set(['tractor', 'watertank', 'boat', 'log', 'pipe', 'chip', 'capacitor', 'catwalk', 'billboard', 'chimney', 'deck', 'beam', 'press', 'cloud']);
function terrainStyle(m, r) { const p = r[4] || {}; return p.style || (p.oneway ? 'cloud' : m.style); }
function renderTerrainLayer(m, scale = 1) {
  // Pre-render the static terrain + decorations once per map; Phaser shows it as a single image.
  const W = m.w * T, H = m.h * T, pad = 40;
  const c = document.createElement('canvas'); c.width = Math.ceil((W + pad * 2) * scale); c.height = Math.ceil((H + pad * 2 + 120) * scale);
  const ctx = c.getContext('2d'); ctx.scale(scale, scale); ctx.translate(pad, pad);
  const deco = layer => (m.deco || []).forEach(([k, x, y, s, l]) => { if ((l || 'f') !== layer || !DECOS[k]) return; ctx.save(); ctx.translate(x * T, y * T); try { DECOS[k](ctx, (s || 1) * DECO_SCALE); } catch (e) { console.warn('deco', k, e); } ctx.restore(); });
  const rects = m.terrain.map((r, i) => { const p = r[4] || {}; const st = terrainStyle(m, r); let h = r[3] * T; if (r[1] + r[3] >= m.h - .5 && !NO_EXTEND.has(st)) h += 140; return { x: r[0] * T, y: r[1] * T, w: r[2] * T, h, p, st, seed: i + 1 + m.id.length * 13, r }; }).filter(o => !o.p.disco && o.p.surf !== 'conv');
  deco('b');
  // soft contact shadow behind solid blocks (shadow only: the shape itself is drawn far off-canvas)
  ctx.save(); ctx.shadowColor = 'rgba(20,10,30,.32)'; ctx.shadowBlur = 16 * scale; ctx.shadowOffsetX = 10000 * scale; ctx.shadowOffsetY = 7 * scale; ctx.fillStyle = '#000';
  for (const o of rects) if (!NO_SHADOW.has(o.st)) ctx.fillRect(o.x - 10000 + 3, o.y + 2, o.w - 6, o.h);
  ctx.restore();
  for (const o of rects) { const f = TERRAIN_STYLES[o.st] || TERRAIN_STYLES.grass; ctx.save(); try { f(ctx, o.x, o.y, o.w, o.h, m.pal, o.seed); } catch (e) { console.warn('terrain', o.st, e); } ctx.restore(); }
  for (const o of rects) autoDecor(ctx, m, o.r, o.seed);
  deco('f');
  paintify(c, 0, 0, c.width, c.height, { grain: .3, light: .05, dark: .06 });
  return { canvas: c, pad, scale };
}
const _thumbCache = {};
function mapThumb(m, w, h, items) {
  const key = m.id + w + 'x' + h + (items ? items.length : '');
  if (_thumbCache[key] && !items) return _thumbCache[key];
  const c = document.createElement('canvas'); c.width = w; c.height = h; const ctx = c.getContext('2d');
  const s = Math.min(w / (m.w * T), h / (m.h * T) * 1.25);
  ctx.save(); ctx.scale(s, s); ctx.translate(0, -(m.h * T - h / s));
  drawMapBackground(ctx, m);
  if (!m._layer) m._layer = renderTerrainLayer(m, .5);
  ctx.drawImage(m._layer.canvas, -m._layer.pad, -m._layer.pad, m._layer.canvas.width / m._layer.scale, m._layer.canvas.height / m._layer.scale);
  for (const r of m.terrain) { const p = r[4] || {}; if (p.disco) { rr(ctx, r[0] * T, r[1] * T, r[2] * T, r[3] * T, 4); fillStroke(ctx, p.disco === 'a' ? '#ff5fa2' : '#5fc8ff', 3); } if (p.surf === 'conv') { rr(ctx, r[0] * T, r[1] * T, r[2] * T, r[3] * T, 12); fillStroke(ctx, '#4b4f58', 3); } }
  if (m.bridge) for (let x = m.bridge.from; x <= m.bridge.to; x += m.bridge.step) { ctx.fillStyle = '#d8b27e'; ctx.fillRect(x * T, m.bridge.y * T, 3 * T, T / 2); }
  if (m.mech === 'lava') { ctx.fillStyle = '#ff6a2a'; ctx.fillRect(0, 27.3 * T, m.w * T, 4 * T); }
  if (m.mech === 'tide') { ctx.fillStyle = 'rgba(40,140,200,.8)'; ctx.fillRect(0, 27 * T, m.w * T, 4 * T); }
  if (m.mech === 'waterfall') { ctx.fillStyle = 'rgba(200,240,255,.75)'; ctx.fillRect(24 * T, 0, 4 * T, m.h * T); }
  if (items) for (const it of items) drawItem(ctx, it, 1);
  drawFlag(ctx, m.goal[0] * T, m.goal[1] * T, 0, m.pal.accent === '#e8473f' ? '#ffd34d' : '#e8473f');
  ctx.restore();
  if (!items) _thumbCache[key] = c;
  return c;
}

// ---------------- MAP MECHANICS ----------------
// One of the four windmill sail platforms at the world's current time (a pure function of W.t).
function millSail(W, i) {
  const cx = 28 * T, cy = 9 * T, R = 6 * T, a = W.t * .42 + i * TAU / 4, ax = cx + Math.cos(a) * R, ay = cy + Math.sin(a) * R;
  return { x: ax - 1.5 * T, y: ay, w: 3 * T, h: T / 2, vx: -Math.sin(a) * R * .42, vy: Math.cos(a) * R * .42, src: 'mill', key: 'mill' + i, ax, ay };
}
const MECH = {
  wind: {
    tick(W) { const P = 9, ph = W.t % P, cyc = Math.floor(W.t / P); W.ms.windDir = cyc % 2 ? -1 : 1; W.ms.windWarn = ph > 4.5 && ph < 5.5; W.ms.wind = ph >= 5.5 && ph < 8.5; if (W.ms.wind) W.forces.push({ k: 'rect', x: -999, y: -999, w: 99999, h: 99999, fx: W.ms.windDir * 950, fy: 0 }); },
    drawFront(ctx, W, t, cam) { if (!W.ms.wind && !W.ms.windWarn) return; ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; const n = W.ms.wind ? 40 : 6; for (let i = 0; i < n; i++) { const R = (i * 9301 + 49297) % 233280 / 233280; const x = ((R * 3000 + t * 900 * W.ms.windDir) % (W.map.w * T + 400) + W.map.w * T + 400) % (W.map.w * T + 400) - 200, y = (i * 137) % (W.map.h * T); line(ctx, x, y, x - W.ms.windDir * 40, y, 'rgba(255,255,255,.55)', 2); } },
    hud(W) { return W.ms.windWarn ? (W.ms.windDir > 0 ? 'Gust coming →' : '← Gust coming') : W.ms.wind ? (W.ms.windDir > 0 ? 'WIND →' : '← WIND') : null; },
  },
  dark: {
    drawFront(ctx, W, t, cam, view) {
      if (!W.racing && !W.testing) return;
      const c = MECH.dark._c || (MECH.dark._c = document.createElement('canvas'));
      const s = .25, cw = Math.ceil(view.w * s), ch = Math.ceil(view.h * s);
      if (c.width !== cw || c.height !== ch) { c.width = cw; c.height = ch; }
      const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, cw, ch); g.fillStyle = 'rgba(12,6,24,.8)'; g.fillRect(0, 0, cw, ch);
      g.globalCompositeOperation = 'destination-out';
      const lights = W.players.filter(p => p.alive).map(p => [p.x + p.w / 2, p.y, 190]).concat([[W.map.goal[0] * T, W.map.goal[1] * T - 30, 150], [5 * T, 14 * T, 160], [28 * T, 16 * T, 120 + Math.sin(t * 7) * 10], [40 * T, 20 * T, 110]]);
      for (const [x, y, r] of lights) { const sx = (x - view.x) * view.z * s, sy = (y - view.y) * view.z * s, sr = r * view.z * s; const gr = g.createRadialGradient(sx, sy, sr * .25, sx, sy, sr); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(sx, sy, sr, 0, TAU); g.fill(); }
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = true; ctx.drawImage(c, 0, 0, view.w * view.dpr, view.h * view.dpr); ctx.restore();
    },
    drawBack(ctx, W, t) { for (const [x, y] of [[5, 14], [28, 16], [40, 20]]) { line(ctx, x * T, y * T - 30, x * T, y * T - 10, '#3a2a1e', 2); rr(ctx, x * T - 7, y * T - 10, 14, 18, 3); fillStroke(ctx, '#ffd36a', 2); } },
  },
  tide: {
    tick(W) { const y = (26.8 + Math.sin(W.t * .45) * 2.4) * T; W.ms.tideY = y; W.hazards.push({ k: 'r', x: -500, y: y + 8, w: W.map.w * T + 1000, h: 2000, owner: -1, src: 'the tide', water: true }); },
    drawFront(ctx, W, t) { const y = W.ms.tideY || 27 * T; ctx.fillStyle = 'rgba(40,140,210,.75)'; ctx.beginPath(); ctx.moveTo(-500, y + 400); for (let x = -500; x <= W.map.w * T + 500; x += 20) ctx.lineTo(x, y + Math.sin(x * .03 + t * 2) * 5); ctx.lineTo(W.map.w * T + 500, y + 400); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3; ctx.stroke(); },
  },
  waterfall: {
    tick(W) { W.forces.push({ k: 'rect', x: 24 * T, y: -400, w: 4 * T, h: W.map.h * T + 400, fx: 0, fy: 2200, fall: true }); },
    drawBack(ctx, W, t) { const x = 24 * T, w = 4 * T; const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, 'rgba(120,200,255,.55)'); g.addColorStop(.5, 'rgba(220,245,255,.7)'); g.addColorStop(1, 'rgba(120,200,255,.55)'); ctx.fillStyle = g; ctx.fillRect(x, -400, w, W.map.h * T + 600); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2; for (let i = 0; i < 10; i++) { const yy = ((t * 500 + i * 97) % (W.map.h * T + 200)) - 200; line(ctx, x + 10 + i * 11, yy, x + 10 + i * 11, yy + 50, 'rgba(255,255,255,.7)', 2); } for (let i = 0; i < 5; i++) circ(ctx, x + w / 2 + Math.sin(t * 3 + i) * 50, W.map.h * T - 10, 20 + Math.sin(t * 5 + i) * 6, 'rgba(255,255,255,.6)', 0); },
  },
  mill: {
    tick(W) { W.ms.mill = []; for (let i = 0; i < 4; i++) { const sl = millSail(W, i); W.ms.mill.push([sl.ax, sl.ay]); W.solids.push(sl); } },
    drawBack(ctx, W, t) { const cx = 28 * T, cy = 9 * T; for (const [x, y] of W.ms.mill || []) { line(ctx, cx, cy, x, y, '#8a6a4a', 8); const a = Math.atan2(y - cy, x - cx); ctx.save(); ctx.translate(cx, cy); ctx.rotate(a); rr(ctx, 30, -14, 6 * T - 60, 28, 3); fillStroke(ctx, 'rgba(255,250,235,.85)', 2.5); for (let k = 50; k < 6 * T - 40; k += 26) line(ctx, k, -14, k, 14, 'rgba(58,42,30,.35)', 1.5); ctx.restore(); } circ(ctx, cx, cy, 16, '#a0703f', 3); },
    drawMid(ctx, W) { for (const s of W.solids) if (s.src === 'mill') { rr(ctx, s.x, s.y, s.w, s.h, 4); fillStroke(ctx, '#d49a5c', 2.5); } },
  },
  lava: {
    tick(W) { W.hazards.push({ k: 'r', x: -500, y: 27.3 * T, w: W.map.w * T + 1000, h: 2000, owner: -1, src: 'the lava' }); if (cycle(W.mitem || (W.mitem = { st: {} }), W, 2.2) && W.ms) { fireProj(W, { x: rand(12, 44) * T, y: 28 * T, vx: rand(-40, 40), vy: -rand(650, 820), g: 700, r: 11, kind: 'fire', owner: -1, src: 'a fireball', life: 2.6, map: true }); } },
    drawFront(ctx, W, t) { const y = 27.3 * T; ctx.fillStyle = '#ff6a2a'; ctx.beginPath(); ctx.moveTo(-500, y + 400); for (let x = -500; x <= W.map.w * T + 500; x += 20) ctx.lineTo(x, y + Math.sin(x * .04 + t * 3) * 4); ctx.lineTo(W.map.w * T + 500, y + 400); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 4; ctx.stroke(); for (let i = 0; i < 8; i++) circ(ctx, (i * 271 + t * 30) % (W.map.w * T), y + 20 + Math.sin(t * 4 + i) * 5, 6, '#ffb62e', 0); },
  },
  vines: {
    init(W) { W.climb.push({ x: 20 * T, y: 13 * T, w: T, h: 10 * T }, { x: 30 * T, y: 13 * T, w: T, h: 9 * T }, { x: 41 * T, y: 9 * T, w: T, h: 10 * T }); },
    drawBack(ctx, W, t) { for (const c of W.climb) { ctx.strokeStyle = '#3f8a3a'; ctx.lineWidth = 5; ctx.beginPath(); for (let y = c.y - 10; y <= c.y + c.h; y += 8) ctx.lineTo(c.x + c.w / 2 + Math.sin(y * .05 + t) * 4, y); ctx.stroke(); for (let y = c.y + 10; y < c.y + c.h; y += 26) ell(ctx, c.x + c.w / 2 + (y % 52 ? 8 : -8), y, 7, 4, '#5fbf4a', 1.5, y % 52 ? .5 : -.5); } line(ctx, 40 * T, 9 * T, 43 * T, 9 * T, '#8a6a4a', 6); },
  },
  disco: {
    tick(W) { const P = 2.6, ph = W.t % P, on = Math.floor(W.t / P) % 2; W.ms.discoOn = on ? 'b' : 'a'; W.ms.discoWarn = ph > P - .6; for (const s of W.discoSolids) if (s.disco === W.ms.discoOn) W.solids.push(s); },
    drawMid(ctx, W, t) { for (const s of W.discoSolids) { const on = s.disco === W.ms.discoOn; const flash = W.ms.discoWarn && on && (Save.data.settings.reduceFlash || Math.sin(t * 30) > 0); ctx.globalAlpha = on ? (flash ? .55 : 1) : .25; rr(ctx, s.x, s.y, s.w, s.h, 4); fillStroke(ctx, s.disco === 'a' ? '#ff5fa2' : '#5fc8ff', 2.5); ctx.fillStyle = 'rgba(255,255,255,.5)'; for (let x = s.x + 4; x < s.x + s.w - 8; x += 16) ctx.fillRect(x, s.y + 4, 8, s.h - 8); ctx.globalAlpha = 1; } },
  },
  lowgrav: {
    init(W) { for (const z of W.map.zones || []) W.gravZones.push({ x: z[0] * T, y: z[1] * T, w: z[2] * T, h: z[3] * T, mul: .35 }); },
    drawBack(ctx, W, t) { for (const z of W.gravZones) { ctx.fillStyle = 'rgba(90,255,120,.13)'; rr(ctx, z.x, z.y, z.w, z.h, 20); ctx.fill(); ctx.setLineDash([10, 8]); ctx.strokeStyle = 'rgba(60,200,90,.6)'; ctx.lineWidth = 3; ctx.stroke(); ctx.setLineDash([]); for (let i = 0; i < 8; i++) circ(ctx, z.x + ((i * 97) % z.w), z.y + z.h - ((t * 40 + i * 70) % z.h), 4, 'rgba(120,255,150,.6)', 0); } },
  },
  lasers: {
    tick(W) {
      W.ms.lz = [];
      W.map.lasers.forEach((row, i) => { const P = 5, ph = (W.t + i * 2.5) % P, on = ph > 3.5, warn = ph > 2.5 && !on; const y = row * T + T / 2; const len = rayLength(W, 12, y, 1, 0, null, W.map.w * T); W.ms.lz.push({ y, on, warn, len }); if (on) W.hazards.push({ k: 'r', x: 12, y: y - 5, w: len, h: 10, owner: -1, src: 'a wall laser' }); });
    },
    drawFront(ctx, W, t) { for (const L of W.ms.lz || []) { rr(ctx, -4, L.y - 14, 18, 28, 4); fillStroke(ctx, '#3b3f4c', 2.5); if (L.warn && (Save.data.settings.reduceFlash || Math.sin(t * 40) > 0)) line(ctx, 14, L.y, 14 + L.len, L.y, 'rgba(255,60,90,.5)', 1.5); if (L.on) { line(ctx, 14, L.y, 14 + L.len, L.y, 'rgba(255,60,90,.35)', 14); line(ctx, 14, L.y, 14 + L.len, L.y, '#ff4a6a', 6); line(ctx, 14, L.y, 14 + L.len, L.y, '#fff', 2); } } },
  },
  floaty: { init(W) { W.gravBase = .6; } },
};
