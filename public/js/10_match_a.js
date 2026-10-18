// ===================== SESSION (players in this lobby) =====================
const Session = {
  roster: [], // { id, name, char, hat, color, colorIdx, input, slot, conn, ready }
  mode: 'party', mapId: 'farm',
  addLocal(input) {
    if (this.roster.length >= 8) { toast('Lobby is full (8 players)'); return null; }
    if (this.roster.some(r => r.input === input)) return null;
    const used = new Set(this.roster.map(r => r.colorIdx)); let ci = 0; while (used.has(ci)) ci++;
    const usedSlots = new Set(this.roster.map(r => r.slot)); let slot = 0; while (usedSlots.has(slot) && slot < 3) slot++;
    const sv = Save.data.slots[slot] || Save.data.slots[0];
    const e = { id: uid(), name: sv.name, char: sv.char, hat: sv.hat, colorIdx: ci, color: PLAYER_COLORS[ci], input, slot, conn: 'local', ready: true };
    if (this.roster.some(r => r.name === e.name)) e.name = 'Player ' + (this.roster.length + 1);
    this.roster.push(e);
    if (input === 'kb2') Input.kb2Active = true;
    return e;
  },
  remove(e) { this.roster = this.roster.filter(r => r !== e); Input.kb2Active = this.roster.some(r => r.input === 'kb2'); },
  host() { return this.roster[0]; },
  persist(e) { const s = Save.data.slots[e.slot]; if (s) { s.name = e.name; s.char = e.char; s.hat = e.hat; Save.write(); } },
};

function weightOf(id) { if (id === 'coin' && !Save.data.rules.coins) return 0; const w = Save.data.weights[id]; return w == null ? ITEMS[id].weight : w; }
function rollItems(n) {
  const pool = ITEM_ORDER.filter(id => weightOf(id) > 0);
  if (!pool.length) return Array(n).fill('plank');
  const total = pool.reduce((a, id) => a + weightOf(id), 0), out = [];
  for (let i = 0; i < n; i++) {
    let r = Math.random() * total, id = pool[0];
    for (const k of pool) { r -= weightOf(k); if (r <= 0) { id = k; break; } }
    if (id === 'coin' && out.includes('coin')) { i--; continue; }
    out.push(id);
  }
  if (n >= 3 && !out.some(id => ITEMS[id].cat === 'block')) out[0] = pick(pool.filter(id => ITEMS[id].cat === 'block')) || 'plank';
  return out;
}

// ---------- build-cursor helpers (shared by Party build phase and the editor) ----------
function moveCursor(c, inp, dt, useMouse, rig) {
  if (useMouse && Input.mouse.moved && Input.mouse.inside) { const [wx, wy] = rig.toWorld(Input.mouse.x, Input.mouse.y); c.cx = wx; c.cy = wy; c.mouse = true; return; }
  const step = Save.data.settings.grid ? T / 2 : 4;
  const analog = inp.ix && Math.abs(inp.ix) < .99 || inp.iy && Math.abs(inp.iy) < .99;
  const dx = inp.ix, dy = inp.iy;
  if (!dx && !dy) { c.holdT = 0; return; }
  c.mouse = false;
  if (analog) { const sp = inp.fine ? 140 : 640; c.cx += dx * sp * dt; c.cy += dy * sp * dt; return; }
  if (inp.pressed.left || inp.pressed.right || inp.pressed.up || inp.pressed.down) { c.cx += dx * (inp.fine ? 2 : step); c.cy += dy * (inp.fine ? 2 : step); c.holdT = 0; return; }
  c.holdT += dt; if (c.holdT > .22) { const sp = inp.fine ? 90 : 560; c.cx += dx * sp * dt; c.cy += dy * sp * dt; }
}
function cursorItem(W, c) {
  const d = ITEMS[c.id]; const [w, h] = rotSize(d.w * T, d.h * T, c.rot);
  const g = Save.data.settings.grid && !c.fine ? T / 2 : 2;
  c.cx = clamp(c.cx, 0, W.map.w * T); c.cy = clamp(c.cy, -6 * T, W.map.h * T);
  const x = Math.round((c.cx - w / 2) / g) * g, y = Math.round((c.cy - h / 2) / g) * g;
  return { uid: 'preview', id: c.id, x, y, rot: c.rot, owner: c.pi, st: {}, ph: 0 };
}
function nextRot(id, r) { const d = ITEMS[id]; if (d.rot === 'none') return 0; if (d.rot === 'flip') return r === 0 ? 2 : 0; return (r + 1) & 3; }
function drawOffscreenIndicators(ctx, rig, players) {
  if (!Save.data.settings.indicators) return;
  const m = 26;
  for (const p of players) {
    if (!p.alive || p.finished) continue;
    const [sx, sy] = rig.toScreen(p.x + p.w / 2, p.y + p.h / 2);
    if (sx > 0 && sx < rig.sw && sy > 0 && sy < rig.shH) continue;
    const cx = clamp(sx, m, rig.sw - m), cy = clamp(sy, m, rig.shH - m), a = Math.atan2(sy - cy, sx - cx);
    poly(ctx, [[cx + Math.cos(a) * 24, cy + Math.sin(a) * 24], [cx + Math.cos(a + 2.4) * 14, cy + Math.sin(a + 2.4) * 14], [cx + Math.cos(a - 2.4) * 14, cy + Math.sin(a - 2.4) * 14]], p.color, 2);
    hudPortrait(ctx, cx - Math.cos(a) * 4, cy - Math.sin(a) * 4, 15, p.entry);
  }
}

// ===================== MATCH (Party & Creative) =====================
const Match = {
  M: null,
  start(scene, mode, mapId, custom) {
    const map = MAP_BY_ID[mapId], rules = Save.data.rules;
    const W = createWorld(map, rules);
    if (custom && custom.items) for (const c of custom.items) { const it = makeItem(c[0], c[1], c[2], c[3], -1); it.fixed = true; W.items.push(it); }
    const players = Session.roster.map((e, i) => newPlayer(e, i));
    W.players = players;
    stepWorld(W, 0);
    const view = new WorldView(scene, W);
    spawnPlayers(W, players);
    view.setPlayers(players);
    const M = this.M = {
      W, view, scene, rig: scene.rig, mode, map, rules, players, round: 0, phase: 'intro', timer: 2.2, scores: players.map(() => ({ total: 0, segs: [] })),
      order: [], box: [], hands: players.map(() => []), turn: 0, picker: null, pickCursor: 0, placing: null, undoT: 0, lastPlaced: null,
      raceT: 0, countdown: 0, finishOrder: [], deaths: [], coinsGot: [], roundAward: null, resultsT: 0, banner: null, winners: null, msg: null,
      t: 0, custom, preview: new Preview(view), boxRects: null,
    };
    W.onDeath = (p, cause) => this.onDeath(p, cause);
    W.onFinish = p => this.onFinish(p);
    players.forEach(p => this.hide(p));
    fitWholeMap(M.rig, W, true);
    Audio2.play('build');
    Save.data.recent = [mapId].concat(Save.data.recent.filter(m => m !== mapId)).slice(0, 3); Save.write();
    if (players.length === 1) toast('Solo practice — friends can join from the lobby couch!');
  },
  hide(p) { p.alive = false; p.deathT = 9; if (p.body) p.body.enable = false; if (p.spr) p.spr.setVisible(false); if (p.tag) p.tag.setVisible(false); },
  computeOrder() {
    const M = this.M, n = M.players.length, R = M.rules;
    let o = [...Array(n).keys()];
    if (R.order === 'shuffle') shuffle(o); else if (R.order === 'rotate') o = o.map((_, i) => (i + M.round - 1) % n);
    M.order = o;
  },
  beginRound() {
    const M = this.M; M.round++;
    this.computeOrder();
    M.hands = M.players.map(() => []);
    M.W.projs = []; for (const it of M.W.items) it.st = {};
    M.players.forEach(p => { this.hide(p); p.finished = false; });
    const R = M.rules;
    if (R.assign === 'random' && M.mode === 'party') { for (const pi of M.order) M.hands[pi] = rollItems(R.perPlayer); M.phase = 'dealt'; M.timer = 2.4; Audio2.sfx('pick'); }
    else {
      M.box = M.mode === 'creative' ? ITEM_ORDER.filter(id => weightOf(id) > 0).map(id => ({ id, by: -1 })) : rollItems(M.players.length * R.perPlayer + R.extraItems).map(id => ({ id, by: -1 }));
      M.turn = 0; M.phase = 'pick'; M.timer = R.pickTime; M.pickCursor = 0; this.nextPicker(true);
    }
    Audio2.play('build');
  },
  pickSeq() { const M = this.M; const seq = []; for (let k = 0; k < M.rules.perPlayer; k++) seq.push(...(k % 2 ? M.order.slice().reverse() : M.order)); return seq; },
  nextPicker(first) {
    const M = this.M, seq = this.pickSeq();
    if (!first) M.turn++;
    if (M.turn >= seq.length) { this.beginBuild(); return; }
    M.picker = seq[M.turn]; M.timer = M.rules.pickTime;
    const free = M.box.findIndex(b => b.by < 0); M.pickCursor = Math.max(0, free);
  },
  doPick(pi, boxIdx) {
    const M = this.M; if (!M || M.phase !== 'pick') return; const b = M.box[boxIdx];
    if (!b || (b.by >= 0 && M.mode !== 'creative') || M.picker !== pi) return;
    if (M.mode !== 'creative') b.by = pi;
    M.hands[pi].push(b.id); Audio2.sfx('pick');
    this.nextPicker(false);
  },
  beginBuild() {
    const M = this.M; M.phase = 'build'; M.turn = 0;
    const used = M.players.map(() => 0);
    M.buildSeq = this.pickSeq().map(pi => ({ pi, id: M.hands[pi][used[pi]++] })).filter(s => s.id);
    this.nextPlacer(true);
  },
  nextPlacer(first) {
    const M = this.M;
    if (!first) M.turn++;
    M.preview.hide();
    if (M.turn >= M.buildSeq.length) { this.beginRace(); return; }
    const s = M.buildSeq[M.turn], prev = M.placing;
    M.placing = { pi: s.pi, id: s.id, rot: 0, cx: prev ? prev.cx : M.map.w * T / 2, cy: prev ? prev.cy : M.map.h * T / 2, holdT: 0, valid: null };
    M.timer = M.rules.buildTime; M.undoT = 0; M.lastPlaced = null;
  },
  applyPlace(a) {
    const M = this.M; if (!M || M.phase !== 'build' || !M.placing || M.placing.pi !== a.pi || M.placing.done) return;
    const it = makeItem(a.id, a.x, a.y, a.rot, a.pi);
    const chk = placementCheck(M.W, it);
    if (!chk.ok) { Audio2.sfx('bad'); M.msg = { s: chk.why, t: 1.4 }; return; }
    if (ITEMS[a.id].instant) { const b = itemBox(it); Save.data.stats.bombs += explodeBomb(M.W, b.x + b.w / 2, b.y + b.h / 2); M.lastPlaced = null; this.nextPlacer(false); return; }
    M.W.items.push(it); M.lastPlaced = it; stepWorld(M.W, 0); M.view.addItem(it);
    Save.data.stats.placed++;
    Audio2.sfx('place'); const b = itemBox(it); FX.burst(b.x + b.w / 2, b.y + b.h, 10, { color: '#ffffff', kind: 'puff', g: -20, smin: 30, smax: 120 }); M.view.shake(3);
    M.preview.hide();
    if (M.rules.allowUndo) { M.undoT = 1.6; M.placing.done = true; } else this.nextPlacer(false);
  },
  undo() {
    const M = this.M; if (!M.lastPlaced || M.undoT <= 0) return;
    M.view.removeItem(M.lastPlaced); M.W.items = M.W.items.filter(i => i !== M.lastPlaced); M.lastPlaced = null; M.undoT = 0; M.placing.done = false; M.timer = Math.max(M.timer, 6);
    Audio2.sfx('click'); Save.data.stats.placed--;
  },
  beginRace() {
    const M = this.M, W = M.W;
    M.phase = 'race'; M.countdown = 3.2; M.raceT = M.rules.raceTime; M.finishOrder = []; M.deaths = []; M.coinsGot = []; M.endT = 0; M.placing = null; M.goT = 0;
    W.t = 0; W.projs = []; for (const it of W.items) it.st = {};
    M.preview.hide();
    spawnPlayers(W, M.players);
    M.players.forEach(p => { p.alive = true; p.finished = false; p.deathT = 0; p.state = 'idle'; });
    Audio2.play('race'); Audio2.sfx('beep'); M.lastBeep = 3;
  },
  onDeath(p, cause) { const M = this.M; if (!M) return; M.deaths.push({ v: p.idx, owner: cause.owner }); Save.data.stats.deaths++; },
  onFinish(p) {
    const M = this.M; if (!M) return;
    M.finishOrder.push(p.idx);
    if (p.coin) { M.coinsGot.push(p.idx); M.view.removeItem(p.coin); M.W.items = M.W.items.filter(i => i !== p.coin); p.coin = null; Save.data.stats.coins++; FX.text(p.x, p.y - 40, '+ACORN', '#ffd34d'); }
    Save.data.stats.finishes++;
    if (M.finishOrder.length === 1 && M.players.length > 1) FX.text(p.x + p.w / 2, p.y - 60, 'FIRST!', '#ffd34d');
  },
  computeAwards() {
    const M = this.M, R = M.rules, n = M.players.length, F = M.finishOrder.length;
    const aw = M.players.map(() => []);
    let status = 'ok';
    if (n >= 2 && R.tooEasy && F === n) status = 'easy';
    if (F === 0) status = 'hard';
    if (status === 'ok') {
      const totals = M.scores.map(s => s.total), minT = Math.min(...totals), lows = totals.filter(t => t === minT).length;
      for (const i of M.finishOrder) {
        aw[i].push({ k: 'finish', pts: R.ptsFinish, label: 'Finish' });
        if (F > 1 && M.finishOrder[0] === i) { aw[i].push({ k: 'first', pts: R.ptsFirst, label: 'First' }); Save.data.stats.firsts++; }
        if (F === 1 && n >= 2) { aw[i].push({ k: 'solo', pts: R.ptsSolo, label: 'Solo' }); Save.data.stats.solos++; }
        if (M.coinsGot.includes(i)) aw[i].push({ k: 'coin', pts: R.ptsCoin, label: 'Acorn' });
        if (n >= 2 && totals[i] === minT && lows === 1 && Math.max(...totals) > minT) { aw[i].push({ k: 'underdog', pts: R.ptsUnderdog, label: 'Underdog' }); Save.data.stats.underdogs++; }
      }
      const trapCount = M.players.map(() => 0);
      for (const d of M.deaths) if (d.owner >= 0 && d.owner !== d.v && d.owner < n) trapCount[d.owner]++;
      trapCount.forEach((c, i) => { c = Math.min(c, 3); if (c) { aw[i].push({ k: 'trap', pts: R.ptsTrap * c, label: 'Trap ×' + c }); Save.data.stats.traps += c; } });
    }
    let xp = 0;
    aw.forEach((list, i) => { const h = R.handicap[i] == null ? 1 : R.handicap[i]; for (const a of list) { a.pts = Math.round(a.pts * h); xp += a.pts; } });
    M.roundAward = { status, aw, before: M.scores.map(s => s.total) };
    aw.forEach((list, i) => { for (const a of list) { M.scores[i].total += a.pts; M.scores[i].segs.push({ k: a.k, pts: a.pts, round: M.round }); } });
    Save.data.stats.rounds++; Save.data.stats.xp += xp + 10;
    if (status === 'easy') { M.banner = { s: 'TOO EASY!', sub: 'Everyone made it — no points', t: 2.5 }; Audio2.sfx('toohard'); }
    else if (status === 'hard') { M.banner = { s: 'TOO HARD!', sub: 'Nobody made it — no points', t: 2.5 }; Audio2.sfx('toohard'); }
    else Audio2.sfx('win');
    Progress.check(); Save.write();
  },
  endRace() { const M = this.M; M.phase = 'results'; M.resultsT = 0; M.W.racing = false; this.computeAwards(); Audio2.play('results'); },
  afterResults() {
    const M = this.M, R = M.rules;
    const top = Math.max(...M.scores.map(s => s.total));
    if (top >= R.winScore || (R.roundLimit > 0 && M.round >= R.roundLimit)) {
      M.phase = 'podium'; M.resultsT = 0;
      M.winners = M.scores.map((s, i) => s.total === top ? i : -1).filter(i => i >= 0);
      Save.data.stats.matches++; if (top > 0) Save.data.stats.wins++;
      Progress.check(); Save.write(); Audio2.sfx('win');
      // winners dance where they finished; everyone else reappears at the start
      for (const p of M.players) { if (M.winners.includes(p.idx)) { if (!p.finished) { spawnPlayers(M.W, [p]); } p.alive = true; p.finished = true; p.spr.setVisible(true).setAlpha(1); p.body.enable = false; } }
      return;
    }
    this.beginRound();
  },
};
Net.on('pick', a => Match.doPick(a.pi, a.box));
Net.on('place', a => Match.applyPlace(a));
