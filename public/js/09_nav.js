// ===================== REACHABILITY (used to build fair Challenge courses) =====================
// A conservative tile-grid check: if this finds a path, a real player can definitely make it.
const NAV_TIMING = new Set(['crossbow', 'cannon', 'flame', 'laser', 'puncher', 'fan']);
function navGrid(W) {
  const cols = W.map.w, top = 6, rows = W.map.h + top + 1;
  const solid = new Uint8Array(cols * rows), sup = new Uint8Array(cols * rows), haz = new Uint8Array(cols * rows);
  const mark = (arr, x0, y0, x1, y1) => { const c0 = Math.max(0, Math.floor(x0 / T)), c1 = Math.min(cols - 1, Math.floor((x1 - .01) / T)), r0 = Math.max(0, Math.floor(y0 / T) + top), r1 = Math.min(rows - 1, Math.floor((y1 - .01) / T) + top); for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) arr[r * cols + c] = 1; };
  for (const s of W.solids) {
    if (s.wall || s.disco || s.pl || (s.ref && (MOVING_SOLID_ITEMS.has(s.ref.id) || s.ref.id === 'flipper')) || s.src === 'mill') continue;
    if (s.oneway) { mark(sup, s.x + 1, s.y + 1, s.x + s.w - 1, s.y + 2); continue; }
    mark(solid, s.x + 1, s.y + 1, s.x + s.w - 1, s.y + s.h - 1); mark(sup, s.x + 1, s.y + 1, s.x + s.w - 1, s.y + s.h - 1);
  }
  for (const it of W.items) {
    const d = ITEMS[it.id]; if (NAV_TIMING.has(it.id) || d.cat !== 'hazard') continue;
    const b = itemBox(it);
    if (it.id === 'sawarm') { const cx = b.x + b.w / 2, cy = b.y + b.h / 2, r = 2.75 * T; mark(haz, cx - r, cy - r, cx + r, cy + r); }
    else if (it.id === 'pendulum') mark(haz, b.x - 8, b.y, b.x + b.w + 8, b.y + b.h + 8);
    else if (it.id === 'blackhole') mark(haz, b.x - 3.2 * T, b.y - 3.2 * T, b.x + b.w + 3.2 * T, b.y + b.h + 4 * T); // the pull is inescapable this close
    else mark(haz, b.x - 6, b.y - 6, b.x + b.w + 6, b.y + b.h + 6);
  }
  if (W.map.mech === 'lava' || W.map.mech === 'tide') mark(haz, 0, 26.5 * T, cols * T, (W.map.h + 1) * T);
  const blocked = new Uint8Array(cols * rows); for (let i = 0; i < blocked.length; i++) blocked[i] = solid[i] | haz[i];
  // 2D prefix sums for O(1) "is this rectangle clear?" checks
  const ps = new Int32Array((cols + 1) * (rows + 1));
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) ps[(r + 1) * (cols + 1) + c + 1] = blocked[r * cols + c] + ps[r * (cols + 1) + c + 1] + ps[(r + 1) * (cols + 1) + c] - ps[r * (cols + 1) + c];
  const clear = (c0, r0, c1, r1) => { if (c0 < 0 || r0 < 0 || c1 >= cols || r1 >= rows) return false; return ps[(r1 + 1) * (cols + 1) + c1 + 1] - ps[r0 * (cols + 1) + c1 + 1] - ps[(r1 + 1) * (cols + 1) + c0] + ps[r0 * (cols + 1) + c0] === 0; };
  const stand = new Uint8Array(cols * rows);
  for (let r = 1; r < rows - 1; r++) for (let c = 0; c < cols; c++) { const i = r * cols + c; if (!blocked[i] && !blocked[i - cols] && sup[i + cols] && !haz[i + cols]) stand[i] = 1; }
  return { cols, rows, top, stand, clear };
}
function navSearch(W) {
  const G = navGrid(W), { cols, rows, top, stand, clear } = G;
  const inZone = (c, r, z) => (c + .5) * T > z.x && (c + .5) * T < z.x + z.w && (r - top + .5) * T > z.y - T && (r - top + .5) * T < z.y + z.h + T;
  const dist = new Int32Array(cols * rows).fill(-1), par = new Int32Array(cols * rows).fill(-1), q = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (stand[r * cols + c] && inZone(c, r, W.start)) { dist[r * cols + c] = 0; q.push(r * cols + c); }
  let goal = -1, far = 0, farX = 0; const gx = W.map.goal[0], gy = W.map.goal[1] - 1 + top; const near = [];
  for (let qi = 0; qi < q.length; qi++) {
    const i = q[qi], c = i % cols, r = (i / cols) | 0;
    if (c > farX) { farX = c; far = i; }
    near.push([Math.abs(gx - c) + 1.6 * Math.abs(gy - r), i]);
    if (inZone(c, r, W.goalZone) || (Math.abs(c - W.map.goal[0]) <= 2 && Math.abs(r - top - W.map.goal[1] + 1) <= 1)) { goal = i; break; }
    for (let dx = -4; dx <= 4; dx++) for (let dy = -2; dy <= 8; dy++) {
      if (!dx && !dy) continue;
      if (dy <= 0 && Math.abs(dx) > 3) continue;
      const c2 = c + dx, r2 = r + dy; if (c2 < 0 || c2 >= cols || r2 < 0 || r2 >= rows) continue;
      const j = r2 * cols + c2; if (!stand[j] || dist[j] >= 0) continue;
      const x0 = Math.min(c, c2), x1 = Math.max(c, c2), sg = Math.sign(dx);
      let ok;
      if (dy < 0) ok = clear(c, r2 - 1, c, r) && clear(x0, r2 - 1, x1, r2);            // rise at the source, then move across at the target height
      else if (dy === 0) ok = clear(x0, r - 1, x1, r);
      else ok = dx !== 0 && clear(c, r - 1, c, r) && clear(Math.min(c + sg, c2), r - 1, Math.max(c + sg, c2), r2); // step off, then fall
      if (!ok) continue;
      dist[j] = dist[i] + 1; par[j] = i; q.push(j);
    }
  }
  const path = [];
  if (goal >= 0) { for (let i = goal; i >= 0; i = par[i]) path.push([i % cols, ((i / cols) | 0) - top]); path.reverse(); }
  near.sort((a, b) => a[0] - b[0]);
  return { ok: goal >= 0, path, farX, reach: dist, G, bestD: near.length ? near[0][0] : 1e9, near: near.slice(0, 8).map(n => n[1]) };
}
function navRefresh(W) { const sv = W.t; stepWorld(W, 0); W.t = sv; stepWorld(W, 0); }

// ---------- Challenge generation ----------
const CHALLENGE_CACHE = {};
function buildChallenge(mapId) {
  if (CHALLENGE_CACHE[mapId]) return CHALLENGE_CACHE[mapId];
  const map = MAP_BY_ID[mapId], rng = mulberry(hashStr(mapId) + 1234);
  const R = a => a[Math.floor(rng() * a.length)], ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const W = createWorld(map, DEFAULT_RULES);
  navRefresh(W);
  let res = navSearch(W);
  const bridges = ['plank', 'plank', 'longplank', 'crate', 'bigcrate', 'stairs', 'cloud', 'hay', 'girder'];
  let tries = 0;
  while (!res.ok && tries++ < 1200) {
    // grow from the reachable standing spots closest to the flag
    const cols = res.G.cols, base = R(res.near.length ? res.near : [0]);
    const bc = base % cols, br = ((base / cols) | 0) - res.G.top;
    const gx = map.goal[0], gy = map.goal[1] - 1, dirX = Math.sign(gx - bc) || 1, up = gy < br - 1;
    const id = R(bridges), d = ITEMS[id], rot = id === 'stairs' || id === 'girder' ? R([0, 1]) : 0;
    const [w] = rotSize(d.w, d.h, rot);
    const tx = dirX > 0 ? bc + ri(-1, 3) - (rng() < .3 ? w - 1 : 0) : bc - ri(-1, 3) - w + 1;
    const topRow = br + 1 + (up ? -ri(1, 2) : ri(-1, 2));
    const it = makeItem(id, tx * T, topRow * T, rot, -1); it.fixed = true;
    if (id === 'stairs') it.y = (topRow - 2) * T;
    if (!placementCheck(W, it).ok) continue;
    W.items.push(it); navRefresh(W);
    const r2 = navSearch(W);
    const cnt = x => { let n = 0; for (let i = 0; i < x.reach.length; i++) if (x.reach[i] >= 0) n++; return n; };
    if (r2.ok || r2.bestD < res.bestD - .5 || (W.items.length < 26 && cnt(r2) > cnt(res) + 3 && rng() < .4)) res = r2; else { W.items.pop(); navRefresh(W); }
  }
  // a hazard may not sit on, or shoot into, the start area or the goal
function hazardThreatens(it, Z) {
  const b = itemBox(it), pad = 2 * T;
  if (b.x < Z.x + Z.w + pad && b.x + b.w > Z.x - pad && b.y < Z.y + Z.h + pad && b.y + b.h > Z.y - pad) return true;
  if (!NAV_TIMING.has(it.id)) return false;
  const [dx, dy] = rotDir(1, 0, it.rot), cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  const reach = (it.id === 'laser' || it.id === 'crossbow' || it.id === 'cannon') ? 44 * T : 6 * T;
  if (dx) { if (cy + 1.4 * T < Z.y || cy - 1.4 * T > Z.y + Z.h) return false; const d = dx > 0 ? Z.x - cx : cx - (Z.x + Z.w); return d > -T && d < reach; }
  if (cx + 1.4 * T < Z.x || cx - 1.4 * T > Z.x + Z.w) return false; const d = dy > 0 ? Z.y - cy : cy - (Z.y + Z.h); return d > -T && d < reach;
}
  // sprinkle hazards near (but never fully blocking) the route
  const hazards = ['saw', 'spikes', 'spikeball', 'sawarm', 'crossbow', 'crossbow', 'flame', 'pendulum', 'puncher', 'cannon', 'laser', 'spikes', 'blackhole', 'fan', 'honey', 'ice'];
  let added = 0, ht = 0; const want = 6 + (hashStr(mapId) % 4);
  const startPx = { x: map.start[0] * T, y: map.start[1] * T, w: map.start[2] * T, h: map.start[3] * T };
  while (res.ok && added < want && ht++ < 160) {
    const p = R(res.path); const id = R(hazards), d = ITEMS[id];
    let rot = 0; if (d.rot === 'full') rot = ri(0, 3); else if (d.rot === 'flip') rot = R([0, 2]);
    const it = makeItem(id, (p[0] + ri(-4, 4)) * T, (p[1] + ri(-5, 2)) * T, rot, -1); it.fixed = true; it.ph = rng() * 3;
    if (!placementCheck(W, it).ok || hazardThreatens(it, startPx) || hazardThreatens(it, W.goalZone)) continue;
    W.items.push(it); navRefresh(W);
    const r2 = navSearch(W);
    if (r2.ok) { res = r2; added++; } else { W.items.pop(); navRefresh(W); }
  }
  // par times from the route length
  let len = 0; for (let i = 1; i < res.path.length; i++) len += Math.hypot(res.path[i][0] - res.path[i - 1][0], res.path[i][1] - res.path[i - 1][1]);
  const gold = Math.round((len * T / 210 + 2.2 + added * .4) * 2) / 2;
  const ch = { mapId, ok: res.ok, items: W.items.filter(i => i.fixed && !i.mapOwned).map(i => [i.id, i.x, i.y, i.rot, i.ph || 0]), gold, silver: Math.round(gold * 1.45), bronze: Math.round(gold * 2.2), hazards: added };
  CHALLENGE_CACHE[mapId] = ch; ch._dbg = { near: res.near.map(i => [i % res.G.cols, ((i / res.G.cols) | 0) - res.G.top]), bestD: res.bestD };
  return ch;
}
