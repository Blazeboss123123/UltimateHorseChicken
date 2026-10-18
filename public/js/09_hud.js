// ===================== CAMERA RIG + HUD SCENE =====================
class CamRig {
  constructor(cam) { this.cam = cam; this.x = cam.midPoint.x; this.y = cam.midPoint.y; this.z = cam.zoom; this.tx = this.x; this.ty = this.y; this.tz = this.z; }
  get sw() { return this.cam.width; } get shH() { return this.cam.height; }
  unit() { return this.cam.height / 720; }
  set(x, y, z, snap) { this.tx = x; this.ty = y; this.tz = z; if (snap) { this.x = x; this.y = y; this.z = z; this.apply(); } }
  fit(r, pad, zmin, zmax, snap) { const w = r.w + pad * 2, h = r.h + pad * 2; const z = clamp(Math.min(this.sw / w, this.shH / h), zmin, zmax); this.set(r.x + r.w / 2, r.y + r.h / 2, z, snap); }
  clampTo(b) {
    const hw = this.sw / 2 / this.tz, hh = this.shH / 2 / this.tz;
    this.tx = b.w > hw * 2 ? clamp(this.tx, b.x + hw, b.x + b.w - hw) : b.x + b.w / 2;
    this.ty = b.h > hh * 2 ? clamp(this.ty, b.y + hh, b.y + b.h - hh) : b.y + b.h / 2;
  }
  update(dt) {
    const k = 1 - Math.pow(.0025, dt), kz = 1 - Math.pow(.02, dt);
    this.x = lerp(this.x, this.tx, k); this.y = lerp(this.y, this.ty, k); this.z = lerp(this.z, this.tz, kz);
    this.apply();
  }
  apply() { if (this.split && this.split.on) return; this.cam.setZoom(this.z); this.cam.centerOn(this.x, this.y); }
  toWorld(sx, sy) { return [(sx - this.sw / 2) / this.z + this.x, (sy - this.shH / 2) / this.z + this.y]; }
  toScreen(wx, wy) { return [(wx - this.x) * this.z + this.sw / 2, (wy - this.y) * this.z + this.shH / 2]; }
}
function mapBounds(W) { return { x: -3 * T, y: -7 * T, w: W.map.w * T + 6 * T, h: W.map.h * T + 8 * T }; }
function fitWholeMap(rig, W, snap) { const z = Math.min(rig.sw / (W.map.w * T + 2 * T), rig.shH / (W.map.h * T + 3 * T)); rig.set(W.map.w * T / 2, W.map.h * T / 2 - T, z, snap); }
function cameraOnPlayers(rig, W, list, snap) {
  const S = Save.data.settings;
  if (S.camMode === 'map') { fitWholeMap(rig, W, snap); return; }
  let L = list.filter(p => p.alive && !p.finished);
  if (!L.length) L = list.filter(p => p.alive || p.deathT < 1);
  if (!L.length) L = list;
  if (S.camMode === 'p1') L = [L.find(q => q.entry === Session.host()) || L[0]];
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const p of L) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y - 20); x1 = Math.max(x1, p.x + p.w); y1 = Math.max(y1, p.y + p.h); }
  const u = rig.unit(), fitZ = Math.min(rig.sw / (W.map.w * T + 2 * T), rig.shH / (W.map.h * T + 3 * T));
  const zmin = Math.max(Math.min(fitZ, S.minZoom * u * 1.6), S.minZoom * u), zmax = 1.2 * u;
  rig.fit({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, 150 * u * .6 + 60, Math.min(zmin, zmax), zmax, snap);
  rig.clampTo(mapBounds(W));
}


// ---------- Split screen: up to 4 Phaser cameras, one per local player ----------
class SplitCams {
  constructor(scene, rig) { this.s = scene; this.rig = rig; this.cams = []; this.on = false; this.n = 0; }
  wanted(players) { return Save.data.settings.camMode === 'split' && players.length >= 2; }
  layout(n) { const W = this.s.scale.width, H = this.s.scale.height; if (n === 2) return [[0, 0, W / 2, H], [W / 2, 0, W / 2, H]]; return [[0, 0, W / 2, H / 2], [W / 2, 0, W / 2, H / 2], [0, H / 2, W / 2, H / 2], [W / 2, H / 2, W / 2, H / 2]].slice(0, n); }
  enable(players) {
    const n = Math.min(4, players.length); if (this.on && this.n === n) return;
    this.disable(); this.on = true; this.n = n;
    const L = this.layout(n), main = this.s.cameras.main;
    main.setViewport(...L[0]);
    for (let i = 1; i < n; i++) { const c = this.s.cameras.add(...L[i]); c.setBackgroundColor(main.backgroundColor); this.cams.push(c); }
    this.all = [main].concat(this.cams); this.pos = this.all.map(() => null);
    if (n === 3) { const W = this.s.scale.width, H = this.s.scale.height; this.overview = this.s.cameras.add(W / 2, H / 2, W / 2, H / 2); this.cams.push(this.overview); }
  }
  disable() {
    if (!this.on) return; this.on = false;
    for (const c of this.cams) this.s.cameras.remove(c); this.cams = []; this.overview = null;
    this.s.cameras.main.setViewport(0, 0, this.s.scale.width, this.s.scale.height);
  }
  update(players, dt, W) {
    if (!this.on) return;
    const u = this.s.scale.height / 720, z = (this.n === 2 ? 1.0 : .8) * u, k = 1 - Math.pow(.002, dt);
    this.all.forEach((c, i) => {
      const p = players[i]; if (!p) return;
      const tx = p.x + p.w / 2, ty = p.y; let P = this.pos[i]; if (!P) P = this.pos[i] = { x: tx, y: ty };
      P.x = lerp(P.x, tx, k); P.y = lerp(P.y, ty, k);
      const hw = c.width / 2 / z, hh = c.height / 2 / z, B = mapBounds(W);
      c.setZoom(z); c.centerOn(clamp(P.x, B.x + hw, B.x + B.w - hw), clamp(P.y, B.y + hh, B.y + B.h - hh));
    });
    if (this.overview) { const o = this.overview, oz = Math.min(o.width / (W.map.w * T + 2 * T), o.height / (W.map.h * T + 3 * T)); o.setZoom(oz); o.centerOn(W.map.w * T / 2, W.map.h * T / 2 - T); }
  }
  drawFrames(ctx) { if (!this.on) return; const W = this.s.scale.width, H = this.s.scale.height; ctx.fillStyle = INK; ctx.fillRect(W / 2 - 2, 0, 4, H); if (this.n > 2) ctx.fillRect(0, H / 2 - 2, W, 4); }
}

// ---------- HUD drawing helpers (screen space) ----------
// txt works on both real canvases (art baking) and the HUD GCtx (Phaser Text objects).
function txt(ctx, s, x, y, size, col = '#fff', align = 'center', stroke = INK, weight = 700) {
  if (ctx.isG) { if (ctx.hud) ctx.hud.tp.get(s, x, y, size, col, align, stroke, weight); return; }
  ctx.font = weight + ' ' + size + 'px Fredoka, sans-serif'; ctx.textAlign = align; ctx.textBaseline = 'middle';
  if (stroke) { ctx.lineWidth = Math.max(3, size / 6); ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
  ctx.fillStyle = col; ctx.fillText(s, x, y); ctx.textBaseline = 'alphabetic';
}
function hudPortrait(ctx, x, y, r, entry, opt = {}) {
  if (!ctx.isG || !ctx.hud) return;
  const key = bakePortrait(entry); const im = ctx.hud.ip.get(key, x, y, r / (28 * TS), opt.dim ? .45 : 1);
  return im;
}
function hudIcon(ctx, id, x, y, size, alpha = 1) { if (!ctx.isG || !ctx.hud) return; ctx.hud.ip.get('ico_' + id, x, y, size / 60, alpha); }
function panel(ctx, x, y, w, h, fill = 'rgba(255,246,230,.96)') { rr(ctx, x, y + 5, w, h, 16); ctx.fillStyle = 'rgba(58,42,30,.3)'; ctx.fill(); rr(ctx, x, y, w, h, 16); fillStroke(ctx, fill, 3.5); }
function hudScale(rig) { return Math.min(1.25, Math.max(.7, rig.shH / 820)) * Save.data.settings.uiScale; }

class HudScene extends Phaser.Scene {
  constructor() { super({ key: 'Hud', active: false }); }
  create() {
    this.gr = this.add.graphics().setDepth(50); this.g = new GCtx(this.gr, this); this.g.hud = this;
    this.gr2 = this.add.graphics().setDepth(60); this.g2 = new GCtx(this.gr2, this); this.g2.hud = this; // layer above images (for markers)
    this.tp = new TextPool(this, 80); this.ip = new ImagePool(this, 70);
    // darkness overlay for the haunted map
    this.darkCv = TEX.canvas(64, 64); this.darkKey = 'darkov'; if (this.textures.exists(this.darkKey)) this.textures.remove(this.darkKey);
    this.darkTex = this.textures.addCanvas(this.darkKey, this.darkCv); this.dark = this.add.image(0, 0, this.darkKey).setOrigin(0).setDepth(40).setVisible(false);
    this.iris = this.add.graphics().setDepth(200); this.irisG = new GCtx(this.iris, this);
    this.irisChars = [this.add.sprite(0, 0, '__DEFAULT').setVisible(false).setDepth(201), this.add.sprite(0, 0, '__DEFAULT').setVisible(false).setDepth(201)];
  }
  update(time, delta) {
    const g = this.g; g.clear(); this.g2.clear(); this.tp.begin(); this.ip.begin();
    try {
      const sc = Game.worldScene();
      if (sc && sc.hudDraw && sc.sys.isActive()) sc.hudDraw(g, this);
      this.drawDark(sc);
    } catch (e) { Game.reportError(e); }
    this.tp.end(); this.ip.end();
    try { Game.drawTransition(this, Math.min(.1, delta / 1000)); } catch (e) { Game.trans = null; Game.reportError(e); }
  }
  drawDark(sc) {
    const W = sc && sc.W, rig = sc && sc.rig;
    if (!W || W.map.mech !== 'dark' || !(W.racing || W.testing) || !rig) { this.dark.setVisible(false); return; }
    const s = .25, cw = Math.ceil(rig.sw * s), ch = Math.ceil(rig.shH * s), c = this.darkCv;
    if (c.width !== cw || c.height !== ch) { c.width = cw; c.height = ch; this.darkTex.setSize(cw, ch); }
    const gx = c.getContext('2d'); gx.setTransform(1, 0, 0, 1, 0, 0); gx.globalCompositeOperation = 'source-over'; gx.clearRect(0, 0, cw, ch); gx.fillStyle = 'rgba(12,6,24,.8)'; gx.fillRect(0, 0, cw, ch);
    gx.globalCompositeOperation = 'destination-out';
    const lights = W.players.filter(p => p.alive).map(p => [p.x + p.w / 2, p.y, 190]).concat([[W.map.goal[0] * T, W.map.goal[1] * T - 30, 150], [5 * T, 14 * T, 160], [28 * T, 16 * T, 120 + Math.sin(W.t * 7) * 10], [40 * T, 20 * T, 110]]);
    for (const [x, y, r] of lights) { const [sx0, sy0] = rig.toScreen(x, y); const sx = sx0 * s, sy = sy0 * s, sr = r * rig.z * s; const gr = gx.createRadialGradient(sx, sy, sr * .25, sx, sy, sr); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); gx.fillStyle = gr; gx.beginPath(); gx.arc(sx, sy, sr, 0, TAU); gx.fill(); }
    this.darkTex.refresh(); this.dark.setVisible(true).setDisplaySize(rig.sw, rig.shH);
  }
}
