// ===================== TITLE SCREEN =====================
// Painted farm backdrop with the cast running around, the big wooden sign, and a notice board to
// host an online game, join one with a code, or play on this computer.
function bakeTitleArt() {
  if (!TEX.has('title_logo')) TEX.bake('title_logo', 660, 250, g => {
    // ropes
    line(g, 150, 0, 170, 70, '#8a6a3a', 5); line(g, 510, 0, 490, 70, '#8a6a3a', 5);
    // board
    drawWood(g, 40, 64, 580, 168, 7, '#c88d52');
    rr(g, 40, 64, 580, 168, 14); g.lineWidth = 5; g.strokeStyle = '#5a3a1e'; g.stroke();
    nails(g, [[58, 82], [602, 82], [58, 214], [602, 214]]);
    // ribbon
    poly(g, [[180, 46], [480, 46], [500, 70], [480, 96], [180, 96], [160, 70]], '#e8473f', 4);
    poly(g, [[160, 70], [128, 58], [142, 74], [128, 92], [168, 88]], '#c0352d', 3); poly(g, [[500, 70], [532, 58], [518, 74], [532, 92], [492, 88]], '#c0352d', 3);
    g.font = '700 38px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 6; g.strokeStyle = '#7a1e18'; g.strokeText('ULTIMATE', 330, 72); g.fillStyle = '#fff6e6'; g.fillText('ULTIMATE', 330, 72);
    g.font = '700 74px Fredoka, sans-serif';
    g.lineWidth = 14; g.strokeStyle = INK; g.strokeText('Horse Chicken', 330, 160);
    const gr = g.createLinearGradient(0, 120, 0, 196); gr.addColorStop(0, '#fff7d6'); gr.addColorStop(1, '#ffd34d'); g.fillStyle = gr; g.fillText('Horse Chicken', 330, 160);
    // a horse and a chicken peeking over the board
    drawChar(g, 'horse', { x: 70, y: 250, scale: 1.9, facing: 1, state: 'idle', t: .4, hat: 'none', color: PLAYER_COLORS[0] });
    drawChar(g, 'chicken', { x: 590, y: 250, scale: 1.9, facing: -1, state: 'idle', t: 1.1, hat: 'none', color: PLAYER_COLORS[1] });
  }, 10, 2);
  if (!TEX.has('title_ground')) TEX.bake('title_ground', 3200, 260, g => {
    const P = MAP_BY_ID.farm.pal; TERRAIN_STYLES.grass(g, 0, 40, 3200, 240, P, 3);
    const R = mulberry(5);
    for (let x = 30; x < 3200; x += 60 + R() * 120) { const k = R(); g.save(); g.translate(x, 40); if (k < .35) DECOS.flowers(g, 1.3); else if (k < .5) DECOS.bush(g, 1.3); else if (k < .58) DECOS.fence(g, 1.2); else if (k < .63) DECOS.mushrooms(g, 1.4); g.restore(); }
  }, 0, 1);
}

class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }
  create() {
    const m = MAP_BY_ID.farm, o = bakeMap(m); bakeTitleArt();
    this.rig = new CamRig(this.cameras.main);
    this.m = m; this.t = 0;
    const MW = m.w * T, MH = m.h * T; this.MW = MW; this.MH = MH;
    this.sky = this.add.image(0, 0, 'bgsky_' + m.id).setScrollFactor(0).setDepth(-100);
    this.layers = [['bgair_', .92, -95, o.skyY0], ['bgfar_', .6, -80, o.y0], ['bgland_', .35, -70, o.y0], ['bgnear_', .18, -60, o.y0]].map(([k, f, d, y]) => this.add.image(o.x0, y, k + m.id).setOrigin(0).setScale(1 / BG_RES).setScrollFactor(1 - f, 1).setDepth(d));
    this.clouds = [0, 1, 2, 3, 4].map(i => this.add.image(0, 80 + i * 47, 'cloud').setScale((.8 + (i % 3) * .4) / 1.5).setDepth(-88).setScrollFactor(.18, 1).setAlpha(.9));
    this.groundY = MH - 120;
    this.ground = this.add.image(-700, this.groundY - 40, 'title_ground').setOrigin(0).setDepth(5);
    this.logo = this.add.image(0, 0, 'title_logo').setScrollFactor(0).setDepth(50).setOrigin(.5, 0);
    // the cast
    const R = mulberry(Date.now() % 100000);
    this.runners = CHAR_IDS.slice(0, 9).map((id, i) => {
      const look = { char: id, hat: i % 3 === 0 ? HAT_IDS[1 + Math.floor(R() * (HAT_IDS.length - 1))] : 'none', colorIdx: i % 8 };
      const key = bakeCharacter(look);
      const dir = i % 2 ? -1 : 1, sp = 110 + R() * 120;
      const s = this.add.sprite(-400 + R() * (MW + 800), this.groundY, key, 'run0').setOrigin(.5, CHAR_CELL.fy / CHAR_CELL.h).setScale(.62).setDepth(10 + i).setFlipX(dir < 0);
      s.anims.play(key + '_run'); s.r = { key, dir, sp, jy: 0, vy: 0, nextJump: 1 + R() * 4 };
      return s;
    });
    Audio2.play('lobby');
    TitleUI.show();
    this.onResize(); this.scale.on('resize', this.onResize, this);
    this.events.once('shutdown', () => { this.scale.off('resize', this.onResize, this); TitleUI.hide(); });
  }
  onResize() {
    const cam = this.cameras.main, W = cam.width, H = cam.height;
    this.sky.setPosition(W / 2, H / 2).setDisplaySize(W * 3, H * 3);
    const z = Math.max(W / (this.MW - 200), H / (this.MH - 220));
    this.rig.set(this.MW / 2, this.MH - 120 - (H / 2 - 60) / z, z, true);
    for (const L of this.layers) L.x = -900 + (W / 2 - this.MW / 2) * (1 - L.scrollFactorX);
    const wide = W >= 760 && W > H * 1.05, avail = W - (Math.min(430, W * .96) + Math.max(28, W * .06) + 16);
    const ls = Math.min(wide ? (avail - 16) / 680 : (W - 20) / 680, wide ? (H * .42) / 270 : (H * .24) / 270, 1.15);
    this.logo.setScale(ls / 2).setPosition(wide ? avail / 2 + 10 : W / 2, wide ? Math.max(16, H * .12) : 6);
    TitleUI.layout(wide, this.logo.y + 270 * ls);
  }
  update(time, delta) {
    const dt = Math.min(.05, delta / 1000); this.t += dt;
    this.rig.x = this.MW / 2 + Math.sin(this.t * .07) * 140; this.rig.apply();
    this.logo.setAngle(Math.sin(this.t * 1.3) * 1.6);
    this.clouds.forEach((c, i) => { c.x = ((i * 410 + this.t * (8 + i * 2)) % (this.MW + 600)) - 300; });
    for (const s of this.runners) {
      const r = s.r; s.x += r.dir * r.sp * dt;
      if (s.x > this.MW + 500) s.x = -500; if (s.x < -500) s.x = this.MW + 500;
      r.nextJump -= dt; if (r.nextJump <= 0 && r.jy === 0) { r.vy = -420 - Math.random() * 200; r.nextJump = 1.5 + Math.random() * 4; }
      if (r.vy || r.jy) { r.vy += 1400 * dt; r.jy += r.vy * dt; if (r.jy >= 0) { r.jy = 0; r.vy = 0; } }
      const anim = r.jy < 0 ? (r.vy < 0 ? '_jump' : '_fall') : '_run';
      if (!s.anims.currentAnim || s.anims.currentAnim.key !== r.key + anim) s.anims.play(r.key + anim, true);
      s.y = this.groundY + r.jy;
    }
    TitleUI.tick(dt);
  }
}

// ---------- the notice board (DOM) ----------
const TitleUI = {
  el: null, busy: false,
  build() {
    const el = document.createElement('div'); el.id = 'titleui';
    el.innerHTML =
      '<div class="board">' +
      '<div class="who"><canvas class="me" width="96" height="104"></canvas><div class="whof"><label>Your name</label><input class="txt nm" maxlength="14" spellcheck="false"><button class="btn sm alt look">👗 Change look</button></div></div>' +
      '<div class="sec online"><div class="sec-h">🌐 Play online with friends</div>' +
      '<button class="btn big host">🏠 Host a game</button>' +
      '<div class="or"><span>or join a friend with their code</span></div>' +
      '<div class="codein">' + [0, 1, 2, 3, 4, 5].map(i => '<input class="tile-in" maxlength="1" autocomplete="off" spellcheck="false" inputmode="latin" aria-label="Code letter ' + (i + 1) + '">').join('') + '</div>' +
      '<button class="btn green big join">Join game →</button>' +
      '<div class="status"></div></div>' +
      '<div class="sec local"><button class="btn alt couch">🛋️ Play on this computer</button><div class="row mini"><button class="btn ghost sm howto">❓ How to play</button><button class="btn ghost sm settings">⚙️ Settings</button></div></div>' +
      '</div>';
    document.body.appendChild(el); this.el = el;
    const nm = el.querySelector('.nm');
    nm.addEventListener('input', () => { const e = Session.local(); if (!e) return; e.name = nm.value.trim().slice(0, 14) || 'Player'; Session.persist(e); });
    el.querySelector('.look').onclick = () => { const e = Session.local(); if (e) UI.wardrobe(e); };
    el.querySelector('.howto').onclick = () => UI.howto();
    el.querySelector('.settings').onclick = () => UI.settings();
    el.querySelector('.couch').onclick = () => { if (this.busy) return; Audio2.unlock(); Audio2.sfx('pick'); Game.transition(() => { UI.closeAll(); Game.go('Lobby'); toast('🛋️ Couch mode — friends join on this computer: <b>Enter</b> for Keyboard 2 or <b>A</b> on a controller'); }); };
    el.querySelector('.host').onclick = () => this.go('create');
    el.querySelector('.join').onclick = () => this.go('join');
    const tiles = [...el.querySelectorAll('.tile-in')];
    const setCode = s => { const c = cleanCode(s); tiles.forEach((t, i) => t.value = c[i] || ''); return c; };
    this.code = () => tiles.map(t => t.value).join('');
    tiles.forEach((t, i) => {
      t.addEventListener('input', () => {
        const v = cleanCode(t.value);
        if (v.length > 1) { const c = setCode(this.code().slice(0, i) + v); tiles[Math.min(5, c.length)].focus(); return; }
        t.value = v; if (v && i < 5) tiles[i + 1].focus(); this.status('');
      });
      t.addEventListener('keydown', e => {
        if (e.key === 'Backspace' && !t.value && i > 0) { tiles[i - 1].focus(); tiles[i - 1].value = ''; e.preventDefault(); }
        else if (e.key === 'ArrowLeft' && i > 0) tiles[i - 1].focus(); else if (e.key === 'ArrowRight' && i < 5) tiles[i + 1].focus();
        else if (e.key === 'Enter') this.go('join');
      });
      t.addEventListener('paste', e => { const txt = (e.clipboardData || window.clipboardData).getData('text'); e.preventDefault(); const c = setCode(txt); tiles[Math.min(5, c.length)].focus(); });
      t.addEventListener('focus', () => t.select());
    });
    this.setCode = setCode;
    if (!Online.available()) {
      el.querySelector('.online').classList.add('off');
      this.status('Online play works when the game is opened from its web link (your Render site). On this copy you can still play on this computer.', 'warn');
      el.querySelectorAll('.online .btn, .online input').forEach(b => b.disabled = true);
    }
  },
  show() {
    if (!this.el) this.build();
    this.el.style.display = ''; this.busy = false; this.setBusy(false);
    const e = Session.local(); this.el.querySelector('.nm').value = e ? e.name : '';
    const q = new URLSearchParams(location.search).get('code');
    if (q && Online.available()) { const c = this.setCode(q); if (c.length === 6) this.status('Your friend\'s code is filled in — press <b>Join game</b>!', 'ok'); }
  },
  hide() { if (this.el) this.el.style.display = 'none'; },
  layout(wide, logoBottom) {
    if (!this.el) return;
    this.el.classList.toggle('wide', wide);
    this.el.style.setProperty('--top', Math.round(wide ? 0 : logoBottom + 6) + 'px');
  },
  status(html, cls) { if (!this.el) return; const s = this.el.querySelector('.status'); s.innerHTML = html || ''; s.className = 'status ' + (cls || ''); },
  setBusy(b) { this.busy = b; if (!this.el) return; this.el.querySelectorAll('.btn').forEach(x => { if (!x.closest('.off')) x.disabled = b; }); },
  async go(op) {
    if (this.busy) return; Audio2.unlock();
    const code = this.code();
    if (op === 'join' && code.length !== 6) { this.status('Type the 6-letter game code your friend gave you.', 'err'); Audio2.sfx('bad'); const t = this.el.querySelector('.tile-in'); if (t) t.focus(); return; }
    this.setBusy(true); this.status(op === 'create' ? 'Setting up your game…' : 'Looking for game <b>' + code + '</b>…');
    try {
      await Online.connect(op, code, () => this.status('Waking up the game server… free servers nap when nobody is playing, so this can take up to a minute.', 'warn'));
      Audio2.sfx('pick');
      const host = Online.members[0];
      toast(Net.isHost ? '🏠 You\'re hosting! Your game code is <b>' + Online.code + '</b> — send it (or the invite link) to your friends.' : '🎉 You joined <b>' + esc(host ? host.name : 'your friend') + '</b>\'s game!');
      Game.transition(() => { UI.closeAll(); Game.go('Lobby'); });
    } catch (e) {
      this.status(esc(e.message || 'Something went wrong.'), 'err'); Audio2.sfx('bad'); this.setBusy(false);
    }
  },
  tick(dt) {
    if (!this.el || this.el.style.display === 'none') return;
    const cv = this.el.querySelector('.me'), e = Session.local(); if (!cv || !e) return;
    const g = cv.getContext('2d'), t = performance.now() / 1000;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
    g.fillStyle = '#9ad86a'; g.fillRect(0, 90, cv.width, 14);
    drawChar(g, e.char, { x: 48, y: 94, scale: 1.75, facing: 1, state: Math.floor(t / 3) % 2 ? 'idle' : 'run', phase: t * 6, t, hat: e.hat, color: e.color });
  },
};
