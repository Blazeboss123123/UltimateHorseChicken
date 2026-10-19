// ===================== CHALLENGE SCENE =====================
const MEDAL_RANK = { gold: 3, silver: 2, bronze: 1 };
class ChallengeScene extends Phaser.Scene {
  constructor() { super('Challenge'); }
  init(d) { this.mapId = d.mapId; }
  create() {
    this.rig = new CamRig(this.cameras.main); this.split = this.rig.split = new SplitCams(this, this.rig);
    const ch = buildChallenge(this.mapId), map = MAP_BY_ID[this.mapId];
    const W = this.W = createWorld(map, Object.assign({}, DEFAULT_RULES));
    for (const c of ch.items) { const it = makeItem(c[0], c[1], c[2], c[3], -1); it.fixed = true; it.ph = c[4] || 0; W.items.push(it); }
    W.players = Session.roster.map((e, i) => newPlayer(e, i));
    W.onFinish = p => this.onFinish(p);
    W.onDeath = p => { this.C.deaths[p.idx]++; Save.data.stats.deaths++; };
    stepWorld(W, 0);
    this.view = new WorldView(this, W);
    spawnPlayers(W, W.players); this.view.setPlayers(W.players);
    this.C = { ch, map, t: 0, countdown: 3.2, lastBeep: 4, times: W.players.map(() => null), deaths: W.players.map(() => 0), runT: 0, done: false, doneT: 0 };
    fitWholeMap(this.rig, W, true);
    Audio2.play('race');
    this.scale.on('resize', this.onResize, this); this.events.once('shutdown', () => { this.scale.off('resize', this.onResize, this); this.view.destroy(); });
  }
  onResize() { this.view.resize(); }
  onFinish(p) {
    const C = this.C, tm = C.runT; C.times[p.idx] = tm;
    const medal = tm <= C.ch.gold ? 'gold' : tm <= C.ch.silver ? 'silver' : tm <= C.ch.bronze ? 'bronze' : null, id = C.map.id;
    if (medal && (!Save.data.medals[id] || MEDAL_RANK[medal] > MEDAL_RANK[Save.data.medals[id]])) Save.data.medals[id] = medal;
    if (!Save.data.best[id] || tm < Save.data.best[id]) { Save.data.best[id] = tm; FX.text(p.x, p.y - 60, 'NEW BEST!', '#ffd34d'); }
    Save.data.stats.finishes++; Save.data.stats.xp += medal ? MEDAL_RANK[medal] * 40 : 15;
    Progress.check(); Save.write();
  }
  update(time, delta) { try { this.tick(time, delta); } catch (e) { Game.reportError(e); } }
  tick(time, delta) {
    if (Game.paused()) return;
    const dt = Math.min(.05, delta / 1000), C = this.C, W = this.W; C.t += dt;
    if (C.countdown > 0) { C.countdown -= dt; const c = Math.ceil(C.countdown); if (c !== C.lastBeep && c > 0) { C.lastBeep = c; Audio2.sfx('beep'); } if (C.countdown <= 0) { W.racing = true; Audio2.sfx('go'); W.players.forEach(p => this.view.release(p)); } }
    else if (!C.done) C.runT += dt;
    stepWorld(W, dt);
    const inputs = W.players.map(p => Input.read(p.entry.input));
    W.players.forEach((p, i) => { if (C.countdown <= 0) this.view.controlPlayer(p, inputs[i], dt); else this.view.hold(p); });
    for (const p of W.players) if (!p.alive && p.deathT > .8 && !C.done) { p.alive = true; p.deathT = 0; spawnPlayers(W, [p]); }
    if (!C.done && W.players.every(p => p.finished)) { C.done = true; C.doneT = 0; Audio2.sfx('win'); }
    if (C.done) { C.doneT += dt; if (C.doneT > 1 && Input.anyPressed('jump')) Game.launch('challenge', C.map.id); if (C.doneT > 1 && Input.anyPressed('interact')) Game.toLobby(); }
    else W.players.forEach((p, i) => { if (inputs[i].pressed.rotate && C.countdown <= 0 && !p.finished) { p.alive = true; spawnPlayers(W, [p]); } });
    if (C.countdown > 1.2) fitWholeMap(this.rig, W); else cameraOnPlayers(this.rig, W, W.players);
    this.view.update(dt, C.t);
    if (C.countdown <= 1.2 && this.split.wanted(W.players) && W.map.mech !== 'dark') { this.split.enable(W.players); this.split.update(W.players, dt, W); } else this.split.disable();
    this.rig.update(dt);
  }
  hudDraw(ctx) {
    const C = this.C, W = this.W, R = this.rig, SW = R.sw, SH = R.shH, u = hudScale(R);
    if (this.split.on) this.split.drawFrames(ctx); else drawOffscreenIndicators(ctx, R, W.players);
    const w = 440 * u, x = SW / 2 - w / 2, y = 10 * u; panel(ctx, x, y, w, 70 * u);
    txt(ctx, 'CHALLENGE · ' + C.map.name, x + 16 * u, y + 22 * u, 18 * u, '#e8573f', 'left');
    txt(ctx, fmtTime(C.runT), x + w - 16 * u, y + 24 * u, 26 * u, '#fff', 'right');
    txt(ctx, '🥇 ' + fmtTime(C.ch.gold) + '   🥈 ' + fmtTime(C.ch.silver) + '   🥉 ' + fmtTime(C.ch.bronze) + '   Best: ' + fmtTime(Save.data.best[C.map.id]), x + 16 * u, y + 52 * u, 14 * u, INK, 'left', null, 600);
    W.players.forEach((p, i) => { const yy = 96 * u + i * 30 * u; hudPortrait(ctx, 26 * u, yy, 12 * u, p.entry); txt(ctx, p.name + ' · ' + (C.times[i] != null ? fmtTime(C.times[i]) : '💫 ' + C.deaths[i]), 44 * u, yy, 14 * u, '#fff', 'left'); });
    if (C.countdown > 0 && C.countdown <= 3) txt(ctx, String(Math.ceil(C.countdown)), SW / 2, SH / 2, 100 * u, '#ffd34d');
    if (!C.done && C.countdown <= 0) txt(ctx, 'Rotate key = restart from the start', SW / 2, SH - 20 * u, 13 * u, '#fff');
    if (C.done) {
      panel(ctx, SW / 2 - 260 * u, SH / 2 - 120 * u, 520 * u, 240 * u);
      txt(ctx, 'Challenge complete!', SW / 2, SH / 2 - 86 * u, 30 * u, '#e8573f');
      W.players.forEach((p, i) => { const tm = C.times[i]; const m = tm <= C.ch.gold ? '🥇' : tm <= C.ch.silver ? '🥈' : tm <= C.ch.bronze ? '🥉' : '—'; txt(ctx, p.name + '   ' + fmtTime(tm) + '   ' + m + '   (' + C.deaths[i] + ' pops)', SW / 2, SH / 2 - 40 * u + i * 26 * u, 17 * u, INK, 'center', null, 600); });
      txt(ctx, 'Jump: try again  ·  Interact: back to treehouse', SW / 2, SH / 2 + 96 * u, 15 * u, INK, 'center', null, 500);
    }
  }
}

// ===================== FREE BUILD / LEVEL EDITOR SCENE =====================
const Ed = { E: null, scene: null };
class EditorScene extends Phaser.Scene {
  constructor() { super('Editor'); }
  init(d) { this.mapId = d.mapId; this.levelData = d.level || null; }
  create() {
    Ed.scene = this;
    this.rig = new CamRig(this.cameras.main); this.split = this.rig.split = new SplitCams(this, this.rig);
    const map = MAP_BY_ID[this.mapId], level = this.levelData;
    const W = this.W = createWorld(map, Object.assign({}, Save.data.rules, { allowOverlap: false }));
    if (level) for (const it of itemsFromList(level.items)) W.items.push(it);
    W.players = Session.roster.map((e, i) => newPlayer(e, i));
    W.onFinish = p => { if (!Ed.E.verified) toast('✅ Level verified — you can publish it now!'); Ed.E.verified = true; p.respawnAt = Ed.E.t + 1.5; };
    W.onDeath = () => { Save.data.stats.deaths++; };
    stepWorld(W, 0);
    this.view = new WorldView(this, W);
    spawnPlayers(W, W.players); this.view.setPlayers(W.players);
    W.players.forEach(p => Match.hide(p));
    const starts = ['plank', 'crate', 'saw', 'spikes', 'crossbow', 'trampoline', 'ice', 'fan'];
    const cursors = Session.roster.map((e, i) => ({ pi: i, cx: map.w * T / 2 + i * 40, cy: map.h * T / 2, id: starts[i % 8], rot: 0, holdT: 0, grab: null, prev: new Preview(this.view) }));
    Ed.E = { W, map, mode: 'edit', cursors, name: level ? level.name : map.name + ' remix', verified: false, t: 0, draftIdx: level && level.draftIdx != null ? level.draftIdx : -1 };
    fitWholeMap(this.rig, W, true); Audio2.play('editor');
    UI.editorBars(true);
    this.scale.on('resize', this.onResize, this);
    this.events.once('shutdown', () => { this.scale.off('resize', this.onResize, this); UI.editorBars(false, true); this.view.destroy(); Ed.E = null; Ed.scene = null; });
  }
  onResize() { this.view.resize(); }
  level() { const E = Ed.E; return { name: E.name, map: E.map.id, items: itemsToList(E.W.items) }; }
  changed() { if (Ed.E) Ed.E.verified = false; }
  toggleTest() {
    const E = Ed.E, W = E.W;
    if (E.mode === 'edit') { E.mode = 'test'; W.testing = true; W.t = 0; W.projs = []; for (const it of W.items) it.st = {}; W.players.forEach(p => { p.alive = true; p.finished = false; }); spawnPlayers(W, W.players); E.cursors.forEach(c => c.prev.hide()); Audio2.play('race'); toast('Testing! Reach the flag to verify the level.'); }
    else { E.mode = 'edit'; W.testing = false; W.projs = []; for (const it of W.items) it.st = {}; W.players.forEach(p => Match.hide(p)); Audio2.play('editor'); }
    UI.editorBars(true);
  }
  itemUnder(x, y) { const W = Ed.E.W; for (let i = W.items.length - 1; i >= 0; i--) { const it = W.items[i]; if (it.mapOwned) continue; const b = itemBox(it); if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return it; } return null; }
  select(pi, id) { const c = Ed.E && Ed.E.cursors[pi]; if (!c || !ITEMS[id] || c.grab) return; c.id = id; c.rot = 0; Audio2.sfx('move'); UI.editorBars(false); }
  update(time, delta) { try { this.tick(time, delta); } catch (e) { Game.reportError(e); } }
  tick(time, delta) {
    if (Game.paused()) return;
    const dt = Math.min(.05, delta / 1000), E = Ed.E, W = E.W; E.t += dt;
    const inputs = W.players.map(p => Input.read(p.entry.input));
    if (inputs.some(i => i.pressed.test)) this.toggleTest();
    stepWorld(W, dt);
    if (E.mode === 'test') {
      W.players.forEach((p, i) => this.view.controlPlayer(p, inputs[i], dt));
      for (const p of W.players) if ((!p.alive && p.deathT > .8) || (p.finished && p.respawnAt && E.t > p.respawnAt)) { p.respawnAt = 0; p.alive = true; p.finished = false; spawnPlayers(W, [p]); }
      cameraOnPlayers(this.rig, W, W.players);
      this.view.update(dt, E.t);
      if (this.split.wanted(W.players)) { this.split.enable(W.players); this.split.update(W.players, dt, W); }
      this.rig.update(dt);
      return;
    }
    this.split.disable();
    this.view.update(dt, E.t, { showZones: true });
    drawGridG(this.view.gb, W);
    E.cursors.forEach((c, i) => {
      const inp = inputs[i], src = W.players[i].entry.input, mouse = src === 'kb1' && !UI.pointerOverBars;
      c.fine = inp.fine;
      if ((inp.pressed.prev || inp.pressed.next) && !c.grab) { const L = ITEM_ORDER; let k = L.indexOf(c.id); k = (k + (inp.pressed.next ? 1 : -1) + L.length) % L.length; this.select(i, L[k]); }
      moveCursor(c, inp, dt, mouse, this.rig);
      if (inp.pressed.rotate || (mouse && Input.mouse.wheel)) { if (c.grab) c.grab.rot = nextRot(c.grab.id, c.grab.rot); else c.rot = nextRot(c.id, c.rot); Audio2.sfx('move'); }
      const holdId = c.grab ? c.grab.id : c.id, holdRot = c.grab ? c.grab.rot : c.rot;
      const prev = cursorItem(W, { id: holdId, rot: holdRot, cx: c.cx, cy: c.cy, fine: c.fine }); prev.uid = 'p' + i;
      c.valid = placementCheck(W, prev, {});
      const p = W.players[i];
      c.prev.show(prev, c.valid.ok, p.color, E.t);
      if (inp.pressed.interact || (mouse && Input.mouse.clicked)) {
        if (!c.valid.ok) { Audio2.sfx('bad'); toast(c.valid.why); }
        else if (ITEMS[holdId].instant) { const b = itemBox(prev); explodeBomb(W, b.x + b.w / 2, b.y + b.h / 2); this.changed(); }
        else { const it = makeItem(holdId, prev.x, prev.y, holdRot, -1); it.attach = findAttach(W, it); W.items.push(it); stepWorld(W, 0); this.view.addItem(it); c.grab = null; Audio2.sfx('place'); this.changed(); }
      }
      if (inp.pressed.jump && !c.grab) { const it = this.itemUnder(c.cx, c.cy); if (it) { W.items = W.items.filter(o => o !== it); this.view.removeItem(it); c.grab = { id: it.id, rot: it.rot, orig: it }; Audio2.sfx('pick'); this.changed(); } }
      else if (inp.pressed.jump && c.grab) { W.items.push(c.grab.orig); this.view.addItem(c.grab.orig); c.grab = null; Audio2.sfx('click'); }
      if (inp.pressed.undo || (mouse && Input.mouse.rclicked)) {
        if (c.grab) { W.items.push(c.grab.orig); this.view.addItem(c.grab.orig); c.grab = null; }
        else { const it = this.itemUnder(c.cx, c.cy); if (it) { W.items = W.items.filter(o => o !== it); this.view.removeItem(it); Audio2.sfx('crumble'); FX.burst(it.x + 10, it.y + 10, 8, { color: '#b07a45' }); this.changed(); } }
      }
    });
    const c0 = E.cursors[0], pw = document.getElementById('palette') ? 196 : 0, bh = 96;
    const z = Math.min((this.rig.sw - pw - 20) / (W.map.w * T), (this.rig.shH - bh - 20) / (W.map.h * T + 4 * T));
    this.rig.set(W.map.w * T / 2 - pw / 2 / z, W.map.h * T / 2 - 2 * T + bh / 2 / z, z);
    this.rig.update(dt);
  }
  hudDraw(ctx) {
    const E = Ed.E; if (!E) return; const W = E.W, R = this.rig, SW = R.sw, u = Math.min(1.2, Math.max(.75, R.shH / 820)) * Save.data.settings.uiScale;
    if (E.mode === 'edit') E.cursors.forEach((c, i) => { const p = W.players[i]; const pr = c.prev.it; if (!pr) return; const b = itemBox(pr); const [sx, sy] = R.toScreen(b.x + b.w / 2, b.y); txt(ctx, p.name + (c.grab ? ' (moving)' : ''), sx, sy - 12, 12, '#fff', 'center', p.color); });
    const w = 300 * u, x = SW - w - 10, y = 10;
    panel(ctx, x, y, w, 118 * u);
    txt(ctx, (E.mode === 'edit' ? '✏️ FREE BUILD' : '▶ TESTING') + (E.verified ? '  ✅' : ''), x + 14 * u, y + 20 * u, 18 * u, '#e8573f', 'left');
    const lines = E.mode === 'edit' ? ['Click/E: place · Space: grab/move', 'Right-click/Q: delete · R/wheel: rotate', 'Z/X: change item · Tab: test level', 'Pads: X place · A grab · B delete · LB/RB'] : ['Reach the flag to verify your level', 'Tab / Back: return to editing', 'Every player can test at once'];
    lines.forEach((l, k) => txt(ctx, l, x + 14 * u, y + 44 * u + k * 19 * u, 13 * u, INK, 'left', null, 500));
    if (E.mode === 'edit') E.cursors.forEach((c, i) => { if (i === 0) return; const p = W.players[i]; const yy = 140 * u + (i - 1) * 40 * u; rr(ctx, SW - 160 * u, yy, 150 * u, 34 * u, 10); ctx.fillStyle = 'rgba(255,246,230,.9)'; ctx.fill(); ctx.strokeStyle = p.color; ctx.lineWidth = 3; ctx.stroke(); hudIcon(ctx, c.grab ? c.grab.id : c.id, SW - 140 * u, yy + 17 * u, 26 * u); txt(ctx, p.name, SW - 120 * u, yy + 17 * u, 12 * u, INK, 'left', null, 600); });
  }
}
// Old call sites used Ed.* helpers; forward them to the live editor scene.
Object.assign(Ed, {
  level() { return Ed.scene.level(); }, changed() { if (Ed.scene) Ed.scene.changed(); }, toggleTest() { Ed.scene.toggleTest(); },
  select(pi, id) { if (Ed.scene) Ed.scene.select(pi, id); },
  start(mapId, level) { Game.launch('freebuild', mapId, null, level); },
  exit() { Game.toLobby(); },
});
