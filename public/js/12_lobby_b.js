// ===================== TREEHOUSE LOBBY SCENE =====================
class LobbyWorld extends WorldView {
  build() {
    const s = this.s;
    s.physics.world.setBounds(0, -2000, LW, LH + 4000); s.physics.world.setBoundsCollision(true, true, false, false);
    this.sg = s.physics.add.staticGroup(); this.dg = s.physics.add.group({ allowGravity: false, immovable: true });
    LOBBY.solids.forEach((so, i) => { if (!so.wall) this.zoneFor('T:' + i, so, false); });
  }
  resize() { }
  update(dt, t) { this.gb.clear(); this.gx.clear(); this.gf.clear(); this.drawPlayers(t); }
}
const Lobby = { scene: null, launch: null };
function lobbyWorldModel() {
  return { map: { id: 'lobby', w: LW / T, h: LH / T, mech: null, goal: [-99, -99], pal: MAPS[0].pal }, rules: Object.assign({}, DEFAULT_RULES), t: 0, dt: 0, items: [], projs: [], solids: LOBBY.solids, hazards: [], forces: [], pushers: [], climb: LOBBY.climbs, gravZones: [], players: [], ms: {}, gravBase: 1, racing: false, testing: false, terrainSolids: LOBBY.solids, discoSolids: [], goal: { x: -9999, y: -9999, w: 0, h: 0 }, start: { x: 0, y: 0, w: 0, h: 0 } };
}
class LobbyScene extends Phaser.Scene {
  constructor() { super('Lobby'); }
  create() {
    Lobby.scene = this; Lobby.launch = null;
    bakeLobby(); MAPS.forEach(bakeThumb);
    this.rig = new CamRig(this.cameras.main);
    this.W = lobbyWorldModel();
    this.sky = this.add.image(0, 0, 'lobby_sky').setScrollFactor(0).setDepth(-100);
    this.clouds = [...Array(8).keys()].map(i => this.add.image(0, 120 + (i * 97 % 900), 'cloud').setScale((1 + (i % 3) * .5) / 1.5).setDepth(-90).setAlpha(.9));
    this.add.rectangle(-3000, LG + 2, LW + 6000, 2000, 0x9ad86a).setOrigin(0).setDepth(0);
    this.add.image(0, 0, 'lobby_static').setOrigin(0).setDepth(1);
    this.cards = LOBBY.cards.map(c => this.add.image(c.x, c.y, 'thumb_' + c.map.id).setOrigin(0).setDisplaySize(c.w, c.h - 4).setDepth(2));
    const ra = LOBBY.acts.find(a => a.kind === 'random'); this.randImg = this.add.image(ra.x + 6, ra.y + 6, 'thumb_farm').setOrigin(0).setDisplaySize(ra.w - 12, 98).setAlpha(.55).setDepth(2);
    const ba = LOBBY.acts.find(a => a.kind === 'bell'); this.bell = this.add.image(ba.x + 35, ba.y + 10, 'bell').setOrigin(.5, .08).setScale(.5).setDepth(3);
    this.wg = this.add.graphics().setDepth(3); this.g = new GCtx(this.wg, this);
    this.wt = new TextPool(this, 4); this.wt.scrollFactor = 1;
    this.view = new LobbyWorld(this, this.W);
    this.birds = [...Array(4).keys()].map(() => ({ x: rand(0, LW), y: rand(80, 400), vx: rand(40, 90) * (Math.random() < .5 ? -1 : 1), ph: rand(0, 6) }));
    this.near = []; this.t = 0;
    this.players = []; this.syncPlayers(true);
    this.rig.set(LW / 2, LH / 2, Math.min(this.rig.sw / LW, this.rig.shH / LH), true);
    Audio2.play('lobby');
    this.onResize(); this.scale.on('resize', this.onResize, this);
    this.events.once('shutdown', () => { this.scale.off('resize', this.onResize, this); this.view.destroy(); Lobby.scene = null; });
  }
  onResize() { this.sky.setPosition(this.rig.sw / 2, this.rig.shH / 2).setDisplaySize(this.rig.sw * 8, this.rig.shH * 8); }
  syncPlayers(force) {
    const R = Session.roster;
    let changed = force || this.players.length !== R.length || this.players.some((p, i) => p.entry !== R[i]);
    if (changed) {
      const old = new Map(this.players.map(p => [p.entry, p]));
      this.players = R.map((e, i) => { const o = old.get(e); const p = newPlayer(e, i); if (o) { p.x = o.x; p.y = o.y; } else { p.x = 140 + i * 30; p.y = LG - PH - 2; FX.burst(p.x + 10, p.y + 10, 12, { color: e.color, kind: 'star', g: 0 }); } p.look = lookKey(e); return p; });
      this.W.players = this.players; this.view.setPlayers(this.players);
      this.players.forEach(p => this.view.onSpawn(p));
    }
    this.players.forEach((p, i) => {
      p.idx = i; p.name = p.entry.name; p.color = p.entry.color;
      const lk = lookKey(p.entry);
      if (p.look !== lk) { p.look = lk; bakeCharacter(p.entry); bakePortrait(p.entry); p.spr.setTexture('chr_' + lk, 'idle0'); p.spr.anims.stop(); }
      if (p.tag.text !== COLOR_SHAPES[p.entry.colorIdx % 8] + ' ' + p.name) p.tag.setText(COLOR_SHAPES[p.entry.colorIdx % 8] + ' ' + p.name);
      p.tag.setBackgroundColor(p.color);
    });
  }
  modeObj() { return MODES.find(m => m.id === Session.mode) || MODES[0]; }
  isHost(p) { return p.entry === Session.host(); }
  actPrompt(a) { if (a.kind === 'card') return a.card.map.name; if (a.kind === 'mode') return 'Mode: ' + this.modeObj().name; if (a.kind === 'couch') return 'Players couch (' + Session.roster.length + '/8)'; return a.label; }
  keyFor(p, a) { const s = p.entry.input; if (s.startsWith('kb')) return keyLabel((Input.binds(s)[a] || [])[0]); return PAD_LABELS[a].split(' ')[0]; }
  interact(p, a) {
    const host = this.isHost(p);
    if (a.host && !host && a.kind !== 'card') { toast('Only the host (' + Session.host().name + ') can do that'); Audio2.sfx('bad'); return; }
    Audio2.sfx('click');
    switch (a.kind) {
      case 'card': {
        const m = a.card.map; Save.data.seen[m.id] = true; Save.write();
        if (!host) { toast('Only the host can pick the map'); return; }
        Net.dispatch({ t: 'lobbyMap', map: m.id }); this.startLaunch(m.id, null); break;
      }
      case 'mode': { const list = Net.online ? MODES.filter(m => m.id === 'party' || m.id === 'creative') : MODES; const i = list.findIndex(m => m.id === Session.mode); Net.dispatch({ t: 'lobbyMode', mode: list[(i + 1) % list.length].id }); break; }
      case 'couch': if (Net.online) toast('Online, each friend plays on their own device — share the game code <b>' + Online.code + '</b>!'); else UI.players(); break;
      case 'wardrobe': UI.wardrobe(p.entry); break;
      case 'trophies': UI.achievements(); break;
      case 'stats': UI.stats(); break;
      case 'settings': UI.settings(); break;
      case 'controls': UI.settings('controls'); break;
      case 'credits': UI.credits(); break;
      case 'rules': UI.rules(); break;
      case 'random': UI.random(); break;
      case 'community': UI.community(); break;
      case 'well': { Audio2.sfx(pick(['quack', 'splash', 'coin', 'bell'])); FX.burst(a.x + 55, a.y + 20, 10, { color: '#7fc8ff', g: 500, angle: -Math.PI / 2, spread: .5, smin: 150, smax: 300 }); FX.text(a.x + 55, a.y - 10, pick(['*plip*', 'A wish!', 'Quack?', '*echo* hello…', 'Lucky!']), '#fff'); break; }
      case 'bell': { Save.data.stats.bellRings++; Audio2.sfx('bell'); FX.text(a.x + 35, a.y, 'DONG!', '#ffd34d'); this.tweens.add({ targets: this.bell, angle: { from: -25, to: 0 }, duration: 900, ease: 'Elastic.easeOut' }); Progress.check(); for (const b of this.birds) b.vx *= -1.8; break; }
    }
  }
  startLaunch(mapId, custom) {
    if (Net.online) { if (!Net.isHost) { toast('Only the host can start a match'); return; } if (Session.mode !== 'party' && Session.mode !== 'creative') Net.dispatch({ t: 'lobbyMode', mode: 'party' }); Net.dispatch({ t: 'prelaunch', mapId, custom: custom ? { name: custom.name, items: custom.items } : null, mode: Session.mode }); return; }
    Lobby.launch = { mapId, custom, t: 1.6 }; Audio2.sfx('pick');
  }
  update(time, delta) { try { this.tick(time, delta); } catch (e) { Game.reportError(e); } }
  tick(time, delta) {
    const dt = Math.min(.05, delta / 1000); this.t += dt;
    const pj = Net.online ? -1 : Input.padJoinPressed(); if (pj >= 0 && !Session.roster.some(r => r.input === 'pad' + pj)) { const e = Session.addLocal('pad' + pj); if (e) { toast('🎮 ' + e.name + ' joined!'); Audio2.sfx('pick'); } }
    if (!Net.online && !Input.kb2Active && !Input.skip && (Input.pressed.has('Enter') || Input.pressed.has('NumpadEnter')) && !Input.uiCapture) { const e = Session.addLocal('kb2'); if (e) { toast('⌨️ ' + e.name + ' joined on keyboard 2 (IJKL + Right-Shift)'); Audio2.sfx('pick'); } }
    this.syncPlayers();
    const inputs = this.players.map(p => Input.read(p.entry.input));
    this.players.forEach((p, i) => { this.view.controlPlayer(p, inputs[i], dt); if (!p.entry.remote && (!p.alive || p.y > LH)) { p.alive = true; p.x = 140; p.y = LG - PH - 2; this.view.onSpawn(p); } });
    this.near = this.players.map((p, i) => {
      if (p.entry.remote) return null;
      const cx = p.x + p.w / 2, cy = p.y + p.h / 2; let best = null, bd = 1e9;
      for (const a of LOBBY.acts) if (cx > a.x - 20 && cx < a.x + a.w + 20 && cy > a.y - 30 && cy < a.y + a.h + 20) { const d = Math.abs(cx - (a.x + a.w / 2)); if (d < bd) { bd = d; best = a; } }
      if (best && inputs[i].pressed.interact) this.interact(p, best);
      if (best && best.kind === 'card' && inputs[i].pressed.fav) { const id = best.card.map.id; Save.data.favs[id] = !Save.data.favs[id]; Save.write(); Audio2.sfx('coin'); toast((Save.data.favs[id] ? '♥ Added ' : 'Removed ') + best.card.map.name + (Save.data.favs[id] ? ' to favourites' : ' from favourites')); }
      if (inputs[i].pressed.menu && !Lobby.launch) UI.pause('lobby');
      return best;
    });
    if (Lobby.launch) {
      Lobby.launch.t -= dt;
      const cancel = Input.anyPressed('menu') || Input.anyPressed('undo');
      if (cancel && Net.online && !Net.isHost) { if (!Lobby.launch.told) { Lobby.launch.told = true; toast('Only the host can cancel'); } }
      else if (cancel) { if (Net.online) Net.dispatch({ t: 'cancelLaunch' }); else { Lobby.launch = null; toast('Cancelled'); Audio2.sfx('bad'); } }
      else if (Lobby.launch.t <= 0) {
        const L = Lobby.launch;
        if (!Net.online) { Lobby.launch = null; Game.launch(Session.mode, L.mapId, L.custom); }
        else if (Net.isHost && !L.sent) { L.sent = true; Net.dispatch({ t: 'launch', mode: Session.mode, mapId: L.mapId, custom: L.custom, rules: deepCopy(Save.data.rules), ids: Session.roster.map(e => e.netId) }); }
      }
    }
    for (const b of this.birds) { b.x += b.vx * dt; b.y += Math.sin(this.t * 2 + b.ph) * 20 * dt; if (b.x < -100) b.x = LW + 80; if (b.x > LW + 100) b.x = -80; b.vx = clamp(b.vx * (1 - dt * .2) + Math.sign(b.vx) * 20 * dt, -260, 260); }
    this.clouds.forEach((c, i) => { c.x = ((i * 330 + this.t * (5 + i)) % (LW + 500)) - 250; });
    this.randImg.setTexture('thumb_' + MAPS[Math.floor(this.t * 1.5) % MAPS.length].id).setDisplaySize(148, 98);
    this.bell.angle = this.bell.angle * .98 + Math.sin(this.t * 3) * .1;
    const fz = Math.min(this.rig.sw / LW, this.rig.shH / LH);
    let cx = LW / 2, cy = LH / 2; const follow = Net.online ? this.players.filter(p => !p.entry.remote) : this.players; if (follow.length) { cx = follow.reduce((a, p) => a + p.x, 0) / follow.length; cy = follow.reduce((a, p) => a + p.y, 0) / follow.length; }
    this.rig.set(lerp(LW / 2, cx, .35), lerp(LH / 2, cy, .35), fz * (this.rig.sw < 900 ? 1.7 : 1.12)); this.rig.clampTo({ x: -40, y: -40, w: LW + 80, h: LH + 60 });
    this.rig.update(dt);
    this.view.update(dt, this.t);
    this.drawDynamic();
  }
  drawDynamic() {
    const g = this.g, t = this.t; g.clear(); this.wt.begin();
    for (const b of this.birds) { g.save(); g.translate(b.x, b.y); g.scale(Math.sign(b.vx) || 1, 1); const f = Math.sin(t * 14 + b.ph) * 6; g.strokeStyle = INK; g.lineWidth = 2.5; g.beginPath(); g.moveTo(-10, -f); g.quadraticCurveTo(-4, -2, 0, 0); g.quadraticCurveTo(4, -2, 10, -f); g.stroke(); g.restore(); }
    const sel = Session.mapId;
    LOBBY.cards.forEach(c => {
      const m = c.map, un = mapUnlocked(m);
      rr(g, c.x, c.y, c.w, c.h - 4, 6); g.lineWidth = m.id === sel ? 5 : 3; g.strokeStyle = m.id === sel ? '#ff5fa2' : INK; g.stroke();
      rr(g, c.x + 6, c.y + c.h - 4, c.w - 12, 10, 3); fillStroke(g, '#9aa1aa', 2.5);
      this.wt.get(m.name, c.x + c.w / 2, c.y + 16, m.name.length > 14 ? 15 : 17, un ? '#fff' : '#ddd', 'center', INK);
      if (false) { const s = 1 + Math.sin(t * 6) * .08; g.save(); g.translate(c.x + c.w - 12, c.y + c.h - 26); g.scale(s, s); g.rotate(-.2); starPath(g, 0, 0, 22, 14, 10); fillStroke(g, '#ffe14d', 2); g.restore(); this.wt.get('NEW', c.x + c.w - 12, c.y + c.h - 25, 12, '#e8473f', 'center', null); }
      if (Save.data.favs[m.id]) this.wt.get('♥', c.x + 12, c.y + c.h - 22, 20, '#ff5fa2', 'center', INK);
      if (Save.data.recent.includes(m.id)) this.wt.get('⟲', c.x + 30, c.y + c.h - 22, 16, '#fff', 'center', INK);
      const med = Save.data.medals[m.id]; if (med) this.wt.get({ gold: '🥇', silver: '🥈', bronze: '🥉' }[med], c.x + c.w - 14, c.y + 36, 16, '#fff', 'center', null);
    });
    for (const a of LOBBY.acts) {
      if (a.kind === 'mode') { const m = this.modeObj(); this.wt.get(m.icon + ' ' + m.name, a.x + a.w / 2, a.y + 55, m.name.length > 8 ? 15 : 18, INK, 'center', null); for (let i = 0; i < 4; i++) circ(g, a.x + 22 + i * 32, a.y + 6, 5, MODES[i].id === Session.mode ? '#ffd34d' : '#666655', 1.5); const ang = Math.sin(t * 2) * .05 - .4; line(g, a.x + 110, a.y + 120, a.x + 110 + Math.sin(ang) * 40, a.y + 120 - Math.cos(ang) * 40, INK, 5); circ(g, a.x + 110 + Math.sin(ang) * 40, a.y + 120 - Math.cos(ang) * 40, 8, '#e8473f', 2.5); }
      else if (a.kind === 'rules') { const R = Save.data.rules; this.wt.get('Win ' + R.winScore + ' · ' + (R.roundLimit ? R.roundLimit + ' rnds' : '∞ rnds') + ' · ' + R.perPlayer + ' item' + (R.perPlayer > 1 ? 's' : ''), a.x + a.w / 2, a.y + 34, 11, INK, 'center', null, 500); Session.roster.slice(0, 8).forEach((e, i) => { const yy = a.y + 46 + i * 10; g.fillStyle = e.color; g.fillRect(a.x + 14, yy, 8, 8); rr(g, a.x + 28, yy, (a.w - 70) * Math.min(1, (R.handicap[i] || 1) / 1.5), 8, 3); g.fillStyle = 'rgba(58,42,30,.35)'; g.fill(); this.wt.get(Math.round((R.handicap[i] || 1) * 100) + '%', a.x + a.w - 22, yy + 4, 9, INK, 'center', null, 600); }); }
      else if (a.kind === 'random') this.wt.get('🎲 Random', a.x + a.w / 2, a.y + 55, 24, '#fff', 'center', INK);
      else if (a.kind === 'community') this.wt.get('Community ' + Save.data.custom.length, a.x + a.w / 2, a.y - 15, 13, INK, 'center', null);
      else if (a.kind === 'couch') this.wt.get(Session.roster.length + '/8', 150, LG - 32, 16, '#fff', 'center', INK);
    }
    const n = Object.keys(Save.data.ach); n.slice(0, 8).forEach((id, i) => { const A = ACHIEVEMENTS.find(x => x.id === id); this.wt.get(A ? A.icon : '★', 88 + (i % 4) * 30, i < 4 ? 886 : 932, 20, '#fff', 'center', null); }); if (!n.length) this.wt.get('🏆', 132, 886, 24, '#fff', 'center', null);
    if (Audio2.track) for (let i = 0; i < 2; i++) this.wt.get('♪', 440 + Math.sin(t * 2 + i) * 10, 868 - ((t * 30 + i * 30) % 60), 18, '#3f8de8', 'center', null);
    this.wt.end();
  }
  hudDraw(ctx) {
    const R = this.rig, SW = R.sw, SH = R.shH, u = Math.min(1.2, Math.max(.7, SH / 820)) * Save.data.settings.uiScale;
    // interaction prompts
    const seenAct = new Map(); const infos = [];
    this.near.forEach((a, i) => {
      const p = this.players[i]; if (!a || !p) return;
      if (a.kind === 'card') { if (!infos.some(ci => ci.c === a.card)) infos.push({ c: a.card, p }); return; }
      const k = seenAct.get(a) || 0; seenAct.set(a, k + 1);
      const s = '[' + this.keyFor(p, 'interact') + '] ' + this.actPrompt(a), [sx, sy] = R.toScreen(p.x + p.w / 2, p.y - 50); const w = s.length * 7.4 + 20, y = sy - k * 30;
      rr(ctx, sx - w / 2, y - 13, w, 26, 10); fillStroke(ctx, '#ffffff', 2.5); ctx.strokeStyle = p.color; ctx.lineWidth = 3; ctx.stroke(); txt(ctx, s, sx, y, 14, INK, 'center', null, 600);
    });
    for (const ci of infos) this.drawCardInfo(ctx, ci.c, ci.p, u);
    // roster
    Session.roster.forEach((e, i) => {
      const x = 10 * u + (i % 4) * 150 * u, y = 10 * u + Math.floor(i / 4) * 46 * u;
      rr(ctx, x, y, 144 * u, 40 * u, 10); ctx.fillStyle = 'rgba(255,246,230,.92)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = e.color; ctx.stroke();
      hudPortrait(ctx, x + 20 * u, y + 20 * u, 15 * u, e);
      txt(ctx, (i === 0 ? '👑 ' : '') + e.name.slice(0, 11) + (Net.online && !e.remote ? ' (you)' : ''), x + 40 * u, y + 13 * u, 12 * u, INK, 'left', null, 600);
      const dev = Net.online ? (e.remote ? '🌐 Online' : '🏠 This device') : e.input === 'kb1' ? '⌨ Keyboard 1' : e.input === 'kb2' ? '⌨ Keyboard 2' : e.input.startsWith('pad') ? '🎮 Pad ' + (+e.input.slice(3) + 1) : '🌐 Online';
      txt(ctx, dev + ' · ' + (e.ready ? '✔' : '…'), x + 40 * u, y + 29 * u, 10 * u, INK, 'left', null, 500);
    });
    const bw = 190 * u, bx = SW - bw - 10 * u, by = 10 * u, mo = this.modeObj();
    rr(ctx, bx, by, bw, 40 * u, 10); ctx.fillStyle = 'rgba(255,246,230,.92)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    txt(ctx, mo.icon + ' ' + mo.name + ' mode', bx + bw / 2, by + 20 * u, 16 * u, '#e8573f', 'center', null, 700);
    const h = SH - 30 * u; if (Net.online) { const hs = Net.isHost ? 'You\'re the host — walk to a map card and press ' + this.keyFor(this.players.find(p => !p.entry.remote) || { entry: { input: 'kb1' } }, 'interact') + ' to start' : 'Waiting for ' + Session.host().name + ' (host) to pick a map — explore the treehouse!'; const wv = Math.min(SW - 20, (hs.length * 7.2 + 40) * u), hy = SH - 96 * u; rr(ctx, SW / 2 - wv / 2, hy - 14 * u, wv, 28 * u, 12); ctx.fillStyle = 'rgba(58,42,30,.7)'; ctx.fill(); txt(ctx, hs, SW / 2, hy, 13 * u, '#fff', 'center', null, 600); } else { rr(ctx, SW / 2 - 330 * u, h - 14 * u, 660 * u, 28 * u, 12); ctx.fillStyle = 'rgba(58,42,30,.7)'; ctx.fill();
    txt(ctx, 'Walk to a map card and press ' + this.keyFor(this.players[0] || { entry: { input: 'kb1' } }, 'interact') + ' to play · Friends: press A on a controller or Enter to join', SW / 2, h, 13 * u, '#fff', 'center', null, 600); }
    if (Lobby.launch) {
      const m = MAP_BY_ID[Lobby.launch.mapId];
      panel(ctx, SW / 2 - 240 * u, SH / 2 - 60 * u, 480 * u, 120 * u, '#fff1c4');
      txt(ctx, this.modeObj().icon + ' ' + this.modeObj().name + ' on ' + (Lobby.launch.custom ? Lobby.launch.custom.name : m.name), SW / 2, SH / 2 - 20 * u, 22 * u, '#e8573f');
      txt(ctx, Lobby.launch.t > 0 ? 'Starting in ' + Math.ceil(Lobby.launch.t) + '…' + (!Net.online || Net.isHost ? '   (Esc / B to cancel)' : '') : 'Starting…', SW / 2, SH / 2 + 22 * u, 16 * u, INK, 'center', null, 600);
    }
  }
  drawCardInfo(ctx, c, p, u) {
    const m = c.map, un = mapUnlocked(m), R = this.rig;
    const [sx, sy] = R.toScreen(c.x + c.w / 2, c.y), [, sy2] = R.toScreen(0, c.y + c.h);
    const w = 290 * u, h = 150 * u, x = clamp(sx - w / 2, 10, R.sw - w - 10), y = sy - h - 10 < 60 ? Math.min(sy2 + 10, R.shH - h - 50) : sy - h - 10;
    rr(ctx, x, y, w, h, 12); fillStroke(ctx, 'rgba(255,248,236,.97)', 3);
    txt(ctx, m.name, x + 14 * u, y + 20 * u, 19 * u, '#e8573f', 'left', null);
    txt(ctx, m.theme, x + 14 * u, y + 42 * u, 13 * u, INK, 'left', null, 600);
    const lines = [];
    lines.push('⚙ ' + m.mechText);
    lines.push('👥 Party & Creative: 1–8 players  ·  ' + (m.mech ? 'Tricky' : 'Classic'));
    lines.push('⏱ Challenge best: ' + fmtTime(Save.data.best[m.id]) + (Save.data.medals[m.id] ? '  ' + { gold: '🥇', silver: '🥈', bronze: '🥉' }[Save.data.medals[m.id]] : ''));
    let yy = y + 64 * u; const maxCh = Math.floor((w - 28 * u) / (6.3 * u));
    for (const l of lines) { const words = l.split(' '); let cur = ''; for (const wd of words) { if ((cur + wd).length > maxCh) { txt(ctx, cur, x + 14 * u, yy, 12 * u, INK, 'left', null, 500); yy += 15 * u; cur = ''; } cur += wd + ' '; } txt(ctx, cur, x + 14 * u, yy, 12 * u, INK, 'left', null, 500); yy += 17 * u; }
    txt(ctx, un ? '[' + this.keyFor(p, 'interact') + '] Play ' + this.modeObj().name + '   [' + this.keyFor(p, 'fav') + '] ♥' : '[' + this.keyFor(p, 'fav') + '] ♥ favourite', x + w - 12 * u, y + h - 12 * u, 12 * u, '#3f8de8', 'right', null, 700);
  }
}
Net.on('lobbyMap', a => { Session.mapId = a.map; });
Net.on('lobbyMode', a => { Session.mode = a.mode; const m = MODES.find(x => x.id === a.mode); toast(m.icon + ' Mode: <b>' + m.name + '</b> — ' + m.desc); });
// Old UI code calls Lobby.startLaunch
Lobby.startLaunch = (mapId, custom) => { if (Lobby.scene) Lobby.scene.startLaunch(mapId, custom); };
