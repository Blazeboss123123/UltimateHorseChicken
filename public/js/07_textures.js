// ===================== TEXTURE BAKING =====================
// All art is drawn once with canvas code and turned into Phaser textures, spritesheets and animations.
const TS = 2; // texture supersampling: textures are drawn at 2x and displayed at 0.5 scale so zooming stays crisp
const TEX = {
  scene: null,
  canvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; },
  has(key) { return this.scene.textures.exists(key); },
  add(key, canvas) { if (this.has(key)) this.scene.textures.remove(key); return this.scene.textures.addCanvas(key, canvas); },
  // Draw fn into a supersampled canvas of world size w x h (+pad) and register it.
  bake(key, w, h, fn, pad = 0, scale = TS, paint = true) {
    if (this.has(key)) return key;
    const c = this.canvas((w + pad * 2) * scale, (h + pad * 2) * scale), g = c.getContext('2d');
    g.scale(scale, scale); g.translate(pad, pad); fn(g);
    if (paint && c.width > 24) paintify(c, 0, 0, c.width, c.height, { light: .1, dark: .12, grain: .45 });
    this.add(key, c); return key;
  },
};

// ---------- characters ----------
const CHAR_CELL = { w: 96, h: 136, fx: 48, fy: 128 }; // feet position inside each frame (texture px)
const CHAR_SETS = [
  ['idle', 4, k => ({ state: 'idle', t: k / 4 * (TAU / 3) })],
  ['blink', 1, () => ({ state: 'idle', t: 0, blink: true })],
  ['run', 8, k => ({ state: 'run', phase: k / 8 * TAU, t: k * .05 })],
  ['jump', 1, () => ({ state: 'jump', t: 0 })],
  ['fall', 2, k => ({ state: 'fall', t: k * .14 })],
  ['wall', 1, () => ({ state: 'wall', t: 0 })],
  ['climb', 4, k => ({ state: 'climb', t: k / 4 * (TAU / 10) })],
  ['dance', 8, k => ({ state: 'dance', t: k / 8 * (TAU / 7), happy: true, noSpin: true })],
  ['stun', 4, k => ({ state: 'stun', t: k / 4 * (TAU / 6) })],
  ['scared', 2, k => ({ state: 'idle', t: k * .5, scared: true })],
  ['scaredrun', 8, k => ({ state: 'run', phase: k / 8 * TAU, t: k * .05, scared: true })],
  ['scaredfall', 2, k => ({ state: 'fall', t: k * .14, scared: true })],
  ['dead', 1, () => ({ state: 'fall', t: 0, dead: true })],
];
const CHAR_RATES = { idle: 5, run: 15, fall: 10, climb: 10, dance: 9, stun: 8, scared: 6, scaredrun: 15, scaredfall: 10 };
function lookKey(e) { return e.char + '_' + e.hat + '_' + (e.colorIdx || 0); }
function bakeCharacter(e) {
  const key = 'chr_' + lookKey(e);
  if (TEX.has(key)) return key;
  const total = CHAR_SETS.reduce((a, s) => a + s[1], 0), cols = 8, rows = Math.ceil(total / cols);
  const C = CHAR_CELL, c = TEX.canvas(cols * C.w, rows * C.h), g = c.getContext('2d');
  const frames = []; let i = 0;
  for (const [name, n, f] of CHAR_SETS) for (let k = 0; k < n; k++) {
    const x = (i % cols) * C.w, y = Math.floor(i / cols) * C.h;
    g.save(); g.beginPath(); g.rect(x, y, C.w, C.h); g.clip();
    const o = Object.assign({ x: x + C.fx, y: y + C.fy, facing: 1, scale: TS, hat: e.hat, color: PLAYER_COLORS[e.colorIdx || 0], lookX: .5 }, f(k));
    o.y = y + C.fy; // feet
    drawChar(g, e.char, o);
    g.restore();
    paintify(c, x, y, C.w, C.h, { light: .06, dark: .1, grain: .4 });
    frames.push({ name: name + k, x, y }); i++;
  }
  const tex = TEX.add(key, c);
  for (const fr of frames) tex.add(fr.name, 0, fr.x, fr.y, C.w, C.h);
  const A = TEX.scene.anims;
  for (const [name, n] of CHAR_SETS) {
    const ak = key + '_' + name; if (A.exists(ak)) A.remove(ak);
    A.create({ key: ak, frames: [...Array(n).keys()].map(k => ({ key, frame: name + k })), frameRate: CHAR_RATES[name] || 6, repeat: -1 });
  }
  return key;
}
function bakePortrait(e, r = 28) {
  const key = 'por_' + lookKey(e);
  if (TEX.has(key)) return key;
  const c = TEX.canvas(r * 2 * TS + 8, r * 2 * TS + 8), g = c.getContext('2d');
  drawPortrait(g, c.width / 2, c.height / 2, r * TS, e.char, e.hat, PLAYER_COLORS[e.colorIdx || 0], { t: 0 });
  TEX.add(key, c); return key;
}
function forgetLook(e) { for (const k of ['chr_', 'por_']) { const key = k + lookKey(e); if (TEX.has(key)) TEX.scene.textures.remove(key); } }

// ---------- items ----------
const ITEM_PAD = 10;
function fakeItem(id, extra) { return Object.assign({ x: 0, y: 0, id, rot: 0, owner: -1, st: {}, ph: 0 }, extra || {}); }
function bakeItems() {
  const save = _wt; _wt = null;
  for (const id of ITEM_ORDER) {
    const d = ITEMS[id];
    // base art (static parts only)
    TEX.bake('it_' + id, d.w * T, d.h * T, g => {
      const f = fakeItem(id);
      if (ITEM_BASE[id]) ITEM_BASE[id](g, d); else if (!ITEM_NOBASE.has(id)) d.draw(g, f, 0);
    }, ITEM_PAD);
    // icon for menus / HUD
    const ic = TEX.canvas(72, 72); drawItemIcon(ic.getContext('2d'), id, 36, 36, 60, 1); TEX.add('ico_' + id, ic);
  }
  _wt = save;
  // animated conveyor frames
  for (let k = 0; k < 4; k++) TEX.bake('it_conveyor_' + k, 4 * T, T / 2, g => ITEMS.conveyor.draw(g, fakeItem('conveyor'), k / 4 * .4), ITEM_PAD);
  for (let k = 0; k < 4; k++) TEX.bake('it_fan_' + k, T, T, g => ITEMS.fan.draw(g, fakeItem('fan', { _fan: null }), k / 4 * (TAU / 30)), ITEM_PAD);
  // parts
  TEX.bake('part_saw', 1.5 * T, 1.5 * T, g => drawSaw(g, .75 * T, .75 * T, .72 * T, 0), 2);
  TEX.bake('part_spikeball', 1.4 * T, 1.4 * T, g => drawSpikeball(g, .7 * T, .7 * T, .58 * T, 0), 2);
  TEX.bake('part_hub', T * .7, T * .7, g => { rr(g, 0, 0, T * .7, T * .7, 4); fillStroke(g, '#e8a33a', 2.5); circ(g, T * .35, T * .35, 4, INK, 0); }, 2);
  TEX.bake('part_arm', 2 * T, 8, g => { rr(g, 0, 0, 2 * T, 8, 4); fillStroke(g, '#a8afb8', 2); }, 2);
  TEX.bake('part_anchor', 20, 12, g => { rr(g, 0, 0, 20, 12, 3); fillStroke(g, '#7a7f88', 2); }, 2);
  TEX.bake('part_mover', 3 * T, T / 2, g => { rr(g, 0, 0, 3 * T, T / 2, 4); fillStroke(g, '#7fb6e8', 2.5); g.fillStyle = '#ffd34d'; for (let x = 8; x < 3 * T - 6; x += 14) g.fillRect(x, 4, 6, T / 2 - 8); }, 2);
  TEX.bake('part_wsail', 2 * T, T / 2, g => { rr(g, 0, 0, 2 * T, T / 2, 4); fillStroke(g, '#e2bd86', 2.5); g.fillStyle = '#e8473f'; g.fillRect(4, 3, 2 * T - 8, 3); }, 2);
  TEX.bake('part_wspoke', 2.45 * T, 8, g => { line(g, 0, 4, 2.45 * T, 4, '#5a3a1e', 7); line(g, 0, 4, 2.45 * T, 4, '#e8e0cc', 3.5); }, 2);
  TEX.bake('part_whub', 28, 28, g => { circ(g, 14, 14, 12, '#e8473f', 2.5); circ(g, 14, 14, 4, '#ffd34d', 1.5); }, 2);
  TEX.bake('part_swing', 2.5 * T, T / 2, g => drawWood(g, 0, 0, 2.5 * T, T / 2, 77, '#d8b27e'), 2);
  TEX.bake('part_flipper', 3 * T, T / 2, g => { rr(g, 0, 0, 3 * T, T / 2, 4); fillStroke(g, '#8ccaf0', 2.5); g.fillStyle = '#ffffff'; for (let i = 0; i < 3; i++) g.fillRect(10 + i * T, T / 4 - 3, T - 20, 6); }, 2);
  TEX.bake('part_flipper_b', 3 * T, T / 2, g => { rr(g, 0, 0, 3 * T, T / 2, 4); fillStroke(g, '#6fa0c8', 2.5); g.fillStyle = '#4a7aa0'; for (let i = 0; i < 3; i++) g.fillRect(10 + i * T, T / 4 - 3, T - 20, 6); }, 2);
  TEX.bake('part_bumper', T, T, g => ITEMS.bumper.draw(g, fakeItem('bumper')), 3);
  TEX.bake('part_glove', 22, 22, g => { ell(g, 12, 11, 9, 10, '#e8473f', 2.2); ell(g, 8, 4, 4, 3, '#e8473f', 1.6); }, 2);
  TEX.bake('part_punch_arm', T * 2, 6, g => { g.setLineDash([3, 3]); line(g, 0, 3, T * 2, 3, '#888', 3); }, 2);
  TEX.bake('part_acorn', 24, 30, g => drawAcorn(g, 12, 18, 1, 0), 2);
  TEX.bake('part_bh', 2 * T, 2 * T, g => { g.save(); g.translate(T, T); for (let i = 0; i < 6; i++) { g.rotate(TAU / 6); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(T * .8, -T * .2, T * .9, T * .5); g.strokeStyle = '#2a1636'; g.lineWidth = 3; g.stroke(); } g.restore(); circ(g, T, T, .5 * T, '#0c0612', 2); }, 2);
  TEX.bake('part_ring', 64, 64, g => { g.beginPath(); g.arc(32, 32, 30, 0, TAU); g.strokeStyle = 'rgba(40,20,60,.5)'; g.lineWidth = 3; g.stroke(); }, 1, 2);
  for (const [k, c1, c2] of [['in', '#7a3fc4', '#d9b8ff'], ['out', '#2fa36a', '#b8ffd9']]) TEX.bake('part_portal_' + k, T, 2 * T, g => { ell(g, T / 2, T, T / 2 - 1, T - 1, c1, 2.5); g.save(); g.translate(T / 2, T); g.strokeStyle = c2; g.lineWidth = 2.5; g.beginPath(); for (let a = 0; a < 12; a += .3) g.lineTo(Math.cos(a) * a * T / 26, Math.sin(a) * a * 2 * T / 26); g.stroke(); g.restore(); }, 2);
  for (let k = 0; k < 3; k++) TEX.bake('part_flame_' + k, 3 * T, T * .8, g => { for (let i = 0; i < 9; i++) { const q = i / 9, x = q * 3 * T, s = 10 * (1 - q * .5) + Math.sin(k * 2 + i) * 2; g.fillStyle = q < .3 ? '#fff3a0' : q < .65 ? '#ffb62e' : '#ff5a2a'; g.globalAlpha = .9; g.beginPath(); g.arc(x + 4, T * .4 + Math.sin(k * 3 + i * 2) * 2, s, 0, TAU); g.fill(); } g.globalAlpha = 1; }, 4);
  // projectiles
  TEX.bake('pr_arrow', 44, 16, g => { line(g, 4, 8, 32, 8, '#5a3414', 5.5); line(g, 4, 8, 32, 8, '#a8703a', 3); poly(g, [[30, 2], [43, 8], [30, 14]], '#e4e8ee', 1.8); poly(g, [[0, 3], [10, 8], [0, 13], [4, 8]], '#e8473f', 1.4); poly(g, [[6, 3], [14, 8], [6, 13], [9, 8]], '#ff8a7a', 1.2); }, 4);
  TEX.bake('pr_ball', 24, 24, g => { circ(g, 12, 12, 11, '#2a2a30', 2.4); circ(g, 8.5, 8.5, 3.5, '#6a6a74', 0); circ(g, 7.5, 7.5, 1.6, '#b8b8c0', 0); }, 2);
  TEX.bake('pr_fire', 28, 28, g => { for (let i = 3; i >= 0; i--) circ(g, 14, 14 + i * 2, 11 * (1 - i * .2), ['#fff3a0', '#ffd34d', '#ffb62e', '#ff5a2a'][i], 0); circ(g, 14, 14, 11, null, 2); }, 2);
  // flag & misc
  TEX.bake('flag_pole', 8, 80, g => { line(g, 4, 80, 4, 6, '#5a4636', 4); circ(g, 4, 6, 4, '#ffd34d', 2); }, 4);
  for (const col of ['#ffd34d', '#e8473f']) for (let k = 0; k < 4; k++) TEX.bake('flag_' + col + k, 44, 30, g => { g.beginPath(); g.moveTo(0, 2); for (let i = 0; i <= 8; i++) g.lineTo(i * 5, 2 + Math.sin(k / 4 * TAU + i * .8) * 3 * (i / 8)); for (let i = 8; i >= 0; i--) g.lineTo(i * 5, 26 + Math.sin(k / 4 * TAU + i * .8) * 3 * (i / 8) - i * 1.4); g.closePath(); fillStroke(g, col, 2.5); }, 4);
  TEX.bake('cloud', 150, 84, g => drawCloud(g, 30, 48, 1.12, '#ffffff'), 4, 1.5, false);
  TEX.bake('px', 2, 2, g => { g.fillStyle = '#fff'; g.fillRect(0, 0, 2, 2); }, 0, 1);
}
// Items that draw nothing static (their parts are separate sprites)
const ITEM_NOBASE = new Set(['saw', 'sawarm', 'pendulum', 'spikeball', 'blackhole', 'coin', 'portal', 'swing', 'flipper', 'bumper']);
const ITEM_BASE = {
  mover(g, d) { g.setLineDash([4, 6]); line(g, 6, T / 4, d.w * T - 6, T / 4, 'rgba(58,42,30,.55)', 3); g.setLineDash([]); },
  puncher(g) { ITEM_ART.puncher(g, T, T, 0); },
  fan(g) { ITEM_ART.fan(g, T, T, 0); },
  laser(g) { ITEM_ART.laser(g, T, T, 0); },
  conveyor(g) { ITEMS.conveyor.draw(g, fakeItem('conveyor'), 0); },
};

// ---------- particles ----------
function fxTexture(kind, color) {
  const key = 'fx_' + kind + '_' + color;
  if (TEX.has(key)) return key;
  if (kind === 'feather') TEX.bake(key, 16, 7, g => { g.fillStyle = color; g.beginPath(); g.ellipse(8, 3.5, 8, 3.5, 0, 0, TAU); g.fill(); }, 1);
  else if (kind === 'star') TEX.bake(key, 16, 16, g => { g.fillStyle = color; starPath(g, 8, 8, 8, 3.6, 5); g.fill(); }, 1);
  else if (kind === 'puff') TEX.bake(key, 24, 24, g => { const gr = g.createRadialGradient(12, 12, 2, 12, 12, 12); gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 24, 24); }, 0);
  else TEX.bake(key, 10, 10, g => { g.fillStyle = color; g.beginPath(); g.arc(5, 5, 5, 0, TAU); g.fill(); }, 0);
  return key;
}

// ---------- maps ----------
const BG_RES = .45;
function bakeMap(m) {
  const id = m.id, MW = m.w * T, MH = m.h * T;
  const x0 = -900, x1 = MW + 900, y0 = -500, y1 = MH + 500;
  const layer = (key, fn, ya = y0, yb = y1) => { if (TEX.has(key)) return; const c = TEX.canvas((x1 - x0) * BG_RES, (yb - ya) * BG_RES), g = c.getContext('2d'); g.scale(BG_RES, BG_RES); g.translate(-x0, -ya); fn(g); TEX.add(key, c); };
  if (!TEX.has('bgsky_' + id)) { const c = TEX.canvas(4, 256), g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, shade(m.pal.sky[0], -.14)); gr.addColorStop(.5, m.pal.sky[0]); gr.addColorStop(1, m.pal.sky[1]); g.fillStyle = gr; g.fillRect(0, 0, 4, 256); TEX.add('bgsky_' + id, c); }
  layer('bgair_' + id, g => paintSky(g, m, x0, x1, -1400, y1), -1400, y1);
  layer('bgfar_' + id, g => paintBgLayer('far', g, m, x0, x1));
  layer('bgland_' + id, g => paintBgLayer('land', g, m, x0, x1));
  layer('bgnear_' + id, g => paintBgLayer('near', g, m, x0, x1));
  if (!TEX.has('ter_' + id)) { const L = renderTerrainLayer(m, 1.5); TEX.add('ter_' + id, L.canvas); }
  return { x0, y0, skyY0: -1400 };
}
function bakeThumb(m) { const key = 'thumb_' + m.id; if (!TEX.has(key)) TEX.add(key, mapThumb(m, 300, 216)); return key; }
