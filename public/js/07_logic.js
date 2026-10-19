// ===================== LOGIC WORLD (the game model; Phaser renders it and runs player physics) =====================
const PHYS = { run: 250, sprint: 1.5, crouch: .42, slideDec: 330, accG: 2600, decG: 3000, accA: 1700, decA: 700, grav: 1900, jumpV: 610, maxFall: 820, coyote: .13, buffer: .16, wallSlide: 110, wallJumpX: 330, climbX: 180, climbV: .82, climbLock: .07, climbHold: .12, pushK: .2, holePull: 300, holeLift: 1, lowJumpMul: 2.1, minJump: .1 };
const PW = 22, PH = 28, CH = 17; // player width, height, crouched height

function createWorld(map, rules) {
  const W = {
    map, rules: rules || Save.data.rules, t: 0, dt: 1 / 120, items: [], projs: [], solids: [], hazards: [], forces: [], pushers: [],
    climb: [], gravZones: [], discoSolids: [], terrainSolids: [], players: [], ms: {}, gravBase: 1, racing: false, testing: false,
    onDeath: null, onFinish: null,
  };
  const ice = map.mech === 'ice';
  for (const r of map.terrain) {
    const p = r[4] || {};
    const s = { x: r[0] * T, y: r[1] * T, w: r[2] * T, h: r[3] * T + (r[1] + r[3] >= map.h - .01 ? 600 : 0), terrain: true, src: 'terrain' };
    if (p.oneway) s.oneway = true;
    if (p.surf) { s.surf = p.surf; s.conv = p.conv; } else if (ice) s.surf = 'ice';
    if (p.disco) { s.disco = p.disco; W.discoSolids.push(s); continue; }
    W.terrainSolids.push(s);
  }
  // invisible side walls
  W.terrainSolids.push({ x: -200, y: -3000, w: 200, h: map.h * T + 4000, terrain: true, wall: true }, { x: map.w * T, y: -3000, w: 200, h: map.h * T + 4000, terrain: true, wall: true });
  if (map.bridge) for (let x = map.bridge.from; x <= map.bridge.to; x += map.bridge.step) { const it = makeItem('falling', x * T, map.bridge.y * T, 0, -1); it.uid = 'b' + x; it.fixed = true; it.mapOwned = true; W.items.push(it); }
  W.start = { x: map.start[0] * T, y: map.start[1] * T, w: map.start[2] * T, h: map.start[3] * T };
  W.goal = { x: map.goal[0] * T - 14, y: map.goal[1] * T - 78, w: 46, h: 78 };
  W.goalZone = { x: W.goal.x - T, y: W.goal.y - T, w: W.goal.w + 2 * T, h: W.goal.h + T };
  const M = MECH[map.mech]; if (M && M.init) M.init(W);
  return W;
}

function stepWorld(W, dt) {
  W.t += dt; W.dt = dt;
  W.forces = []; W.pushers = []; W.hazards = [];
  updateAttached(W);
  tickItems(W);
  const S = W.terrainSolids.slice();
  for (const it of W.items) {
    const d = ITEMS[it.id];
    if (d.solids) { if (!it._s || it._sx !== it.x || it._sy !== it.y || it._sr !== it.rot) { it._s = staticRects(it, d.solids); it._sx = it.x; it._sy = it.y; it._sr = it.rot; } }
    if (it._s) { if (it.attach) it._s.forEach((s, k) => { s.vx = it._avx; s.vy = it._avy; s.key = it.uid + ':' + k; }); for (const s of it._s) S.push(s); }
    if (it._h) for (const h of it._h) W.hazards.push(h);
  }
  // Player contact rule: during a race each player is a solid others can bump into and stand on
  if (W.rules && W.rules.contact && (W.racing || W.testing) && W.players) for (const p of W.players) if (p.alive && !p.finished && !p.gone)
    { const hd = p.h < PH ? 3 : 9; S.push({ x: p.x + 1, y: p.y - hd, w: p.w - 2, h: p.h + hd, vx: p.vx || 0, vy: 0, pl: p, key: 'pl' + p.idx, src: 'player' }); } // heads are drawn a bit above the hitbox
  W.solids = S;
  const M = MECH[W.map.mech]; if (M && M.tick) M.tick(W);
  updateProjectiles(W, dt);
}

function newPlayer(entry, idx) {
  return { idx, entry, name: entry.name, char: entry.char, hat: entry.hat, color: entry.color, src: entry.input,
    x: 0, y: 0, w: PW, h: PH, vx: 0, vy: 0, onGround: false, ground: null, coyote: 0, buffer: 0, wallDir: 0, wallT: 0, wallSide: 0, wallHoney: false, wallLock: 0,
    facing: 1, alive: true, finished: false, state: 'idle', animT: rand(0, 5), phase: 0, squash: 0, stun: 0, climbing: false, coin: null, deathT: 0, portalCD: 0, scared: 0, blinkT: rand(2, 5), dropT: 0, finishT: 0, airT: 0 };
}
// Random spawns rule: safe standing spots spread around the level, the same on every screen for a given seed.
function seededRand(seed) { let a = (seed >>> 0) || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function randomSpawnSpots(W, seed, n) {
  const rnd = seededRand(seed * 2654435761 + W.map.w * 97 + W.map.h), MW = W.map.w * T;
  const gx = W.goal.x + W.goal.w / 2, gy = W.goal.y + W.goal.h / 2, sx = W.start.x + W.start.w / 2, sy = W.start.y + W.start.h / 2;
  const minGoal = Math.max(8 * T, Math.hypot(gx - sx, gy - sy) * .45); // never start right next to the flag
  const tops = W.solids.filter(s => !s.wall && !s.disco && !s.pl && !(s.vx || s.vy) && !(s.ref && (MOVING_SOLID_ITEMS.has(s.ref.id) || s.ref.id === 'flipper' || s.ref.id === 'falling')) && s.surf !== 'bounce' && s.surf !== 'conv' && s.src !== 'mill' && s.w >= PW + 4);
  const safe = r => {
    if (r.x < 4 || r.x + r.w > MW - 4 || r.y < -4 * T) return false;
    if (W.solids.some(s => !s.oneway && !s.pl && rectsOverlap(r, s))) return false;
    const big = { x: r.x - 1.6 * T, y: r.y - 1.6 * T, w: r.w + 3.2 * T, h: r.h + 3.2 * T };
    if (W.hazards.some(h => shapeHitsRect(h, big))) return false;
    if (W.forces.some(f => f.k === 'rect' ? rectsOverlap(r, f) : Math.hypot(f.x - r.x, f.y - r.y) < f.r + T)) return false;
    if (rectsOverlap(r, W.goalZone) || Math.hypot(r.x - gx, r.y - gy) < minGoal) return false;
    return true;
  };
  const cand = [];
  for (const s of tops) for (let x = s.x + 2; x + PW <= s.x + s.w - 2; x += T * .75) { const r = { x, y: s.y - PH - 1, w: PW, h: PH }; if (safe(r)) cand.push(r); }
  const out = [];
  for (let i = 0; i < n; i++) {
    if (!cand.length) { out.push(null); continue; }
    // pick a random spot, preferring ones away from spots already taken
    let best = null, bd = -1;
    for (let k = 0; k < 6; k++) { const c = cand[Math.floor(rnd() * cand.length)]; const d = out.reduce((m, o) => o ? Math.min(m, Math.hypot(o.x - c.x, o.y - c.y)) : m, 1e9); if (d > bd) { bd = d; best = c; } }
    out.push({ x: best.x, y: best.y });
  }
  return out;
}
function spawnPlayers(W, list) {
  const n = list.length, S = W.start;
  list.forEach((p, i) => {
    p.x = S.x + (S.w - PW) * (n === 1 ? .5 : i / (n - 1)); p.y = S.y + S.h - PH - 1;
    const rs = W.spawnSpots && W.spawnSpots[p.idx]; if (rs) { p.x = rs.x; p.y = rs.y; }
    p.vx = p.vy = 0; p.alive = true; p.finished = false; p.climbing = false; p.coin = null; p.stun = 0; p.state = 'idle'; p.deathT = 0; p.facing = 1; p.squash = 0; p.onGround = false; p.ground = null; p.wallT = 0; p.portalCD = 0;
    // drop onto the start platform
    if (!rs) for (let k = 0; k < 200; k++) { if (W.terrainSolids.some(s => !s.wall && rectsOverlap({ x: p.x, y: p.y + 1, w: p.w, h: p.h }, s))) break; p.y += 2; if (p.y > S.y + S.h + 6 * T) { p.y = S.y + S.h - PH - 1; break; } }
    if (W.view) W.view.onSpawn(p);
  });
}
const approach = (v, t, a) => v < t ? Math.min(v + a, t) : Math.max(v - a, t);

// quiet = show the death but don't report it (used for other online players, whose own game reports it)
function killPlayer(W, p, cause, quiet) {
  if (!p.alive || p.finished) return;
  p.alive = false; p.deathT = 0; p.killedBy = cause.owner; p.deathSrc = cause.src;
  if (p.coin) { p.coin.st.taken = false; p.coin = null; }
  const C = CHARS[p.char] || CHARS.horse;
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
  FX.burst(cx, cy, 14, { color: [C.body, C.belly || C.body, '#ffffff'], kind: 'feather', g: 140, smin: 80, smax: 300, lmin: .8, lmax: 1.6, rmin: 3, rmax: 6 });
  FX.burst(cx, cy, 8, { color: 'rgba(255,255,255,.9)', kind: 'puff', g: -30, smin: 20, smax: 90, rmin: 6, rmax: 12 });
  FX.text(cx, cy - 20, cause.water ? 'SPLASH!' : pick(['POP!', 'POOF!', 'BONK!', 'YIKES!']), '#fff');
  Audio2.sfx(cause.water ? 'splash' : 'death');
  if (W.view) W.view.onDeath(p, cause);
  if (W.onDeath && !quiet) W.onDeath(p, cause);
}
function finishPlayer(W, p, quiet) {
  if (p.finished || !p.alive) return;
  p.finished = true; p.finishT = 0; p.vx = p.vy = 0; p.state = 'dance';
  FX.burst(p.x + p.w / 2, p.y, 22, { color: ['#ffd34d', '#ff5fa2', '#5fc8ff', '#7ae07a'], kind: 'star', g: 300, smin: 120, smax: 380 });
  Audio2.sfx('goal');
  if (W.view) W.view.onFinish(p);
  if (W.onFinish && !quiet) W.onFinish(p);
}

// ---------- Placement validation ----------
function placementCheck(W, it, opts = {}) {
  const d = ITEMS[it.id], box = itemBox(it), core = itemCore(it);
  const MW = W.map.w * T, MH = W.map.h * T;
  if (box.x < 0 || box.x + box.w > MW || box.y < -6 * T || box.y + box.h > MH) return { ok: false, why: 'Outside the map' };
  if (d.instant) return { ok: true };
  const pad = { x: W.start.x - 6, y: W.start.y - 2 * T, w: W.start.w + 12, h: W.start.h + 2 * T };
  if (rectsOverlap(box, pad)) return { ok: false, why: 'Too close to the start' };
  if (rectsOverlap(box, W.goalZone)) return { ok: false, why: 'Too close to the flag' };
  const att = opts.attach !== undefined ? opts.attach : findAttach(W, it);
  if (W.map.mech === 'mill' && !(att && att.k === 'mill')) { const hx = 28 * T, hy = 9 * T; const nx = clamp(hx, box.x, box.x + box.w), ny = clamp(hy, box.y, box.y + box.h); const dmin = Math.hypot(nx - hx, ny - hy); const dmax = Math.max(...[[box.x, box.y], [box.x + box.w, box.y], [box.x, box.y + box.h], [box.x + box.w, box.y + box.h]].map(([x, y]) => Math.hypot(x - hx, y - hy))); if (dmin < 7.8 * T && dmax > 4.2 * T) return { ok: false, why: 'In the way of the sails — put it right on a sail to ride along!' }; }
  if (opts.allowOverlap || W.rules.allowOverlap) return { ok: true, attach: att };
  const shrink = { x: core.x + 1, y: core.y + 1, w: core.w - 2, h: core.h - 2 };
  for (const s of W.terrainSolids.concat(W.discoSolids)) if (!s.wall && rectsOverlap(shrink, s)) return { ok: false, why: 'Overlaps the level' };
  for (const o of W.items) if (o !== it && o.uid !== it.uid && !(att && att.k === 'item' && o.uid === att.uid) && rectsOverlap(shrink, itemCore(o))) return { ok: false, why: 'Overlaps another item' };
  return { ok: true, attach: att };
}
function explodeBomb(W, x, y) {
  let n = 0;
  W.items = W.items.filter(o => { if (o.fixed) return true; const b = itemBox(o); if (rectCircle(b, { x, y, r: BOMB_RADIUS })) { n++; FX.burst(b.x + b.w / 2, b.y + b.h / 2, 10, { color: ['#b07a45', '#888', '#ffd34d'], smax: 380 }); return false; } return true; });
  FX.burst(x, y, 30, { color: ['#ffb62e', '#ff5a2a', '#fff3a0'], smax: 480, rmin: 4, rmax: 10 });
  FX.burst(x, y, 14, { color: 'rgba(80,80,80,.7)', kind: 'puff', g: -60, smax: 160, rmin: 10, rmax: 22, lmax: 1.4 });
  FX.text(x, y - 30, 'KABOOM!', '#ffd34d');
  Audio2.sfx('boom'); if (W.view) { W.view.shake(14); W.view.syncItems(); }
  return n;
}


// ---------- items riding on moving things (windmill sails, moving platforms) ----------
// An item placed touching a moving platform sticks to it: it.attach = {k:'mill', i} or {k:'item', uid}
// plus its offset (ox, oy) from the platform, and follows it every tick.
const NO_ATTACH = new Set(['mover', 'portal', 'bomb', 'windmill', 'swing', 'flipper']);
const HOST_ITEMS = new Set(['mover', 'windmill', 'swing']); // items whose moving platforms carry other items
function attachHosts(W) {
  const out = [];
  if (W.map.mech === 'mill') for (let i = 0; i < 4; i++) out.push({ a: { k: 'mill', i }, s: millSail(W, i) });
  for (const h of W.items) if (HOST_ITEMS.has(h.id)) { ITEMS[h.id].dyn(h, W); h._s.forEach((s, si) => out.push({ a: si ? { k: 'item', uid: h.uid, si } : { k: 'item', uid: h.uid }, s })); }
  return out;
}
function hostSolid(W, a) {
  if (!a) return null;
  if (a.k === 'mill') return W.map.mech === 'mill' && a.i >= 0 && a.i < 4 ? millSail(W, a.i | 0) : null;
  const h = W.items.find(i => i.uid === a.uid && HOST_ITEMS.has(i.id)); if (!h) return null;
  ITEMS[h.id].dyn(h, W); return h._s[a.si | 0] || null;
}
function findAttach(W, it) {
  if (NO_ATTACH.has(it.id)) return null;
  const b = itemBox(it), m = 5;
  for (const H of attachHosts(W)) {
    const s = H.s;
    if (b.x < s.x + s.w + m && b.x + b.w > s.x - m && b.y < s.y + s.h + m && b.y + b.h > s.y - m) return Object.assign({}, H.a, { ox: Math.round(it.x - s.x), oy: Math.round(it.y - s.y) });
  }
  return null;
}
function cleanAttach(a) {
  if (!a || typeof a !== 'object') return null;
  const ox = +a.ox, oy = +a.oy; if (!isFinite(ox) || !isFinite(oy) || Math.abs(ox) > 400 || Math.abs(oy) > 400) return null;
  if (a.k === 'mill' && Number.isInteger(a.i) && a.i >= 0 && a.i < 4) return { k: 'mill', i: a.i, ox, oy };
  if (a.k === 'item' && typeof a.uid === 'string' && a.uid.length < 40) { const o = { k: 'item', uid: a.uid, ox, oy }; if (Number.isInteger(a.si) && a.si > 0 && a.si < 4) o.si = a.si; return o; }
  return null;
}
function updateAttached(W) {
  for (const it of W.items) {
    if (!it.attach) continue;
    const s = hostSolid(W, it.attach); if (!s) { it.attach = null; it._avx = it._avy = 0; continue; }
    it.x = s.x + it.attach.ox; it.y = s.y + it.attach.oy; it._avx = s.vx || 0; it._avy = s.vy || 0;
  }
}
// Level item lists: [id, x, y, rot, attach?] — a moving-platform host is stored by its index in the list.
function itemsToList(items) {
  const list = items.filter(i => !i.mapOwned);
  return list.map(i => { const r = [i.id, Math.round(i.x), Math.round(i.y), i.rot]; if (i.attach) { const a = Object.assign({}, i.attach); if (a.k === 'item') { a.n = list.findIndex(h => h.uid === a.uid); delete a.uid; } if (a.k === 'mill' || a.n >= 0) r.push(a); } return r; });
}
function itemsFromList(list, prefix) {
  const out = list.map((c, i) => { const it = makeItem(c[0], c[1], c[2], c[3], -1); if (prefix) it.uid = prefix + i; return it; });
  list.forEach((c, i) => { const a = c[4]; if (!a || typeof a !== 'object') return; const b = Object.assign({}, a); if (b.k === 'item') { const h = out[b.n]; if (!h) return; b.uid = h.uid; delete b.n; } const ok = cleanAttach(b); if (ok) out[i].attach = ok; });
  return out;
}
