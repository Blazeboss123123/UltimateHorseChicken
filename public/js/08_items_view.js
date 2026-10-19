// ===================== ITEM VIEWS (Phaser sprites for each placed item) =====================
function partOrigin(len, pad) { return pad / (len + pad * 2); }
function makeItemView(view, it, opts = {}) {
  const s = view.s, d = ITEMS[it.id], bx = itemBox(it);
  let cx = bx.x + bx.w / 2, cy = bx.y + bx.h / 2; const ang = (it.rot & 3) * 90;
  const objs = [], depth = opts.depth || 10;
  const add = o => { objs.push(o); if (o.setDepth) o.setDepth(depth); if (opts.alpha != null && o.setAlpha) o.setAlpha(opts.alpha); return o; };
  const V = { x: it.x, y: it.y, rot: it.rot, id: it.id, it, objs, update() { }, destroy() { objs.forEach(o => o.destroy()); objs.length = 0; },
    // the item moved (it rides a windmill sail or moving platform): slide everything along
    relocate() { const dx = it.x - V.x, dy = it.y - V.y; for (const o of objs) { o.x += dx; o.y += dy; } cx += dx; cy += dy; V.x = it.x; V.y = it.y; } };
  const base = () => add(s.add.image(cx, cy, 'it_' + it.id).setScale(.5).setAngle(ang));
  const [dx, dy] = rotDir(1, 0, it.rot);
  const g = () => view.gx; // per-frame vector layer
  switch (it.id) {
    case 'conveyor': { const im = base(); V.update = t => im.setTexture('it_conveyor_' + (Math.floor(t * 10) % 4)); break; }
    case 'fan': {
      const im = base();
      V.update = t => {
        im.setTexture('it_fan_' + (Math.floor(t * 19) % 4));
        const r = it._fan; if (!r) return; const G = g(); G.globalAlpha = .3;
        for (let i = 0; i < 6; i++) { const k = ((t * 1.6 + i / 6) % 1); const x = dx ? (dx > 0 ? r.x + k * r.w : r.x + r.w - k * r.w) : r.x + (i + .5) / 6 * r.w, y = dy ? (dy > 0 ? r.y + k * r.h : r.y + r.h - k * r.h) : r.y + (i + .5) / 6 * r.h; line(G, x, y, x + dx * 14, y + dy * 14, '#ffffff', 2); }
        G.globalAlpha = 1;
      };
      break;
    }
    case 'trampoline': { const im = base(); V.update = (t, dt) => { const st = it.st || {}; if (st.boing > 0) st.boing = Math.max(0, st.boing - dt * 4); im.setScale(.5, .5 * (1 - (st.boing || 0) * .4)); }; break; }
    case 'mover': {
      base(); const pl = add(s.add.image(cx, cy, 'part_mover').setScale(.5).setAngle(it.rot & 1 ? 90 : 0));
      V.update = () => { const so = it._s && it._s[0]; if (so) pl.setPosition(so.x + so.w / 2, so.y + so.h / 2); };
      break;
    }
    case 'windmill': {
      const spokes = [0, 1, 2, 3].map(() => add(s.add.image(cx, cy, 'part_wspoke').setScale(.5).setOrigin(partOrigin(2.45 * T, 2), .5)));
      base(); const hub = add(s.add.image(cx, cy, 'part_whub').setScale(.5));
      const sails = [0, 1, 2, 3].map(() => add(s.add.image(cx, cy, 'part_wsail').setScale(.5)));
      V.update = t => { const S = it._s || (opts.preview ? (ITEMS.windmill.dyn(it, { t, dt: 0 }), it._s) : null); if (!S) return; const M = it._wm;
        S.forEach((so, i) => { spokes[i].setPosition(M.cx, M.cy).setRotation(Math.atan2(so.ay - M.cy, so.ax - M.cx)); sails[i].setPosition(so.x + so.w / 2, so.y + so.h / 2); }); hub.setPosition(M.cx, M.cy); };
      break;
    }
    case 'swing': {
      const an = add(s.add.image(cx, bx.y + .35 * T - 4, 'part_anchor').setScale(.5));
      const pl = add(s.add.image(cx, cy, 'part_swing').setScale(.5));
      V.update = t => { const P = it._sw || (opts.preview ? (ITEMS.swing.dyn(it, { t, dt: 0 }), it._sw) : null); if (!P) return; an.setPosition(P.ax, P.ay - 4);
        const G = g(); line(G, P.ax, P.ay, P.bx - T, P.by + 2, '#8a6a40', 2.5); line(G, P.ax, P.ay, P.bx + T, P.by + 2, '#8a6a40', 2.5); pl.setPosition(P.bx, P.by + T / 4); };
      break;
    }
    case 'flipper': {
      const a = add(s.add.image(cx, cy, 'part_flipper').setScale(.5)), b2 = add(s.add.image(cx, cy, 'part_flipper_b').setScale(.5).setVisible(false));
      const pin = add(s.add.image(cx, cy, 'part_anchor').setScale(.35));
      V.update = () => { const st = it.st || {}; const c = st.flip > 0 ? Math.cos(st.flip * Math.PI) : 1, j = st.warn ? Math.sin(st.warn * 70) * 1.5 : 0;
        a.setVisible(c >= 0).setScale(.5, .5 * Math.max(.06, Math.abs(c))).setPosition(cx + j, cy); b2.setVisible(c < 0).setScale(.5, .5 * Math.max(.06, Math.abs(c))).setPosition(cx + j, cy); pin.setPosition(cx, cy); };
      break;
    }
    case 'bumper': {
      const im = add(s.add.image(cx, cy, 'part_bumper').setScale(.5));
      V.update = (t, dt) => { const st = it.st || {}; if (st.boing > 0) st.boing = Math.max(0, st.boing - (dt || .016) * 5); im.setScale(.5 * (1 + (st.boing || 0) * .25)); };
      break;
    }
    case 'falling': {
      const im = base();
      V.update = () => {
        const st = it.st || {};
        if (st.fall > 0) { im.setAlpha(st.fall > 2.6 ? Math.min(.35, st.fall - 2.6) : .15); im.setPosition(cx, cy + (st.fall < 2.6 ? Math.min(st.fall * 120, 60) : 0)); }
        else { im.setAlpha(opts.alpha != null ? opts.alpha : 1); im.setPosition(cx + (st.shake > 0 ? Math.sin(st.shake * 80) * 2 : 0), cy); }
      };
      break;
    }
    case 'portal': {
      if (!it._portal) ITEMS.portal.dyn(it);
      const P = it._portal;
      const a = add(s.add.image(P.inn.x + P.inn.w / 2, P.inn.y + P.inn.h / 2, 'part_portal_in').setScale(.5).setAngle(ang));
      const b = add(s.add.image(P.out.x + P.out.w / 2, P.out.y + P.out.h / 2, 'part_portal_out').setScale(.5).setAngle(ang));
      V.update = t => { const k = 1 + Math.sin(t * 4) * .06; a.setScale(.5 * k); b.setScale(.5 * (2 - k)); const G = g(); G.save(); G.setLineDash([3, 7]); line(G, a.x, a.y, b.x, b.y, 'rgba(160,90,220,.35)', 2); G.restore(); };
      break;
    }
    case 'saw': { const sp = add(s.add.image(cx, cy, 'part_saw').setScale(.5)); V.update = t => sp.setRotation(t * 9); break; }
    case 'sawarm': {
      const arm = add(s.add.image(cx, cy, 'part_arm').setScale(.5).setOrigin(partOrigin(2 * T, 2), .5));
      const saw = add(s.add.image(cx, cy, 'part_saw').setScale(.5 * .68 / .72));
      const hub = add(s.add.image(cx, cy, 'part_hub').setScale(.5));
      V.update = t => { const A = it._arm || (opts.preview ? (ITEMS.sawarm.dyn(it, { t: t, dt: 0 }), it._arm) : null); if (!A) return; arm.setPosition(A.cx, A.cy).setRotation(A.a); saw.setPosition(A.sx, A.sy).setRotation(t * 12); hub.setPosition(A.cx, A.cy); };
      break;
    }
    case 'pendulum': {
      const an = add(s.add.image(cx, bx.y + .4 * T - 4, 'part_anchor').setScale(.5));
      const ball = add(s.add.image(cx, cy, 'part_spikeball').setScale(.5 * .58 / .58 * 1.0));
      V.update = t => { const P = it._pd || (opts.preview ? (ITEMS.pendulum.dyn(it, { t: t, dt: 0 }), it._pd) : null); if (!P) return; an.setPosition(P.ax, P.ay - 4); const G = g(); G.save(); G.setLineDash([5, 3]); line(G, P.ax, P.ay, P.bx, P.by, '#5a5f68', 3); G.restore(); ball.setPosition(P.bx, P.by).setRotation(t * .8); };
      break;
    }
    case 'spikeball': { const sp = add(s.add.image(cx, cy, 'part_spikeball').setScale(.5 * .42 / .58 * 1.15)); V.update = t => { sp.setPosition(cx, cy + Math.sin(t * 2 + it.x) * 1.5).setRotation(t * .3); }; break; }
    case 'blackhole': {
      const rings = [0, 1, 2, 3].map(i => add(s.add.image(cx, cy, 'part_ring')));
      const core = add(s.add.image(cx, cy, 'part_bh').setScale(.5));
      V.update = t => { rings.forEach((r, i) => { const R = (5.5 - ((t * 1.5 + i * 1.4) % 5.5)) * T; r.setScale(R / 60).setAlpha((opts.alpha || 1) * (.25 + i * .08)); }); core.setRotation(-t * 4); };
      break;
    }
    case 'coin': {
      const sp = add(s.add.image(cx, cy, 'part_acorn').setScale(.5));
      V.update = t => { const taken = it.st && it.st.taken; sp.setVisible(!taken); sp.setPosition(cx, cy + Math.sin(t * 3) * 2).setScale(.5 * (Math.cos(t * 2.5) * .25 + .85), .5); };
      break;
    }
    case 'flame': {
      base();
      const fl = add(s.add.image(cx + dx * T / 2, cy + dy * T / 2, 'part_flame_0').setScale(.5).setOrigin(partOrigin(3 * T, 4), .5).setAngle(ang).setVisible(false));
      V.update = t => { const F = it._fl; if (!F || !(F.on || F.warm)) { fl.setVisible(false); return; } fl.setVisible(true).setTexture('part_flame_' + (Math.floor(t * 20) % 3)); fl.setScale(F.on ? .5 : .1, F.on ? .5 : .3); };
      break;
    }
    case 'laser': {
      base();
      V.update = t => {
        const L = it._lz, G = g(); circ(G, cx + dx * (T / 2 - 6), cy + dy * (T / 2 - 6), 5, L && (L.on || L.warn) ? '#ff4a6a' : '#802030', 1.6);
        if (!L) return;
        if (L.warn && (Save.data.settings.reduceFlash || Math.sin(t * 40) > 0)) line(G, L.ox, L.oy, L.ex, L.ey, 'rgba(255,60,90,.45)', 1.5);
        if (L.on) { line(G, L.ox, L.oy, L.ex, L.ey, 'rgba(255,60,90,.35)', 12); line(G, L.ox, L.oy, L.ex, L.ey, '#ff4a6a', 5); line(G, L.ox, L.oy, L.ex, L.ey, '#ffffff', 2); circ(G, L.ex, L.ey, 5 + Math.sin(t * 50) * 2, '#ffd0d8', 0); }
      };
      break;
    }
    case 'puncher': {
      base();
      const arm = add(s.add.image(cx + dx * T / 2, cy + dy * T / 2, 'part_punch_arm').setScale(0, .5).setOrigin(partOrigin(2 * T, 2), .5).setAngle(ang));
      const glove = add(s.add.image(cx + dx * T / 2 + dx * 6, cy + dy * T / 2 + dy * 6, 'part_glove').setScale(.5).setAngle(ang));
      V.update = () => { const P = it._pu; const Lx = P ? P.L : 0, ox = cx + dx * T / 2, oy = cy + dy * T / 2; arm.setPosition(ox, oy).setScale(.5 * Lx / (2 * T), .5); glove.setPosition(ox + dx * (Lx + 8), oy + dy * (Lx + 8)); };
      break;
    }
    case 'crossbow': case 'cannon': {
      const im = base(); let last = null;
      // the crossbow shows its loaded arrow, which leaves when it fires and reloads after a moment
      const bolt = it.id === 'crossbow' ? add(s.add.image(cx + dx * 7, cy + dy * 7, 'pr_arrow').setScale(.4).setAngle(ang)) : null;
      V.update = t => {
        const c = it.st && it.st.cyc; if (last !== null && c !== last) s.tweens.add({ targets: im, scale: { from: .42, to: .5 }, duration: 180 }); last = c;
        if (bolt) { const ph = (((W_TIME() + (it.ph || 0)) % 1.9) + 1.9) % 1.9; bolt.setVisible(opts.preview || ph > .45); }
      };
      break;
    }
    default: base();
  }
  return V;
}

// Placement preview: a translucent copy of the item under a player's cursor
class Preview {
  constructor(view) { this.view = view; this.v = null; this.key = ''; }
  show(it, ok, color, t) {
    const key = it.id + ':' + it.rot + ':' + it.x + ':' + it.y;
    if (key !== this.key) { this.hide(); this.key = key; this.it = Object.assign({}, it, { st: {} }); this.v = makeItemView(this.view, this.it, { alpha: .75, depth: 16, preview: true }); }
    const W0 = { t, dt: 0, forces: [], pushers: [], projs: [], solids: this.view.W.solids, hazards: [], racing: false, map: this.view.W.map };
    const d = ITEMS[it.id]; const sw = _wt; if (d.dyn) { try { d.dyn(this.it, W0); } catch (e) { } } _wt = sw;
    this.v.update(t, 0);
    const G = this.view.gf, b = itemBox(it);
    G.save(); G.setLineDash([7, 5]); G.strokeStyle = ok ? color : '#ff3a3a'; G.lineWidth = 3; G.strokeRect(b.x - 3, b.y - 3, b.w + 6, b.h + 6); G.restore();
    if (!ok) { G.fillStyle = 'rgba(255,40,40,.18)'; G.fillRect(b.x, b.y, b.w, b.h); }
    if (it.id === 'bomb') { G.beginPath(); G.arc(b.x + b.w / 2, b.y + b.h / 2, BOMB_RADIUS, 0, TAU); G.fillStyle = 'rgba(255,120,40,.15)'; G.fill(); G.save(); G.setLineDash([6, 6]); G.strokeStyle = '#ff7a2a'; G.lineWidth = 2.5; G.stroke(); G.restore(); }
    circ(G, b.x + b.w / 2, b.y + b.h / 2, 5, color, 2);
  }
  hide() { if (this.v) this.v.destroy(); this.v = null; this.key = ''; }
}
function drawGridG(G, W) {
  if (!Save.data.settings.grid) return;
  G.strokeStyle = 'rgba(255,255,255,.18)'; G.lineWidth = 1; G.beginPath();
  for (let x = 0; x <= W.map.w * T; x += T) { G.moveTo(x, -6 * T); G.lineTo(x, W.map.h * T); }
  for (let y = -6 * T; y <= W.map.h * T; y += T) { G.moveTo(0, y); G.lineTo(W.map.w * T, y); }
  G.stroke();
}
