// ===================== GAME SHELL (Phaser boot, scene flow, transitions, pause) =====================
const WORLD_SCENES = ['Title', 'Lobby', 'Match', 'Challenge', 'Editor'];
const Game = {
  phaser: null, trans: null,
  get scene() { const s = this.worldScene(); return s ? s.scene.key.toLowerCase() : ''; },
  worldScene() { if (!this.phaser) return null; for (const k of WORLD_SCENES) { const s = this.phaser.scene.getScene(k); if (s && s.sys.isActive()) return s; } return null; },
  // menus pause the game offline; online the world keeps going for everyone else
  paused() { return Input.uiCapture && !Net.online && this.scene !== 'lobby' && this.scene !== 'title'; },
  go(key, data) {
    const S = this.phaser.scene;
    for (const k of WORLD_SCENES) if (S.isActive(k) || S.isPaused(k)) S.stop(k);
    S.start(key, data || {});
    S.bringToTop('Hud');
  },
  transition(fn) { if (this.trans) { this.nextTrans = fn; return; } this.trans = { t: 0, fn, done: false }; },
  launch(mode, mapId, custom, edLevel) {
    this.transition(() => {
      UI.closeAll();
      if (mode === 'party' || mode === 'creative') this.go('Match', { mode, mapId, custom });
      else if (mode === 'freebuild') this.go('Editor', { mapId, level: edLevel || (custom ? { name: custom.name, items: custom.items } : null) });
      else if (mode === 'challenge') this.go('Challenge', { mapId });
    });
  },
  toLobby() {
    this.transition(() => {
      UI.closeAll();
      if (Net.online) { Net.inMatch = false; Lobby.launch = null; if (Net.isHost) Online.send({ t: 'state', v: 'lobby' }); Online.buildRoster(); }
      this.go('Lobby'); Progress.check(); Save.write();
    });
  },
  // back to the title screen (leaves any online game)
  toTitle() {
    this.transition(() => {
      UI.closeAll(); Online.leave(); Session.resetLocal();
      for (const e of Session.roster) { bakeCharacter(e); bakePortrait(e); }
      try { history.replaceState(null, '', location.pathname); } catch (e) { }
      this.go('Title'); Save.write();
    });
  },
  drawTransition(hud, dt) {
    const g = hud.irisG; g.clear(); hud.irisChars.forEach(c => c.setVisible(false));
    const tr = this.trans; if (!tr) return;
    tr.t += dt;
    const D = .38; let k;
    if (!tr.done) { k = 1 - tr.t / D; if (tr.t >= D) { tr.done = true; tr.t = 0; try { tr.fn(); } catch (e) { console.error(e); } k = 0; } }
    else { k = tr.t / D; if (tr.t >= D) { this.trans = null; if (this.nextTrans) { const f = this.nextTrans; this.nextTrans = null; this.transition(f); } return; } }
    k = clamp(k, 0, 1);
    const cam = hud.cameras.main, W = cam.width, H = cam.height, R = Math.hypot(W, H) * .6 * k;
    // a dark frame with a shrinking/growing round hole (drawn as a thick ring)
    // keyhole polygon: the screen rectangle with a round hole joined by a zero-width slit
    const cx = W / 2, cy = H / 2, pts = [{ x: 0, y: cy }, { x: 0, y: 0 }, { x: W, y: 0 }, { x: W, y: H }, { x: 0, y: H }, { x: 0, y: cy }];
    const n = 48; for (let i = 0; i <= n; i++) { const a = Math.PI + i / n * TAU; pts.push({ x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R }); }
    hud.iris.fillStyle(0x3a2a1e, 1); hud.iris.fillPoints(pts, true);
    if (k < .15) {
      const e1 = Session.roster[0] || { char: 'chicken', hat: 'none', colorIdx: 0 };
      const looks = [{ char: 'chicken', hat: 'none', colorIdx: 1 }, { char: 'horse', hat: 'none', colorIdx: 0 }];
      looks.forEach((L, i) => { const key = bakeCharacter(L); const sp = hud.irisChars[i]; if (sp.texture.key !== key) sp.setTexture(key, 'run0'); sp.setVisible(true).setScale(1).setOrigin(.5, CHAR_CELL.fy / CHAR_CELL.h).setPosition(W / 2 - 30 + i * 60, H / 2 + 30); if (!sp.anims.isPlaying || sp.anims.currentAnim.key !== key + '_run') sp.anims.play(key + '_run'); });
    }
  },
  reportError(e) { console.error(e); const now = Date.now(); if (!this._lastErr || now - this._lastErr > 5000) { this._lastErr = now; toast('⚠️ Something went wrong: ' + esc(e.message || e)); } },
  // runs before any scene updates each frame
  preStep(delta) {
    Input.poll();
    const wasUI = Input.uiCapture;
    if (wasUI) { UI.update(delta / 1000); if (!Input.uiCapture) Input.skip = true; }
    else if (this.scene && this.scene !== 'lobby' && this.scene !== 'title' && !this.trans && Input.anyPressed('menu')) UI.pause(this.scene);
    try { Online.tick(delta / 1000); NetBar.update(); } catch (e) { console.error(e); }
    const ws = this.worldScene();
    if (ws && ws.physics && ws.physics.world) { const want = this.paused(); if (want && !ws.physics.world.isPaused) ws.physics.pause(); else if (!want && ws.physics.world.isPaused) ws.physics.resume(); }
    if (!this.paused()) Save.data.stats.playTime += delta / 1000;
  },
};

class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    TEX.scene = this;
    bakeItems();
    for (const e of Session.roster) { bakeCharacter(e); bakePortrait(e); }
    this.scene.launch('Hud');
    Game.go('Title');
    const L = document.getElementById('loading'); if (L) L.remove();
    if (!Save.data.welcomed) { Save.data.welcomed = true; Save.write(); }
  }
}

// Browsers stop drawing a page that is hidden or behind other windows. The game (and an online match
// you're hosting) should keep going anyway, so when frames stop arriving we keep stepping the game
// ourselves from a worker timer (worker timers aren't throttled like the page's own).
function keepRunningInBackground(game) {
  game.events.once('ready', () => {
    game.events.off('hidden', game.onHidden, game); game.events.off('visible', game.onVisible, game);
    if (game.sound) game.sound.pauseOnBlur = false;
  });
  let lastRaf = performance.now(), lastBeat = performance.now(), bg = false;
  (function frame() { lastRaf = performance.now(); requestAnimationFrame(frame); })();
  const beat = () => {
    const now = performance.now();
    if (now - lastRaf < 150) { if (bg) { bg = false; try { game.loop.resetDelta(); } catch (e) { } } lastBeat = now; return; }
    bg = true; const d = Math.min(100, Math.max(1, now - lastBeat)); lastBeat = now;
    try { game.headlessStep(now, d); } catch (e) { console.error(e); }
  };
  try { const w = new Worker(URL.createObjectURL(new Blob(['setInterval(function(){postMessage(0)},33)'], { type: 'text/javascript' }))); w.onmessage = beat; }
  catch (e) { setInterval(beat, 33); }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { try { game.loop.resetDelta(); } catch (e) { } } });
}
function webglAvailable() { try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); } catch (e) { return false; } }
function bootGame() {
  Save.load();
  document.documentElement.style.setProperty('--ui-scale', Save.data.settings.uiScale);
  Input.init();
  Session.addLocal('kb1');
  Progress.check();
  const pref = Save.data.settings.renderer;
  const type = pref === 'canvas' ? Phaser.CANVAS : (webglAvailable() ? Phaser.WEBGL : Phaser.CANVAS);
  const game = new Phaser.Game({
    type, canvas: document.getElementById('c'), backgroundColor: '#a8e6ef',
    scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
    physics: { default: 'arcade', arcade: { gravity: { y: 0 }, fps: 120, fixedStep: true, debug: false, tileBias: 16, overlapBias: 8 } },
    input: { keyboard: false, mouse: false, touch: false, gamepad: false },
    render: { antialias: true, roundPixels: false },
    fps: { target: 60 },
    banner: false,
    scene: [BootScene, HudScene, TitleScene, LobbyScene, MatchScene, ChallengeScene, EditorScene],
  });
  window.GAME = Game.phaser = game;
  game.events.on('prestep', (time, delta) => Game.preStep(delta));
  game.events.on('postrender', () => Input.endFrame());
  addEventListener('beforeunload', () => Save.write());
  keepRunningInBackground(game);
  setInterval(() => Save.write(), 15000);
}
// Start once the font is ready so baked text uses it.
(function () {
  const go = () => { try { bootGame(); } catch (e) { console.error(e); const L = document.getElementById('loading'); if (L) L.textContent = 'Could not start: ' + e.message; } };
  if (document.fonts && document.fonts.ready) Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]).then(go); else go();
})();
