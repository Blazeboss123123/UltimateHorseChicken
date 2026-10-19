// ===================== ITEMS (placeables) =====================
// Shapes are in tile units, in the item's unrotated local box [0,w]x[0,h].
// rot: 'none' | 'flip' (0/2 only) | 'full' (four quarter turns)
const ITEMS = {};
const ITEM_ORDER = [];
function defItem(id, d) { d.id = id; d.weight = d.weight == null ? 3 : d.weight; d.rot = d.rot || 'full'; ITEMS[id] = d; ITEM_ORDER.push(id); }

// Draw with the item's rotation applied; fn draws in local px space.
function withRot(ctx, it, def, fn) {
  const [W, H] = rotSize(def.w * T, def.h * T, it.rot);
  ctx.save(); ctx.translate(it.x + W / 2, it.y + H / 2); ctx.rotate((it.rot & 3) * Math.PI / 2); ctx.translate(-def.w * T / 2, -def.h * T / 2);
  fn(def.w * T, def.h * T); ctx.restore();
}
function itemBox(it) { const d = ITEMS[it.id]; const [w, h] = rotSize(d.w * T, d.h * T, it.rot); return { x: it.x, y: it.y, w, h }; }
function itemCore(it) {
  const d = ITEMS[it.id]; if (!d.core) return itemBox(it);
  const c = d.core, r = rotRect(c[0], c[1], c[2], c[3], d.w, d.h, it.rot);
  return { x: it.x + r.x * T, y: it.y + r.y * T, w: r.w * T, h: r.h * T };
}
function localToWorld(it, lx, ly) { const d = ITEMS[it.id]; const p = rotPoint(lx, ly, d.w, d.h, it.rot); return [it.x + p[0] * T, it.y + p[1] * T]; }
function staticRects(it, list, extra) {
  const d = ITEMS[it.id], out = [];
  for (const s of list) { const r = rotRect(s[0], s[1], s[2], s[3], d.w, d.h, it.rot); const o = Object.assign({ x: it.x + r.x * T, y: it.y + r.y * T, w: r.w * T, h: r.h * T, ref: it, owner: it.owner, src: d.name }, s[4] || {}, extra || {}); if (o.surf === 'honey') o.hn = rotDir(0, -1, it.rot); out.push(o); } // hn = which way the honey side faces
  return out;
}

// ---------------- BLOCKS & PLATFORMS ----------------
defItem('crate', {
  name: 'Crate', cat: 'block', w: 1, h: 1, weight: 4, rot: 'none', desc: 'A sturdy wooden box.',
  solids: [[0, 0, 1, 1]],
  draw(ctx, it) { withRot(ctx, it, this, (w, h) => { drawWood(ctx, 0, 0, w, h, 3, '#c98f55'); line(ctx, 4, 4, w - 4, h - 4, '#8a5a30', 2.5); line(ctx, w - 4, 4, 4, h - 4, '#8a5a30', 2.5); }); },
});
defItem('bigcrate', {
  name: 'Big Block', cat: 'block', w: 2, h: 2, weight: 3, rot: 'none', desc: 'Two-by-two of solid wood.',
  solids: [[0, 0, 2, 2]],
  draw(ctx, it) { withRot(ctx, it, this, (w, h) => { drawWood(ctx, 0, 0, w, h, 5, '#bf8550'); rr(ctx, 6, 6, w - 12, h - 12, 3); fillStroke(ctx, null, 2, '#8a5a30'); line(ctx, 6, h / 2, w - 6, h / 2, '#8a5a30', 2); }); },
});
defItem('plank', {
  name: 'Plank', cat: 'block', w: 3, h: .5, weight: 5, desc: 'Short board. Rotate for a wall.',
  solids: [[0, 0, 3, .5]],
  draw(ctx, it) { withRot(ctx, it, this, (w, h) => { drawWood(ctx, 0, 0, w, h, 8, '#d49a5c'); circ(ctx, 6, h / 2, 1.6, '#5a3a20', 0); circ(ctx, w - 6, h / 2, 1.6, '#5a3a20', 0); }); },
});
defItem('longplank', {
  name: 'Long Plank', cat: 'block', w: 5, h: .5, weight: 3, desc: 'A long bridge board.',
  solids: [[0, 0, 5, .5]],
  draw(ctx, it) { withRot(ctx, it, this, (w, h) => { drawWood(ctx, 0, 0, w, h, 9, '#cf9356'); for (const x of [6, w / 2, w - 6]) circ(ctx, x, h / 2, 1.6, '#5a3a20', 0); }); },
});
defItem('girder', {
  name: 'L-Girder', cat: 'block', w: 3, h: 3, weight: 3, desc: 'Metal corner piece.',
  solids: [[0, 0, 3, 1], [0, 1, 1, 2]],
  draw(ctx, it) { withRot(ctx, it, this, (w, h) => { drawGirder(ctx, 0, 0, w, T); drawGirder(ctx, 0, T, T, h - T); }); },
});
defItem('stairs', {
  name: 'Stairs', cat: 'block', w: 3, h: 3, weight: 3, rot: 'full', desc: 'Step it up.',
  solids: [[2, 0, 1, 3], [1, 1, 1, 2], [0, 2, 1, 1]],
  draw(ctx, it) { withRot(ctx, it, this, (w, h) => { drawWood(ctx, 2 * T, 0, T, 3 * T, 11, '#c78c52'); drawWood(ctx, T, T, T, 2 * T, 12, '#cd9358'); drawWood(ctx, 0, 2 * T, T, T, 13, '#d39a5e'); }); },
});
defItem('hay', {
  name: 'Hay Bale', cat: 'block', w: 2, h: 2, weight: 2, rot: 'none', desc: 'Round, golden, solid.',
  solids: [[0, 0, 2, 2]],
  draw(ctx, it) { withRot(ctx, it, this, (w, h) => { rr(ctx, 1, 1, w - 2, h - 2, 18); fillStroke(ctx, '#f2cf4a', 2.5); ctx.strokeStyle = '#c99e25'; ctx.lineWidth = 2; for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(6, i * h / 6); ctx.quadraticCurveTo(w / 2, i * h / 6 + 4, w - 6, i * h / 6); ctx.stroke(); } }); },
});
defItem('ice', {
  name: 'Ice Block', cat: 'block', w: 2, h: 1, weight: 2, rot: 'none', desc: 'Slippery on top — and the icicles underneath are sharp!',
  solids: [[0, 0, 2, 1, { surf: 'ice' }]],
  dyn(it) { it._h = [hz(it, 'r', { x: it.x + 5, y: it.y + T, w: 2 * T - 10, h: 10, src: 'icicles' })]; },
  draw(ctx, it) { withRot(ctx, it, this, (w, h) => { wob(ctx, 0, 0, w, h, 21); fillStroke(ctx, '#bfefff', 2.5); ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillRect(5, 5, w * .4, 3); ctx.fillRect(w * .55, h - 9, w * .3, 2.5); for (let i = 0; i < 5; i++) poly(ctx, [[6 + i * 12, h], [10 + i * 12, h + 7], [14 + i * 12, h]], '#d8f6ff', 1.2); }); },
});
defItem('honey', {
  name: 'Honey Block', cat: 'block', w: 2, h: 1, weight: 2, desc: 'Sticky on the honey side only: slows you on top, lets you cling when the honey faces sideways.',
  solids: [[0, 0, 2, 1, { surf: 'honey' }]],
  draw(ctx, it, t) { withRot(ctx, it, this, (w, h) => { drawWood(ctx, 0, 4, w, h - 4, 31, '#a8743e'); ctx.beginPath(); ctx.moveTo(0, 0); for (let x = 0; x <= w; x += 8) ctx.lineTo(x, 6 + Math.sin(x * .7 + t * 2) * 2 + (x % 24 === 8 ? 7 : 0)); ctx.lineTo(w, 0); ctx.closePath(); fillStroke(ctx, '#f4b62a', 2); }); },
});
defItem('trampoline', {
  name: 'Trampoline', cat: 'block', w: 1.5, h: .5, weight: 2, rot: 'none', desc: 'Boing! Launches you high.',
  solids: [[0, 0, 1.5, .5, { surf: 'bounce' }]],
  draw(ctx, it, t) { withRot(ctx, it, this, (w, h) => { const sq = (it.st && it.st.boing > 0) ? it.st.boing * 8 : 0; line(ctx, 6, h, 10, 4 + sq, INK, 3); line(ctx, w - 6, h, w - 10, 4 + sq, INK, 3); rr(ctx, 0, sq, w, 6, 3); fillStroke(ctx, '#e8473f', 2); rr(ctx, 2, h - 4, w - 4, 4, 2); fillStroke(ctx, '#7a7f88', 1.6); }); },
});
defItem('conveyor', {
  name: 'Conveyor', cat: 'block', w: 4, h: .5, weight: 2, rot: 'flip', desc: 'Carries you along the belt.',
  dyn(it) { const dir = it.rot === 2 ? -1 : 1; it._s = staticRects(it, [[0, 0, 4, .5, { surf: 'conv', conv: 130 * dir }]]); },
  draw(ctx, it, t) { withRot(ctx, it, this, (w, h) => { rr(ctx, 0, 0, w, h, h / 2); fillStroke(ctx, '#4b4f58', 2.5); ctx.save(); rr(ctx, 2, 2, w - 4, h - 4, 6); ctx.clip(); ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 2.5; const o = (t * 40) % 16; for (let x = -16 + o; x < w + 16; x += 16) { ctx.beginPath(); ctx.moveTo(x, 3); ctx.lineTo(x + 5, h / 2); ctx.lineTo(x, h - 3); ctx.stroke(); } ctx.restore(); for (const x of [h / 2, w - h / 2]) circ(ctx, x, h / 2, h / 2 - 3, '#8e97a3', 1.5); }); },
});
defItem('mover', {
  name: 'Moving Platform', cat: 'block', w: 7, h: .5, weight: 3, desc: 'Slides back and forth along its rail.',
  dyn(it, W) {
    const vert = it.rot & 1, L = 4 * T, p = (Math.sin(W.t * 1.3 + (it.ph || 0)) + 1) / 2, dp = Math.cos(W.t * 1.3 + (it.ph || 0)) * 1.3 / 2 * L;
    const flip = it.rot >= 2 ? -1 : 1;
    const off = (flip > 0 ? p : 1 - p) * L, vel = dp * flip;
    if (!vert) it._s = [{ x: it.x + off, y: it.y, w: 3 * T, h: T / 2, vx: vel, vy: 0, ref: it, src: this.name, key: it.uid }];
    else it._s = [{ x: it.x, y: it.y + off, w: T / 2, h: 3 * T, vx: 0, vy: vel, ref: it, src: this.name, key: it.uid }];
  },
  draw(ctx, it) {
    const b = itemBox(it); const vert = it.rot & 1;
    ctx.setLineDash([4, 6]); line(ctx, vert ? b.x + T / 4 : b.x + 6, vert ? b.y + 6 : b.y + T / 4, vert ? b.x + T / 4 : b.x + b.w - 6, vert ? b.y + b.h - 6 : b.y + T / 4, 'rgba(58,42,30,.55)', 3); ctx.setLineDash([]);
    const s = it._s && it._s[0]; if (!s) return;
    rr(ctx, s.x, s.y, s.w, s.h, 4); fillStroke(ctx, '#7fb6e8', 2.5); ctx.fillStyle = '#ffd34d'; if (!vert) for (let x = s.x + 8; x < s.x + s.w - 6; x += 14) ctx.fillRect(x, s.y + 4, 6, s.h - 8); else for (let y = s.y + 8; y < s.y + s.h - 6; y += 14) ctx.fillRect(s.x + 4, y, s.w - 8, 6);
  },
});
defItem('falling', {
  name: 'Crumbly Ledge', cat: 'block', w: 3, h: .5, weight: 2, desc: 'Collapses shortly after you land on it, then rebuilds.',
  dyn(it, W) {
    const st = it.st || (it.st = {});
    if (st.fall > 0) { st.fall += W.dt; if (st.fall > 3.2) { st.fall = 0; st.shake = 0; } }
    else if (st.shake > 0) { st.shake += W.dt; if (st.shake > .55) { st.fall = .001; Audio2.sfx('crumble'); FX.burst(it.x + 1.5 * T, it.y + 8, 10, { color: '#b9875a', rmin: 2, rmax: 5 }); } }
    it._s = st.fall > 0 ? [] : staticRects(it, [[0, 0, 3, .5, { surf: 'crumble' }]]);
  },
  draw(ctx, it) {
    const st = it.st || {}; if (st.fall > 0) { ctx.globalAlpha = Math.min(.35, st.fall > 2.6 ? (st.fall - 2.6) : .15); }
    const j = st.shake > 0 && !st.fall ? Math.sin(st.shake * 80) * 2 : 0;
    ctx.save(); ctx.translate(j, st.fall > 0 ? Math.min(st.fall * 120, 60) * (st.fall < 2.6 ? 1 : 0) : 0);
    withRot(ctx, it, this, (w, h) => { for (let i = 0; i < 3; i++) { drawWood(ctx, i * T + 1, 0, T - 2, h, 40 + i, '#d8b27e'); } line(ctx, T, 2, T + 3, h - 2, '#6a4a2a', 1.5); line(ctx, 2 * T + 2, 2, 2 * T - 2, h - 2, '#6a4a2a', 1.5); });
    ctx.restore(); ctx.globalAlpha = 1;
  },
});
defItem('cloud', {
  name: 'Cloud Platform', cat: 'block', w: 3, h: .5, weight: 2, rot: 'none', desc: 'Jump up through it from below.',
  solids: [[0, 0, 3, .5, { oneway: true }]],
  draw(ctx, it, t) { withRot(ctx, it, this, (w, h) => { ctx.fillStyle = '#ffffff'; ctx.strokeStyle = 'rgba(90,120,160,.7)'; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i < 4; i++) ctx.arc(10 + i * (w - 20) / 3, h / 2 + Math.sin(t * 2 + i) * .8, 9, 0, TAU); ctx.fill(); ctx.stroke(); ctx.beginPath(); for (let i = 0; i < 4; i++) ctx.arc(10 + i * (w - 20) / 3, h / 2 + Math.sin(t * 2 + i) * .8, 8, 0, TAU); ctx.fill(); }); },
});
defItem('portal', {
  name: 'Portal Pair', cat: 'block', w: 7, h: 2, weight: 1, rot: 'full', desc: 'Step into the purple swirl, pop out of the green one.',
  dyn(it) {
    const a = rotRect(0, 0, 1, 2, 7, 2, it.rot), b = rotRect(6, 0, 1, 2, 7, 2, it.rot);
    it._portal = { inn: { x: it.x + a.x * T, y: it.y + a.y * T, w: a.w * T, h: a.h * T }, out: { x: it.x + b.x * T, y: it.y + b.y * T, w: b.w * T, h: b.h * T } };
  },
  draw(ctx, it, t) {
    const P = it._portal || (this.dyn(it), it._portal);
    const sw = (r, c1, c2) => { const cx = r.x + r.w / 2, cy = r.y + r.h / 2; ell(ctx, cx, cy, r.w / 2, r.h / 2, c1, 2.5); ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 3); ctx.strokeStyle = c2; ctx.lineWidth = 2.5; ctx.beginPath(); for (let a = 0; a < 12; a += .3) ctx.lineTo(Math.cos(a) * a * r.w / 26, Math.sin(a) * a * r.h / 26); ctx.stroke(); ctx.restore(); };
    ctx.setLineDash([3, 7]); line(ctx, P.inn.x + P.inn.w / 2, P.inn.y + P.inn.h / 2, P.out.x + P.out.w / 2, P.out.y + P.out.h / 2, 'rgba(160,90,220,.35)', 2); ctx.setLineDash([]);
    sw(P.inn, '#7a3fc4', '#d9b8ff'); sw(P.out, '#2fa36a', '#b8ffd9');
  },
});
