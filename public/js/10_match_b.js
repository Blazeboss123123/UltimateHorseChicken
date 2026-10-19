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
    M.players.forEach((p, i) => { if (racing && !p.gone) M.view.controlPlayer(p, inputs[i], dt); else if (p.alive && !p.finished) M.view.hold(p); else { p.animT += dt; if (!p.alive) p.deathT += dt; } });
    const P = M.phase;
    if (P === 'intro') { M.timer -= dt; fitWholeMap(M.rig, W); if (M.timer <= 0 && this.once('intro')) this.hostRound(); }
    else if (P === 'dealt') { M.timer -= dt; fitWholeMap(M.rig, W); if (M.timer <= 0 && this.once('dealt' + M.round)) Net.dispatch({ t: 'build', round: M.round }); }
    else if (P === 'pick') this.updatePick(dt);
    else if (P === 'build') this.updateBuild(dt);
    else if (P === 'race') this.updateRace(dt);
    else if (P === 'results') { M.resultsT += dt; fitWholeMap(M.rig, W); if ((M.resultsT > 5.2 || (M.resultsT > 1.5 && Input.anyPressed('jump'))) && this.once('res' + M.round)) this.hostAfterResults(); }
    else if (P === 'podium') {
      M.resultsT += dt; const w = M.players.filter(p => M.winners.includes(p.idx)); cameraOnPlayers(M.rig, W, w.length ? w : M.players);
      if (Math.random() < .3) FX.burst(M.rig.x + rand(-.5, .5) * M.rig.sw / M.rig.z, M.rig.y - M.rig.shH / 2 / M.rig.z + 20, 3, { color: ['#ffd34d', '#ff5fa2', '#5fc8ff', '#7ae07a'], kind: 'star', g: 200, smin: 20, smax: 100, lmin: 1.5, lmax: 2.5 });
      if (M.resultsT > 2.5 && (Input.anyPressed('jump') || Input.anyPressed('interact'))) { if (M.host) { if (this.once('podium')) Net.dispatch({ t: 'toLobby' }); } else if (!M.waitToast) { M.waitToast = true; toast('Waiting for ' + esc(Session.host().name) + ' (the host) to head back to the treehouse'); } }
    }
    M.view.update(dt, M.t, { showZones: P === 'build' });
    if (P === 'build' && M.builders) {
      drawGridG(M.view.gb, W);
      for (const B of M.builders) {
        const pl = M.players[B.pi], pv = M.previews[B.pi]; if (!pv) continue;
        if (!this.builderDone(B) && B.preview) pv.show(B.preview, B.valid && B.valid.ok, pl.color, M.t); else pv.hide();
        if (B.last && M.t - B.placedAt < 2) { const b = itemBox(B.last), G = M.view.gf; G.strokeStyle = pl.color; G.lineWidth = 3; G.strokeRect(b.x - 4, b.y - 4, b.w + 8, b.h + 8); }
      }
    }
  },
  updatePick(dt) {
    const M = this.M; fitWholeMap(M.rig, M.W);
    M.timer -= dt;
    const cols = Math.min(8, Math.max(4, Math.ceil(Math.sqrt(M.box.length * 1.8))));
    for (const pi of M.order) {
      const p = M.players[pi]; if (p.entry.remote || !this.needsPick(pi)) continue;
      const inp = Input.read(p.entry.input), before = M.pickCur[pi];
      const moveTo = i => { if (i >= 0 && i < M.box.length) { M.pickCur[pi] = i; Audio2.sfx('move'); } };
      if (inp.pressed.left) moveTo(M.pickCur[pi] - 1); if (inp.pressed.right) moveTo(M.pickCur[pi] + 1);
      if (inp.pressed.up) moveTo(M.pickCur[pi] - cols); if (inp.pressed.down) moveTo(M.pickCur[pi] + cols);
      let chosen = -1;
      if (mouseUser(p.entry) && M.boxRects) { const mi = M.boxRects.findIndex(r => Input.mouse.x > r.x && Input.mouse.x < r.x + r.w && Input.mouse.y > r.y && Input.mouse.y < r.y + r.h); if (mi >= 0 && Input.mouse.moved) M.pickCur[pi] = mi; if (mi >= 0 && Input.mouse.clicked) chosen = mi; }
      if (chosen < 0 && (inp.pressed.jump || inp.pressed.interact)) chosen = M.pickCur[pi];
      if (M.pickCur[pi] !== before) Net.cast({ t: 'pcur', pi, i: M.pickCur[pi] });
      if (chosen >= 0) { const b = M.box[chosen]; if (b && (b.by < 0 || M.mode === 'creative')) Net.dispatch({ t: 'pick', pi, box: chosen }); else Audio2.sfx('bad'); }
      if (M.phase !== 'pick') return;
    }
    // the host fills in for anyone who ran out of time (or left)
    if (M.host) for (const pi of M.order) if (this.needsPick(pi) && (M.timer <= 0 || M.players[pi].gone) && this.once('pick' + M.round + ':' + pi + ':' + M.hands[pi].length)) { this.autoPick(pi); if (M.phase !== 'pick') return; }
  },
  updateBuild(dt) {
    const M = this.M, W = M.W; if (!M.builders) return;
    M.timer -= dt;
    if (M.timer < 4 && Math.ceil(M.timer) !== Math.ceil(M.timer + dt)) Audio2.sfx('tick');
    const locals = M.builders.filter(B => B.queue.length && !M.players[B.pi].entry.remote);
    for (const B of M.builders) {
      if (!B.queue.length) continue;
      const pl = M.players[B.pi], local = !pl.entry.remote;
      if (local) {
        const inp = Input.read(pl.entry.input);
        if (inp.pressed.undo && B.last && M.rules.allowUndo) { Net.dispatch({ t: 'undo', pi: B.pi, n: B.n - 1 }); continue; }
        if (this.builderDone(B)) continue;
        B.fine = inp.fine;
        const rot0 = B.rot, mouse = mouseUser(pl.entry);
        B.id = B.queue[B.n];
        moveCursor(B, inp, dt, mouse, M.rig);
        if (inp.pressed.rotate || (mouse && (Input.mouse.wheel || Input.mouse.rclicked))) { B.rot = nextRot(B.id, B.rot); Audio2.sfx('move'); }
        B.curT -= dt; if (Net.online && (B.curT <= 0 || B.rot !== rot0)) { B.curT = 1 / 15; Net.cast({ t: 'cur', pi: B.pi, x: Math.round(B.cx), y: Math.round(B.cy), r: B.rot }); }
        const it = cursorItem(W, B); B.valid = placementCheck(W, it); B.preview = it;
        if (inp.pressed.interact || inp.pressed.jump || (mouse && Input.mouse.clicked)) {
          if (B.valid.ok) Net.dispatch({ t: 'place', pi: B.pi, n: B.n, id: B.id, x: it.x, y: it.y, rot: it.rot, uid: Net.online && !Net.isHost ? undefined : uid(), attach: B.valid.attach || undefined });
          else { Audio2.sfx('bad'); M.msg = { s: B.valid.why, t: 1.4 }; }
        }
      } else if (!this.builderDone(B)) { B.id = B.queue[B.n]; const it = cursorItem(W, B); B.valid = placementCheck(W, it); B.preview = it; }
    }
    // camera: follow your own cursor when you're the only one building on this screen
    const mine = locals.filter(B => !this.builderDone(B));
    if (mine.length === 1) { const c = mine[0], fz = Math.min(M.rig.sw / (W.map.w * T + 2 * T), M.rig.shH / (W.map.h * T + 4 * T)); M.rig.set(lerp(W.map.w * T / 2, c.cx, .12), lerp(W.map.h * T / 2 - T, c.cy, .08), fz); }
    else fitWholeMap(M.rig, W);
    if (!M.host) return;
    // the host drops items for anyone who ran out of time, and starts the race once everyone is done
    if (M.timer <= 0) for (const B of M.builders) {
      if (this.builderDone(B) || !this.once('auto' + M.round + ':' + B.pi + ':' + B.n)) continue;
      const pl = M.players[B.pi]; B.id = B.queue[B.n];
      const it = cursorItem(W, B); let spot = null, chk = placementCheck(W, it); if (chk.ok) spot = { it, chk };
      for (let r = 1; !spot && r <= 8; r++) for (let k = 0; k < r * 8 && !spot; k++) { const ang = k / (r * 8) * TAU; const t2 = Object.assign({}, it, { x: it.x + Math.round(Math.cos(ang) * r) * T / 2, y: it.y + Math.round(Math.sin(ang) * r) * T / 2 }); const c2 = placementCheck(W, t2); if (c2.ok) spot = { it: t2, chk: c2 }; }
      if (spot) Net.dispatch({ t: 'place', pi: B.pi, n: B.n, id: B.id, x: spot.it.x, y: spot.it.y, rot: spot.it.rot, uid: uid(), attach: spot.chk.attach || undefined });
      else Net.dispatch({ t: 'skip', pi: B.pi, n: B.n, msg: pl.name + ' fumbled the ' + ITEMS[B.id].name + '!' });
    }
    if (M.builders.every(B => this.builderDone(B))) {
      if (M.allDoneT == null) M.allDoneT = M.t;
      if (M.t - M.allDoneT > (M.rules.allowUndo ? 1.4 : .5) && this.once('race' + M.round)) Net.dispatch({ t: 'race', round: M.round });
    }
  },
  updateRace(dt) {
    const M = this.M, W = M.W, R = M.rules;
    const watch = () => { const me = M.me; if (Net.online && me && me.alive && !me.finished) return [me]; const alive = M.players.filter(p => p.alive && !p.finished && !p.gone); return alive.length ? alive : M.players; };
    if (M.countdown > 0) {
      M.countdown -= dt; const c = Math.ceil(M.countdown);
      if (c !== M.lastBeep && c > 0) { M.lastBeep = c; Audio2.sfx('beep'); }
      if (M.countdown <= 0) { W.racing = true; Audio2.sfx('go'); M.players.forEach(p => M.view.release(p)); }
      if (M.countdown > 1.1) fitWholeMap(M.rig, W); else cameraOnPlayers(M.rig, W, watch());
      return;
    }
    M.goT += dt; M.raceT -= dt;
    if (R.respawn) for (const p of M.players) if (!p.entry.remote && !p.gone && !p.alive && p.deathT > 1.2 && M.raceT > 0) { p.alive = true; p.deathT = 0; spawnPlayers(W, [p]); Net.cast({ t: 'respawn', pi: p.idx }); }
    if (M.host) {
      const done = M.players.every(p => p.gone || p.finished || (!p.alive && !R.respawn));
      if (done || M.raceT <= 0) { M.endT += dt; if (M.endT > (done ? 1 : .1) && this.once('end' + M.round)) Net.dispatch({ t: 'endRace', fo: M.finishOrder.slice(), de: M.deaths.slice(), co: M.coinsGot.slice() }); }
    }
    cameraOnPlayers(M.rig, W, watch());
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
    const useSplit = !Net.online && M.phase === 'race' && M.countdown <= 1.1 && this.split.wanted(M.players) && M.map.mech !== 'dark';
    if (useSplit) { this.split.enable(M.players); this.split.update(M.players, dt, M.W); } else this.split.disable();
    this.rig.update(dt);
  }
  hudDraw(g, hud) { Match.drawHud(g, hud); }
}
