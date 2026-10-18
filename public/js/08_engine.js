// ===================== PHASER HELPERS =====================
// GCtx: a small Canvas2D-style facade over Phaser.GameObjects.Graphics, so per-frame vector
// drawing (beams, chains, HUD panels, previews) is rendered by Phaser's batched renderer.
const _colCache = new Map();
function parseColor(c) {
  if (c && c._stops) c = c._stops[0] || '#fff';
  if (typeof c !== 'string') return [0xffffff, 1];
  let r = _colCache.get(c); if (r) return r;
  let v = 0xffffff, a = 1;
  if (c[0] === '#') { let h = c.slice(1); if (h.length === 3) h = h.split('').map(x => x + x).join(''); v = parseInt(h.slice(0, 6), 16); }
  else { const m = c.match(/rgba?\(([^)]+)\)/); if (m) { const p = m[1].split(',').map(Number); v = (p[0] << 16) | (p[1] << 8) | p[2]; if (p.length > 3) a = p[3]; } else if (c === 'white') v = 0xffffff; else if (c === 'black') v = 0; else if (c === 'lime') v = 0x00ff00; else if (c === 'red') v = 0xff0000; }
  r = [v, a]; _colCache.set(c, r); return r;
}
class GCtx {
  constructor(g, scene) { this.g = g; this.scene = scene; this.isG = true; this._f = [0xffffff, 1]; this._s = [0, 1]; this.lineWidth = 1; this.globalAlpha = 1; this.subs = []; this.cur = null; this.dash = null; this.stack = []; this.font = ''; this.textAlign = 'left'; this.textBaseline = 'alphabetic'; this.lineCap = 'round'; this.lineJoin = 'round'; this.lineDashOffset = 0; this.imageSmoothingEnabled = true; this.globalCompositeOperation = 'source-over'; this.canvas = { width: 0, height: 0 }; }
  set fillStyle(c) { this._f = parseColor(c); this._fRaw = c; } get fillStyle() { return this._fRaw; }
  set strokeStyle(c) { this._s = parseColor(c); this._sRaw = c; } get strokeStyle() { return this._sRaw; }
  clear() { this.g.clear(); this.stack = []; }
  save() { this.stack.push([this._f, this._s, this.lineWidth, this.globalAlpha, this.dash, this._fRaw, this._sRaw]); this.g.save(); }
  restore() { const s = this.stack.pop(); if (s) [this._f, this._s, this.lineWidth, this.globalAlpha, this.dash, this._fRaw, this._sRaw] = s; this.g.restore(); }
  translate(x, y) { this.g.translateCanvas(x, y); } rotate(a) { this.g.rotateCanvas(a); } scale(x, y) { this.g.scaleCanvas(x, y); }
  setTransform() { } resetTransform() { } clip() { } clearRect() { } drawImage() { } fillText() { } strokeText() { }
  measureText(s) { const m = /(\d+(\.\d+)?)px/.exec(this.font); return { width: String(s).length * (m ? +m[1] : 12) * .55 }; }
  setLineDash(a) { this.dash = a && a.length ? a : null; }
  createLinearGradient() { return { _stops: [], addColorStop(o, c) { this._stops.push(c); } }; }
  createRadialGradient() { return this.createLinearGradient(); }
  beginPath() { this.subs = []; this.cur = null; }
  moveTo(x, y) { this.cur = { pts: [x, y], closed: false }; this.subs.push(this.cur); }
  lineTo(x, y) { if (!this.cur) this.moveTo(x, y); else this.cur.pts.push(x, y); }
  last() { const p = this.cur.pts; return [p[p.length - 2], p[p.length - 1]]; }
  quadraticCurveTo(cx, cy, x, y) { if (!this.cur) this.moveTo(cx, cy); const [x0, y0] = this.last(); for (let i = 1; i <= 8; i++) { const t = i / 8, u = 1 - t; this.cur.pts.push(u * u * x0 + 2 * u * t * cx + t * t * x, u * u * y0 + 2 * u * t * cy + t * t * y); } }
  bezierCurveTo(c1x, c1y, c2x, c2y, x, y) { if (!this.cur) this.moveTo(c1x, c1y); const [x0, y0] = this.last(); for (let i = 1; i <= 12; i++) { const t = i / 12, u = 1 - t; this.cur.pts.push(u * u * u * x0 + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * x, u * u * u * y0 + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * y); } }
  arc(x, y, r, a0, a1, ccw) {
    let d = a1 - a0; if (ccw) { if (d > 0) d -= TAU * Math.ceil(d / TAU); } else if (d < 0) d += TAU * Math.ceil(-d / TAU);
    if (Math.abs(a1 - a0) >= TAU - 1e-6) d = ccw ? -TAU : TAU;
    const n = Math.max(6, Math.min(48, Math.ceil(Math.abs(d) * Math.max(r, 2) / 5)));
    for (let i = 0; i <= n; i++) { const a = a0 + d * i / n, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; if (i === 0 && !this.cur) this.moveTo(px, py); else this.lineTo(px, py); }
  }
  ellipse(x, y, rx, ry, rot, a0, a1, ccw) {
    let d = a1 - a0; if (Math.abs(d) >= TAU - 1e-6) d = TAU; else if (ccw && d > 0) d -= TAU; else if (!ccw && d < 0) d += TAU;
    const n = Math.max(8, Math.min(40, Math.ceil(Math.abs(d) * Math.max(rx, ry) / 5))), c = Math.cos(rot || 0), s = Math.sin(rot || 0);
    for (let i = 0; i <= n; i++) { const a = a0 + d * i / n, ex = Math.cos(a) * rx, ey = Math.sin(a) * ry, px = x + ex * c - ey * s, py = y + ex * s + ey * c; if (i === 0 && !this.cur) this.moveTo(px, py); else this.lineTo(px, py); }
  }
  arcTo(x1, y1, x2, y2, r) {
    if (!this.cur) { this.moveTo(x1, y1); return; }
    const [x0, y0] = this.last();
    let v1x = x0 - x1, v1y = y0 - y1, v2x = x2 - x1, v2y = y2 - y1; const l1 = Math.hypot(v1x, v1y), l2 = Math.hypot(v2x, v2y);
    if (r <= 0 || l1 < 1e-6 || l2 < 1e-6) { this.lineTo(x1, y1); return; }
    v1x /= l1; v1y /= l1; v2x /= l2; v2y /= l2;
    const th = Math.acos(clamp(v1x * v2x + v1y * v2y, -1, 1)); if (th < 1e-3 || Math.abs(th - Math.PI) < 1e-3) { this.lineTo(x1, y1); return; }
    const dist = r / Math.tan(th / 2), bx = v1x + v2x, by = v1y + v2y, bl = Math.hypot(bx, by), cd = r / Math.sin(th / 2);
    const cx = x1 + bx / bl * cd, cy = y1 + by / bl * cd, t1x = x1 + v1x * dist, t1y = y1 + v1y * dist, t2x = x1 + v2x * dist, t2y = y1 + v2y * dist;
    this.lineTo(t1x, t1y);
    let a0 = Math.atan2(t1y - cy, t1x - cx), a1 = Math.atan2(t2y - cy, t2x - cx), d = a1 - a0; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
    const n = Math.max(3, Math.ceil(Math.abs(d) * r / 4)); for (let i = 1; i <= n; i++) { const a = a0 + d * i / n; this.cur.pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
  }
  rect(x, y, w, h) { this.subs.push({ pts: [x, y, x + w, y, x + w, y + h, x, y + h], closed: true }); this.cur = null; }
  closePath() { if (this.cur) { this.cur.closed = true; const p = this.cur.pts; this.cur = { pts: [p[0], p[1]], closed: false, ghost: true }; this.subs.push(this.cur); } }
  _pts(sub) { const o = []; for (let i = 0; i < sub.pts.length; i += 2) o.push({ x: sub.pts[i], y: sub.pts[i + 1] }); return o; }
  fill() { this.g.fillStyle(this._f[0], this._f[1] * this.globalAlpha); for (const s of this.subs) if (s.pts.length >= 6) this.g.fillPoints(this._pts(s), true); }
  stroke() {
    if (this.lineWidth <= 0) return;
    this.g.lineStyle(this.lineWidth, this._s[0], this._s[1] * this.globalAlpha);
    for (const s of this.subs) {
      if (s.pts.length < 4) continue;
      const P = this._pts(s); if (s.closed) P.push({ x: P[0].x, y: P[0].y });
      if (this.dash) this._dashed(P); else this.g.strokePoints(P, false, false);
    }
  }
  _dashed(P) {
    const [on, off] = [this.dash[0], this.dash[1] == null ? this.dash[0] : this.dash[1]]; let draw = true, left = on;
    for (let i = 1; i < P.length; i++) {
      let x0 = P[i - 1].x, y0 = P[i - 1].y; const x1 = P[i].x, y1 = P[i].y; let segL = Math.hypot(x1 - x0, y1 - y0);
      while (segL > 0) { const st = Math.min(left, segL), k = st / segL, nx = x0 + (x1 - x0) * k, ny = y0 + (y1 - y0) * k; if (draw) this.g.lineBetween(x0, y0, nx, ny); x0 = nx; y0 = ny; segL -= st; left -= st; if (left <= 1e-6) { draw = !draw; left = draw ? on : off; } }
    }
  }
  fillRect(x, y, w, h) { this.g.fillStyle(this._f[0], this._f[1] * this.globalAlpha); this.g.fillRect(x, y, w, h); }
  strokeRect(x, y, w, h) { this.beginPath(); this.rect(x, y, w, h); this.stroke(); }
}

// Immediate-mode pools of Phaser Text / Image objects (reset each frame, unused ones hidden)
class TextPool {
  constructor(scene, depth = 100) { this.s = scene; this.list = []; this.i = 0; this.depth = depth; this.scrollFactor = 0; }
  begin() { this.i = 0; }
  get(str, x, y, size, color = '#fff', align = 'center', stroke = INK, weight = 700) {
    let t = this.list[this.i];
    if (!t) { t = this.s.add.text(0, 0, '', { fontFamily: 'Fredoka, Trebuchet MS, sans-serif' }).setDepth(this.depth).setScrollFactor(this.scrollFactor); this.list.push(t); }
    this.i++;
    const st = t._st || (t._st = {});
    const fs = Math.round(size) + 'px', fw = String(weight);
    if (st.fs !== fs || st.fw !== fw) { t.setFontSize(fs); t.setFontStyle(fw === '700' ? 'bold' : fw === '600' ? 'bold' : 'normal'); st.fs = fs; st.fw = fw; }
    if (st.c !== color) { t.setColor(color); st.c = color; }
    const sk = stroke || 'none'; if (st.sk !== sk || st.sz !== size) { t.setStroke(stroke || '#000', stroke ? Math.max(3, size / 6) : 0); st.sk = sk; st.sz = size; }
    if (t.text !== String(str)) t.setText(String(str));
    t.setOrigin(align === 'left' ? 0 : align === 'right' ? 1 : .5, .5).setPosition(x, y).setVisible(true).setAlpha(1);
    return t;
  }
  end() { for (let j = this.i; j < this.list.length; j++) this.list[j].setVisible(false); }
}
class ImagePool {
  constructor(scene, depth = 100) { this.s = scene; this.list = []; this.i = 0; this.depth = depth; this.scrollFactor = 0; }
  begin() { this.i = 0; }
  get(key, x, y, scale = 1, alpha = 1) {
    let im = this.list[this.i];
    if (!im) { im = this.s.add.image(0, 0, key).setDepth(this.depth).setScrollFactor(this.scrollFactor); this.list.push(im); }
    this.i++;
    if (im.texture.key !== key && this.s.textures.exists(key)) im.setTexture(key);
    im.setPosition(x, y).setScale(scale).setAlpha(alpha).setVisible(true).setAngle(0).setDepth(this.depth + (this.i * .001));
    return im;
  }
  end() { for (let j = this.i; j < this.list.length; j++) this.list[j].setVisible(false); }
}

// ---------- Particle effects (Phaser emitters) ----------
const FX = {
  scene: null, em: {},
  attach(scene) { this.scene = scene; this.em = {}; },
  emitter(kind, color) {
    const tex = fxTexture(kind, color), k = tex;
    if (this.em[k] && this.em[k].scene) return this.em[k];
    const base = { emitting: false, lifespan: 700, speed: { min: 60, max: 260 }, gravityY: 600 };
    if (kind === 'dot') Object.assign(base, { scale: { start: .5, end: 0 } });
    if (kind === 'feather') Object.assign(base, { scale: .7, rotate: { min: 0, max: 360 }, alpha: { start: 1, end: 0 } });
    if (kind === 'puff') Object.assign(base, { scale: { start: .5, end: 1.3 }, alpha: { start: .9, end: 0 } });
    if (kind === 'star') Object.assign(base, { scale: { start: .7, end: .1 }, rotate: { start: 0, end: 360 }, alpha: { start: 1, end: .2 } });
    const e = this.scene.add.particles(0, 0, tex, base).setDepth(25);
    this.em[k] = e; return e;
  },
  burst(x, y, n, opt = {}) {
    if (!this.scene || !this.scene.sys || !this.scene.sys.isActive()) return;
    const cols = Array.isArray(opt.color) ? opt.color : [opt.color || '#ffffff'], kind = opt.kind || 'dot';
    const per = Math.max(1, Math.round(n / cols.length));
    for (const c of cols) {
      const e = this.emitter(kind, c.replace(/\s/g, ''));
      e.setParticleSpeed({ min: opt.smin || 60, max: opt.smax || 260 });
      e.setParticleLifespan({ min: (opt.lmin || .4) * 1000, max: (opt.lmax || .9) * 1000 });
      e.setParticleGravity(0, opt.g != null ? opt.g : 600);
      if (opt.angle != null) { const sp = opt.spread || 1; e.setEmitterAngle({ min: (opt.angle - sp) * 180 / Math.PI, max: (opt.angle + sp) * 180 / Math.PI }); } else e.setEmitterAngle({ min: 0, max: 360 });
      const sz = ((opt.rmin || 3) + (opt.rmax || 7)) / 10;
      if (kind === 'dot') e.setParticleScale({ start: .5 * sz, end: 0 }); else if (kind === 'puff') e.setParticleScale({ start: .5 * sz, end: 1.3 * sz });
      e.explode(per, x, y);
    }
  },
  text(x, y, str, color = '#fff') {
    if (!this.scene || !this.scene.sys || !this.scene.sys.isActive()) return;
    const t = this.scene.add.text(x, y, str, { fontFamily: 'Fredoka, sans-serif', fontSize: '18px', fontStyle: 'bold', color, stroke: INK, strokeThickness: 4 }).setOrigin(.5).setDepth(40);
    this.scene.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 1100, ease: 'Quad.easeOut', onComplete: () => t.destroy() });
  },
};
