// ===================== WORLD VIEW: Phaser objects + Arcade physics for one level =====================
const MOVING_SOLID_ITEMS = new Set(['mover', 'windmill', 'swing']);
class WorldView {
  constructor(scene, W, opt = {}) {
    this.s = scene; this.W = W; W.view = this; this.opt = opt;
    this.items = new Map(); this.zones = new Map(); this.projs = new Map(); this.players = [];
    FX.attach(scene);
    this.gBack = scene.add.graphics().setDepth(4); this.gb = new GCtx(this.gBack, scene);
    this.gMid = scene.add.graphics().setDepth(12); this.gx = new GCtx(this.gMid, scene);
    this.gFront = scene.add.graphics().setDepth(30); this.gf = new GCtx(this.gFront, scene);
    this.build();
  }
  build() {
    const s = this.s, W = this.W, m = W.map, MW = m.w * T, MH = m.h * T;
    s.physics.world.setBounds(0, -4000, MW, MH + 8000);
    s.physics.world.setBoundsCollision(true, true, false, false);
    const o = bakeMap(m);
    this.sky = s.add.image(0, 0, 'bgsky_' + m.id).setScrollFactor(0).setDepth(-100);
    this.clouds = [];
    const SF = SKY_FX[m.sky] || SKY_FX.day, nCl = SF.clouds ? 6 : 0, cTint = parseColor(SF.cloudCol || '#ffffff')[0];
    for (let i = 0; i < nCl; i++) this.clouds.push(s.add.image(0, 70 + (i * 61 % 260), 'cloud').setScale((.8 + (i % 3) * .4) / 1.5).setDepth(-88).setScrollFactor(.18, 1).setAlpha((SF.cloudA || .8) * (.75 + (i % 2) * .25)).setTint(cTint));
    this.layers = [['bgair_', .92, -95, o.skyY0], ['bgfar_', .6, -80, o.y0], ['bgland_', .35, -70, o.y0], ['bgnear_', .18, -60, o.y0]].map(([k, f, d, y]) => ({ img: s.add.image(o.x0, y, k + m.id).setOrigin(0).setScale(1 / BG_RES).setScrollFactor(1 - f, 1).setDepth(d), f, x0: o.x0 }));
    this.ter = s.add.image(-40, -40, 'ter_' + m.id).setOrigin(0).setScale(1 / 1.5).setDepth(0);
    this.sg = s.physics.add.staticGroup(); this.dg = s.physics.add.group({ allowGravity: false, immovable: true });
    for (const so of W.terrainSolids) if (!so.wall) this.zoneFor('T:' + W.terrainSolids.indexOf(so), so, false);
    W.discoSolids.forEach((so, i) => this.zoneFor('disco' + i, so, false));
    // flag
    const gx = m.goal[0] * T, gy = m.goal[1] * T, fc = m.pal.accent === '#e8473f' ? '#ffd34d' : '#e8473f';
    this.flagPole = s.add.image(gx, gy, 'flag_pole').setOrigin(.5, 1).setScale(.5).setDepth(9);
    this.flag = s.add.image(gx - 2, gy - 72, 'flag_' + fc + '0').setOrigin(0, 0).setScale(.5).setDepth(9); this.flagCol = fc;
    for (const it of W.items) this.addItem(it);
    this.resize();
  }
  resize() {
    const cam = this.s.cameras.main, MW = this.W.map.w * T;
    this.sky.setPosition(cam.width / 2, cam.height / 2).setDisplaySize(cam.width * 3, cam.height * 3);
    for (const L of this.layers) L.img.x = L.x0 + (cam.width / 2 - MW / 2) * L.f;
  }
  // ---------- solids -> Arcade bodies ----------
  zoneFor(key, so, moving) {
    let z = this.zones.get(key);
    const cx = so.x + so.w / 2, cy = so.y + so.h / 2;
    if (!z || z.moving !== moving) {
      if (z) { z.destroy(); }
      z = this.s.add.zone(cx, cy, so.w, so.h); z.moving = moving;
      if (moving) { this.dg.add(z); z.body.setAllowGravity(false); z.body.setImmovable(true); z.body.pushable = false; z.body.setDirectControl(true); }
      else this.sg.add(z);
      this.zones.set(key, z);
    }
    z.solid = so; z.seen = this.frame;
    if (moving) { z.setPosition(cx, cy); if (z.body.width !== so.w || z.body.height !== so.h) { z.setSize(so.w, so.h); z.body.setSize(so.w, so.h); } }
    else if (z.x !== cx || z.y !== cy || z.width !== so.w || z.height !== so.h) { z.setPosition(cx, cy); z.setSize(so.w, so.h); z.body.updateFromGameObject(); }
    const cc = z.body.checkCollision; const ow = !!so.oneway; cc.down = !ow; cc.left = !ow; cc.right = !ow; cc.up = true;
    if (!z.body.enable) z.body.enable = true;
    return z;
  }
  syncSolids() {
    this.frame = (this.frame || 0) + 1;
    const W = this.W;
    for (const it of W.items) if (it._s) it._s.forEach((so, i) => this.zoneFor(it.uid + ':' + i, so, MOVING_SOLID_ITEMS.has(it.id) || !!it.attach));
    let mi = 0; for (const so of W.solids) { if (so.src === 'mill') this.zoneFor('mill' + (mi++), so, true); else if (so.pl) this.zoneFor(so.key, so, true); }
    W.discoSolids.forEach((so, i) => { const z = this.zones.get('disco' + i); if (z) { z.seen = this.frame; z.body.enable = W.solids.includes(so); } });
    for (const [k, z] of this.zones) {
      if (k.startsWith('T:')) continue;
      if (z.seen !== this.frame) { if (k.startsWith('disco')) continue; z.destroy(); this.zones.delete(k); }
    }
  }
  // ---------- items ----------
  addItem(it) { if (this.items.has(it.uid)) return; const v = makeItemView(this, it); this.items.set(it.uid, v); }
  removeItem(it) { const v = this.items.get(it.uid); if (v) { v.destroy(); this.items.delete(it.uid); } }
  syncItems() {
    const live = new Set(this.W.items.map(i => i.uid));
    for (const [k, v] of this.items) if (!live.has(k)) { v.destroy(); this.items.delete(k); }
    for (const it of this.W.items) if (!this.items.has(it.uid)) this.addItem(it); else { const v = this.items.get(it.uid); if (v.rot !== it.rot || v.it !== it) { this.removeItem(it); this.addItem(it); } else if (v.x !== it.x || v.y !== it.y) v.relocate(); }
  }
  // ---------- players ----------
  setPlayers(list) {
    const s = this.s;
    for (const p of this.players) this.destroyPlayer(p);
    this.players = list;
    this.pg = s.physics.add.group();
    for (const p of list) {
      bakeCharacter(p.entry); bakePortrait(p.entry);
      const z = s.add.zone(p.x + PW / 2, p.y + PH / 2, PW, PH); this.pg.add(z);
      const b = z.body; b.setCollideWorldBounds(true); b.setMaxVelocity(900, 1400); b.setAllowGravity(true); b.setGravityY(0);
      z.p = p; p.zone = z; p.body = b;
      p.spr = s.add.sprite(p.x, p.y, 'chr_' + lookKey(p.entry), 'idle0').setOrigin(.5, CHAR_CELL.fy / CHAR_CELL.h).setScale(.5).setDepth(20);
      p.tag = s.add.text(0, 0, COLOR_SHAPES[p.entry.colorIdx % 8] + ' ' + p.name, { fontFamily: 'Fredoka, sans-serif', fontSize: '11px', fontStyle: 'bold', color: '#fff', backgroundColor: p.color, padding: { x: 5, y: 1 } }).setOrigin(.5, 1).setDepth(35).setAlpha(.92);
      p.coinImg = s.add.image(0, 0, 'part_acorn').setScale(.4).setDepth(21).setVisible(false);
    }
    if (!this.colliders) {
      this.colliders = [s.physics.add.collider(this.pg, this.sg, this.onHit, this.canHit, this), s.physics.add.collider(this.pg, this.dg, this.onHit, this.canHit, this)];
    } else { this.colliders.forEach(c => c.object1 = this.pg); }
  }
  destroyPlayer(p) { for (const k of ['zone', 'spr', 'tag', 'coinImg', 'bub']) if (p[k]) { p[k].destroy(); p[k] = null; } }
  canHit(pz, z) {
    const p = pz.p, so = z.solid; if (!p || !p.alive || p.finished) return false;
    if (so && so.pl) { // another player (contact rule): no bumping into yourself, and no shoving if you were already overlapping
      if (so.pl === p || !so.pl.alive) return false; const b = pz.body, zb = z.body;
      return !(b.prev.x < zb.prev.x + zb.width - 1 && b.prev.x + b.width > zb.prev.x + 1 && b.prev.y < zb.prev.y + zb.height - 1 && b.prev.y + b.height > zb.prev.y + 1);
    }
    if (so && so.oneway) { const b = pz.body; return p.dropT <= 0 && !p.climbing && b.velocity.y >= -1 && b.prev.y + b.height <= z.body.y + 6; }
    return true;
  }
  onHit(pz, z) {
    const p = pz.p, b = pz.body, zb = z.body, so = z.solid;
    if (Math.abs(b.bottom - zb.top) < 3) { p._gnd = so; }
    // honey only grips on the side that has honey on it
    else if (Math.abs(b.right - zb.left) < 3) { p._wall = 1; p._wallSurf = so.surf === 'honey' && !(so.hn && so.hn[0] < 0) ? null : so.surf; }
    else if (Math.abs(b.left - zb.right) < 3) { p._wall = -1; p._wallSurf = so.surf === 'honey' && !(so.hn && so.hn[0] > 0) ? null : so.surf; }
  }
  onSpawn(p) {
    if (!p.body) return;
    this.setCrouch(p, false, true);
    p.body.reset(p.x + PW / 2, p.y + PH / 2); p.body.setVelocity(0, 0); p.body.enable = !(p.entry && p.entry.remote); p._pt = null;
    p.spr.setAlpha(1).setVisible(true).setRotation(0); p.tag.setVisible(Save.data.settings.names && this.players.length > 1);
    if (p.deadTween) { p.deadTween.stop(); p.deadTween = null; }
  }
  onDeath(p, cause) {
    if (p.body) { p.body.enable = false; }
    this.shake(6);
    if (p.spr) { p.spr.anims.play('chr_' + lookKey(p.entry) + '_dead', true); p.deadTween = this.s.tweens.add({ targets: p.spr, y: p.spr.y - 70, alpha: 0, duration: 1600 }); }
    if (p.tag) p.tag.setVisible(false);
  }
  onFinish(p) { if (p.body) { p.body.setVelocity(0, 0); p.body.enable = false; } }
  shake(px) { if (Save.data.settings.shake) { const c = this.s.cameras.main; c.shake(180, px / Math.max(400, c.width)); } }

  // Crouching shrinks the hitbox from the top (feet stay put).
  setCrouch(p, on, reset) {
    if (!!p.crouch === !!on && !reset) return; p.crouch = !!on; p.h = on ? CH : PH; p.slide = false;
    const b = p.body; if (!b) return;
    b.setSize(PW, p.h, false); b.setOffset(0, PH - p.h);
    // Phaser re-places the body from its offset on the next physics step; only our own copy of y moves now
    if (b.enable && !reset) p.y += on ? PH - CH : CH - PH;
  }
  // room to stand up? (nothing solid above a crouched player's head)
  canStand(p) {
    const r = { x: p.x + 1, y: p.y + p.h - PH, w: p.w - 2, h: PH - p.h };
    return !this.W.solids.some(so => !so.oneway && !so.pl && rectsOverlap(r, so));
  }
  // ---------- per-frame player control (inputs -> Arcade body velocities) ----------
  // Another online player: their own game moves them; we just follow the positions they stream to us.
  puppet(p, dt) {
    p.animT += dt; if (p.blinkT > 0) p.blinkT -= dt; else p.blinkT = rand(2, 5);
    if (p.squash) p.squash = approach(p.squash, 0, dt * 2.2);
    if (p.body && p.body.enable) p.body.enable = false;
    if (!p.alive) { p.deathT += dt; return; }
    if (p.finished) { p.finishT += dt; p.state = 'dance'; return; }
    const st = Online.states.get(p.entry.netId); if (!st || !Array.isArray(st.s)) return;
    const s = st.s, age = Math.min(.2, (performance.now() - st.at) / 1000);
    const tx = s[0] + (s[2] || 0) * age, ty = s[1] + (s[3] || 0) * age;
    if (p._pt == null || Math.hypot(tx - p.x, ty - p.y) > 160) { p.x = tx; p.y = ty; }
    else { const k = 1 - Math.exp(-dt * 18); p.x += (tx - p.x) * k; p.y += (ty - p.y) * k; }
    p._pt = 1; p.vx = s[2] || 0; p.vy = s[3] || 0; p.facing = s[4] < 0 ? -1 : 1; p.state = PS_STATES[s[5]] || 'idle';
    p.h = p.state === 'crouch' || p.state === 'crawl' || p.state === 'slide' ? CH : PH;
    const f = s[6] | 0; p.scared = f & 1 ? 1 : 0; p.onGround = !!(f & 2);
  }
  controlPlayer(p, inp, dt) {
    if (p.entry && p.entry.remote) { this.puppet(p, dt); return; }
    const W = this.W, R = W.rules, b = p.body;
    p.animT += dt; if (p.blinkT > 0) p.blinkT -= dt; else p.blinkT = rand(2, 5);
    if (p.squash) p.squash = approach(p.squash, 0, dt * 2.2);
    if (!p.alive) { p.deathT += dt; return; }
    if (p.finished) { p.finishT += dt; p.state = 'dance'; return; }
    if (!b || !b.enable) return;
    // --- read back the physics step ---
    p.x = b.x; p.y = b.y;
    p.onGround = b.blocked.down || b.touching.down;
    p.ground = p.onGround ? p._gnd : null; p._gnd = null;
    // Fallback ground probe: Arcade can miss contact for a frame (seams between blocks, platforms moving away).
    if ((!p.onGround || !p.ground) && b.velocity.y >= -1) {
      const foot = p.y + p.h;
      for (const so of W.solids) {
        if (so.wall || foot < so.y - 3 || foot > so.y + 3 || p.x + 2 >= so.x + so.w || p.x + p.w - 2 <= so.x) continue;
        if (so.oneway && p.dropT > 0) continue;
        p.onGround = true; p.ground = so; break;
      }
    }
    // Riding a moving platform: stay glued to its top (Arcade's colliders trail the model by a frame).
    if (p.rideKey) {
      const g = W.solids.find(so => so.key === p.rideKey);
      if (g && b.velocity.y > -60 && p.x + p.w > g.x + 1 && p.x < g.x + g.w - 1 && p.y + p.h > g.y - 14 && p.y + p.h < g.y + 12) {
        p.y = g.y - p.h; b.y = p.y; b.prev.y = p.y; b.updateCenter(); p.onGround = true; p.ground = g;
      } else p.rideKey = null;
    }
    let wallNow = b.blocked.left || b.touching.left ? -1 : b.blocked.right || b.touching.right ? 1 : 0;
    if ((wallNow < 0 && p.x <= 1) || (wallNow > 0 && p.x + p.w >= W.map.w * T - 1)) wallNow = 0; // the level's outer edge is not a wall
    p.vx = b.velocity.x - (p._conv || 0); p.vy = b.velocity.y;
    // crushed by something that moved into us
    const core = { x: p.x + 3, y: p.y + 3, w: p.w - 6, h: p.h - 6 };
    // (moving solids get a deeper margin: their colliders catch up a frame after the model moves them)
    const deep = { x: p.x + 7, y: p.y + 8, w: p.w - 14, h: p.h - 14 };
    for (const so of W.solids) if (!so.oneway && !so.wall && !so.pl && so !== p.ground && rectsOverlap((so.vx || so.vy) ? deep : core, so)) { killPlayer(W, p, { owner: -1, src: 'getting squashed' }); return; }
    // --- inputs ---
    if (p.stun > 0) p.stun -= dt;
    const stunned = p.stun > 0;
    let ix = stunned ? 0 : inp.ix; if (Math.abs(ix) < .2) ix = 0;
    if (inp.pressed.jump && !stunned) p.buffer = PHYS.buffer; else p.buffer -= dt;
    if (inp.held.down && inp.pressed.jump && p.onGround && p.ground && p.ground.oneway) { p.dropT = .25; p.buffer = 0; }
    if (p.dropT > 0) p.dropT -= dt;
    p.portalCD -= dt; p.wallLock -= dt; p.wallT -= dt;
    if (wallNow && !p.onGround) { p.wallT = .12; p.wallSide = wallNow; p.wallHoney = p._wallSurf === 'honey'; }
    p._wall = 0;
    let gm = W.gravBase * R.gravity; for (const z of W.gravZones) if (rectsOverlap(p, z)) gm *= z.mul;
    const inClimb = W.climb.find(c => rectsOverlap({ x: p.x + 4, y: p.y, w: p.w - 8, h: p.h }, c));
    if (inClimb && !stunned && (inp.held.up || (inp.held.down && !p.onGround)) && !p.climbing && p.vy > -300) p.climbing = true;
    if (p.climbing && !inClimb) p.climbing = false;
    let gravity = 0, conv = 0;
    if (p.climbing) {
      p.vx = ix * 140; p.vy = inp.iy * 170;
      if (p.buffer > 0) { p.climbing = false; p.vy = -PHYS.jumpV * .85; p.buffer = 0; Audio2.sfx('jump'); }
    } else {
      let surf = p.onGround && p.ground ? p.ground.surf : null; if (surf === 'honey' && p.ground.hn && p.ground.hn[1] >= 0) surf = null; // standing on the dry side
      // Sprint: hold it for 1.5x top speed. You keep a sprint going through the air as long as you hold it.
      p.sprint = !stunned && !!inp.held.sprint && (p.onGround || p.sprint || p.wallT > 0 || Math.abs(p.vx) > PHYS.run * R.speed * 1.05);
      // Crouch: hold down on the ground. Crouching while running fast turns into a slide.
      const wantCrouch = !stunned && inp.held.down && p.onGround && !p.climbing;
      if (wantCrouch && !p.crouch) { if (Math.abs(p.vx) > PHYS.run * R.speed * 1.12) { p.slide = true; Audio2.sfx('land'); } this.setCrouch(p, true); }
      else if (p.crouch && (!wantCrouch || p.buffer > 0) && this.canStand(p)) { this.setCrouch(p, false); p.slide = false; }
      if (p.slide && (!p.crouch || Math.abs(p.vx) < 110 || !p.onGround)) p.slide = false;
      const maxS = PHYS.run * R.speed * (surf === 'honey' ? .45 : 1) * (p.crouch && !p.slide ? PHYS.crouch : p.sprint ? PHYS.sprint : 1);
      // External pushes (fans, wind, black holes). Sideways pushes shift the speed you settle at, so they move you
      // even while standing on the ground (ground friction used to cancel them out); vertical pushes are accelerations.
      let drift = 0, fy = 0;
      for (const f of W.forces) {
        if (f.k === 'rect') { if (rectsOverlap(p, f)) { drift += f.fx * PHYS.pushK; fy += f.fy; if (f.fall) p.vy = Math.max(p.vy, 260); } }
        else {
          const dx = f.x - (p.x + p.w / 2), dy = f.y - (p.y + p.h / 2), d = Math.hypot(dx, dy);
          if (d < f.r && d > 1) {
            // Felt across the whole field (not only near the core): the sideways pull is ~1/3 strength at the rim, and the
            // hole's lift cancels most of your weight at the rim and overpowers it everywhere further in, so you float into it.
            const k = 1 - d / f.r, q = Math.sqrt(k), s = (f.s || 1500) / 1500;
            drift += dx / d * PHYS.holePull * (.35 + .65 * q) * s;
            fy += dy / d * PHYS.grav * gm * PHYS.holeLift * (.85 + .75 * q) * s;
          }
        }
      }
      if (p.slide) { p.vx = approach(p.vx, drift, (surf === 'ice' ? 60 : PHYS.slideDec) * dt); if ((p.dustT = (p.dustT || 0) - dt) <= 0) { p.dustT = .05; FX.burst(p.x + p.w / 2, p.y + p.h, 1, { color: 'rgba(255,255,255,.85)', kind: 'puff', g: -30, smin: 10, smax: 50 }); } }
      else if (p.wallLock <= 0) {
        const target = ix * maxS + drift;
        if (ix || drift) p.vx = approach(p.vx, target, (p.onGround ? (surf === 'ice' ? 420 : PHYS.accG) : PHYS.accA * R.airControl) * dt * Math.max(Math.abs(ix), drift ? 1 : 0));
        else p.vx = approach(p.vx, 0, (p.onGround ? (surf === 'ice' ? 200 : PHYS.decG) : PHYS.decA * R.airControl) * dt);
      } else p.vx += drift * 4 * dt;
      p.vy += fy * dt;
      p.jumpT = (p.jumpT || 0) - dt;
      gravity = PHYS.grav * gm; if (p.vy < 0 && !inp.held.jump && p.jumpT <= 0 && fy >= 0) gravity *= PHYS.lowJumpMul; // short-hop only for jumps, not for being lifted
      p.vx = clamp(p.vx, -900, 900); p.vy = clamp(p.vy, -1300, PHYS.maxFall * Math.max(.6, Math.min(1, gm + .2)));
      if (!p.onGround && p.wallT > 0 && p.vy > 0 && (ix === p.wallSide || p.wallHoney)) p.vy = Math.min(p.vy, p.wallHoney ? 22 : PHYS.wallSlide);
      if (p.onGround) p.coyote = PHYS.coyote; else p.coyote -= dt;
      if (p.buffer > 0 && !stunned) {
        if (p.coyote > 0) { p.vy = -PHYS.jumpV * (surf === 'honey' ? .7 : 1); p.coyote = 0; p.buffer = 0; p.onGround = false; p.jumpT = PHYS.minJump; p.squash = -.18; Audio2.sfx('jump'); Save.data.stats.jumps++; }
        else if (p.wallT > 0) {
          // Holding toward the wall = climb jump: small kick away so you swing straight back and gain height each jump.
          // Holding away / neutral = big kick off the wall.
          const climb = ix === p.wallSide;
          p.vy = -PHYS.jumpV * (climb ? PHYS.climbV : .92); p.vx = -p.wallSide * (climb ? PHYS.climbX : PHYS.wallJumpX); p.wallLock = climb ? PHYS.climbLock : .15;
          p.buffer = 0; p.wallT = 0; p.jumpT = climb ? PHYS.climbHold : PHYS.minJump; p.facing = -p.wallSide; p.squash = -.15; Save.data.stats.jumps++; Audio2.sfx('walljump'); FX.burst(p.x + (p.wallSide > 0 ? p.w : 0), p.y + p.h / 2, 5, { color: '#ffffff', kind: 'puff', g: 0, smin: 20, smax: 60 }); }
      }
      if (p.onGround && p.ground) {
        const g = p.ground;
        if (g.surf === 'bounce' && p.vy >= 0) { p.vy = -980; p.squash = .3; if (g.ref) g.ref.st.boing = 1; Audio2.sfx('bounce'); }
        else if (g.surf === 'crumble' && g.ref && !(g.ref.st.shake > 0)) { g.ref.st.shake = .001; Net.cast({ t: 'crumble', uid: g.ref.uid }); }
        if (g.surf === 'conv') conv = g.conv;
        // moving platforms (windmill sails, moving platforms, things riding on them) carry you along
        if (g.vx) conv += g.vx;
      }
      if (p.sprint && p.onGround && ix && Math.abs(p.vx) > PHYS.run * 1.1 && (p.dustT = (p.dustT || 0) - dt) <= 0) { p.dustT = .07; FX.burst(p.x + p.w / 2 - ix * 8, p.y + p.h, 1, { color: 'rgba(255,255,255,.8)', kind: 'puff', g: -30, smin: 10, smax: 40 }); }
      if (p.onGround && !p.wasGround && p.lastVy > 300) { p.squash = Math.min(.32, p.lastVy / 2400); Audio2.sfx('land'); FX.burst(p.x + p.w / 2, p.y + p.h, 4, { color: '#ffffff', kind: 'puff', g: 0, smin: 20, smax: 70 }); }
    }
    p.wasGround = p.onGround; p.lastVy = p.vy;
    p._conv = conv;
    const riding = !p.climbing && p.onGround && p.ground && p.ground.key && (p.ground.vx || p.ground.vy) && p.vy >= -1;
    p.rideKey = riding ? p.ground.key : null; if (riding) p.vy = 0;
    b.setAllowGravity(!p.climbing && !riding); b.setGravityY(riding ? 0 : gravity);
    b.setVelocity(p.vx + conv, p.vy);
    if (p.y > W.map.h * T + 80) { killPlayer(W, p, { owner: -1, src: 'falling', fell: true }); return; }
    // --- interactions with the level ---
    const hb = { x: p.x + 3, y: p.y + 3, w: p.w - 6, h: p.h - 5 };
    for (const it of W.items) if (it._portal && p.portalCD <= 0 && rectsOverlap(hb, it._portal.inn)) { const o = it._portal.out; FX.burst(p.x + p.w / 2, p.y + p.h / 2, 12, { color: '#b98cff', g: 0 }); const v = { x: b.velocity.x, y: b.velocity.y }; p.x = o.x + o.w / 2 - p.w / 2; p.y = o.y + o.h - p.h - 2; b.reset(p.x + PW / 2, p.y + PH / 2); b.setVelocity(v.x, v.y); p.portalCD = .5; Audio2.sfx('teleport'); FX.burst(p.x + p.w / 2, p.y + p.h / 2, 12, { color: '#8cffc0', g: 0 }); }
    for (const pu of W.pushers) if (pu.k === 'c') { // round bumper: bonk away from its middle
      if (!rectCircle(hb, pu)) continue;
      let ex = p.x + p.w / 2 - pu.x, ey = p.y + p.h / 2 - pu.y; const d = Math.hypot(ex, ey) || 1; ex /= d; ey /= d; if (ey > -.25 && Math.abs(ex) < .3) ey = -1;
      p.vx = ex * 760; p.vy = Math.min(ey * 760 - 140, -260); b.setVelocity(p.vx, p.vy); p.stun = .18; p.onGround = false; p.wallLock = .12;
      if (pu.ref) { pu.ref.st = pu.ref.st || {}; if (!(pu.ref.st.boing > .5)) Audio2.sfx('bounce'); pu.ref.st.boing = 1; }
      FX.burst(pu.x + ex * 16, pu.y + ey * 16, 6, { color: '#ff5aa8', kind: 'star', g: 0 });
    } else if (rectsOverlap(hb, pu)) { p.vx = pu.ix; p.vy = pu.iy; b.setVelocity(pu.ix, pu.iy); p.stun = .35; p.onGround = false; p.wallLock = .2; FX.burst(p.x + p.w / 2, p.y + p.h / 2, 6, { color: '#ffd34d', kind: 'star', g: 0 }); }
    for (const h of W.hazards) if (shapeHitsRect(h, hb)) { killPlayer(W, p, h); return; }
    for (let i = W.projs.length - 1; i >= 0; i--) { const pr = W.projs[i]; if (rectCircle(hb, { x: pr.x, y: pr.y, r: pr.r })) { W.projs.splice(i, 1); killPlayer(W, p, pr); return; } }
    for (const it of W.items) if (it._coin && !it.st.taken && !p.coin && rectCircle(hb, it._coin)) { it.st.taken = true; p.coin = it; if (W.onCoin) W.onCoin(p, it); Audio2.sfx('coin'); FX.burst(it._coin.x, it._coin.y, 12, { color: '#ffd34d', kind: 'star', g: 0 }); }
    if ((W.racing || W.testing) && rectsOverlap(hb, W.goal)) { finishPlayer(W, p); return; }
    // --- animation state ---
    if (ix) p.facing = ix > 0 ? 1 : -1;
    p.state = p.climbing ? 'climb' : stunned ? 'stun' : !p.onGround ? (p.wallT > 0 && p.vy > 0 ? 'wall' : p.vy < 0 ? 'jump' : 'fall') : p.slide ? 'slide' : p.crouch ? (Math.abs(p.vx) > 25 ? 'crawl' : 'crouch') : Math.abs(p.vx) > 25 ? 'run' : 'idle';
    if (p.state === 'wall') p.facing = -p.wallSide;
    p.scared = 0;
    for (const h of W.hazards) { const cx = h.k === 'c' ? h.x : h.x + h.w / 2, cy = h.k === 'c' ? h.y : h.y + h.h / 2; if (Math.abs(cx - p.x) < 90 && Math.abs(cy - p.y) < 90 && h.owner !== -1) { p.scared = 1; break; } }
    if (!p.scared) for (const pr of W.projs) if (Math.hypot(pr.x - p.x, pr.y - p.y) < 120) { p.scared = 1; break; }
  }
  // Freeze a player in place (countdowns, results)
  hold(p) { if (p.body && p.body.enable) { p.body.setVelocity(0, 0); p.body.setGravityY(0); p.body.setAllowGravity(false); p.x = p.body.x; p.y = p.body.y; } p.animT += 1 / 60; }
  release(p) { if (p.body) p.body.setAllowGravity(true); }
  // ---------- visuals ----------
  drawPlayers(t) {
    // stack name tags so players standing together stay readable
    const tagged = this.players.filter(p => p.alive && p.spr).sort((a, b) => a.x - b.x); let lastX = -1e9, lift = 0;
    for (const p of tagged) { const w = p.tag ? p.tag.width : 60; lift = (p.x - lastX < w * .9) ? lift + 15 : 0; p.tagLift = lift; lastX = p.x; }
    for (const p of this.players) {
      if (!p.spr) continue;
      const key = 'chr_' + lookKey(p.entry);
      if (!p.alive) { p.coinImg.setVisible(false); if (p.bub) p.bub.setVisible(false); continue; }
      const b = p.body, cx = b && b.enable ? b.center.x : p.x + p.w / 2, by = b && b.enable ? b.bottom : p.y + p.h;
      p.spr.setPosition(cx, by).setFlipX(p.facing < 0);
      let a = p.state || 'idle';
      if (p.scared && a !== 'dance') a = a === 'run' ? 'scaredrun' : a === 'fall' || a === 'jump' ? (a === 'fall' ? 'scaredfall' : a) : a === 'idle' ? 'scared' : a;
      if (a === 'idle' && p.blinkT < .12) a = 'blink';
      const full = key + '_' + a; if (!p.spr.anims.currentAnim || p.spr.anims.currentAnim.key !== full) p.spr.anims.play(full, true);
      const sq = p.squash || 0; p.spr.setScale(.5 * (1 + sq * .45), .5 * (1 - sq));
      p.spr.setRotation(a === 'dance' ? Math.sin(p.animT * 3.5) * .25 : 0);
      p.tag.setPosition(cx, by - 46 - (p.tagLift || 0)).setVisible(Save.data.settings.names && this.players.length > 1);
      p.coinImg.setVisible(!!p.coin).setPosition(cx, by - 62);
      this.drawBubble(p, cx, by - (p.tag && p.tag.visible ? 64 + (p.tagLift || 0) : 50));
      if (p.onGround && b) { this.gx.fillStyle = 'rgba(0,0,0,.12)'; this.gx.beginPath(); this.gx.ellipse(cx, by, 11, 3, 0, 0, TAU); this.gx.fill(); }
    }
  }
  // emote / chat bubble over a player's head
  drawBubble(p, x, y) {
    const S = p.say, now = performance.now();
    if (!S || now > S.until || !p.alive) { if (p.bub) p.bub.setVisible(false); if (S && now > S.until) p.say = null; return; }
    if (!p.bub || p.bub._k !== S.at) {
      if (p.bub) p.bub.destroy();
      p.bub = S.emoji ? this.s.add.text(0, 0, S.s, { fontFamily: 'Fredoka, "Segoe UI Emoji", "Apple Color Emoji", sans-serif', fontSize: '30px', padding: { x: 4, y: 4 } }).setOrigin(.5, 1).setDepth(36)
        : this.s.add.text(0, 0, S.s, { fontFamily: 'Fredoka, sans-serif', fontSize: '13px', fontStyle: 'bold', color: '#3a2a1e', backgroundColor: '#fffaf0', padding: { x: 7, y: 4 }, wordWrap: { width: 170, useAdvancedWrap: true }, align: 'center' }).setOrigin(.5, 1).setDepth(36);
      p.bub._k = S.at;
    }
    const age = (now - S.at) / 1000, left = (S.until - now) / 1000;
    const pop = S.emoji ? Math.min(1, age * 7) * (1 + Math.max(0, .35 - age) * 1.2) : Math.min(1, age * 8);
    p.bub.setVisible(true).setPosition(x, y - (S.emoji ? Math.min(8, age * 30) : 0)).setScale(pop).setAlpha(Math.min(1, left * 3));
  }
  update(dt, t, opt = {}) {
    const W = this.W;
    this.syncSolids();
    this.gb.clear(); this.gx.clear(); this.gf.clear();
    const M = MECH[W.map.mech];
    if (M && M.drawBack) M.drawBack(this.gb, W, t);
    for (const so of W.terrainSolids) if (so.surf === 'conv') { const g = this.gb; rr(g, so.x, so.y, so.w, so.h, so.h / 2); fillStroke(g, '#4b4f58', 2.5); const o = (t * Math.abs(so.conv) * .3) % 16 * Math.sign(so.conv); for (let x = so.x + 8 + ((o % 16) + 16) % 16; x < so.x + so.w - 8; x += 16) { g.beginPath(); g.moveTo(x, so.y + 3); g.lineTo(x + 5 * Math.sign(so.conv), so.y + so.h / 2); g.lineTo(x, so.y + so.h - 3); g.strokeStyle = '#ffd34d'; g.lineWidth = 2.5; g.stroke(); } }
    if (M && M.drawMid) M.drawMid(this.gb, W, t);
    if (opt.showZones) { const g = this.gb; g.fillStyle = 'rgba(63,174,90,.18)'; rr(g, W.start.x, W.start.y, W.start.w, W.start.h, 10); g.fill(); g.fillStyle = 'rgba(232,71,63,.18)'; rr(g, W.goalZone.x, W.goalZone.y, W.goalZone.w, W.goalZone.h, 10); g.fill(); }
    for (const v of this.items.values()) { if (v.it && (v.it.x !== v.x || v.it.y !== v.y) && v.relocate) v.relocate(); v.update(t, dt); }
    this.updateProjectiles();
    if (M && M.drawFront && W.map.mech !== 'dark') M.drawFront(this.gf, W, t, null, null);
    if (Save.data.settings.contrast) for (const h of W.hazards) { const g = this.gf; g.save(); g.setLineDash([6, 4]); g.strokeStyle = '#ff2050'; g.lineWidth = 3; g.beginPath(); if (h.k === 'c') g.arc(h.x, h.y, h.r + 3, 0, TAU); else g.rect(h.x - 3, h.y - 3, h.w + 6, h.h + 6); g.stroke(); g.restore(); }
    if (Save.data.settings.hitboxes) { const g = this.gf; g.lineWidth = 1; g.strokeStyle = 'lime'; for (const so of W.solids) g.strokeRect(so.x, so.y, so.w, so.h); g.strokeStyle = 'red'; for (const h of W.hazards) { g.beginPath(); if (h.k === 'c') g.arc(h.x, h.y, h.r, 0, TAU); else g.rect(h.x, h.y, h.w, h.h); g.stroke(); } }
    this.flag.setTexture('flag_' + this.flagCol + (Math.floor(t * 6) % 4));
    const cam = this.s.cameras.main, MW = W.map.w * T;
    this.clouds.forEach((c, i) => { c.x = ((i * 377 + t * (6 + i)) % (MW + 600)) - 300; });
    this.drawPlayers(t);
  }
  updateProjectiles() {
    const live = new Set(this.W.projs);
    for (const [p, img] of this.projs) if (!live.has(p)) { img.destroy(); this.projs.delete(p); }
    for (const p of this.W.projs) {
      let img = this.projs.get(p);
      if (!img) { img = this.s.add.image(p.x, p.y, p.kind === 'arrow' ? 'pr_arrow' : p.kind === 'fire' ? 'pr_fire' : 'pr_ball').setScale(.5).setDepth(15); this.projs.set(p, img); }
      img.setPosition(p.x, p.y); if (p.kind === 'arrow') img.setRotation(Math.atan2(p.vy, p.vx)); else img.rotation += .1;
      // speed streak behind each projectile so it reads at a glance
      const sp = Math.hypot(p.vx, p.vy) || 1, ux = p.vx / sp, uy = p.vy / sp, L = p.kind === 'arrow' ? 46 : 30, G = this.gx;
      G.globalAlpha = .45; line(G, p.x - ux * (L + 16), p.y - uy * (L + 16), p.x - ux * 14, p.y - uy * 14, p.kind === 'fire' ? '#ffb62e' : '#ffffff', p.kind === 'arrow' ? 3 : 7); G.globalAlpha = 1;
    }
  }
  destroy() {
    for (const p of this.players) this.destroyPlayer(p);
    for (const v of this.items.values()) v.destroy();
    this.items.clear(); this.zones.clear(); this.projs.clear();
    if (this.W) this.W.view = null;
  }
}
