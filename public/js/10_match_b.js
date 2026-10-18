// ---------- Match per-frame logic ----------
Object.assign(Match, {
  update(dt) {
    const M = this.M; if (!M) return;
    const W = M.W; M.t += dt;
    if (M.msg) { M.msg.t -= dt; if (M.msg.t <= 0) M.msg = null; }
    if (M.banner) { M.banner.t -= dt; if (M.banner.t <= 0) M.banner = null; }
    stepWorld(W, dt);
    const racing = M.phase === 'race' && M.countdown <= 0;
    const inputs = M.players.map(p => Input.read(p.entry.input));
    M.players.forEach((p, i) => { if (racing) M.view.controlPlayer(p, inputs[i], dt); else if (p.alive && !p.finished) M.view.hold(p); else { p.animT += dt; if (!p.alive) p.deathT += dt; } });
    const P = M.phase;
    if (P === 'intro') { M.timer -= dt; fitWholeMap(M.rig, W); if (M.timer <= 0) this.beginRound(); }
    else if (P === 'dealt') { M.timer -= dt; fitWholeMap(M.rig, W); if (M.timer <= 0) this.beginBuild(); }
    else if (P === 'pick') this.updatePick(dt);
    else if (P === 'build') this.updateBuild(dt);
    else if (P === 'race') this.updateRace(dt);
    else if (P === 'results') { M.resultsT += dt; fitWholeMap(M.rig, W); if (M.resultsT > 5.2 || (M.resultsT > 1.5 && Input.anyPressed('jump'))) this.afterResults(); }
    else if (P === 'podium') { M.resultsT += dt; const w = M.players.filter(p => M.winners.includes(p.idx)); cameraOnPlayers(M.rig, W, w.length ? w : M.players); if (Math.random() < .3) FX.burst(M.rig.x + rand(-.5, .5) * M.rig.sw / M.rig.z, M.rig.y - M.rig.shH / 2 / M.rig.z + 20, 3, { color: ['#ffd34d', '#ff5fa2', '#5fc8ff', '#7ae07a'], kind: 'star', g: 200, smin: 20, smax: 100, lmin: 1.5, lmax: 2.5 }); if (M.resultsT > 2.5 && (Input.anyPressed('jump') || Input.anyPressed('interact'))) Game.toLobby(); }
    M.view.update(dt, M.t, { showZones: P === 'build' });
    if (P === 'build' && M.placing) {
      drawGridG(M.view.gb, W);
      const c = M.placing, pl = M.players[c.pi];
      if (!c.done && c.preview) M.preview.show(c.preview, c.valid && c.valid.ok, pl.color, M.t); else M.preview.hide();
      if (M.lastPlaced) { const b = itemBox(M.lastPlaced), G = M.view.gf; G.strokeStyle = pl.color; G.lineWidth = 3; G.strokeRect(b.x - 4, b.y - 4, b.w + 8, b.h + 8); }
    }
  },
  updatePick(dt) {
    const M = this.M; fitWholeMap(M.rig, M.W);
    M.timer -= dt;
    const pl = M.players[M.picker], inp = Input.read(pl.entry.input);
    const cols = Math.min(8, Math.max(4, Math.ceil(Math.sqrt(M.box.length * 1.8))));
    const moveTo = i => { if (i >= 0 && i < M.box.length) { M.pickCursor = i; Audio2.sfx('move'); } };
    if (inp.pressed.left) moveTo(M.pickCursor - 1); if (inp.pressed.right) moveTo(M.pickCursor + 1);
    if (inp.pressed.up) moveTo(M.pickCursor - cols); if (inp.pressed.down) moveTo(M.pickCursor + cols);
    if (pl.entry.input === 'kb1' && M.boxRects) { const mi = M.boxRects.findIndex(r => Input.mouse.x > r.x && Input.mouse.x < r.x + r.w && Input.mouse.y > r.y && Input.mouse.y < r.y + r.h); if (mi >= 0 && Input.mouse.moved) M.pickCursor = mi; if (mi >= 0 && Input.mouse.clicked) { Net.dispatch({ t: 'pick', pi: M.picker, box: mi }); return; } }
    if (inp.pressed.jump || inp.pressed.interact) { const b = M.box[M.pickCursor]; if (b && (b.by < 0 || M.mode === 'creative')) Net.dispatch({ t: 'pick', pi: M.picker, box: M.pickCursor }); else Audio2.sfx('bad'); return; }
    if (M.timer <= 0) { const free = M.box.map((b, i) => (b.by < 0 || M.mode === 'creative') ? i : -1).filter(i => i >= 0); Net.dispatch({ t: 'pick', pi: M.picker, box: pick(free) }); }
  },
  updateBuild(dt) {
    const M = this.M, W = M.W, c = M.placing; if (!c) return;
    const pl = M.players[c.pi], inp = Input.read(pl.entry.input);
    if (M.undoT > 0) {
      M.undoT -= dt; if (inp.pressed.undo) { this.undo(); return; }
      if (M.undoT <= 0 || inp.pressed.jump) { M.undoT = 0; this.nextPlacer(false); }
      return;
    }
    M.timer -= dt;
    if (M.timer < 4 && Math.ceil(M.timer) !== Math.ceil(M.timer + dt)) Audio2.sfx('tick');
    c.fine = inp.fine;
    moveCursor(c, inp, dt, pl.entry.input === 'kb1', M.rig);
    if (inp.pressed.rotate || (pl.entry.input === 'kb1' && (Input.mouse.wheel || Input.mouse.rclicked))) { c.rot = nextRot(c.id, c.rot); Audio2.sfx('move'); }
    const it = cursorItem(W, c); c.valid = placementCheck(W, it); c.preview = it;
    const fz = Math.min(M.rig.sw / (W.map.w * T + 2 * T), M.rig.shH / (W.map.h * T + 4 * T));
    M.rig.set(lerp(W.map.w * T / 2, c.cx, .12), lerp(W.map.h * T / 2 - T, c.cy, .08), fz);
    const confirm = inp.pressed.interact || inp.pressed.jump || (pl.entry.input === 'kb1' && Input.mouse.clicked);
    if (confirm) Net.dispatch({ t: 'place', pi: c.pi, id: c.id, x: it.x, y: it.y, rot: it.rot });
    else if (M.timer <= 0) {
      let spot = c.valid.ok ? it : null;
      for (let r = 1; !spot && r <= 8; r++) for (let a = 0; a < r * 8 && !spot; a++) { const ang = a / (r * 8) * TAU; const t2 = Object.assign({}, it, { x: it.x + Math.round(Math.cos(ang) * r) * T / 2, y: it.y + Math.round(Math.sin(ang) * r) * T / 2 }); if (placementCheck(W, t2).ok) spot = t2; }
      if (spot) { M.msg = { s: 'Time! ' + pl.name + "'s item dropped where it was.", t: 1.6 }; Net.dispatch({ t: 'place', pi: c.pi, id: c.id, x: spot.x, y: spot.y, rot: spot.rot }); }
      else { M.msg = { s: pl.name + ' fumbled the ' + ITEMS[c.id].name + '!', t: 2 }; Audio2.sfx('bad'); this.nextPlacer(false); }
    }
  },
  updateRace(dt) {
    const M = this.M, W = M.W, R = M.rules;
    if (M.countdown > 0) {
      M.countdown -= dt; const c = Math.ceil(M.countdown);
      if (c !== M.lastBeep && c > 0) { M.lastBeep = c; Audio2.sfx('beep'); }
      if (M.countdown <= 0) { W.racing = true; Audio2.sfx('go'); M.players.forEach(p => M.view.release(p)); }
      if (M.countdown > 1.1) fitWholeMap(M.rig, W); else cameraOnPlayers(M.rig, W, M.players);
      return;
    }
    M.goT += dt; M.raceT -= dt;
    if (R.respawn) for (const p of M.players) if (!p.alive && p.deathT > 1.2 && M.raceT > 0) { p.alive = true; p.deathT = 0; spawnPlayers(W, [p]); }
    const done = M.players.every(p => p.finished || (!p.alive && !R.respawn));
    if (done || M.raceT <= 0) { M.endT += dt; if (M.endT > (done ? 1 : .1)) this.endRace(); }
    cameraOnPlayers(M.rig, W, M.players);
  },
});

class MatchScene extends Phaser.Scene {
  constructor() { super('Match'); }
  init(data) { this.data0 = data; }
  create() {
    this.rig = new CamRig(this.cameras.main); this.split = this.rig.split = new SplitCams(this, this.rig);
    Match.start(this, this.data0.mode, this.data0.mapId, this.data0.custom);
    this.W = Match.M.W;
    this.scale.on('resize', this.onResize, this); this.events.once('shutdown', () => { this.scale.off('resize', this.onResize, this); if (Match.M && Match.M.view) Match.M.view.destroy(); Match.M = null; });
  }
  onResize() { if (Match.M) Match.M.view.resize(); }
  update(time, delta) { try { this.tick(time, delta); } catch (e) { Game.reportError(e); } }
  tick(time, delta) {
    if (Game.paused()) return; const dt = Math.min(.05, delta / 1000); Match.update(dt);
    const M = Match.M; if (!M) return;
    const useSplit = M.phase === 'race' && M.countdown <= 1.1 && this.split.wanted(M.players) && M.map.mech !== 'dark';
    if (useSplit) { this.split.enable(M.players); this.split.update(M.players, dt, M.W); } else this.split.disable();
    this.rig.update(dt);
  }
  hudDraw(g, hud) { Match.drawHud(g, hud); }
}
