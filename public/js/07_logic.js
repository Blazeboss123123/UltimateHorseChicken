// ===================== LOGIC WORLD (the game model; Phaser renders it and runs player physics) =====================
const PHYS = { run: 250, accG: 2600, decG: 3000, accA: 1700, decA: 700, grav: 1900, jumpV: 610, maxFall: 820, coyote: .13, buffer: .16, wallSlide: 110, wallJumpX: 330, climbX: 180, climbV: .82, climbLock: .07, climbHold: .12, pushK: .2, holePull: 300, holeLift: 1, lowJumpMul: 2.1, minJump: .1 };
const PW = 22, PH = 28;

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
  tickItems(W);
  const S = W.terrainSolids.slice();
  for (const it of W.items) {
    const d = ITEMS[it.id];
    if (d.solids) { if (!it._s || it._sx !== it.x || it._sy !== it.y || it._sr !== it.rot) { it._s = staticRects(it, d.solids); it._sx = it.x; it._sy = it.y; it._sr = it.rot; } }
    if (it._s) for (const s of it._s) S.push(s);
    if (it._h) for (const h of it._h) W.hazards.push(h);
  }
  W.solids = S;
  const M = MECH[W.map.mech]; if (M && M.tick) M.tick(W);
  updateProjectiles(W, dt);
}

function newPlayer(entry, idx) {
  return { idx, entry, name: entry.name, char: entry.char, hat: entry.hat, color: entry.color, src: entry.input,
    x: 0, y: 0, w: PW, h: PH, vx: 0, vy: 0, onGround: false, ground: null, coyote: 0, buffer: 0, wallDir: 0, wallT: 0, wallSide: 0, wallHoney: false, wallLock: 0,
    facing: 1, alive: true, finished: false, state: 'idle', animT: rand(0, 5), phase: 0, squash: 0, stun: 0, climbing: false, coin: null, deathT: 0, portalCD: 0, scared: 0, blinkT: rand(2, 5), dropT: 0, finishT: 0, airT: 0 };
}
function spawnPlayers(W, list) {
  const n = list.length, S = W.start;
  list.forEach((p, i) => {
    p.x = S.x + (S.w - PW) * (n === 1 ? .5 : i / (n - 1)); p.y = S.y + S.h - PH - 1;
    p.vx = p.vy = 0; p.alive = true; p.finished = false; p.climbing = false; p.coin = null; p.stun = 0; p.state = 'idle'; p.deathT = 0; p.facing = 1; p.squash = 0; p.onGround = false; p.ground = null; p.wallT = 0; p.portalCD = 0;
    // drop onto the start platform
    for (let k = 0; k < 200; k++) { if (W.terrainSolids.some(s => !s.wall && rectsOverlap({ x: p.x, y: p.y + 1, w: p.w, h: p.h }, s))) break; p.y += 2; if (p.y > S.y + S.h + 6 * T) { p.y = S.y + S.h - PH - 1; break; } }
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
  if (W.map.mech === 'mill') { const hx = 28 * T, hy = 9 * T; const nx = clamp(hx, box.x, box.x + box.w), ny = clamp(hy, box.y, box.y + box.h); const dmin = Math.hypot(nx - hx, ny - hy); const dmax = Math.max(...[[box.x, box.y], [box.x + box.w, box.y], [box.x, box.y + box.h], [box.x + box.w, box.y + box.h]].map(([x, y]) => Math.hypot(x - hx, y - hy))); if (dmin < 7.8 * T && dmax > 4.2 * T) return { ok: false, why: 'Blocks the windmill sails' }; }
  if (opts.allowOverlap || W.rules.allowOverlap) return { ok: true };
  const shrink = { x: core.x + 1, y: core.y + 1, w: core.w - 2, h: core.h - 2 };
  for (const s of W.terrainSolids.concat(W.discoSolids)) if (!s.wall && rectsOverlap(shrink, s)) return { ok: false, why: 'Overlaps the level' };
  for (const o of W.items) if (o !== it && o.uid !== it.uid && rectsOverlap(shrink, itemCore(o))) return { ok: false, why: 'Overlaps another item' };
  return { ok: true };
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

