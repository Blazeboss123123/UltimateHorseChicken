// ---------------- HAZARDS ----------------
function hz(it, k, a) { return Object.assign({ k, owner: it.owner, src: ITEMS[it.id].name }, a); }
function cycle(it, W, period, key = 'cyc') { const c = Math.floor((W.t + (it.ph || 0)) / period); const st = it.st || (it.st = {}); if (st[key] !== c) { const first = st[key] === undefined; st[key] = c; return !first; } return false; }

defItem('spikes', {
  name: 'Thorn Wire', cat: 'hazard', w: 2, h: .5, weight: 4, desc: 'Prickly wire. Touch it and you pop.',
  dyn(it) { const r = rotRect(.1, .05, 1.8, .4, 2, .5, it.rot); it._h = [hz(it, 'r', { x: it.x + r.x * T, y: it.y + r.y * T, w: r.w * T, h: r.h * T })]; },
  draw(ctx, it) { withRot(ctx, it, this, (w, h) => { ctx.strokeStyle = '#5c616b'; ctx.lineWidth = 2; for (let k = 0; k < 3; k++) { ctx.beginPath(); for (let x = 0; x <= w; x += 4) ctx.lineTo(x, h / 2 + Math.sin(x * .45 + k * 2) * (h / 2 - 2)); ctx.stroke(); } for (let x = 5; x < w; x += 9) { line(ctx, x - 3, h / 2 - 5, x + 3, h / 2 + 5, '#3a3f48', 1.6); line(ctx, x + 3, h / 2 - 5, x - 3, h / 2 + 5, '#3a3f48', 1.6); } }); },
});
defItem('saw', {
  name: 'Buzz Saw', cat: 'hazard', w: 1.5, h: 1.5, weight: 3, rot: 'none', desc: 'Always spinning, always hungry.',
  dyn(it) { it._h = [hz(it, 'c', { x: it.x + .75 * T, y: it.y + .75 * T, r: .62 * T })]; },
  draw(ctx, it, t) { drawSaw(ctx, it.x + .75 * T, it.y + .75 * T, .72 * T, t * 9); },
});
function drawSaw(ctx, x, y, r, a) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.beginPath(); const n = 14; for (let i = 0; i < n; i++) { const a1 = i / n * TAU, a2 = (i + .5) / n * TAU; ctx.lineTo(Math.cos(a1) * r, Math.sin(a1) * r); ctx.lineTo(Math.cos(a2) * r * .78, Math.sin(a2) * r * .78); } ctx.closePath(); fillStroke(ctx, '#c4c9d0', 2.2);
  circ(ctx, 0, 0, r * .55, '#9aa1aa', 1.6); circ(ctx, 0, 0, r * .18, '#5a606a', 1.4);
  for (let i = 0; i < 3; i++) { const aa = i * TAU / 3; line(ctx, Math.cos(aa) * r * .2, Math.sin(aa) * r * .2, Math.cos(aa) * r * .5, Math.sin(aa) * r * .5, '#6b727c', 2); }
  ctx.restore();
}
defItem('sawarm', {
  name: 'Saw Arm', cat: 'hazard', w: 5, h: 5, weight: 2, rot: 'flip', core: [2, 2, 1, 1], desc: 'A saw on a spinning arm. Only the hub blocks placement.',
  dyn(it, W) {
    const dir = it.rot === 2 ? -1 : 1, a = W.t * 1.9 * dir + (it.ph || 0), cx = it.x + 2.5 * T, cy = it.y + 2.5 * T;
    it._arm = { cx, cy, a, sx: cx + Math.cos(a) * 2 * T, sy: cy + Math.sin(a) * 2 * T };
    it._h = [hz(it, 'c', { x: it._arm.sx, y: it._arm.sy, r: .58 * T })];
    it._s = [{ x: cx - T * .35, y: cy - T * .35, w: T * .7, h: T * .7, ref: it, src: this.name }];
  },
  draw(ctx, it, t) { const A = it._arm; if (!A) return; line(ctx, A.cx, A.cy, A.sx, A.sy, '#6b727c', 7); line(ctx, A.cx, A.cy, A.sx, A.sy, '#a8afb8', 3); drawSaw(ctx, A.sx, A.sy, .68 * T, t * 12); rr(ctx, A.cx - T * .35, A.cy - T * .35, T * .7, T * .7, 4); fillStroke(ctx, '#e8a33a', 2.5); circ(ctx, A.cx, A.cy, 4, INK, 0); },
});
defItem('crossbow', {
  name: 'Crossbow', cat: 'hazard', w: 1, h: 1, weight: 3, desc: 'Fires an arrow every couple of seconds.',
  solids: [[.15, .15, .7, .7]],
  dyn(it, W) {
    if (cycle(it, W, 1.9)) { const [dx, dy] = rotDir(1, 0, it.rot); const [sx, sy] = localToWorld(it, .5 + .6, .5); fireProj(W, { x: it.x + itemBox(it).w / 2 + dx * T * .6, y: it.y + itemBox(it).h / 2 + dy * T * .6, vx: dx * 560, vy: dy * 560, r: 5, kind: 'arrow', owner: it.owner, src: 'Crossbow', ref: it }); Audio2.sfx('arrow'); }
  },
  draw(ctx, it, t) { withRot(ctx, it, this, (w, h) => { rr(ctx, 4, 8, w - 8, h - 16, 3); fillStroke(ctx, '#8a5a30', 2.2); ctx.beginPath(); ctx.moveTo(w - 8, 1); ctx.quadraticCurveTo(w + 2, h / 2, w - 8, h - 1); ctx.strokeStyle = '#5a3a20'; ctx.lineWidth = 3; ctx.stroke(); const ph = ((W_TIME(it) % 1.9) / 1.9); const pull = ph < .15 ? 0 : (ph - .15) * 8; line(ctx, w - 8, 1, w - 10 - pull, h / 2, '#eee', 1.2); line(ctx, w - 10 - pull, h / 2, w - 8, h - 1, '#eee', 1.2); if (ph > .2) { line(ctx, w - 10 - pull, h / 2, w + 2 - pull, h / 2, '#5a3a20', 2); poly(ctx, [[w + 2 - pull, h / 2 - 3], [w + 8 - pull, h / 2], [w + 2 - pull, h / 2 + 3]], '#e8473f', 1); } }); },
});
defItem('cannon', {
  name: 'Cannon', cat: 'hazard', w: 1.5, h: 1.5, weight: 2, desc: 'Lobs heavy cannonballs.',
  solids: [[.1, .25, 1.1, 1]],
  dyn(it, W) {
    if (cycle(it, W, 3.2)) { const [dx, dy] = rotDir(1, 0, it.rot); const b = itemBox(it); fireProj(W, { x: b.x + b.w / 2 + dx * T * .9, y: b.y + b.h / 2 + dy * T * .9, vx: dx * 300, vy: dy * 300 - (dy === 0 ? 60 : 0), r: 10, kind: 'ball', owner: it.owner, src: 'Cannon', g: 220, ref: it }); Audio2.sfx('cannon'); FX.burst(b.x + b.w / 2 + dx * T, b.y + b.h / 2 + dy * T, 8, { color: ['#ddd', '#bbb'], kind: 'puff', g: -40, smin: 20, smax: 80 }); }
  },
  draw(ctx, it) { withRot(ctx, it, this, (w, h) => { rr(ctx, 6, h * .3, w * .78, h * .45, 8); fillStroke(ctx, '#3d4a6b', 2.5); rr(ctx, w * .72, h * .26, w * .22, h * .53, 4); fillStroke(ctx, '#2b3550', 2.5); circ(ctx, w * .35, h * .75, h * .22, '#a0703f', 2.2); circ(ctx, w * .35, h * .75, 3, INK, 0); }); },
});
defItem('flame', {
  name: 'Flamethrower', cat: 'hazard', w: 1, h: 1, weight: 2, desc: 'Breathes fire in bursts. Watch the sputter.',
  solids: [[.1, .15, .75, .7]],
  dyn(it, W) {
    const P = 3, ph = (W.t + (it.ph || 0)) % P, on = ph > 1.6 && ph < 2.9; it._fl = { on, warm: ph > 1.2 && ph <= 1.6, ph };
    if (cycle(it, W, P) && W.racing) Audio2.sfx('flame');
    it._h = [];
    if (on) { const r = rotRect(1, .2, 3, .6, 1, 1, it.rot); it._h.push(hz(it, 'r', { x: it.x + r.x * T, y: it.y + r.y * T, w: r.w * T, h: r.h * T })); }
  },
  draw(ctx, it, t) {
    const F = it._fl || {};
    withRot(ctx, it, this, (w, h) => {
      rr(ctx, 3, 5, w - 8, h - 10, 4); fillStroke(ctx, '#c0392b', 2.2); rr(ctx, w - 8, 9, 8, h - 18, 2); fillStroke(ctx, '#555', 2); ctx.fillStyle = '#ffd34d'; ctx.fillRect(7, 9, 4, h - 18);
      if (F.on || F.warm) {
        const L = F.on ? 3 * T : T * .6;
        for (let i = 0; i < 9; i++) { const k = i / 9, x = w + k * L, s = (F.on ? 10 : 5) * (1 - k * .5) + Math.sin(t * 40 + i) * 2; ctx.fillStyle = k < .3 ? '#fff3a0' : k < .65 ? '#ffb62e' : '#ff5a2a'; ctx.globalAlpha = .9; ctx.beginPath(); ctx.arc(x, h / 2 + Math.sin(t * 30 + i * 2) * 2, s, 0, TAU); ctx.fill(); }
        ctx.globalAlpha = 1;
      }
    });
  },
});
defItem('laser', {
  name: 'Laser Beam', cat: 'hazard', w: 1, h: 1, weight: 2, desc: 'Fires a beam until it hits something solid. Flickers before it fires.',
  solids: [[.1, .1, .8, .8]],
  dyn(it, W) {
    const P = 4, ph = (W.t + (it.ph || 0)) % P; const on = ph > 2.4, warn = ph > 1.8 && !on;
    const [dx, dy] = rotDir(1, 0, it.rot); const b = itemBox(it);
    const ox = b.x + b.w / 2 + dx * b.w / 2, oy = b.y + b.h / 2 + dy * b.h / 2;
    const len = rayLength(W, ox, oy, dx, dy, it, 40 * T);
    it._lz = { on, warn, ox, oy, ex: ox + dx * len, ey: oy + dy * len };
    if (on && cycle(it, W, P, 'snd') && W.racing) Audio2.sfx('laser');
    it._h = on ? [hz(it, 'r', dx ? { x: Math.min(ox, ox + dx * len), y: oy - 4, w: len, h: 8 } : { x: ox - 4, y: Math.min(oy, oy + dy * len), w: 8, h: len })] : [];
  },
  draw(ctx, it, t) {
    const L = it._lz; withRot(ctx, it, this, (w, h) => { rr(ctx, 3, 3, w - 6, h - 6, 5); fillStroke(ctx, '#3b3f4c', 2.4); circ(ctx, w - 6, h / 2, 5, L && (L.on || L.warn) ? '#ff4a6a' : '#802030', 1.6); });
    if (!L) return;
    if (L.warn && (!Save.data.settings.reduceFlash ? Math.sin(t * 40) > 0 : true)) line(ctx, L.ox, L.oy, L.ex, L.ey, 'rgba(255,60,90,.45)', 1.5);
    if (L.on) { line(ctx, L.ox, L.oy, L.ex, L.ey, 'rgba(255,60,90,.35)', 12); line(ctx, L.ox, L.oy, L.ex, L.ey, '#ff4a6a', 5); line(ctx, L.ox, L.oy, L.ex, L.ey, '#fff', 2); circ(ctx, L.ex, L.ey, 5 + Math.sin(t * 50) * 2, '#ffd0d8', 0); }
  },
});
defItem('pendulum', {
  name: 'Swinging Spikeball', cat: 'hazard', w: 5, h: 4, weight: 2, rot: 'none', core: [2, 0, 1, 1], desc: 'Hangs from a hook and swings wide.',
  dyn(it, W) { const a = Math.sin(W.t * 1.8 + (it.ph || 0)) * 1.05, ax = it.x + 2.5 * T, ay = it.y + .4 * T, L = 3 * T; it._pd = { ax, ay, bx: ax + Math.sin(a) * L, by: ay + Math.cos(a) * L }; it._h = [hz(it, 'c', { x: it._pd.bx, y: it._pd.by, r: .5 * T })]; },
  draw(ctx, it, t) { const P = it._pd; if (!P) return; rr(ctx, P.ax - 10, P.ay - 10, 20, 12, 3); fillStroke(ctx, '#7a7f88', 2); ctx.setLineDash([5, 3]); line(ctx, P.ax, P.ay, P.bx, P.by, '#5a5f68', 3); ctx.setLineDash([]); drawSpikeball(ctx, P.bx, P.by, .58 * T, t); },
});
function drawSpikeball(ctx, x, y, r, t) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(t * .8);
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; poly(ctx, [[Math.cos(a - .2) * r * .6, Math.sin(a - .2) * r * .6], [Math.cos(a) * r * 1.15, Math.sin(a) * r * 1.15], [Math.cos(a + .2) * r * .6, Math.sin(a + .2) * r * .6]], i % 2 ? '#cfe8ff' : '#e6c2ff', 1.4); }
  circ(ctx, 0, 0, r * .7, '#8a8f99', 2.2); circ(ctx, -r * .2, -r * .2, r * .18, '#b8bec8', 0); ctx.restore();
}
defItem('spikeball', {
  name: 'Spike Ball', cat: 'hazard', w: 1, h: 1, weight: 3, rot: 'none', desc: 'A floating ball of spikes.',
  dyn(it) { it._h = [hz(it, 'c', { x: it.x + T / 2, y: it.y + T / 2, r: .42 * T })]; },
  draw(ctx, it, t) { drawSpikeball(ctx, it.x + T / 2, it.y + T / 2 + Math.sin(t * 2 + it.x) * 1.5, .42 * T, t * .3); },
});
defItem('blackhole', {
  name: 'Black Hole', cat: 'hazard', w: 2, h: 2, weight: 1, rot: 'none', desc: 'Pulls everyone nearby towards a deadly centre.',
  dyn(it, W) { const cx = it.x + T, cy = it.y + T; it._h = [hz(it, 'c', { x: cx, y: cy, r: .5 * T })]; W.forces.push({ k: 'radial', x: cx, y: cy, r: 5.5 * T, s: 1500 }); },
  draw(ctx, it, t) { const cx = it.x + T, cy = it.y + T; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(cx, cy, (5.5 - ((t * 1.5 + i * 1.4) % 5.5)) * T, 0, TAU); ctx.strokeStyle = 'rgba(40,20,60,' + (.06 + i * .02) + ')'; ctx.lineWidth = 2; ctx.stroke(); } ctx.save(); ctx.translate(cx, cy); ctx.rotate(-t * 4); for (let i = 0; i < 6; i++) { ctx.rotate(TAU / 6); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(T * .8, -T * .2, T * .9, T * .5); ctx.strokeStyle = '#2a1636'; ctx.lineWidth = 3; ctx.stroke(); } ctx.restore(); circ(ctx, cx, cy, .5 * T, '#0c0612', 2); },
});
defItem('puncher', {
  name: 'Boxing Glove', cat: 'hazard', w: 1, h: 1, weight: 2, desc: 'Punches you away. Not deadly, but very rude.',
  solids: [[.1, .1, .8, .8]],
  dyn(it, W) {
    const P = 2.4, ph = (W.t + (it.ph || 0)) % P, ext = ph < .25 ? Math.sin(ph / .25 * Math.PI) : 0;
    const [dx, dy] = rotDir(1, 0, it.rot); const b = itemBox(it); const L = 1.7 * T * ext;
    it._pu = { ext, dx, dy, ox: b.x + b.w / 2 + dx * b.w / 2, oy: b.y + b.h / 2 + dy * b.h / 2, L };
    if (ext > .3) W.pushers.push({ x: it._pu.ox + dx * L - 14, y: it._pu.oy + dy * L - 14, w: 28, h: 28, ix: dx * 720 || 0, iy: dy * 720 - (dx ? 260 : 0), owner: it.owner });
    if (cycle(it, W, P) && W.racing) Audio2.sfx('punch');
  },
  draw(ctx, it) { const p = it._pu || { L: 0 }; withRot(ctx, it, this, (w, h) => { rr(ctx, 3, 3, w - 6, h - 6, 4); fillStroke(ctx, '#d9b06a', 2.2); ctx.setLineDash([3, 3]); line(ctx, w - 4, h / 2, w + p.L, h / 2, '#888', 3); ctx.setLineDash([]); ell(ctx, w + p.L + 6, h / 2, 9, 10, '#e8473f', 2.2); ell(ctx, w + p.L + 2, h / 2 - 7, 4, 3, '#e8473f', 1.6); }); },
});

// ---------------- UTILITY ----------------
defItem('fan', {
  name: 'Fan', cat: 'util', w: 1, h: 1, weight: 2, desc: 'Blows players along its direction.',
  solids: [[.15, .1, .6, .8]],
  dyn(it, W) { const [dx, dy] = rotDir(1, 0, it.rot); const b = itemBox(it); const L = 6 * T; const r = dx ? { x: dx > 0 ? b.x + b.w : b.x - L, y: b.y - T * .25, w: L, h: b.h + T * .5 } : { x: b.x - T * .25, y: dy > 0 ? b.y + b.h : b.y - L, w: b.w + T * .5, h: L }; W.forces.push({ k: 'rect', x: r.x, y: r.y, w: r.w, h: r.h, fx: dx * 1700, fy: dy * (dy < 0 ? 2600 : 1700) }); it._fan = r; },
  draw(ctx, it, t) { if (it._fan) { const r = it._fan; ctx.globalAlpha = .25; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; const [dx, dy] = rotDir(1, 0, it.rot); for (let i = 0; i < 6; i++) { const k = ((t * 1.6 + i / 6) % 1); const x = dx ? (dx > 0 ? r.x + k * r.w : r.x + r.w - k * r.w) : r.x + (i + .5) / 6 * r.w, y = dy ? (dy > 0 ? r.y + k * r.h : r.y + r.h - k * r.h) : r.y + (i + .5) / 6 * r.h; line(ctx, x, y, x + dx * 14, y + dy * 14, '#fff', 2); } ctx.globalAlpha = 1; } withRot(ctx, it, this, (w, h) => { rr(ctx, 4, 3, w * .55, h - 6, 4); fillStroke(ctx, '#7fb6e8', 2.2); ctx.save(); ctx.translate(w * .8, h / 2); ell(ctx, 0, 0, 4, h / 2 - 2, '#ddd', 1.8); const s = Math.sin(t * 30) * (h / 2 - 4); line(ctx, 0, -s, 0, s, '#555', 2.5); ctx.restore(); }); },
});
defItem('bumper', {
  name: 'Bumper', cat: 'util', w: 1, h: 1, weight: 2, rot: 'none', desc: 'Pinball bumper — bonks you away from its middle. Great for launches (or rude surprises).',
  dyn(it, W) { W.pushers.push({ k: 'c', x: it.x + T / 2, y: it.y + T / 2, r: T * .52, ref: it, owner: it.owner }); },
  draw(ctx, it) {
    const x = it.x + T / 2, y = it.y + T / 2, k = 1 + ((it.st && it.st.boing) || 0) * .25;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    circ(ctx, 0, 0, T * .46, '#ff5aa8', 2.5); circ(ctx, 0, 0, T * .32, '#ffd34d', 2); circ(ctx, 0, 0, T * .16, '#ffffff', 1.5);
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(-5, -6, 4, 0, TAU); ctx.fill(); ctx.restore();
  },
});
defItem('coin', {
  name: 'Golden Acorn', cat: 'util', w: 1, h: 1, weight: 2, rot: 'none', desc: 'Grab it and reach the flag for bonus points.',
  dyn(it) { it._coin = { x: it.x + T / 2, y: it.y + T / 2, r: T * .45 }; },
  draw(ctx, it, t) { if (it.st && it.st.taken) return; drawAcorn(ctx, it.x + T / 2, it.y + T / 2 + Math.sin(t * 3) * 2, 1, t); },
});
function drawAcorn(ctx, x, y, s, t) { ctx.save(); ctx.translate(x, y); ctx.scale(s * Math.cos(t * 2.5) * .25 + s * .85, s); ell(ctx, 0, 3, 8, 9, '#f2b81f', 2); ctx.beginPath(); ctx.arc(0, -3, 9, Math.PI, 0); ctx.lineTo(9, -1); ctx.lineTo(-9, -1); ctx.closePath(); fillStroke(ctx, '#a8692e', 2); line(ctx, 0, -12, 2, -16, INK, 2.5); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(-4, 2, 2, 6); ctx.restore(); }
defItem('bomb', {
  name: 'Bomb', cat: 'util', w: 1, h: 1, weight: 2, rot: 'none', desc: 'Blows up nearby placed items when you drop it.', instant: true,
  draw(ctx, it, t) { const x = it.x + T / 2, y = it.y + T / 2 + 2; circ(ctx, x, y, 12, '#2a2a30', 2.2); circ(ctx, x - 4, y - 4, 3, '#55555f', 0); rr(ctx, x - 4, y - 16, 8, 5, 1); fillStroke(ctx, '#777', 1.5); ctx.beginPath(); ctx.moveTo(x, y - 16); ctx.quadraticCurveTo(x + 6, y - 22, x + 4, y - 26); ctx.strokeStyle = '#a07040'; ctx.lineWidth = 2; ctx.stroke(); circ(ctx, x + 4, y - 27, 3 + Math.sin(t * 30), '#ffb62e', 0); },
});
const BOMB_RADIUS = 2.8 * T;

// ---------------- ITEM SYSTEM ----------------
let _wt = null; function W_TIME() { return _wt ? _wt.t : 0; }
function makeItem(id, x, y, rot, owner) { return { uid: uid(), id, x, y, rot: rot || 0, owner: owner == null ? -1 : owner, st: {}, ph: 0 }; }
function fireProj(W, p) { p.life = p.life || 5; W.projs.push(p); }
// Distance from a point along an axis direction until the first solid (excluding `self`)
function rayLength(W, ox, oy, dx, dy, self, max) {
  let best = max;
  for (const s of W.solids) {
    if (s.ref === self || s.oneway) continue;
    if (dx > 0 && oy > s.y && oy < s.y + s.h && s.x + s.w > ox) best = Math.min(best, Math.max(0, s.x - ox));
    else if (dx < 0 && oy > s.y && oy < s.y + s.h && s.x < ox) best = Math.min(best, Math.max(0, ox - (s.x + s.w)));
    else if (dy > 0 && ox > s.x && ox < s.x + s.w && s.y + s.h > oy) best = Math.min(best, Math.max(0, s.y - oy));
    else if (dy < 0 && ox > s.x && ox < s.x + s.w && s.y < oy) best = Math.min(best, Math.max(0, oy - (s.y + s.h)));
  }
  return best;
}
// Rebuild every item's solids / hazards for this tick
function updateItems(W) {
  _wt = W;
  for (const it of W.items) {
    const d = ITEMS[it.id];
    it._h = it._h && d.dyn ? it._h : [];
    if (d.solids && !d.dynSolids) { if (!it._s || it._sx !== it.x || it._sy !== it.y || it._sr !== it.rot) { it._s = staticRects(it, d.solids); it._sx = it.x; it._sy = it.y; it._sr = it.rot; } }
  }
}
function tickItems(W) {
  _wt = W;
  for (const it of W.items) { const d = ITEMS[it.id]; if (d.dyn) d.dyn(it, W); }
}
function updateProjectiles(W, dt) {
  for (let i = W.projs.length - 1; i >= 0; i--) {
    const p = W.projs[i];
    p.life -= dt; p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    let dead = p.life <= 0 || p.x < -200 || p.x > W.map.w * T + 200 || p.y > W.map.h * T + 200 || p.y < -600;
    if (!dead) for (const s of W.solids) { if (s.ref === p.ref || s.oneway) continue; if (p.x > s.x && p.x < s.x + s.w && p.y > s.y && p.y < s.y + s.h) { dead = true; FX.burst(p.x, p.y, p.kind === 'ball' ? 10 : 4, { color: p.kind === 'ball' ? ['#666', '#999'] : ['#8a5a30', '#ddd'], smax: 160, rmin: 2, rmax: 4 }); break; } }
    if (dead) W.projs.splice(i, 1);
  }
}
function drawProjectiles(ctx, W) {
  for (const p of W.projs) {
    if (p.kind === 'arrow') { const a = Math.atan2(p.vy, p.vx); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a); line(ctx, -16, 0, 6, 0, '#7a4a20', 3); poly(ctx, [[6, -4], [13, 0], [6, 4]], '#cfd4da', 1.4); poly(ctx, [[-16, 0], [-21, -5], [-12, 0], [-21, 5]], '#e8473f', 1.2); ctx.restore(); }
    else if (p.kind === 'fire') { for (let i = 0; i < 4; i++) circ(ctx, p.x - p.vx * .01 * i, p.y - p.vy * .012 * i, p.r * (1 - i * .2), ['#fff3a0', '#ffd34d', '#ffb62e', '#ff5a2a'][i], 0); circ(ctx, p.x, p.y, p.r, null, 2); }
    else { circ(ctx, p.x, p.y, p.r, '#2a2a30', 2); circ(ctx, p.x - 3, p.y - 3, 2.5, '#666', 0); }
  }
}
function drawItem(ctx, it, t) { const d = ITEMS[it.id]; if (d) d.draw(ctx, it, t); }
// Small icon of an item scaled into a box
function drawItemIcon(ctx, id, cx, cy, size, t = 0) {
  const d = ITEMS[id]; const fake = { x: 0, y: 0, id, rot: 0, owner: -1, st: {}, ph: 0 };
  const W0 = { t: 1.0, dt: 0, forces: [], pushers: [], projs: [], solids: [], racing: false, map: { w: 1, h: 1 } };
  if (d.dyn) { const sw = _wt; _wt = W0; d.dyn(fake, W0); _wt = sw; }
  const pw = d.w * T, ph = d.h * T; let ex = 0;
  if (id === 'flame' || id === 'puncher' || id === 'laser') ex = T * .6;
  const s = Math.min(size / (pw + ex), size / ph, 1.25);
  ctx.save(); ctx.translate(cx - (pw + ex) * s / 2, cy - ph * s / 2); ctx.scale(s, s);
  if (id === 'fan') fake._fan = null;
  if (id === 'laser') fake._lz = null;
  d.draw(ctx, fake, t);
  ctx.restore();
}
