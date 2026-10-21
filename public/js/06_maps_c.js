// ===================== MAP EXTRAS & SET-PIECE MECHANICS =====================
// Extra map data (all in tiles):
//   ladders: [[x, y, h]]                       climbable column 1 tile wide (hold up), painted as a ladder
//   spikes:  [[x, y, w, dir]]                  spike strip; dir 'up' (on a floor at y), 'down' (under a ceiling at y), 'left'/'right' (on a wall at x, w = height)
//   vents:   [[x, y, w, h, period, phase]]      steam jet: blasts upward for 1.6 s every period
//   movers:  [{ w, h, mode, path|c, r, period, ph, style, oneway, spokes }]   pre-placed moving blocks you can ride
//            mode 'ping' (back and forth between path[0] and path[1]), 'loop' (round a closed path), 'circle' (round c at radius r)
//            path points / c are the block's CENTRE.
//   noBuild: [[x, y, w, h, why]]               nobody can build here
// Everything that moves is a pure function of the world clock (W.t), so every screen agrees.

function moverAt(mv, t) {
  const P = mv.period || 6, k = t / P + (mv.ph || 0);
  let cx, cy;
  if (mv.mode === 'circle') { const a = k * TAU; cx = mv.c[0] + Math.cos(a) * mv.r; cy = mv.c[1] + Math.sin(a) * mv.r; }
  else if (mv.mode === 'loop') {
    const pts = mv.path, n = pts.length; if (!mv._len) { mv._seg = []; let L = 0; for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n], d = Math.hypot(b[0] - a[0], b[1] - a[1]); mv._seg.push([L, d]); L += d; } mv._len = L; }
    let s = (((k % 1) + 1) % 1) * mv._len, i = 0; while (i < n - 1 && s > mv._seg[i][0] + mv._seg[i][1]) i++;
    const a = pts[i], b = pts[(i + 1) % n], u = mv._seg[i][1] ? (s - mv._seg[i][0]) / mv._seg[i][1] : 0; cx = a[0] + (b[0] - a[0]) * u; cy = a[1] + (b[1] - a[1]) * u;
  } else { const a = mv.path[0], b = mv.path[1], u = .5 - .5 * Math.cos(k * TAU); cx = a[0] + (b[0] - a[0]) * u; cy = a[1] + (b[1] - a[1]) * u; }
  return { x: (cx - mv.w / 2) * T, y: (cy - mv.h / 2) * T };
}
function mapMoverSolid(W, i) {
  const mv = W.map.movers && W.map.movers[i]; if (!mv) return null;
  const p = moverAt(mv, W.t), q = moverAt(mv, W.t + 1 / 120);
  return { x: p.x, y: p.y, w: mv.w * T, h: mv.h * T, vx: (q.x - p.x) * 120, vy: (q.y - p.y) * 120, src: 'mapmover', key: 'mm' + i, mi: i, oneway: !!mv.oneway, style: mv.style, terrain: true };
}
function spikeRect(s) {
  const [x, y, w, dir] = s, d = .45 * T;
  if (dir === 'down') return { x: x * T + 2, y: y * T, w: w * T - 4, h: d };
  if (dir === 'left') return { x: x * T - d, y: y * T + 2, w: d, h: w * T - 4 };
  if (dir === 'right') return { x: x * T, y: y * T + 2, w: d, h: w * T - 4 };
  return { x: x * T + 2, y: y * T - d, w: w * T - 4, h: d };
}
function mapExtrasInit(W) {
  const m = W.map;
  for (const [x, y, h] of m.ladders || []) W.climb.push({ x: x * T, y: y * T, w: T, h: h * T, ladder: true });
  W.noBuild = (m.noBuild || []).map(([x, y, w, h, why]) => ({ x: x * T, y: y * T, w: w * T, h: h * T, why: why || "Can't build here" }));
  if (m.idol) { const it = makeItem('coin', m.idol[0] * T, m.idol[1] * T, 0, -1); it.uid = 'idol'; it.fixed = true; it.mapOwned = true; it.mapIdol = true; W.items.push(it); }
}
function mapExtrasTick(W, S) {
  const m = W.map;
  for (const s of m.spikes || []) W.hazards.push(Object.assign(spikeRect(s), { k: 'r', owner: -1, src: 'spikes' }));
  (m.movers || []).forEach((mv, i) => { const so = mapMoverSolid(W, i); S.push(so); if (mv.hazard) W.hazards.push({ k: 'r', x: so.x + 4, y: so.y + so.h - 6, w: so.w - 8, h: 8, owner: -1, src: mv.hazard }); });
  W.ms.vents = (m.vents || []).map(([x, y, w, h, P, ph, fy]) => { const k = ((W.t + (ph || 0)) % P + P) % P, on = k > P - 1.6, warn = !on && k > P - 2.4; if (on) W.forces.push({ k: 'rect', x: x * T, y: y * T, w: w * T, h: h * T, fx: 0, fy: fy || -3600 }); return { x: x * T, y: y * T, w: w * T, h: h * T, on, warn, k }; });
}
// per-frame drawing of the moving bits (on the background vector layer, behind players)
function drawMapExtras(g, W, t) {
  const m = W.map;
  (m.movers || []).forEach((mv, i) => {
    const p = moverAt(mv, W.t), w = mv.w * T, h = mv.h * T, cx = p.x + w / 2, cy = p.y + h / 2;
    if (mv.spokes) { line(g, mv.c[0] * T, mv.c[1] * T, cx, cy, '#5a4a7a', 5); line(g, mv.c[0] * T, mv.c[1] * T, cx, cy, '#c8b8f0', 2); }
    if (mv.chain) { const ax = cx, ay = mv.chain * T; g.save(); g.setLineDash([5, 4]); line(g, ax - w * .3, ay, cx - w * .3, p.y, '#4a4a52', 3); line(g, ax + w * .3, ay, cx + w * .3, p.y, '#4a4a52', 3); g.restore(); }
    (MOVER_STYLES[mv.style] || MOVER_STYLES.crate)(g, p.x, p.y, w, h, t, mv);
  });
  const hubs = new Set(); (m.movers || []).forEach(mv => { if (mv.spokes && !hubs.has(mv.c + '')) { hubs.add(mv.c + ''); circ(g, mv.c[0] * T, mv.c[1] * T, 22, '#ff5fa2', 3); circ(g, mv.c[0] * T, mv.c[1] * T, 9, '#ffd34d', 2); } });
  for (const v of W.ms.vents || []) {
    const n = v.on ? 14 : v.warn ? 4 : 0;
    for (let i = 0; i < n; i++) { const k = ((t * (v.on ? 2.2 : .8) + i / n) % 1), x = v.x + v.w * (.2 + .6 * ((i * 37) % 10) / 10) + Math.sin(t * 6 + i) * 6, y = v.y + v.h - k * v.h; circ(g, x, y, (v.on ? 10 : 6) + k * 14, 'rgba(255,255,255,' + ((1 - k) * (v.on ? .5 : .3)).toFixed(3) + ')', 0); }
  }
}
const MOVER_STYLES = {
  crate(g, x, y, w, h) { rr(g, x, y, w, h, 4); fillStroke(g, '#8a6a4e', 2.5, '#3a2a1e'); rr(g, x + 5, y + 5, w - 10, h - 10, 2); fillStroke(g, '#6e5038', 1.6, '#3a2a1e'); line(g, x + 6, y + 6, x + w - 6, y + h - 6, '#a8865e', 4); line(g, x + w - 6, y + 6, x + 6, y + h - 6, '#a8865e', 4); g.fillStyle = '#ffd34d'; g.fillRect(x + 2, y + h - 7, w - 4, 5); g.fillStyle = '#2a2a30'; for (let xx = x + 4; xx < x + w - 6; xx += 10) g.fillRect(xx, y + h - 7, 5, 5); },
  gondola(g, x, y, w, h, t) { const cx = x + w / 2; line(g, cx, y - 26, cx, y, '#5a4a7a', 3); circ(g, cx, y - 26, 4, '#c8b8f0', 1.5); rr(g, x, y, w, h + 10, 6); fillStroke(g, '#ff5fa2', 2.5, '#7a2050'); g.fillStyle = '#ffd34d'; g.fillRect(x + 4, y + 3, w - 8, 4); },
  lift(g, x, y, w, h) { line(g, x + 6, y, x + 6, y - 900, '#4a4a52', 2); line(g, x + w - 6, y, x + w - 6, y - 900, '#4a4a52', 2); rr(g, x, y, w, h, 3); fillStroke(g, '#9aa3ae', 2.5, '#3a3e48'); g.fillStyle = '#ffd34d'; for (let xx = x + 4; xx < x + w - 6; xx += 14) g.fillRect(xx, y + 3, 7, h - 6); },
  crusher(g, x, y, w, h, t, mv) { const top = mv && mv.rod != null ? mv.rod * T : y - 600; line(g, x + w / 2 - 8, y, x + w / 2 - 8, top, '#5a5048', 5); line(g, x + w / 2 + 8, y, x + w / 2 + 8, top, '#5a5048', 5); rr(g, x, y, w, h, 3); fillStroke(g, '#8a7e6a', 2.5, '#3a3228'); for (let xx = x + 3; xx < x + w - 4; xx += 10) { g.beginPath(); g.moveTo(xx, y + h); g.lineTo(xx + 5, y + h + 8); g.lineTo(xx + 10, y + h); g.closePath(); g.fillStyle = '#c8c8d0'; g.fill(); } },
  plank(g, x, y, w, h) { rr(g, x, y, w, h, 3); fillStroke(g, '#c8935a', 2.2, '#5a3a1e'); },
};

// ---------- painted (static) parts: ladders, spikes, vent nozzles — drawn into the terrain image ----------
function paintMapExtras(ctx, m) {
  for (const [x, y, h] of m.ladders || []) { const X = x * T, Y = y * T, H = h * T; for (let yy = Y + 10; yy < Y + H; yy += 14) line(ctx, X + 6, yy, X + T - 6, yy, '#8a6a40', 3.2); for (const xx of [X + 5, X + T - 5]) { line(ctx, xx, Y - 4, xx, Y + H, '#5a3a1e', 5); line(ctx, xx, Y - 4, xx, Y + H, '#b98352', 2.6); } }
  for (const s of m.spikes || []) { const r = spikeRect(s), dir = s[3] || 'up', horiz = dir === 'up' || dir === 'down', n = Math.max(1, Math.round((horiz ? r.w : r.h) / 13));
    for (let i = 0; i < n; i++) { const a = (horiz ? r.w : r.h) / n; let pts; if (dir === 'up') pts = [[r.x + i * a, r.y + r.h], [r.x + i * a + a / 2, r.y], [r.x + (i + 1) * a, r.y + r.h]]; else if (dir === 'down') pts = [[r.x + i * a, r.y], [r.x + i * a + a / 2, r.y + r.h], [r.x + (i + 1) * a, r.y]]; else if (dir === 'left') pts = [[r.x + r.w, r.y + i * a], [r.x, r.y + i * a + a / 2], [r.x + r.w, r.y + (i + 1) * a]]; else pts = [[r.x, r.y + i * a], [r.x + r.w, r.y + i * a + a / 2], [r.x, r.y + (i + 1) * a]]; poly(ctx, pts, '#dfe4ea', 1.4); } }
  for (const [x, y, dx, dy] of m.darts || []) { const X = x * T, Y = y * T; ctx.save(); ctx.translate(X - dx * 6, Y - dy * 6); ctx.rotate(Math.atan2(dy, dx)); rr(ctx, -12, -10, 16, 20, 3); fillStroke(ctx, '#5a4a3a', 1.8, '#2a1e14'); circ(ctx, 2, 0, 4.5, '#1a120c', 0); ctx.restore(); }
  for (const [x, y, w, h] of m.vents || []) { const X = x * T, B = (y + h) * T; rr(ctx, X - 4, B - 10, w * T + 8, 14, 3); fillStroke(ctx, '#7a828e', 2, '#3a3e48'); for (let xx = X + 2; xx < X + w * T - 2; xx += 7) line(ctx, xx, B - 8, xx, B + 2, '#3a3e48', 2); rr(ctx, X + w * T / 2 - 14, B - 22, 28, 10, 3); fillStroke(ctx, '#ffd34d', 1.6, '#7a5a10'); }
}

// =================================== SET-PIECE MECHANICS ===================================
Object.assign(MECH, {
  // ---- Rush Hour: a subway train pulls into the station, waits, then leaves. Its roof is a bridge; its nose is deadly. ----
  train: {
    state(W) {
      const C = W.map.train, P = C.period, ph = ((W.t % P) + P) % P, dir = Math.floor(W.t / P) % 2 ? -1 : 1;
      const v0 = C.speed, tau = 2.2, dd = v0 * tau / 2, A = 2.0, S1 = A + tau, D = S1 + C.wait, D1 = D + tau;
      let x, v;
      if (ph < A) { x = C.stop - dd - v0 * (A - ph); v = v0; }
      else if (ph < S1) { const u = ph - A; x = C.stop - dd + v0 * u - v0 * u * u / (2 * tau); v = v0 - v0 * u / tau; }
      else if (ph < D) { x = C.stop; v = 0; }
      else if (ph < D1) { const u = ph - D; x = C.stop + v0 * u * u / (2 * tau); v = v0 * u / tau; }
      else { x = C.stop + dd + v0 * (ph - D1); v = v0; }
      if (dir < 0) x = W.map.w - x - C.len; // every other train runs the other way
      return { x: x * T, y: C.y * T, w: C.len * T, h: C.h * T, vx: v * T * dir, dir, ph, warn: ph < A + .4, stopped: ph >= S1 && ph < D, leaving: ph >= D - 1 && ph < D, A, D };
    },
    tick(W) {
      const s = W.ms.train = this.state(W), MW = W.map.w * T;
      if (s.x > MW + 40 || s.x + s.w < -40) return;
      W.solids.push({ x: s.x, y: s.y, w: s.w, h: 10, vx: s.vx, vy: 0, oneway: true, src: 'train', key: 'train:roof', terrain: true });
      if (s.stopped) W.solids.push({ x: s.x + 6, y: s.y + 10, w: s.w - 12, h: s.h - 10, vx: 0, vy: 0, src: 'train', key: 'train:body', terrain: true });
      else if (Math.abs(s.vx) > 30) W.hazards.push({ k: 'r', x: s.x + 2, y: s.y + 14, w: s.w - 4, h: s.h - 14, owner: -1, src: 'the train' });
      if ((W.racing || W.testing) && Audio2.ctx) { const c = Math.floor(W.t / W.map.train.period); if (s.ph > .9 && W.ms.horn !== c) { W.ms.horn = c; Audio2.tone(311, .75, { type: 'square', vol: .05 }); Audio2.tone(392, .75, { type: 'square', vol: .045 }); } }
    },
    hud(W) { const s = W.ms.train; if (!s) return null; return s.warn ? (s.dir > 0 ? '🚆 Train coming from the left!' : '🚆 Train coming from the right!') : s.leaving ? '🚆 Doors closing!' : s.stopped ? '🚆 Train in the station — hop on!' : null; },
    setupView(V) {
      const C = V.W.map.train, MW = V.W.map.w * T, y = C.y * T - 14, h = C.h * T + 14;
      V.trainImg = V.s.add.image(0, 0, bakeTrain(V.W.map)).setOrigin(0, 0).setScale(.5).setDepth(3);
      // dark tunnel mouths beyond both ends of the map, so the train disappears into them
      for (const x of [-3000, MW]) V.s.add.rectangle(x, y, 3000, h, 0x14161e).setOrigin(0, 0).setDepth(3.5);
    },
    updateView(V, t) {
      const s = V.W.ms.train || this.state(V.W), C = V.W.map.train;
      V.trainImg.setPosition(s.x, s.y - TRAIN_PAD).setFlipX(s.dir < 0);
      // signal lights at both tunnel mouths flash while a train is coming
      const g = V.gb, on = s.warn && Math.sin(t * 14) > 0;
      for (const sx of C.signals || []) { rr(g, sx * T - 9, (C.y - 3.2) * T, 18, 34, 5); fillStroke(g, '#2a2a30', 2); circ(g, sx * T, (C.y - 3.2) * T + 9, 5.5, on ? '#ff3a3a' : '#5a1a1a', 1); circ(g, sx * T, (C.y - 3.2) * T + 24, 5.5, !s.warn && !s.stopped ? '#3aff6a' : '#1a4a2a', 1); }
    },
  },

  // ---- Meltdown: radioactive coolant rises from the bottom once the race is on ----
  sludge: {
    level(W) { const S = W.map.sludge; if (W.goT == null) return S.base * T; return Math.max(S.max, S.base - S.rate * Math.max(0, W.t - W.goT - S.delay)) * T; },
    tick(W) { const y = W.ms.sludgeY = this.level(W); W.hazards.push({ k: 'r', x: -500, y: y + 8, w: W.map.w * T + 1000, h: 3000, owner: -1, src: 'radioactive coolant' }); },
    hud(W) { const S = W.map.sludge; if (W.goT == null) return null; const k = W.t - W.goT; return k < S.delay ? '☢ Coolant leak in ' + Math.ceil(S.delay - k) + '…' : '☢ Coolant rising — climb!'; },
    drawFront(g, W, t) {
      const y = W.ms.sludgeY || this.level(W), MW = W.map.w * T;
      g.fillStyle = 'rgba(110,230,80,.78)'; g.beginPath(); g.moveTo(0, y + 900); for (let x = 0; x <= MW; x += 16) g.lineTo(x, y + Math.sin(x * .035 + t * 2.4) * 5); g.lineTo(MW, y + 900); g.closePath(); g.fill();
      g.strokeStyle = '#d8ff9a'; g.lineWidth = 4; g.stroke();
      for (let i = 0; i < 10; i++) { const k = (t * .7 + i * .37) % 1; circ(g, (i * 263 + 40) % MW, y + 30 - k * 40, 5 + k * 5, 'rgba(220,255,170,' + (.7 - k * .6).toFixed(3) + ')', 0); }
    },
  },

  // ---- Thrill Ride: a shuttle roller coaster swoops between the towers. Touching a car is fatal. ----
  coaster: {
    init(W) { W.ms.cs = coasterTrack(W.map); },
    carAt(W) {
      const K = W.ms.cs || (W.ms.cs = coasterTrack(W.map)), P = K.period, ph = ((W.t % P) + P) % P;
      let s, dir, moving = true;
      if (ph < K.Tt) { s = K.sAt(K.fwd, ph); dir = 1; }
      else if (ph < K.Tt + K.pause) { s = K.L; dir = -1; moving = false; }
      else if (ph < 2 * K.Tt + K.pause) { s = K.sAt(K.back, ph - K.Tt - K.pause); dir = -1; }
      else { s = 0; dir = 1; moving = false; }
      const nextGo = ph < K.Tt ? 0 : ph < K.Tt + K.pause ? K.Tt + K.pause - ph : ph < 2 * K.Tt + K.pause ? 0 : P - ph;
      return { s, dir, moving, nextGo };
    },
    tick(W) {
      const K = W.ms.cs || (W.ms.cs = coasterTrack(W.map)), c = W.ms.car = this.carAt(W);
      W.ms.cars = [];
      for (let i = 0; i < 3; i++) { const s = clamp(c.s - c.dir * i * 46, 0, K.L), p = K.at(s); W.ms.cars.push(p); W.hazards.push({ k: 'c', x: p.x + p.nx * 14, y: p.y + p.ny * 14, r: 20, owner: -1, src: 'the roller coaster' }); }
    },
    hud(W) { const c = W.ms.car; return c && !c.moving && c.nextGo < 1.6 ? '🎢 Coaster about to drop!' : null; },
    drawMid(g, W, t) {
      const c = W.ms.car; if (!c || !W.ms.cars) return;
      W.ms.cars.forEach((p, i) => {
        g.save(); g.translate(p.x + p.nx * 14, p.y + p.ny * 14); g.rotate(Math.atan2(p.ty, p.tx));
        rr(g, -22, -12, 44, 24, 8); fillStroke(g, ['#e8473f', '#ffd34d', '#3f8de8'][i], 2.5, '#3a2a1e');
        rr(g, -16, -20, 32, 10, 4); fillStroke(g, '#ffffff', 2, '#3a2a1e');
        for (const dx of [-8, 8]) { circ(g, dx, -26, 6, '#ffd8b0', 1.5); line(g, dx - 4, -30, dx - 8, -40 - Math.sin(t * 20 + i + dx) * 3, '#ffd8b0', 2.5); line(g, dx + 4, -30, dx + 8, -40 - Math.cos(t * 20 + i + dx) * 3, '#ffd8b0', 2.5); }
        circ(g, -13, 12, 5, '#3a3a42', 1.5); circ(g, 13, 12, 5, '#3a3a42', 1.5);
        g.restore();
      });
    },
    paintBack(ctx, m) { // the track: purple rails on stilts, painted once behind the terrain
      const K = coasterTrack(m), MH = m.h * T, step = 10;
      for (let s = 40; s < K.L; s += 150) { const p = K.at(s); if (p.y < MH - 40) { line(ctx, p.x, p.y + 10, p.x - 30, MH + 40, '#7a6aa8', 6); line(ctx, p.x, p.y + 10, p.x + 30, MH + 40, '#7a6aa8', 6); line(ctx, p.x - 18, p.y + (MH - p.y) * .4, p.x + 18, p.y + (MH - p.y) * .6, '#9a8ac8', 3); } }
      for (const off of [10, -2]) { ctx.beginPath(); for (let s = 0; s <= K.L; s += step) { const p = K.at(s); const x = p.x + p.nx * off, y = p.y + p.ny * off; if (!s) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.strokeStyle = '#4a3a7a'; ctx.lineWidth = 7; ctx.stroke(); ctx.strokeStyle = '#a890e8'; ctx.lineWidth = 3.5; ctx.stroke(); }
      for (let s = 0; s <= K.L; s += 16) { const p = K.at(s); line(ctx, p.x + p.nx * 12, p.y + p.ny * 12, p.x - p.nx * 4, p.y - p.ny * 4, '#6a5a98', 3); }
      for (const mv of m.movers || []) if (mv.spokes) { const cx = mv.c[0] * T, cy = mv.c[1] * T; for (const d of [-1, 1]) { line(ctx, cx, cy, cx + d * 4.5 * T, MH, '#5a4a7a', 12); line(ctx, cx, cy, cx + d * 4.5 * T, MH, '#c8b8f0', 5); } ctx.beginPath(); ctx.arc(cx, cy, mv.r * T, 0, TAU); ctx.strokeStyle = 'rgba(200,184,240,.7)'; ctx.lineWidth = 5; ctx.stroke(); break; }
    },
  },

  // ---- Lost Idol: grab the golden idol and a boulder comes rolling after you, all the way to the flag ----
  idol: {
    boulder(W) {
      const B = W.map.boulder; if (!B._t) { B._t = [0]; for (let i = 1; i < B.path.length; i++) { const a = B.path[i - 1], b = B.path[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]) * T, v = Math.abs(b[1] - a[1]) > Math.abs(b[0] - a[0]) ? B.fall * T : B.speed * T; B._t.push(B._t[i - 1] + d / v); } }
      return B;
    },
    tick(W) {
      const B = this.boulder(W), idol = W.items.find(i => i.mapIdol), live = W.racing || W.testing;
      if (!live || (W.ms.bT != null && W.t < W.ms.bT - 2)) { W.ms.bT = null; W.ms.bDone = false; } // new race: reset
      if (live && idol && idol.st && idol.st.taken && W.ms.bT == null && !W.ms.bDone) { W.ms.bT = W.t + .9; if (W.view) W.view.shake(10); Audio2.sfx('boom'); W.ms.rumble = W.t; }
      // dart traps
      (W.map.darts || []).forEach(([x, y, dx, dy, P, ph], i) => {
        const c = Math.floor((W.t + ph) / P); W.ms.dc = W.ms.dc || {};
        if (W.ms.dc[i] !== c) { W.ms.dc[i] = c; if (live && W.t > .5) { fireProj(W, { x: x * T, y: y * T, vx: dx * 520, vy: dy * 520, g: 0, r: 6, kind: 'arrow', owner: -1, src: 'a dart trap', life: 3, map: true }); if (W.view && Math.random() < .5) Audio2.sfx('arrow'); } }
      });
      W.ms.boulder = null;
      if (W.ms.bT == null) return;
      const k = W.t - W.ms.bT, T1 = B._t[B._t.length - 1];
      if (k > T1 + .2) { if (!W.ms.bDone) { W.ms.bDone = true; const e = B.path[B.path.length - 1]; FX.burst(e[0] * T, e[1] * T, 26, { color: ['#8a7a6a', '#6a5a4a', '#b8a888'], smax: 420, rmin: 4, rmax: 10 }); if (W.view) W.view.shake(12); Audio2.sfx('boom'); } return; }
      if (k < 0) return;
      let i = 1; while (i < B._t.length - 1 && k > B._t[i]) i++;
      const a = B.path[i - 1], b = B.path[i], u = clamp((k - B._t[i - 1]) / (B._t[i] - B._t[i - 1]), 0, 1);
      const x = (a[0] + (b[0] - a[0]) * u) * T, y = (a[1] + (b[1] - a[1]) * u) * T, r = B.r * T;
      W.ms.boulder = { x, y, r, rot: (x + y * .3) / r };
      W.hazards.push({ k: 'c', x, y, r: r - 4, owner: -1, src: 'the boulder' });
      // it smashes through anything players built in its way
      const before = W.items.length;
      W.items = W.items.filter(o => { if (o.fixed || o.mapOwned) return true; if (rectCircle(itemBox(o), { x, y, r })) { const bx = itemBox(o); FX.burst(bx.x + bx.w / 2, bx.y + bx.h / 2, 12, { color: ['#b07a45', '#888'], smax: 380 }); return false; } return true; });
      if (W.items.length !== before) { Audio2.sfx('boom'); if (W.view) { W.view.shake(8); W.view.syncItems(); } }
    },
    hud(W) { if (W.ms.boulder || (W.ms.bT != null && !W.ms.bDone)) return '🪨 RUN! The boulder is coming!'; const idol = W.items.find(i => i.mapIdol); return idol && !(idol.st && idol.st.taken) && (W.racing || W.testing) ? '🗿 Grab the idol… if you dare' : null; },
    drawMid(g, W, t) {
      const B = this.boulder(W), bo = W.ms.boulder;
      // waiting in its cradle above the idol until someone takes it
      const p = bo || (W.ms.bDone ? null : { x: B.path[0][0] * T, y: B.path[0][1] * T, r: B.r * T, rot: 0 });
      if (!p) return;
      const shake = W.ms.bT != null && W.t < W.ms.bT ? Math.sin(t * 60) * 3 : 0;
      g.save(); g.translate(p.x + shake, p.y); g.rotate(p.rot);
      circ(g, 0, 0, p.r, '#8a7a66', 3); circ(g, -p.r * .25, -p.r * .3, p.r * .55, 'rgba(255,240,210,.18)', 0);
      g.strokeStyle = '#5a4a3a'; g.lineWidth = 3; for (let i = 0; i < 5; i++) { const a = i * 1.3; g.beginPath(); g.moveTo(Math.cos(a) * p.r * .2, Math.sin(a) * p.r * .2); g.lineTo(Math.cos(a + .4) * p.r * .8, Math.sin(a + .4) * p.r * .8); g.stroke(); }
      g.restore();
    },
  },

  // ---- Crate Foundry: molten metal fills the pit under the moving crates ----
  molten: {
    tick(W) { const P = W.map.pool; W.hazards.push({ k: 'r', x: P[0] * T, y: P[1] * T + 10, w: P[2] * T, h: 3000, owner: -1, src: 'molten metal' }); },
    drawFront(g, W, t) {
      const P = W.map.pool, x0 = P[0] * T, x1 = (P[0] + P[2]) * T, y = P[1] * T;
      g.fillStyle = '#ff7a1a'; g.beginPath(); g.moveTo(x0, y + 300); for (let x = x0; x <= x1; x += 16) g.lineTo(x, y + Math.sin(x * .05 + t * 2.5) * 4); g.lineTo(x1, y + 300); g.closePath(); g.fill();
      g.strokeStyle = '#ffe07a'; g.lineWidth = 4; g.stroke();
      for (let i = 0; i < 9; i++) { const k = (t * .8 + i * .41) % 1; circ(g, x0 + ((i * 197) % (x1 - x0)), y - k * 60, 4 * (1 - k) + 1, 'rgba(255,220,120,' + (1 - k).toFixed(3) + ')', 0); }
    },
  },
});

// ---------- coaster track geometry (Catmull-Rom through the map's points, with a height-based speed profile) ----------
function coasterTrack(m) {
  if (m._track) return m._track;
  const C = m.coaster, P = C.pts.map(([x, y]) => [x * T, y * T]), pts = [];
  for (let i = 0; i < P.length - 1; i++) { const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)]; for (let k = 0; k < 16; k++) { const u = k / 16, u2 = u * u, u3 = u2 * u; pts.push([.5 * (2 * p1[0] + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3), .5 * (2 * p1[1] + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3)]); } }
  pts.push(P[P.length - 1]);
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = cum[cum.length - 1];
  const at = s => { s = clamp(s, 0, L); let lo = 0, hi = cum.length - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= s) lo = mid; else hi = mid; } const a = pts[lo], b = pts[hi], d = cum[hi] - cum[lo] || 1, u = (s - cum[lo]) / d, tx = (b[0] - a[0]) / d, ty = (b[1] - a[1]) / d; return { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, tx, ty, nx: ty, ny: -tx }; };
  // speed from height: faster lower down (like a real coaster)
  const top = Math.min(...pts.map(p => p[1])), vAt = s => Math.sqrt(C.vmin * C.vmin + 2 * C.g * Math.max(0, at(s).y - top));
  const table = from => { const ts = [], ss = []; let tt = 0; for (let s = 0; s <= L; s += 6) { ss.push(from ? L - s : s); ts.push(tt); tt += 6 / vAt(from ? L - s : s); } return { ts, ss }; };
  const fwd = table(false), back = table(true), Tt = fwd.ts[fwd.ts.length - 1];
  const sAt = (tab, t) => { const { ts, ss } = tab; let lo = 0, hi = ts.length - 1; if (t >= ts[hi]) return ss[hi]; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (ts[mid] <= t) lo = mid; else hi = mid; } const u = (t - ts[lo]) / (ts[hi] - ts[lo] || 1); return ss[lo] + (ss[hi] - ss[lo]) * u; };
  return (m._track = { L, at, fwd, back, Tt, sAt, pause: C.pause, period: 2 * Tt + 2 * C.pause });
}

// ---------- the subway train texture ----------
const TRAIN_PAD = 8;
function bakeTrain(m) {
  const C = m.train, key = 'train_' + m.id, w = C.len * T, h = C.h * T;
  return TEX.bake(key, w, h + TRAIN_PAD, g => {
    g.translate(0, TRAIN_PAD);
    const cars = C.cars || 4, cw = w / cars;
    for (let i = 0; i < cars; i++) {
      const x = i * cw + 3, W = cw - 6, nose = i === cars - 1;
      g.beginPath(); g.moveTo(x + 8, 0); g.lineTo(x + W - (nose ? 46 : 8), 0); if (nose) g.quadraticCurveTo(x + W, 6, x + W, h * .55); else g.quadraticCurveTo(x + W, 0, x + W, 8); g.lineTo(x + W, h - 14); g.lineTo(x, h - 14); g.lineTo(x, 8); g.quadraticCurveTo(x, 0, x + 8, 0); g.closePath();
      g.fillStyle = '#3f7fd0'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#1a2a4a'; g.stroke();
      g.fillStyle = '#e8f0fa'; g.fillRect(x + 2, h * .62, W - 4, 12); g.fillStyle = '#ffd34d'; g.fillRect(x + 2, h * .62 + 12, W - 4, 4);
      for (let wx = x + 22; wx < x + W - (nose ? 70 : 30); wx += 56) { rr(g, wx, 22, 38, h * .36, 6); fillStroke(g, '#bfe4ff', 2, '#1a2a4a'); g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.moveTo(wx + 6, 26); g.lineTo(wx + 16, 26); g.lineTo(wx + 8, 22 + h * .36 - 4); g.lineTo(wx + 4, 22 + h * .36 - 4); g.fill(); }
      if (nose) { rr(g, x + W - 40, 22, 30, h * .3, 6); fillStroke(g, '#1a2a4a', 2, '#0a1424'); circ(g, x + W - 8, h * .5, 5, '#fff6c0', 1.5); }
      for (const wx of [x + 26, x + W - 46]) { circ(g, wx, h - 12, 12, '#2a2a30', 2); circ(g, wx + 22, h - 12, 12, '#2a2a30', 2); circ(g, wx, h - 12, 4, '#8a8a92', 0); circ(g, wx + 22, h - 12, 4, '#8a8a92', 0); }
      if (i < cars - 1) { rr(g, x + W - 2, h * .3, 10, h * .4, 2); fillStroke(g, '#2a2a30', 1.5); }
      rr(g, x + 10, -6, W - 20, 8, 3); fillStroke(g, '#9aa3ae', 1.5, '#3a3e48');
    }
  }, 0, TS);
}

// the golden idol on the Lost Idol altar (a map-owned acorn underneath: same points, much more trouble)
function drawIdol(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  rr(ctx, -13, 6, 26, 12, 3); fillStroke(ctx, '#c8962a', 2, '#6a4a10');
  ctx.beginPath(); ctx.moveTo(-11, 8); ctx.quadraticCurveTo(-14, -14, 0, -18); ctx.quadraticCurveTo(14, -14, 11, 8); ctx.closePath(); fillStroke(ctx, '#ffd34d', 2.2, '#7a5a10');
  ell(ctx, -5, -5, 3.4, 2.4, '#7a5a10', 0); ell(ctx, 5, -5, 3.4, 2.4, '#7a5a10', 0); circ(ctx, -5, -5, 1.4, '#3fe0a0', 0); circ(ctx, 5, -5, 1.4, '#3fe0a0', 0);
  rr(ctx, -5, 2, 10, 3, 1.5); ctx.fillStyle = '#7a5a10'; ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-6, -11, 2.5, 5, -.4, 0, TAU); ctx.fill();
  ctx.restore();
}

// ================================ ART FOR THE NEW MAPS ================================
['sign', 'grate', 'truss', 'awning', 'mezz', 'ceiling'].forEach(k => NO_SHADOW.add(k));
['sign', 'grate', 'truss', 'awning', 'mezz', 'booth', 'crate', 'altar'].forEach(k => NO_EXTEND.add(k));
Object.assign(TERRAIN_STYLES, {
  // --- Rush Hour ---
  platform(ctx, x, y, w, h, P, seed) {
    slab(ctx, x, y, w, h, '#9a9ea8', seed, { j: 0, round: 2, tex: R => { for (let xx = x + 30; xx < x + w; xx += 30) line(ctx, xx, y + 10, xx, y + h, 'rgba(0,0,0,.12)', 1.2); } });
    rr(ctx, x - 1, y - 2, w + 2, 9, 2); fillStroke(ctx, '#d8dce4', 1.6, '#5a5e68');
    const ex = x < 10 ? x + w - 16 : x; ctx.fillStyle = '#ffd34d'; ctx.fillRect(ex, y - 1, 16, 7); ctx.fillStyle = 'rgba(0,0,0,.25)'; for (let yy = y; yy < y + 6; yy += 3) ctx.fillRect(ex, yy, 16, 1);
  },
  tracks(ctx, x, y, w, h, P, seed) {
    slab(ctx, x, y, w, h, '#4a4648', seed, { j: 0, round: 1, light: .1, tex: R => speckle(ctx, R, x, y + 4, w, Math.min(h, 60), w / 6, ['#6a6468', '#3a3638', '#7a7470'], 1.5, 3.5) });
    for (let xx = x + 6; xx < x + w; xx += 22) { rr(ctx, xx, y - 4, 14, 6, 1.5); fillStroke(ctx, '#7a5a3a', 1.2, '#3a2a1a'); }
    for (const yy of [y - 7]) { rr(ctx, x, yy, w, 4, 1); fillStroke(ctx, '#b8bcc6', 1.2, '#4a4e58'); }
  },
  ceiling(ctx, x, y, w, h, P, seed) {
    slab(ctx, x, y - 200, w, h + 200, '#5a6074', seed, { j: 0, round: 0, light: .05 });
    rr(ctx, x, y + h - 10, w, 10, 2); fillStroke(ctx, '#7a8296', 1.4, '#3a4052');
    for (let xx = x + 70; xx < x + w; xx += 190) { rr(ctx, xx, y + h, 80, 9, 3); fillStroke(ctx, '#fffbe0', 1.4, '#8a8a72'); }
  },
  mezz(ctx, x, y, w, h, P, seed) { rr(ctx, x, y, w, h, 2); fillStroke(ctx, '#7a8296', 1.8, '#3a4052'); ctx.fillStyle = '#c8ccd6'; ctx.fillRect(x, y, w, 5); for (let xx = x + 4; xx < x + w; xx += 12) line(ctx, xx, y, xx, y - 18, '#9aa0b0', 2); line(ctx, x, y - 18, x + w, y - 18, '#b8bcc6', 3); },
  tiles(ctx, x, y, w, h, P, seed) { slab(ctx, x, y, w, h, '#e8ecf2', seed, { j: 0, round: 2, light: .2, tex: R => { for (let yy = y + 6; yy < y + h; yy += 12) line(ctx, x, yy, x + w, yy, 'rgba(90,100,130,.25)', 1); for (let xx = x; xx < x + w; xx += 20) line(ctx, xx, y, xx, y + h, 'rgba(90,100,130,.2)', 1); ctx.fillStyle = '#3f8de8'; ctx.fillRect(x, y + h * .45, w, 6); } }); rr(ctx, x - 2, y - 3, w + 4, 7, 2); fillStroke(ctx, '#c8ccd6', 1.6, '#5a5e68'); },
  sign(ctx, x, y, w, h, P, seed) { for (const xx of [x + 8, x + w - 8]) line(ctx, xx, y, xx, y - 400, '#3a3e48', 2); rr(ctx, x - 4, y, w + 8, h + 14, 4); fillStroke(ctx, '#2a5ab0', 2, '#14244a'); ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 6, y + 6, w - 12, 3); ctx.fillRect(x + 6, y + 12, w * .45, 3); circ(ctx, x + w - 10, y + 10, 5, '#ffd34d', 1.2); },
  // --- Meltdown ---
  shell(ctx, x, y, w, h, P, seed) { slab(ctx, x, y, w, h, '#c4ccc8', seed, { j: .8, light: .25, tex: R => { for (let yy = y + 40; yy < y + h; yy += 64) line(ctx, x, yy, x + w, yy, 'rgba(0,0,0,.12)', 1.6); for (let i = 0; i < w * h / 3000; i++) { const sx = x + R() * w, sy = y + R() * h; ctx.fillStyle = 'rgba(120,140,110,.18)'; ctx.beginPath(); ctx.ellipse(sx, sy, 3 + R() * 6, 10 + R() * 30, 0, 0, TAU); ctx.fill(); } } }); },
  grate(ctx, x, y, w, h, P, seed) { rr(ctx, x, y, w, Math.max(7, h), 2); fillStroke(ctx, '#8e97a3', 1.8, '#3a3e48'); ctx.save(); rr(ctx, x, y, w, Math.max(7, h), 2); ctx.clip(); for (let xx = x - 10; xx < x + w; xx += 7) line(ctx, xx, y, xx + 9, y + 12, 'rgba(30,30,40,.45)', 1.5); ctx.restore(); ctx.fillStyle = '#ffd34d'; ctx.fillRect(x, y - 1, w, 3); for (let xx = x + 4; xx <= x + w - 4; xx += 40) line(ctx, xx, y + h, xx + 10, y + h + 20, '#5a626e', 2.5); },
  crate(ctx, x, y, w, h, P, seed) { MOVER_STYLES.crate(ctx, x, y, w, h); },
  // --- Thrill Ride ---
  paving(ctx, x, y, w, h, P, seed) { slab(ctx, x, y, w, h, '#e0b878', seed, { j: .5, tex: R => bricks(ctx, R, x, y, w, h, 34, 17, '#e0b878', 'rgba(140,90,40,.3)') }); rr(ctx, x - 2, y - 3, w + 4, 7, 3); fillStroke(ctx, '#f6dca4', 1.6, '#9a6a34'); },
  truss(ctx, x, y, w, h, P, seed) { rr(ctx, x, y, w, Math.max(8, h), 2); fillStroke(ctx, '#8a6ac8', 2, '#3a2a6a'); for (let xx = x; xx < x + w; xx += 16) line(ctx, xx, y + 2, xx + 8, y + 12, '#c8b8f0', 1.6); line(ctx, x, y - 16, x + w, y - 16, '#8a6ac8', 3); for (let xx = x; xx <= x + w; xx += 32) line(ctx, xx, y, xx, y - 16, '#8a6ac8', 2.5); },
  booth(ctx, x, y, w, h, P, seed) { slab(ctx, x, y + 14, w, h - 14, '#f4ecdc', seed, { j: .5, round: 3 }); rr(ctx, x + 14, y + 30, w - 28, 26, 3); fillStroke(ctx, '#bfe4ff', 1.6, '#3a4a5a'); ctx.save(); rr(ctx, x - 8, y - 4, w + 16, 22, 4); ctx.clip(); for (let xx = x - 8; xx < x + w + 8; xx += 16) { ctx.fillStyle = (xx - x) / 16 % 2 ? '#e8473f' : '#ffffff'; ctx.fillRect(xx, y - 4, 16, 22); } ctx.restore(); rr(ctx, x - 8, y - 4, w + 16, 22, 4); ctx.lineWidth = 1.8; ctx.strokeStyle = '#7a2a20'; ctx.stroke(); },
  awning(ctx, x, y, w, h, P, seed) { ctx.save(); ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x + w + 4, y); ctx.lineTo(x + w + 4, y + 10); for (let xx = x + w + 4; xx > x - 4; xx -= 12) ctx.quadraticCurveTo(xx - 6, y + 20, xx - 12, y + 10); ctx.closePath(); ctx.clip(); for (let xx = x - 4; xx < x + w + 4; xx += 12) { ctx.fillStyle = (xx - x) / 12 % 2 ? '#3f8de8' : '#ffffff'; ctx.fillRect(xx, y, 12, 24); } ctx.restore(); line(ctx, x - 4, y, x + w + 4, y, '#1a3a6a', 2.4); for (const xx of [x + 4, x + w - 4]) line(ctx, xx, y + 12, xx, y + 300, '#8a6ac8', 3); },
  fort(ctx, x, y, w, h, P, seed) { slab(ctx, x, y, w, h + 200, '#d8a868', seed, { j: .8, tex: R => bricks(ctx, R, x, y, w, h + 200, 30, 16, '#d8a868', 'rgba(110,70,30,.35)') }); for (let xx = x; xx < x + w - 6; xx += 22) { rr(ctx, xx + 2, y - 12, 14, 14, 2); fillStroke(ctx, '#e8bc80', 1.6, '#8a5a24'); } rr(ctx, x + w / 2 - 12, y + 60, 24, 36, 12); ctx.fillStyle = 'rgba(60,30,10,.5)'; ctx.fill(); },
  // --- Lost Idol ---
  carved(ctx, x, y, w, h, P, seed) { slab(ctx, x, y, w, h, '#7a6250', seed, { j: .8, light: .14, dark: .4, tex: R => { bricks(ctx, R, x, y, w, h, 44, 24, '#7a6250', 'rgba(30,20,10,.45)'); ctx.fillStyle = 'rgba(70,120,60,.3)'; for (let i = 0; i < w / 50; i++) { ctx.beginPath(); ctx.ellipse(x + R() * w, y + R() * Math.min(h, 40), 10 + R() * 12, 4 + R() * 4, 0, 0, TAU); ctx.fill(); } } }); rr(ctx, x - 1, y - 2, w + 2, 6, 2); fillStroke(ctx, '#9a8066', 1.4, '#3a2a1e'); },
  altar(ctx, x, y, w, h, P, seed) { slab(ctx, x, y, w, h, '#8a7058', seed, { round: 3 }); rr(ctx, x - 4, y - 4, w + 8, 8, 2); fillStroke(ctx, '#ffd34d', 1.8, '#7a5a10'); for (let xx = x + 10; xx < x + w - 6; xx += 16) { ctx.strokeStyle = '#c8962a'; ctx.lineWidth = 1.4; ctx.strokeRect(xx, y + 14, 9, 9); } },
});
Object.assign(DECOS, {
  trussleg(c, s) { for (const x of [-60, 60]) line(c, x * s, 0, x * s, -560 * s, '#7a5ab8', 6 * s); for (let y = 0; y > -540; y -= 60) { line(c, -60 * s, y * s, 60 * s, (y - 60) * s, '#a890e0', 3 * s); line(c, 60 * s, y * s, -60 * s, (y - 60) * s, '#a890e0', 3 * s); } },
  bunting(c, s) { c.beginPath(); c.moveTo(-90 * s, 0); c.quadraticCurveTo(0, 30 * s, 90 * s, 0); c.strokeStyle = '#5a4a3a'; c.lineWidth = 1.5; c.stroke(); for (let i = 0; i < 9; i++) { const u = i / 8, x = (-90 + 180 * u) * s, y = 30 * s * 2 * u * (1 - u); poly(c, [[x - 7 * s, y], [x + 7 * s, y], [x, y + 14 * s]], ['#e8473f', '#ffd34d', '#3f8de8', '#5fd06a'][i % 4], 1); } },
  pennant(c, s) { line(c, 0, 0, 0, -70 * s, '#5a4a3a', 3); poly(c, [[0, -70 * s], [30 * s, -62 * s], [0, -54 * s]], '#e8473f', 1.2); },
  poster(c, s) { rr(c, -26 * s, -70 * s, 52 * s, 70 * s, 3); fillStroke(c, '#fff6e0', 1.6, '#3a3e48'); rr(c, -20 * s, -64 * s, 40 * s, 34 * s, 2); fillStroke(c, pick(['#e8473f', '#3f8de8', '#5fd06a']), 1, '#3a3e48'); circ(c, 0, -47 * s, 10 * s, '#ffd34d', 1); line(c, -18 * s, -22 * s, 18 * s, -22 * s, '#3a3e48', 3); line(c, -18 * s, -14 * s, 8 * s, -14 * s, '#3a3e48', 2); },
  bench(c, s) { rr(c, -30 * s, -14 * s, 60 * s, 6 * s, 2); fillStroke(c, '#c8935a', 1.4, '#5a3a1e'); rr(c, -30 * s, -30 * s, 60 * s, 6 * s, 2); fillStroke(c, '#c8935a', 1.4, '#5a3a1e'); for (const x of [-24, 24]) line(c, x * s, 0, x * s, -30 * s, '#3a3e48', 3 * s); },
  stationclock(c, s) { line(c, 0, -60 * s, 0, -40 * s, '#3a3e48', 3); circ(c, 0, 0, 22 * s, '#ffffff', 2.5); line(c, 0, 0, 0, -14 * s, '#2a2a30', 2.5); line(c, 0, 0, 10 * s, 4 * s, '#2a2a30', 2); circ(c, 0, 0, 2.5 * s, '#e8473f', 0); },
  exitsign(c, s) { rr(c, -34 * s, -18 * s, 68 * s, 24 * s, 3); fillStroke(c, '#2fa36a', 1.6, '#145a34'); c.fillStyle = '#ffffff'; c.font = '700 ' + Math.round(15 * s) + 'px Fredoka, sans-serif'; c.textAlign = 'center'; c.fillText('EXIT ➜', 0, 0); },
  turnstile(c, s) { rr(c, -10 * s, -34 * s, 20 * s, 34 * s, 3); fillStroke(c, '#9aa3ae', 1.4, '#3a3e48'); line(c, 10 * s, -24 * s, 30 * s, -24 * s, '#c8ccd6', 3); line(c, 10 * s, -20 * s, 26 * s, -10 * s, '#c8ccd6', 3); circ(c, 0, -28 * s, 3 * s, '#5fd06a', 0); },
  bin(c, s) { rr(c, -9 * s, -24 * s, 18 * s, 24 * s, 3); fillStroke(c, '#3f8de8', 1.4, '#14244a'); rr(c, -11 * s, -27 * s, 22 * s, 5 * s, 2); fillStroke(c, '#2a5ab0', 1.2, '#14244a'); },
  urn(c, s) { c.beginPath(); c.moveTo(-8 * s, 0); c.quadraticCurveTo(-16 * s, -16 * s, -6 * s, -28 * s); c.lineTo(6 * s, -28 * s); c.quadraticCurveTo(16 * s, -16 * s, 8 * s, 0); c.closePath(); fillStroke(c, '#b8743a', 1.6, '#5a3414'); line(c, -10 * s, -16 * s, 10 * s, -16 * s, '#5a3414', 2); },
  glyphs(c, s) { c.strokeStyle = 'rgba(255,220,150,.22)'; c.lineWidth = 2.5; for (let i = 0; i < 5; i++) { const x = (-80 + i * 40) * s; c.strokeRect(x - 12 * s, -40 * s, 24 * s, 30 * s); c.beginPath(); c.arc(x, -26 * s, 6 * s, 0, TAU); c.stroke(); line(c, x - 8 * s, -14 * s, x + 8 * s, -14 * s, 'rgba(255,220,150,.22)', 2); } },
  ladle(c, s) { line(c, -20 * s, -60 * s, 30 * s, -10 * s, '#4a4a52', 5 * s); c.beginPath(); c.arc(34 * s, -14 * s, 16 * s, 0, Math.PI); c.closePath(); fillStroke(c, '#5a5a62', 1.6); c.fillStyle = '#ff9a3a'; c.fillRect(20 * s, -16 * s, 28 * s, 4 * s); },
});
Object.assign(SKY_FX, {
  metro: { clouds: 0 },
  tomb: { clouds: 0, glowBottom: '#c8782a' },
  foundry: { clouds: 0, ash: 120, glowBottom: '#ff7a2a' },
});
Object.assign(BG, {
  subway: { // a tiled station wall with arches, adverts and lights
    far(g, m, F, x0, x1) { const MH = m.h * T; g.fillStyle = F('#d8dce6', .45); g.fillRect(x0, 2 * T, x1 - x0, MH); for (let yy = 2 * T; yy < MH; yy += 22) { g.fillStyle = 'rgba(80,90,120,.08)'; g.fillRect(x0, yy, x1 - x0, 2); } g.fillStyle = F('#3f8de8', .4); g.fillRect(x0, 12.5 * T, x1 - x0, 14); g.fillRect(x0, 4.5 * T, x1 - x0, 8);
      for (let x = x0 + 80; x < x1; x += 320) { g.fillStyle = F('#5a6276', .35); g.beginPath(); g.moveTo(x, 21 * T); g.lineTo(x, 15 * T); g.quadraticCurveTo(x + 110, 11 * T, x + 220, 15 * T); g.lineTo(x + 220, 21 * T); g.fill(); } },
    land(g, m, F) { const MH = m.h * T; for (let x = 120; x < m.w * T; x += 380) { g.fillStyle = F('#ffffff', .2); rr(g, x, 13.3 * T, 150, 90, 6); g.fill(); g.fillStyle = F(pick(['#e8473f', '#ffd34d', '#5fd06a', '#ff5fa2']), .25); rr(g, x + 10, 13.3 * T + 10, 130, 70, 4); g.fill(); }
      for (let x = 0; x < m.w * T; x += 260) { g.fillStyle = F('#7a8296', .3); g.fillRect(x, 2 * T, 30, 19 * T); } g.fillStyle = 'rgba(10,12,20,.75)'; g.fillRect(-900, 21 * T, m.w * T + 1800, 7 * T); for (let x = -900; x < m.w * T + 900; x += 120) { g.fillStyle = 'rgba(255,240,180,.08)'; g.fillRect(x, 21 * T, 50, 7 * T); } },
    near(g, m) { },
  },
  plant: { // the inside of a cooling tower: curved concrete with lights and pipes
    far(g, m, F, x0, x1) { const MH = m.h * T, W = m.w * T; const gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, F('#8aa094', .2)); gr.addColorStop(.5, F('#d4e2da', .25)); gr.addColorStop(1, F('#8aa094', .2)); g.fillStyle = gr; g.fillRect(x0, -1400, x1 - x0, MH + 1800);
      for (let y = 0; y < MH; y += 96) { g.strokeStyle = 'rgba(60,80,70,.12)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, y); g.quadraticCurveTo(W / 2, y + 30, W, y); g.stroke(); }
      glow(g, W / 2, -200, 700, '#ffffff', .5); for (const [x, y] of [[W * .25, 900], [W * .75, 1300], [W * .5, 400]]) glow(g, x, y, 160, '#b8ffcc', .25); },
    land(g, m, F) { const MH = m.h * T, W = m.w * T;
      for (const [cy, r] of [[MH * .58, 150], [MH * .2, 110]]) { const cx = W / 2; circ(g, cx, cy, r, F('#ffd34d', .45), 0); g.fillStyle = F('#3a3a32', .4); for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * TAU / 3; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, r * .82, a - .52, a + .52); g.closePath(); g.fill(); } circ(g, cx, cy, r * .2, F('#ffd34d', .45), 0); circ(g, cx, cy, r * .13, F('#3a3a32', .4), 0); }
      for (const x of [3.6 * T, W - 3.6 * T]) { line(g, x, -200, x, MH, F('#7a9a8a', .3), 18); for (let y = 100; y < MH; y += 260) { rr(g, x - 14, y, 28, 18, 4); g.fillStyle = F('#5a7a6a', .3); g.fill(); } }
      g.fillStyle = F('#ffd34d', .5); for (let y = 15 * T; y < MH; y += 15 * T) { g.save(); g.beginPath(); g.rect(3 * T, y, W - 6 * T, 10); g.clip(); for (let x = 0; x < W; x += 24) { g.beginPath(); g.moveTo(x, y + 10); g.lineTo(x + 10, y); g.lineTo(x + 18, y); g.lineTo(x + 8, y + 10); g.fill(); } g.restore(); }
      g.strokeStyle = F('#6a8a7a', .25); g.lineWidth = 12; for (const x of [W * .2, W * .8]) { g.beginPath(); g.moveTo(x, MH); g.lineTo(x, -200); g.stroke(); } g.lineWidth = 7; for (let y = 200; y < MH; y += 420) { g.beginPath(); g.moveTo(W * .2, y); g.lineTo(W * .8, y + 60); g.stroke(); } },
    near(g, m) { },
  },
  coaster: { // a desert fun-fair: pyramids on the horizon, a big wheel and tents
    far(g, m, F, x0, x1) { const MH = m.h * T; for (const [cx, h] of [[100, 300], [420, 200], [1500, 330], [1880, 220]]) { g.fillStyle = F('#f2d49a', .45); g.beginPath(); g.moveTo(cx - h * 1.1, MH - 180); g.lineTo(cx, MH - 180 - h); g.lineTo(cx + h * 1.1, MH - 180); g.fill(); g.fillStyle = F('#d8b070', .45); g.beginPath(); g.moveTo(cx, MH - 180 - h); g.lineTo(cx + h * 1.1, MH - 180); g.lineTo(cx + h * .2, MH - 180); g.fill(); }
      band(g, hillPts(x0, x1, MH - 160, 80, 4), F(m.pal.far, .3)); },
    land(g, m, F) { const MH = m.h * T, y = MH - 110; for (const [x, w, c] of [[300, 160, '#e8473f'], [900, 120, '#3f8de8'], [1450, 180, '#5fd06a']]) { g.fillStyle = F(c, .3); g.beginPath(); g.moveTo(x - w / 2, y); g.lineTo(x, y - w * .8); g.lineTo(x + w / 2, y); g.fill(); g.fillStyle = F('#ffffff', .3); g.fillRect(x - w / 2, y - 6, w, 6); }
      const p = hillPts(-900, m.w * T + 900, y + 30, 30, 13); band(g, p, F(m.pal.near, .2)); treesOn(g, p, -900, m.w * T + 900, 200, 90, F('#5a9a4a', .25), 7, 'palm', .2); },
    near(g, m) { const MH = m.h * T, p = hillPts(-900, m.w * T + 900, MH + 20, 100, 31); band(g, p, m.pal.near, { rim: '#fbe2b0' }); },
  },
  tomb: { // carved walls deep underground, lit by torches
    far(g, m, F, x0, x1) { const MH = m.h * T; g.fillStyle = '#3a2c24'; g.fillRect(x0, -1400, x1 - x0, MH + 1800); const R = mulberry(17); for (let y = -200; y < MH + 200; y += 48) for (let x = x0 + ((y / 48) % 2) * 40; x < x1; x += 80) { g.fillStyle = 'rgba(0,0,0,' + (.12 + R() * .12) + ')'; g.fillRect(x, y, 78, 46); }
      for (const [x, y] of [[12 * T, 9 * T], [40 * T, 9 * T], [30 * T, 19 * T], [14 * T, 29 * T], [50 * T, 29 * T], [3 * T, 6 * T]]) glow(g, x, y, 260, '#ffb04a', .35); },
    land(g, m, F) { const MH = m.h * T; g.strokeStyle = 'rgba(255,210,140,.12)'; g.lineWidth = 3; for (let x = 200; x < m.w * T; x += 420) { g.strokeRect(x, 7 * T, 120, 3 * T); g.strokeRect(x + 30, 16 * T, 120, 4 * T); g.strokeRect(x + 60, 26 * T, 120, 4 * T); } },
    near(g, m) { },
  },
  foundry: { // a smoky hall with glowing furnaces
    far(g, m, F, x0, x1) { const MH = m.h * T; g.fillStyle = F('#5a4644', .2); g.fillRect(x0, -1400, x1 - x0, MH + 1800); for (let x = x0; x < x1; x += 140) { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x, -400, 12, MH + 800); }
      for (const x of [5 * T, 45 * T]) { const top = MH - 640, base = MH - 150; g.fillStyle = F('#5a3e36', .2); g.beginPath(); g.moveTo(x - 110, base); g.lineTo(x - 80, top + 120); g.lineTo(x - 40, top); g.lineTo(x + 40, top); g.lineTo(x + 80, top + 120); g.lineTo(x + 110, base); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 2; for (let y = top + 30; y < base; y += 26) { g.beginPath(); g.moveTo(x - 110, y); g.lineTo(x + 110, y); g.stroke(); }
        glow(g, x, base - 90, 230, '#ff8a2a', .55); g.fillStyle = '#2a1410'; g.beginPath(); g.moveTo(x - 55, base); g.lineTo(x - 55, base - 90); g.arc(x, base - 90, 55, Math.PI, 0); g.lineTo(x + 55, base); g.closePath(); g.fill();
        g.fillStyle = '#ff9a3a'; g.beginPath(); g.moveTo(x - 42, base); g.lineTo(x - 42, base - 80); g.arc(x, base - 80, 42, Math.PI, 0); g.lineTo(x + 42, base); g.closePath(); g.fill(); g.fillStyle = '#ffd36a'; g.beginPath(); g.ellipse(x, base - 30, 30, 26, 0, 0, TAU); g.fill();
        g.fillStyle = F('#3a2e2c', .2); g.fillRect(x - 22, top - 260, 44, 260); } },
    land(g, m, F) { const MH = m.h * T; g.strokeStyle = F('#7a6a68', .25); g.lineWidth = 8; for (let x = 0; x < m.w * T; x += 320) { g.beginPath(); g.moveTo(x, -200); g.lineTo(x + 160, 10 * T); g.lineTo(x + 320, -200); g.stroke(); } },
    near(g, m) { },
  },
});
// the foundry's steel frame and rails the crates run along (painted behind everything)
MECH.molten.paintBack = (ctx, m) => {
  const R = (x0, y0, x1, y1) => { line(ctx, x0 * T, y0 * T, x1 * T, y1 * T, '#3a3e48', 10); line(ctx, x0 * T, y0 * T, x1 * T, y1 * T, '#8e97a3', 5); };
  R(10, 9, 40, 9); R(10, 9, 10, 31); R(40, 9, 40, 31);
  for (const mv of m.movers) { const [a, b] = mv.path; if (a[0] === b[0]) { line(ctx, a[0] * T, Math.min(a[1], b[1]) * T - 30, a[0] * T, Math.max(a[1], b[1]) * T + 30, '#5a626e', 4); } else line(ctx, Math.min(a[0], b[0]) * T - 30, (mv.chain || a[1]) * T, Math.max(a[0], b[0]) * T + 30, (mv.chain || a[1]) * T, '#5a626e', 4); }
};
MECH.sludge.thumb = (ctx, m) => { ctx.fillStyle = 'rgba(110,230,80,.75)'; ctx.fillRect(0, (m.sludge.base - 1.5) * T, m.w * T, 6 * T); };
MECH.molten.thumb = (ctx, m) => { const P = m.pool; ctx.fillStyle = '#ff7a1a'; ctx.fillRect(P[0] * T, P[1] * T, P[2] * T, 4 * T); };
MECH.train.thumb = (ctx, m) => { const C = m.train; rr(ctx, C.stop * T, C.y * T, C.len * T, C.h * T - 10, 8); ctx.fillStyle = '#3f7fd0'; ctx.fill(); ctx.fillStyle = '#bfe4ff'; for (let x = C.stop * T + 20; x < (C.stop + C.len) * T - 40; x += 56) ctx.fillRect(x, C.y * T + 22, 36, 60); };
