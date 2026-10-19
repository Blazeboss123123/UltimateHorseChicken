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
  persist(e) { const s = Save.data.slots[e.slot || 0]; if (s) { s.name = e.name; s.char = e.char; s.hat = e.hat; Save.write(); } if (Net.online && !e.remote) Online.sendLook(e); },
  resetLocal() { this.roster = []; Input.kb2Active = false; this.addLocal('kb1'); },
  local() { return this.roster.find(e => !e.remote); },
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
// Online, every browser simulates the level itself, but only the host's browser decides anything random
// or timed (items, turns, time-outs, when the race ends). Those decisions go out as Net events, which
// every browser (the host included) applies with the same handlers below — so they stay in step.
function mouseUser(e) { return e.input === 'kb1' || e.input === 'any'; }
const Match = {
  M: null,
  start(scene, mode, mapId, custom) {
    const map = MAP_BY_ID[mapId], rules = Net.online && Net.rules ? Net.rules : Save.data.rules;
    const W = createWorld(map, rules);
    if (custom && custom.items) for (const it of itemsFromList(custom.items, 'c')) { it.fixed = true; W.items.push(it); }
    const players = Session.roster.map((e, i) => newPlayer(e, i));
    W.players = players;
    stepWorld(W, 0);
    const view = new WorldView(scene, W);
    spawnPlayers(W, players);
    view.setPlayers(players);
    const M = this.M = {
      W, view, scene, rig: scene.rig, mode, map, rules, players, round: 0, phase: 'intro', timer: 2.2, scores: players.map(() => ({ total: 0, segs: [] })),
      order: [], box: [], hands: players.map(() => []), pickCur: [], builders: null, previews: [],
      raceT: 0, countdown: 0, finishOrder: [], deaths: [], coinsGot: [], roundAward: null, resultsT: 0, banner: null, winners: null, msg: null,
      t: 0, custom, boxRects: null,
      host: !Net.online || Net.isHost, me: players.find(p => !p.entry.remote) || null, done: {}, coinOwner: {}, curT: 0,
    };
    W.onDeath = (p, cause) => this.onDeath(p, cause);
    W.onFinish = p => this.onFinish(p);
    W.onCoin = (p, it) => { if (Net.online) Net.dispatch({ t: 'coin', pi: p.idx, uid: it.uid }); };
    players.forEach(p => this.hide(p));
    fitWholeMap(M.rig, W, true);
    Audio2.play('build');
    Save.data.recent = [mapId].concat(Save.data.recent.filter(m => m !== mapId)).slice(0, 3); Save.write();
    if (players.length === 1 && !Net.online) toast('Solo practice — friends can join from the lobby couch!');
    Online.flushPending();
  },
  hide(p) { p.alive = false; p.deathT = 9; if (p.body) p.body.enable = false; if (p.spr) p.spr.setVisible(false); if (p.tag) p.tag.setVisible(false); },
  // The host makes each timed decision exactly once (guests never do).
  once(key) { const M = this.M; if (!M.host || M.done[key]) return false; M.done[key] = true; return true; },
  active() { return this.M.players.filter(p => !p.gone); },
  // ---------- rounds ----------
  hostRound() {
    const M = this.M, R = M.rules, n = M.players.length, round = M.round + 1;
    let o = [...Array(n).keys()];
    if (R.order === 'shuffle') shuffle(o); else if (R.order === 'rotate') o = o.map((_, i) => (i + round - 1) % n);
    o = o.filter(i => !M.players[i].gone);
    const a = { t: 'round', round, order: o };
    if (R.assign === 'random' && M.mode === 'party') { a.hands = M.players.map(() => []); for (const pi of o) a.hands[pi] = rollItems(R.perPlayer); }
    else a.box = M.mode === 'creative' ? ITEM_ORDER.filter(id => weightOf(id) > 0) : rollItems(o.length * R.perPlayer + R.extraItems);
    Net.dispatch(a);
  },
  applyRound(a) {
    const M = this.M; if (!M || a.round !== M.round + 1) return false;
    M.round = a.round; M.order = a.order.slice(); M.hands = M.players.map((_, i) => ((a.hands && a.hands[i]) || []).slice());
    M.W.projs = []; for (const it of M.W.items) it.st = {}; M.coinOwner = {};
    M.players.forEach(p => { this.hide(p); p.finished = false; p.coin = null; });
    if (a.hands) { M.phase = 'dealt'; M.timer = 2.4; Audio2.sfx('pick'); }
    else { M.box = a.box.map(id => ({ id, by: -1 })); this.startPick(); }
    Audio2.play('build');
    return true;
  },
  // ---------- pick: everyone grabs from the party box at the same time ----------
  needsPick(pi) { const M = this.M, p = M.players[pi]; return !!p && !p.gone && M.order.includes(pi) && M.hands[pi].length < M.rules.perPlayer; },
  freeBoxes() { const M = this.M; return M.box.map((b, i) => (b.by < 0 || M.mode === 'creative') ? i : -1).filter(i => i >= 0); },
  startPick() {
    const M = this.M; M.phase = 'pick'; M.timer = M.rules.pickTime;
    const free = this.freeBoxes(); M.pickCur = M.players.map((p, i) => free.length ? free[(i * 2) % free.length] : 0);
  },
  doPick(pi, boxIdx) {
    const M = this.M; if (!M || M.phase !== 'pick' || !this.needsPick(pi)) return false;
    const b = M.box[boxIdx]; if (!b || (b.by >= 0 && M.mode !== 'creative')) return false;
    if (M.mode !== 'creative') b.by = pi;
    M.hands[pi].push(b.id); Audio2.sfx('pick');
    if (!M.order.some(i => this.needsPick(i)) || !this.freeBoxes().length) this.beginBuild();
    return true;
  },
  autoPick(pi) { const free = this.freeBoxes(); if (free.length) Net.dispatch({ t: 'pick', pi, box: pick(free) }); },
  // ---------- build: everyone places their item(s) at the same time ----------
  beginBuild() {
    const M = this.M; if (M.phase === 'build') return; M.phase = 'build';
    M.timer = M.rules.buildTime * Math.max(1, M.rules.perPlayer); M.allDoneT = null;
    for (const pv of M.previews || []) if (pv) pv.hide();
    M.previews = M.players.map(() => new Preview(M.view));
    M.builders = M.players.map((p, i) => ({ pi: i, queue: (M.hands[i] || []).slice(), n: 0, rot: 0, holdT: 0, valid: null, preview: null, last: null, placedAt: -9, curT: 0,
      cx: M.map.w * T * (.3 + .4 * ((i * 37) % 10) / 10), cy: M.map.h * T * .35 }));
  },
  builderDone(b) { return !b || b.n >= b.queue.length || this.M.players[b.pi].gone; },
  applyPlace(a, from) {
    const M = this.M; if (!M || M.phase !== 'build') return false;
    const B = M.builders[a.pi]; if (!B || this.builderDone(B) || a.n !== B.n || B.queue[B.n] !== a.id) return false;
    const it = makeItem(a.id, a.x, a.y, a.rot, a.pi); if (a.uid) it.uid = a.uid;
    const att = cleanAttach(a.attach); if (att) { const hs = hostSolid(M.W, att); if (hs) { it.attach = att; it.x = hs.x + att.ox; it.y = hs.y + att.oy; } }
    if (!Net.remote) { // the host (or an offline game) checks the spot; guests trust the host
      const chk = placementCheck(M.W, it, att ? { attach: it.attach || null } : {});
      if (!chk.ok) { Audio2.sfx('bad'); if (from) Online.send({ t: 'cast', to: from, m: { t: 'pfail', why: chk.why } }); else M.msg = { s: chk.why, t: 1.4 }; return false; }
      if (!it.attach && chk.attach) { it.attach = chk.attach; a.attach = chk.attach; }
    }
    const local = !M.players[a.pi].entry.remote;
    B.n++; B.placedAt = M.t; M.allDoneT = null;
    if (ITEMS[a.id].instant) { const b = itemBox(it); const n = explodeBomb(M.W, b.x + b.w / 2, b.y + b.h / 2); if (local) Save.data.stats.bombs += n; B.last = null; return true; }
    M.W.items.push(it); B.last = it; stepWorld(M.W, 0); M.view.addItem(it);
    if (local) Save.data.stats.placed++;
    Audio2.sfx('place'); const b = itemBox(it); FX.burst(b.x + b.w / 2, b.y + b.h, 10, { color: '#ffffff', kind: 'puff', g: -20, smin: 30, smax: 120 }); if (local) M.view.shake(3);
    if (M.previews[a.pi]) M.previews[a.pi].hide();
    return true;
  },
  applySkip(a) { const M = this.M; if (!M || M.phase !== 'build') return false; const B = M.builders[a.pi]; if (!B || a.n !== B.n || this.builderDone(B)) return false; B.n++; B.last = null; M.allDoneT = null; if (a.msg) M.msg = { s: a.msg, t: 2 }; return true; },
  undo(a) {
    const M = this.M; if (!M || M.phase !== 'build' || !M.rules.allowUndo) return false;
    const B = M.builders[a.pi]; if (!B || !B.last || a.n !== B.n - 1) return false;
    M.view.removeItem(B.last); M.W.items = M.W.items.filter(i => i !== B.last); B.last = null; B.n--; M.allDoneT = null;
    M.timer = Math.max(M.timer, 6);
    Audio2.sfx('click'); if (!M.players[a.pi].entry.remote) Save.data.stats.placed--;
    return true;
  },
  applyRaceStart(a) { const M = this.M; if (!M || M.phase !== 'build' || a.round !== M.round) return false; this.beginRace(); return true; },
  // ---------- race ----------
  beginRace() {
    const M = this.M, W = M.W;
    M.phase = 'race'; M.countdown = 3.2; M.raceT = M.rules.raceTime; M.finishOrder = []; M.deaths = []; M.coinsGot = []; M.endT = 0; M.builders = null; M.goT = 0; M.coinOwner = {};
    W.t = 0; W.projs = []; for (const it of W.items) it.st = {};
    for (const pv of M.previews || []) if (pv) pv.hide();
    spawnPlayers(W, M.players);
    M.players.forEach(p => { p.alive = !p.gone; p.finished = false; p.deathT = 0; p.state = 'idle'; if (p.gone) this.hide(p); });
    Audio2.play('race'); Audio2.sfx('beep'); M.lastBeep = 3;
  },
  onDeath(p, cause) {
    const M = this.M; if (!M) return;
    Save.data.stats.deaths++;
    if (!Net.online) { M.deaths.push({ v: p.idx, owner: cause.owner }); return; }
    Net.dispatch({ t: 'death', pi: p.idx, owner: cause.owner == null ? -1 : cause.owner, src: String(cause.src || '').slice(0, 40), water: !!cause.water });
  },
  applyDeath(a) {
    const M = this.M; if (!M || M.phase !== 'race') return false; const p = M.players[a.pi]; if (!p) return false;
    M.deaths.push({ v: a.pi, owner: a.owner });
    for (const k in M.coinOwner) if (M.coinOwner[k] === a.pi) delete M.coinOwner[k];
    if (p.entry.remote) { if (p.coin) { p.coin.st.taken = false; p.coin = null; } if (p.alive) killPlayer(M.W, p, { owner: a.owner, src: a.src, water: a.water }, true); }
    return true;
  },
  onFinish(p) {
    const M = this.M; if (!M) return;
    Save.data.stats.finishes++;
    if (Net.online) { Net.dispatch({ t: 'fin', pi: p.idx, coin: p.coin ? p.coin.uid : null }); return; }
    M.finishOrder.push(p.idx);
    if (p.coin) { M.coinsGot.push(p.idx); M.view.removeItem(p.coin); M.W.items = M.W.items.filter(i => i !== p.coin); p.coin = null; Save.data.stats.coins++; FX.text(p.x, p.y - 40, '+ACORN', '#ffd34d'); }
    if (M.finishOrder.length === 1 && M.players.length > 1) FX.text(p.x + p.w / 2, p.y - 60, 'FIRST!', '#ffd34d');
  },
  applyFin(a) {
    const M = this.M; if (!M || M.phase !== 'race') return false; const p = M.players[a.pi];
    if (!p || M.finishOrder.includes(a.pi)) return false;
    M.finishOrder.push(a.pi);
    if (p.entry.remote && !p.finished) { p.alive = true; finishPlayer(M.W, p, true); }
    const it = a.coin && M.W.items.find(i => i.uid === a.coin);
    if (it) { M.coinsGot.push(a.pi); M.view.removeItem(it); M.W.items = M.W.items.filter(i => i !== it); for (const q of M.players) if (q.coin === it) q.coin = null; FX.text(p.x, p.y - 40, '+ACORN', '#ffd34d'); if (!p.entry.remote) Save.data.stats.coins++; }
    else if (!p.entry.remote) p.coin = null;
    if (M.finishOrder.length === 1 && this.active().length > 1) FX.text(p.x + p.w / 2, p.y - 60, 'FIRST!', '#ffd34d');
    return true;
  },
  applyCoin(a) {
    const M = this.M; if (!M || M.phase !== 'race') return false;
    const it = M.W.items.find(i => i.uid === a.uid), p = M.players[a.pi]; if (!it || !p) return false;
    const cur = M.coinOwner[a.uid]; if (cur != null && cur !== a.pi && !Net.remote) return false; // someone else grabbed it first
    M.coinOwner[a.uid] = a.pi; it.st.taken = true;
    for (const q of M.players) if (q !== p && q.coin === it) q.coin = null;
    p.coin = it; return true;
  },
  applyRespawn(a) {
    const M = this.M; if (!M || M.phase !== 'race') return; const p = M.players[a.pi];
    if (!p || !p.entry.remote || p.alive || p.finished) return;
    p.alive = true; p.deathT = 0; spawnPlayers(M.W, [p]); p._pt = null;
  },
  applyGone(a) {
    const M = this.M; if (!M) return false; const p = M.players[a.pi]; if (!p || p.gone) return false;
    p.gone = true; this.hide(p); toast('👋 ' + esc(p.name) + ' left the game'); return true;
  },
  computeAwards() {
    const M = this.M, R = M.rules, n = this.active().length, F = M.finishOrder.length;
    const aw = M.players.map(() => []);
    let status = 'ok';
    if (n >= 2 && R.tooEasy && F >= n) status = 'easy';
    if (F === 0) status = 'hard';
    if (status === 'ok') {
      const totals = M.scores.map(s => s.total), act = M.players.filter(p => !p.gone).map(p => totals[p.idx]), minT = Math.min(...act), lows = act.filter(t => t === minT).length;
      for (const i of M.finishOrder) {
        aw[i].push({ k: 'finish', pts: R.ptsFinish, label: 'Finish' });
        if (F > 1 && M.finishOrder[0] === i) { aw[i].push({ k: 'first', pts: R.ptsFirst, label: 'First' }); if (!M.players[i].entry.remote) Save.data.stats.firsts++; }
        if (F === 1 && n >= 2) { aw[i].push({ k: 'solo', pts: R.ptsSolo, label: 'Solo' }); if (!M.players[i].entry.remote) Save.data.stats.solos++; }
        if (M.coinsGot.includes(i)) aw[i].push({ k: 'coin', pts: R.ptsCoin, label: 'Acorn' });
        if (n >= 2 && totals[i] === minT && lows === 1 && Math.max(...act) > minT) { aw[i].push({ k: 'underdog', pts: R.ptsUnderdog, label: 'Underdog' }); if (!M.players[i].entry.remote) Save.data.stats.underdogs++; }
      }
      const trapCount = M.players.map(() => 0);
      for (const d of M.deaths) if (d.owner >= 0 && d.owner !== d.v && d.owner < M.players.length) trapCount[d.owner]++;
      trapCount.forEach((c, i) => { c = Math.min(c, 3); if (c) { aw[i].push({ k: 'trap', pts: R.ptsTrap * c, label: 'Trap ×' + c }); if (!M.players[i].entry.remote) Save.data.stats.traps += c; } });
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
  applyEndRace(a) {
    const M = this.M; if (!M || M.phase !== 'race') return false;
    M.finishOrder = a.fo.slice(); M.deaths = a.de.slice(); M.coinsGot = a.co.slice();
    this.endRace(); return true;
  },
  endRace() { const M = this.M; M.phase = 'results'; M.resultsT = 0; M.W.racing = false; this.computeAwards(); Audio2.play('results'); },
  hostAfterResults() {
    const M = this.M, R = M.rules;
    const top = Math.max(...M.scores.map(s => s.total));
    if (top >= R.winScore || (R.roundLimit > 0 && M.round >= R.roundLimit)) Net.dispatch({ t: 'podium', round: M.round });
    else this.hostRound();
  },
  applyPodium(a) {
    const M = this.M; if (!M || M.phase !== 'results') return false;
    const top = Math.max(...M.scores.map(s => s.total));
    M.phase = 'podium'; M.resultsT = 0;
    M.winners = M.scores.map((s, i) => s.total === top ? i : -1).filter(i => i >= 0);
    Save.data.stats.matches++; if (M.me ? M.winners.includes(M.me.idx) && top > 0 : top > 0) Save.data.stats.wins++;
    Progress.check(); Save.write(); Audio2.sfx('win');
    // winners dance where they finished; everyone else reappears at the start
    for (const p of M.players) { if (M.winners.includes(p.idx) && !p.gone) { if (!p.finished) { spawnPlayers(M.W, [p]); } p.alive = true; p.finished = true; p.spr.setVisible(true).setAlpha(1); p.body.enable = false; } }
    return true;
  },
};
// Match events (see the note above). Events that arrive before the match scene exists are queued.
Net.on('round', a => Match.applyRound(a));
Net.on('pick', a => Match.doPick(a.pi, a.box));
Net.on('skip', a => Match.applySkip(a));
Net.on('race', a => Match.applyRaceStart(a));
Net.on('build', a => { const M = Match.M; if (!M || M.phase !== 'dealt' || a.round !== M.round) return false; Match.beginBuild(); return true; });
Net.on('place', (a, from) => Match.applyPlace(a, from));
Net.on('undo', a => Match.undo(a));
Net.on('death', a => Match.applyDeath(a));
Net.on('fin', a => Match.applyFin(a));
Net.on('coin', a => Match.applyCoin(a));
Net.on('endRace', a => Match.applyEndRace(a));
Net.on('podium', a => Match.applyPodium(a));
Net.on('gone', a => Match.applyGone(a));
Net.on('toLobby', () => { Game.toLobby(); return true; });
// cosmetic messages straight from the player concerned
Net.on('cur', a => { const M = Match.M; if (!M || M.phase !== 'build' || !M.builders) return; const B = M.builders[a.pi]; if (!B || !M.players[a.pi].entry.remote) return; B.cx = +a.x || 0; B.cy = +a.y || 0; B.rot = a.r & 3; });
Net.on('pcur', a => { const M = Match.M; if (M && M.phase === 'pick' && M.players[a.pi] && M.players[a.pi].entry.remote) M.pickCur[a.pi] = a.i | 0; });
Net.on('pfail', a => { const M = Match.M; if (M) { M.msg = { s: a.why, t: 1.4 }; Audio2.sfx('bad'); } });
Net.on('respawn', a => Match.applyRespawn(a));
Net.on('crumble', a => { const M = Match.M; if (!M) return; const it = M.W.items.find(i => i.uid === a.uid); if (it && it.st && !(it.st.shake > 0) && !(it.st.fall > 0)) it.st.shake = .001; });
