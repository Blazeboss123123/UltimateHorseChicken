// ===================== MORE TRAPS =====================
// Each of these has: body (static parts, baked into a texture) + fx (moving / animated parts, drawn every frame).
// draw() = body + fx, used for icons and level thumbnails.
// Traps set off by a player (landmine, anvil, paper plane) call triggerItem(): every screen hears about it.
function triggerItem(W, it) {
  const st = it.st || (it.st = {}); if (st.trig != null) return false;
  st.trig = W.t; if (Net.online) Net.cast({ t: 'trig', uid: it.uid });
  return true;
}

// ---------------- Landmine ----------------
defItem('mine', {
  name: 'Landmine', cat: 'hazard', w: 1, h: .5, weight: 3, desc: 'Step on it: beep… BOOM. Blows up everyone nearby. One use per round.',
  dyn(it, W) {
    const st = it.st || (it.st = {}), b = itemBox(it);
    it._h = []; it._trig = null;
    if (st.trig == null) { it._trig = { x: b.x - 4, y: b.y - 8, w: b.w + 8, h: b.h + 16 }; return; }
    const k = W.t - st.trig;
    if (k >= .5 && k < .7) it._h.push(hz(it, 'c', { x: b.x + b.w / 2, y: b.y + b.h / 2, r: 1.7 * T }));
    if (k >= .5 && !st.boom) { st.boom = true; const cx = b.x + b.w / 2, cy = b.y + b.h / 2; FX.burst(cx, cy, 34, { color: ['#ffb62e', '#ff5a2a', '#fff3a0'], smax: 520, rmin: 4, rmax: 11 }); FX.burst(cx, cy, 16, { color: 'rgba(70,70,70,.7)', kind: 'puff', g: -60, smax: 180, rmin: 10, rmax: 24, lmax: 1.5 }); FX.text(cx, cy - 30, 'BOOM!', '#ffd34d'); Audio2.sfx('boom'); if (W.view) W.view.shake(12); }
    if (k < .5 && !st.beep) { st.beep = true; Audio2.tone(1400, .08, { type: 'square', vol: .07 }); Audio2.tone(1400, .08, { type: 'square', vol: .07, delay: .2 }); Audio2.tone(1800, .1, { type: 'square', vol: .08, delay: .38 }); }
  },
  body(ctx, it) { withRot(ctx, it, this, (w, h) => { ctx.beginPath(); ctx.ellipse(w / 2, h, w / 2 - 1, h * .95, 0, Math.PI, 0); ctx.closePath(); fillStroke(ctx, '#4a5240', 2, '#22281c'); ctx.fillStyle = '#ffd34d'; ctx.fillRect(3, h - 4, w - 6, 3); ctx.fillStyle = '#22281c'; for (let x = 5; x < w - 6; x += 7) ctx.fillRect(x, h - 4, 3, 3); rr(ctx, w / 2 - 5, h * .15, 10, 5, 2); fillStroke(ctx, '#7a8270', 1.2, '#22281c'); }); },
  hideBody(it) { const st = it.st || {}; return st.trig != null && W_TIME() - st.trig >= .5; },
  fx(g, it, t) {
    const st = it.st || {}, b = itemBox(it), [ux, uy] = rotDir(0, -1, it.rot), cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    if (st.trig == null) { if (Math.sin(t * 5) > .7) circ(g, cx + ux * 5, cy + uy * 5, 3, '#ff3a3a', 0); return; }
    const k = W_TIME() - st.trig;
    if (k < .5) { const on = Math.sin(k * 60) > 0; circ(g, cx + ux * 5, cy + uy * 5, on ? 6 : 3, on ? '#ff3a3a' : '#7a1a1a', 0); if (on) circ(g, cx + ux * 5, cy + uy * 5, 14, 'rgba(255,60,60,.3)', 0); return; }
    g.fillStyle = 'rgba(30,24,20,.55)'; g.beginPath(); g.ellipse(cx, cy, b.w * .7, b.h * .7 + 4, 0, 0, TAU); g.fill();
  },
  draw(ctx, it, t) { this.body(ctx, it, t); },
});

// ---------------- Pop-up Spikes ----------------
defItem('popspikes', {
  name: 'Pop-up Spikes', cat: 'hazard', w: 2, h: .5, weight: 3, desc: 'A spike plate that shoots up every couple of seconds. It rattles first.',
  state(it, W) { const P = 2.4, k = ((W.t + (it.ph || 0) + (Math.round(it.x / T) % 3) * .8) % P + P) % P; return k < 1.4 ? 0 : k < 1.8 ? .25 : 1; },
  dyn(it, W) { const e = it._ps = this.state(it, W); it._h = []; if (e >= 1) { const r = rotRect(.05, .02, 1.9, .3, 2, .5, it.rot); it._h.push(hz(it, 'r', { x: it.x + r.x * T, y: it.y + r.y * T, w: r.w * T, h: r.h * T })); } },
  body(ctx, it) { withRot(ctx, it, this, (w, h) => { rr(ctx, 0, h * .55, w, h * .45, 2); fillStroke(ctx, '#7a828e', 1.8, '#3a3e48'); for (let x = 6; x < w - 2; x += 8) circ(ctx, x, h * .72, 1.8, '#2a2e36', 0); }); },
  fx(g, it, t) {
    const e = it._ps != null ? it._ps : 1, d = this, shake = e === .25 ? Math.sin(t * 70) * 1.2 : 0;
    if (!e) return;
    withRot(g, it, d, (w, h) => { const top = h * .55 - (h * .55) * e; for (let x = 4; x < w - 2; x += 8) { g.beginPath(); g.moveTo(x - 3 + shake, h * .55); g.lineTo(x + shake, top); g.lineTo(x + 3 + shake, h * .55); g.closePath(); fillStroke(g, '#dfe4ea', 1.2, '#4a4e58'); } });
  },
  draw(ctx, it, t) { it._ps = 1; this.fx(ctx, it, t); this.body(ctx, it, t); },
});

// ---------------- Falling Anvil ----------------
const ANVIL_G = 2600;
defItem('anvil', {
  name: 'Falling Anvil', cat: 'hazard', w: 1.5, h: 1, weight: 2, rot: 'none', desc: 'Hangs on a rope and drops on anyone who walks underneath. Then it winches back up — ride it!',
  // where it would land: the nearest standing-surface below (static blocks and terrain only, so every screen agrees)
  landing(it, W) {
    const x0 = it.x + 4, x1 = it.x + 1.5 * T - 4, y0 = it.y + T; let best = 14 * T;
    for (const s of W.solids) { if (s.oneway || s.pl || s.ref === it || s.vx || s.vy || s.src === 'mapmover' || s.src === 'train' || s.x >= x1 || s.x + s.w <= x0 || s.y < y0 - 1) continue; best = Math.min(best, s.y - y0); }
    return Math.max(0, best);
  },
  pos(it, W) { // y offset (px) of the anvil below its hook, and its speed
    const st = it.st || {}; if (st.trig == null) return { dy: 0, vy: 0, falling: false, phase: 'idle' };
    const k = W.t - st.trig, d = st.d != null ? st.d : 0, tf = Math.sqrt(2 * Math.max(d, 1) / ANVIL_G), rest = 1.4, up = 1.6;
    if (k < tf) return { dy: .5 * ANVIL_G * k * k, vy: ANVIL_G * k, falling: true, phase: 'fall' };
    if (k < tf + rest) return { dy: d, vy: 0, falling: false, phase: 'rest', landK: k - tf };
    if (k < tf + rest + up) return { dy: d * (1 - (k - tf - rest) / up), vy: -d / up, falling: false, phase: 'up' };
    return { dy: 0, vy: 0, falling: false, phase: 'done' };
  },
  dyn(it, W) {
    const st = it.st || (it.st = {});
    if (st.trig != null && st.d == null) st.d = this.landing(it, W);
    let P = this.pos(it, W);
    if (P.phase === 'done') { st.trig = null; st.d = null; st.thud = false; P = this.pos(it, W); } // winched back up: armed again
    const x = it.x, y = it.y + P.dy, w = 1.5 * T, h = T;
    it._an = { y, P };
    it._h = []; it._s = []; it._trig = null;
    if (P.falling) it._h.push(hz(it, 'r', { x: x + 3, y: y + 4, w: w - 6, h: h - 4 }));
    else it._s.push({ x, y: y + 4, w, h: h - 4, vx: 0, vy: P.vy, ref: it, owner: it.owner, src: this.name, key: it.uid + ':0' });
    if (P.phase === 'idle') { const d = this.landing(it, W); it._trig = { x: x + 4, y: it.y + h, w: w - 8, h: Math.max(8, d) }; }
    if (P.phase === 'rest' && !st.thud) { st.thud = true; FX.burst(x + w / 2, y + h, 14, { color: 'rgba(160,150,140,.7)', kind: 'puff', g: -30, smax: 200 }); Audio2.sfx('land'); Audio2.sfx('cannon'); if (W.view) W.view.shake(8); }
  },
  body(ctx, it) { const w = 1.5 * T; rr(ctx, it.x + w / 2 - 10, it.y - 6, 20, 8, 2); fillStroke(ctx, '#5a5048', 1.6, '#2a2420'); },
  fx(g, it, t) {
    const A = it._an || { y: it.y, P: { phase: 'idle' } }, x = it.x, w = 1.5 * T, y = A.y, cx = x + w / 2;
    if (A.P.phase === 'idle' || A.P.phase === 'up') line(g, cx, it.y - 2, cx, y + 4, '#8a6a40', 2.5);
    if (A.P.phase === 'idle') { const sw = Math.sin(t * 2) * 1.5; g.save(); g.translate(sw, 0); drawAnvil(g, x, y, w); g.restore(); } else drawAnvil(g, x, y, w);
    if (A.P.phase === 'fall') for (let i = 0; i < 3; i++) line(g, x + 8 + i * 16, y - 10 - i * 4, x + 8 + i * 16, y - 34 - i * 6, 'rgba(255,255,255,.6)', 2);
  },
  draw(ctx, it, t) { this.body(ctx, it); it._an = { y: it.y, P: { phase: 'idle' } }; this.fx(ctx, it, 0); },
});
function drawAnvil(g, x, y, w) {
  g.beginPath(); g.moveTo(x + 2, y + 6); g.lineTo(x + w - 2, y + 6); g.lineTo(x + w - 2, y + 12); g.quadraticCurveTo(x + w * .72, y + 13, x + w * .68, y + 20); g.lineTo(x + w * .74, y + 30); g.lineTo(x + w * .26, y + 30); g.lineTo(x + w * .32, y + 20); g.quadraticCurveTo(x + w * .2, y + 13, x + 2, y + 12); g.closePath();
  fillStroke(g, '#5a5f6a', 2, '#22252c'); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x + 6, y + 7, w - 12, 2); circ(g, x + w / 2, y + 4, 4, null, 2);
}

// ---------------- Tesla Coil ----------------
defItem('tesla', {
  name: 'Tesla Coil', cat: 'hazard', w: 1, h: 2, weight: 2, rot: 'none', desc: 'Crackles as it charges, then zaps everything around it.',
  solids: [[.15, .55, .7, 1.45]],
  state(it, W) { const P = 3.2, k = ((W.t + (it.ph || 0) + (Math.round(it.x / T) % 4) * .55) % P + P) % P; return { charge: k > 1.9 && k < 2.7 ? (k - 1.9) / .8 : 0, zap: k >= 2.7 }; },
  dyn(it, W) { const S = it._tz = this.state(it, W), ox = it.x + T / 2, oy = it.y + .35 * T; it._h = S.zap ? [hz(it, 'c', { x: ox, y: oy, r: 2.5 * T })] : []; if (S.zap && !(it.st && it.st.z) && (W.racing || W.testing)) { (it.st || (it.st = {})).z = 1; Audio2.noise(.3, { freq: 3000, slide: 600, vol: .12 }); } if (!S.zap && it.st) it.st.z = 0; },
  body(ctx, it) { const x = it.x, y = it.y; rr(ctx, x + 4, y + 2 * T - 10, T - 8, 10, 2); fillStroke(ctx, '#3a3e48', 1.6); rr(ctx, x + 9, y + 18, T - 18, 2 * T - 28, 3); fillStroke(ctx, '#b8784a', 1.6, '#5a3414'); for (let yy = y + 22; yy < y + 2 * T - 12; yy += 5) line(ctx, x + 9, yy, x + T - 9, yy, '#e8a868', 1.4); circ(ctx, x + T / 2, y + .35 * T, 9, '#c8ccd6', 2); },
  fx(g, it, t) {
    const S = it._tz || { charge: .5, zap: false }, ox = it.x + T / 2, oy = it.y + .35 * T;
    circ(g, ox, oy, 6 + S.charge * 4, S.zap ? '#ffffff' : S.charge ? '#bfe8ff' : '#7aa8d8', 0);
    const n = S.zap ? 9 : S.charge ? 3 : 0, R = S.zap ? 2.5 * T : 14 + S.charge * 20;
    for (let i = 0; i < n; i++) { const a = i / n * TAU + Math.floor(t * 20) * 1.7; g.beginPath(); g.moveTo(ox, oy); for (let s = 1; s <= 5; s++) { const r = R * s / 5, j = (Math.sin(t * 90 + i * 7 + s * 3) * .4); g.lineTo(ox + Math.cos(a + j * (1 - s / 6)) * r, oy + Math.sin(a + j * (1 - s / 6)) * r); } g.strokeStyle = S.zap ? '#e8f6ff' : '#9ad0ff'; g.lineWidth = S.zap ? 3 : 1.6; g.stroke(); }
    if (S.zap) { circ(g, ox, oy, R, 'rgba(150,210,255,.12)', 0); g.strokeStyle = 'rgba(190,230,255,.5)'; g.lineWidth = 2; g.beginPath(); g.arc(ox, oy, R, 0, TAU); g.stroke(); }
  },
  draw(ctx, it, t) { this.body(ctx, it); it._tz = { charge: .6, zap: false }; this.fx(ctx, it, .3); },
});

// ---------------- Rocket Launcher ----------------
defItem('rocket', {
  name: 'Rocket Launcher', cat: 'hazard', w: 1, h: 1, weight: 2, desc: 'Fires a slow heat-seeking rocket at the nearest player. Lure it into a wall!',
  solids: [[.1, .1, .8, .8]],
  dyn(it, W) {
    const P = 4.2, k = ((W.t + (it.ph || 0)) % P + P) % P; it._rk = k > P - .8;
    if (cycle(it, W, P) && (W.racing || W.testing)) { const [dx, dy] = rotDir(1, 0, it.rot), b = itemBox(it); fireProj(W, { x: b.x + b.w / 2 + dx * T * .7, y: b.y + b.h / 2 + dy * T * .7, vx: dx * 200, vy: dy * 200, r: 8, kind: 'rocket', homing: true, speed: 235, turn: 2.3, owner: it.owner, src: 'a rocket', ref: it, life: 4.5 }); Audio2.noise(.35, { freq: 500, slide: 1400, vol: .2 }); }
  },
  body(ctx, it) { withRot(ctx, it, this, (w, h) => { rr(ctx, 3, 4, w - 6, h - 8, 4); fillStroke(ctx, '#5a6a4a', 2, '#2a3220'); rr(ctx, w * .45, h * .28, w * .55, h * .44, 4); fillStroke(ctx, '#3a4430', 2, '#1a2010'); circ(ctx, w - 3, h / 2, h * .16, '#1a1a1e', 0); ctx.fillStyle = '#ffd34d'; ctx.fillRect(6, h - 10, w * .38, 4); }); },
  fx(g, it, t) { if (!it._rk) return; const b = itemBox(it); if (Math.sin(t * 30) > 0) circ(g, b.x + b.w / 2, b.y + b.h / 2, 4, '#ff3a3a', 0); },
  draw(ctx, it, t) { this.body(ctx, it); },
});
function drawRocket(g, x, y, a, t) {
  g.save(); g.translate(x, y); g.rotate(a);
  for (let i = 0; i < 3; i++) circ(g, -14 - i * 6 - Math.sin(t * 40 + i) * 2, 0, 5 - i * 1.2, ['#fff3a0', '#ffb62e', '#ff5a2a'][i], 0);
  rr(g, -12, -5, 22, 10, 4); fillStroke(g, '#e8e8ec', 1.6, '#3a3a42'); g.beginPath(); g.moveTo(10, -5); g.lineTo(18, 0); g.lineTo(10, 5); g.closePath(); fillStroke(g, '#e8473f', 1.4, '#3a3a42');
  g.beginPath(); g.moveTo(-12, -5); g.lineTo(-16, -10); g.lineTo(-6, -5); g.closePath(); fillStroke(g, '#e8473f', 1.2, '#3a3a42'); g.beginPath(); g.moveTo(-12, 5); g.lineTo(-16, 10); g.lineTo(-6, 5); g.closePath(); fillStroke(g, '#e8473f', 1.2, '#3a3a42');
  g.restore();
}

// ---------------- Rail Saw ----------------
defItem('railsaw', {
  name: 'Rail Saw', cat: 'hazard', w: 5, h: 1, weight: 3, desc: 'A buzz saw that zooms back and forth along its rail.',
  dyn(it, W) { const u = .5 - .5 * Math.cos(((W.t + (it.ph || 0)) / 2.8) * TAU), p = rotPoint(.75 + 3.5 * u, .5, 5, 1, it.rot); it._rs = { x: it.x + p[0] * T, y: it.y + p[1] * T }; it._h = [hz(it, 'c', { x: it._rs.x, y: it._rs.y, r: .6 * T })]; },
  body(ctx, it) { withRot(ctx, it, this, (w, h) => { rr(ctx, 10, h / 2 - 4, w - 20, 8, 4); fillStroke(ctx, '#7a828e', 1.8, '#3a3e48'); for (const x of [6, w - 6]) { rr(ctx, x - 6, h / 2 - 9, 12, 18, 3); fillStroke(ctx, '#ffd34d', 1.6, '#7a5a10'); } ctx.setLineDash([6, 6]); line(ctx, 16, h / 2, w - 16, h / 2, 'rgba(30,30,40,.5)', 2); ctx.setLineDash([]); }); },
  fx(g, it, t) { const p = it._rs; if (p) drawSaw(g, p.x, p.y, .66 * T, t * 11); },
  draw(ctx, it, t) { this.body(ctx, it); if (!it._rs) { const p = rotPoint(2.5, .5, 5, 1, it.rot); it._rs = { x: it.x + p[0] * T, y: it.y + p[1] * T }; } this.fx(ctx, it, 0); },
});

// ---------------- Chomper ----------------
defItem('chomper', {
  name: 'Chomper', cat: 'hazard', w: 1.5, h: 1, weight: 2, desc: 'A hungry plant that pops out of its pot to bite.',
  solids: [[.15, .3, 1.2, .7]],
  ext(it, W) { const P = 3, k = ((W.t + (it.ph || 0) + (Math.round(it.x / T) % 3) * .6) % P + P) % P; return { e: k < 1.7 ? 0 : k < 2 ? (k - 1.7) / .3 : k < 2.5 ? 1 : k < 3 ? 1 - (k - 2.5) / .5 : 0, bite: k >= 2 && k < 2.5 }; },
  dyn(it, W) { const E = it._ch = this.ext(it, W), p = rotPoint(.75, .3 - 1.25 * E.e, 1.5, 1, it.rot); it._chp = { x: it.x + p[0] * T, y: it.y + p[1] * T }; it._h = E.e > .35 ? [hz(it, 'c', { x: it._chp.x, y: it._chp.y, r: .52 * T })] : []; },
  body(ctx, it) { withRot(ctx, it, this, (w, h) => { ctx.beginPath(); ctx.moveTo(w * .12, h * .3); ctx.lineTo(w * .88, h * .3); ctx.lineTo(w * .78, h); ctx.lineTo(w * .22, h); ctx.closePath(); fillStroke(ctx, '#c8683a', 2, '#5a2a10'); rr(ctx, w * .06, h * .22, w * .88, h * .2, 3); fillStroke(ctx, '#e0804a', 1.8, '#5a2a10'); }); },
  fx(g, it, t) {
    const E = it._ch || { e: 1, bite: true }, P = it._chp; if (!P || E.e <= .02) return;
    const [ux, uy] = rotDir(0, -1, it.rot), b = rotPoint(.75, .3, 1.5, 1, it.rot), bx = it.x + b[0] * T, by = it.y + b[1] * T;
    line(g, bx, by, P.x, P.y, '#3f8a3a', 5); circ(g, (bx + P.x) / 2 + uy * 6, (by + P.y) / 2 - ux * 6, 5, '#5fbf4a', 1.2);
    const open = E.bite ? .5 + .5 * Math.abs(Math.sin(t * 22)) : .25, a = Math.atan2(uy, ux);
    g.save(); g.translate(P.x, P.y); g.rotate(a);
    g.beginPath(); g.arc(0, 0, 15, -Math.PI / 2 - open, Math.PI / 2 + open, true); g.closePath(); fillStroke(g, '#4fae3a', 2, '#1f4a1a');
    g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 15, -open, open); g.closePath(); fillStroke(g, '#e8473f', 1.4, '#7a1a1a');
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const aa = s * (open - .12 - i * .16), r1 = 15, x = Math.cos(aa) * r1, y = Math.sin(aa) * r1; g.beginPath(); g.moveTo(x, y); g.lineTo(x * .62, y * .62 + s * 3); g.lineTo(Math.cos(aa - s * .12) * r1, Math.sin(aa - s * .12) * r1); g.closePath(); fillStroke(g, '#ffffff', .8, '#7a7a7a'); }
    circ(g, -6, -8, 3, '#ffffff', 0); circ(g, -6, 8, 3, '#ffffff', 0);
    g.restore();
  },
  draw(ctx, it, t) { it._ch = { e: .8, bite: true }; const p = rotPoint(.75, .3 - 1.25 * .8, 1.5, 1, it.rot); it._chp = { x: it.x + p[0] * T, y: it.y + p[1] * T }; this.fx(ctx, it, .05); this.body(ctx, it); },
});

// ---------------- Fire Bar ----------------
defItem('firebar', {
  name: 'Fire Bar', cat: 'hazard', w: 6, h: 6, weight: 2, rot: 'flip', core: [2.5, 2.5, 1, 1], desc: 'A spinning chain of fireballs. Only the middle block gets in the way of building.',
  solids: [[2.6, 2.6, .8, .8]],
  dyn(it, W) { const dir = it.rot === 2 ? -1 : 1, a = W.t * 1.5 * dir + (it.ph || 0), cx = it.x + 3 * T, cy = it.y + 3 * T; it._fb = { cx, cy, a, balls: [.85, 1.4, 1.95, 2.5].map(d => ({ x: cx + Math.cos(a) * d * T, y: cy + Math.sin(a) * d * T })) }; it._h = it._fb.balls.map(p => hz(it, 'c', { x: p.x, y: p.y, r: .3 * T })); },
  body(ctx, it) { const x = it.x + 2.6 * T, y = it.y + 2.6 * T, s = .8 * T; rr(ctx, x, y, s, s, 3); fillStroke(ctx, '#a8604a', 2, '#4a2414'); line(ctx, x + 3, y + s / 2, x + s - 3, y + s / 2, '#6a3424', 1.4); circ(ctx, x + s / 2, y + s / 2, 4, '#3a3a42', 1); },
  fx(g, it, t) { const F = it._fb; if (!F) return; F.balls.forEach((p, i) => { circ(g, p.x, p.y, 11 + Math.sin(t * 20 + i) * 1.5, '#ff5a2a', 0); circ(g, p.x, p.y, 7.5, '#ffb62e', 0); circ(g, p.x - 2, p.y - 2, 3.5, '#fff3a0', 0); }); },
  draw(ctx, it, t) { this.dyn(it, { t: .4 }); this.fx(ctx, it, 0); this.body(ctx, it); },
});

// ---------------- Quicksand ----------------
defItem('quicksand', {
  name: 'Quicksand', cat: 'hazard', w: 3, h: 1.5, weight: 2, rot: 'none', desc: 'A tub of quicksand. Land in it and you crawl and sink — jump out before you go under!',
  solids: [[0, 1.25, 3, .25], [0, 0, .15, 1.5], [2.85, 0, .15, 1.5]],
  dyn(it) { it._sink = { x: it.x + .15 * T, y: it.y + 4, w: 2.7 * T, h: 1.25 * T - 4, owner: it.owner, src: 'quicksand' }; },
  body(ctx, it) { const x = it.x, y = it.y, w = 3 * T, h = 1.5 * T; rr(ctx, x, y, w, h, 4); fillStroke(ctx, '#8a6a40', 2, '#4a3418'); rr(ctx, x + 5, y + 5, w - 10, h - 13, 3); ctx.fillStyle = '#d8b06a'; ctx.fill(); const R = mulberry(7); for (let i = 0; i < 26; i++) { ctx.fillStyle = R() < .5 ? 'rgba(140,100,50,.35)' : 'rgba(255,240,200,.35)'; ctx.beginPath(); ctx.arc(x + 8 + R() * (w - 16), y + 8 + R() * (h - 18), 1 + R() * 2.5, 0, TAU); ctx.fill(); } },
  fx(g, it, t) { const x = it.x + 6, y = it.y + 6, w = 3 * T - 12; for (let i = 0; i < 3; i++) { const k = (t * .35 + i / 3) % 1; g.strokeStyle = 'rgba(120,80,30,' + ((1 - k) * .5).toFixed(3) + ')'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(x + w / 2 + Math.sin(i * 2.3) * w * .25, y + 10, 6 + k * 26, 2 + k * 5, 0, 0, TAU); g.stroke(); } },
  draw(ctx, it, t) { this.body(ctx, it); this.fx(ctx, it, .5); },
});

// ---------------- Paper Airplane ----------------
// Jump on and it takes off, gliding forward with you on board. After about 5 seconds it runs out and crumples.
const PLANE_FLY = 5, PLANE_V = 260;
defItem('plane', {
  name: 'Paper Airplane', cat: 'util', w: 2, h: .6, weight: 2, rot: 'flip', desc: 'Hop on and it glides forward carrying you… for about 5 seconds. Then it crumples!',
  pose(it, k) { // offset from its spot k seconds after take-off
    const dir = it.rot === 2 ? -1 : 1;
    if (k < 0) return { dx: 0, dy: 0, tilt: 0, fall: false, gone: false };
    const s = k < .5 ? PLANE_V * k * k : PLANE_V * .25 + PLANE_V * (k - .5);
    let dy = 18 * k + Math.sin(k * 4) * 6, tilt = Math.cos(k * 4) * .06, fall = false;
    if (k > PLANE_FLY) { const f = k - PLANE_FLY; dy += .5 * 1500 * f * f; tilt = Math.min(1.3, f * 2.4); fall = true; }
    return { dx: dir * s, dy, tilt: tilt * dir, fall, gone: k > PLANE_FLY + 3, dir };
  },
  at(it, W) {
    const st = it.st || {};
    if (st.trig == null) { const b = Math.sin(W.t * 2.6) * 3, b2 = Math.sin((W.t + 1 / 120) * 2.6) * 3; return { x: it.x, y: it.y + b, vx: 0, vy: (b2 - b) * 120, tilt: 0, fall: false, gone: false }; }
    const k = Math.min(W.t - st.trig, st.crash != null ? st.crash : 1e9), k2 = k + 1 / 120;
    let A = this.pose(it, k), B = this.pose(it, k2);
    if (st.crash != null && W.t - st.trig > st.crash) { const f = W.t - st.trig - st.crash; A = Object.assign({}, A, { dy: A.dy + .5 * 1500 * f * f, fall: true, tilt: Math.min(1.3, f * 2.4) * (it.rot === 2 ? -1 : 1), gone: f > 3 }); B = A; }
    return { x: it.x + A.dx, y: it.y + A.dy, vx: (B.dx - A.dx) * 120, vy: (B.dy - A.dy) * 120, tilt: A.tilt, fall: A.fall, gone: A.gone };
  },
  dyn(it, W) {
    const st = it.st || (it.st = {}), P = it._pl = this.at(it, W), w = 2 * T;
    it._s = []; it._trig = null;
    if (!P.fall && !P.gone) it._s.push({ x: P.x, y: P.y, w, h: 10, oneway: true, vx: P.vx, vy: P.vy, ref: it, owner: it.owner, src: this.name, key: it.uid + ':0' });
    // flew into something solid: crumple there
    if (st.trig != null && st.crash == null && !P.fall) { const dir = it.rot === 2 ? -1 : 1, fx = dir > 0 ? P.x + w + 2 : P.x - 2; for (const s of W.solids) { if (s.oneway || s.pl || s.ref === it || s.src === 'mapmover' || s.src === 'train') continue; if (fx > s.x && fx < s.x + s.w && P.y + 6 > s.y && P.y + 6 < s.y + s.h) { st.crash = W.t - st.trig; FX.burst(fx, P.y + 6, 10, { color: '#ffffff', kind: 'star', g: 200 }); Audio2.sfx('crumble'); break; } } }
    if (st.trig != null && !st.out && W.t - st.trig > PLANE_FLY) { st.out = true; Audio2.sfx('crumble'); }
  },
  onStand(it, W) { if (triggerItem(W, it)) Audio2.tone(500, .25, { slide: 900, type: 'sine', vol: .08 }); },
  fx(g, it, t) {
    const P = it._pl || { x: it.x, y: it.y, tilt: 0, fall: false, gone: false }; if (P.gone) return;
    const dir = it.rot === 2 ? -1 : 1, w = 2 * T, crumple = P.fall ? Math.min(1, P.tilt * dir) : 0;
    g.save(); g.translate(P.x + w / 2, P.y + 8); g.rotate(P.tilt); g.scale(dir, 1);
    const sq = 1 - crumple * .45;
    g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(-w / 2, -10 * sq); g.lineTo(-w / 2 + 14, 2); g.lineTo(-w / 2, 12 * sq); g.closePath(); fillStroke(g, '#ffffff', 1.8, '#6a7a9a');
    g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(-w / 2 + 14, 2); g.lineTo(-w / 2 + 6, 9 * sq); g.closePath(); g.fillStyle = '#dce8f8'; g.fill(); g.strokeStyle = '#6a7a9a'; g.lineWidth = 1.2; g.stroke();
    line(g, w / 2, 0, -w / 2 + 14, 2, '#8a9ab8', 1.2);
    g.restore();
    if (!P.fall && it.st && it.st.trig != null) { const k = W_TIME() - it.st.trig; if (k > PLANE_FLY - 1.2 && Math.sin(t * 25) > 0) { circ(g, P.x + w / 2, P.y - 6, 3, '#ff5a2a', 0); } }
  },
  draw(ctx, it, t) { it._pl = { x: it.x, y: it.y, tilt: 0 }; this.fx(ctx, it, 0); },
});
