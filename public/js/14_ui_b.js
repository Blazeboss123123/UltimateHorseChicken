// ---------- Settings ----------
Object.assign(UI, {
  settings(tab) {
    const S = Save.data.settings;
    const P = this.open('<h2>⚙️ Settings</h2><div class="tabs"></div><div class="body" style="min-width:min(640px,86vw)"></div><div class="row" style="margin-top:12px"><button class="btn f" data-close>Done</button></div>', { width: 720 });
    const pct = v => Math.round(v * 100) + '%';
    this.tabs(P, [['audio', '🔊 Audio'], ['video', '🎥 Camera & display'], ['access', '♿ Accessibility'], ['controls', '🎮 Controls'], ['data', '💾 Data']], id => {
      if (id === 'audio') this.fields(P, '.body', [
        { type: 'range', label: 'Master volume', min: 0, max: 1, step: .05, get: () => S.master, set: v => { S.master = v; Audio2.applyVolumes(); }, fmt: pct },
        { type: 'range', label: 'Music', min: 0, max: 1, step: .05, get: () => S.music, set: v => { S.music = v; Audio2.applyVolumes(); }, fmt: pct },
        { type: 'range', label: 'Sound effects', min: 0, max: 1, step: .05, get: () => S.sfx, set: v => { S.sfx = v; Audio2.applyVolumes(); Audio2.sfx('jump'); }, fmt: pct },
      ]);
      if (id === 'video') this.fields(P, '.body', [
        { type: 'select', label: 'Race camera', opts: [['shared', 'Shared — zooms to fit everyone'], ['split', 'Split screen (2–4 local players)'], ['map', 'Whole map always'], ['p1', 'Follow player 1']], get: () => S.camMode, set: v => S.camMode = v },
        { type: 'select', label: 'Renderer', opts: [['auto', 'Auto (WebGL when available)'], ['canvas', 'Canvas (compatibility)']], get: () => S.renderer || 'auto', set: v => { S.renderer = v; Save.write(); toast('Renderer changes apply after reloading the page'); } },
        { type: 'range', label: 'Minimum zoom', min: .3, max: 1, step: .05, get: () => S.minZoom, set: v => S.minZoom = v, fmt: pct, note: 'Higher keeps characters bigger when players spread out (edge arrows show anyone off-screen).' },
        { type: 'check', label: 'Off-screen player arrows', get: () => S.indicators, set: v => S.indicators = v },
        { type: 'check', label: 'Name tags above players', get: () => S.names, set: v => S.names = v },
        { type: 'check', label: 'Build grid & snapping', get: () => S.grid, set: v => S.grid = v },
        { type: 'range', label: 'Interface size', min: .8, max: 1.4, step: .05, get: () => S.uiScale, set: v => { S.uiScale = v; document.documentElement.style.setProperty('--ui-scale', v); }, fmt: pct },
        { type: 'check', label: 'Show hitboxes (debug)', get: () => S.hitboxes, set: v => S.hitboxes = v },
      ]);
      if (id === 'access') this.fields(P, '.body', [
        { type: 'check', label: 'Screen shake', get: () => S.shake, set: v => S.shake = v },
        { type: 'check', label: 'Reduce flashing (lasers, disco)', get: () => S.reduceFlash, set: v => S.reduceFlash = v },
        { type: 'check', label: 'High-contrast hazard outlines', get: () => S.contrast, set: v => S.contrast = v, note: 'Draws a dashed red ring around everything that can pop you.' },
        { html: '<p class="small">Player colours also show a unique symbol (● ■ ▲ ◆ ★ ✚ ⬟ ♥) on name tags so colour is never the only clue.</p>' },
      ]);
      if (id === 'controls') this.controlsTab(P);
      if (id === 'data') {
        this.fields(P, '.body', [
          { html: '<div class="row" style="margin-top:12px"><button class="btn red f" data-reset>Reset all progress</button></div>' },
        ]);
        P.querySelector('[data-reset]').addEventListener('click', () => this.confirm('This wipes stats, medals, achievements and saved levels on this device.', () => { const keep = Save.data.settings; Save.data = Save.fresh(); Save.data.settings = keep; Save.write(); toast('Progress reset'); }));
      }
    }, tab);
  },
  controlsTab(P) {
    const B = Save.data.settings.binds; const body = P.querySelector('.body');
    let h = '<p class="small">Click a key box, then press the new key. Gamepads use the standard layout shown on the right.</p><table class="stats"><tr><td><b>Action</b></td><td><b>Keyboard 1</b></td><td><b>Keyboard 2</b></td><td><b>Gamepad</b></td></tr>';
    for (const a of ACTIONS) h += '<tr><td>' + ACTION_LABELS[a] + '</td><td><button class="bind f" data-s="kb1" data-a="' + a + '">' + B.kb1[a].map(keyLabel).join(' / ') + '</button></td><td><button class="bind f" data-s="kb2" data-a="' + a + '">' + B.kb2[a].map(keyLabel).join(' / ') + '</button></td><td class="small">' + (PAD_LABELS[a] || '') + '</td></tr>';
    h += '</table><p class="small">Extra: Left-Shift (keyboard 1), Right-Ctrl (keyboard 2) or LT on a pad = fine adjustment while building.</p><div class="row"><button class="btn red f" data-rb>Reset controls</button></div>';
    body.innerHTML = h;
    body.querySelectorAll('.bind').forEach(b => b.addEventListener('click', () => {
      b.classList.add('wait'); b.textContent = 'Press a key…';
      Input.rebinding = code => {
        if (code === 'Escape' && b.dataset.a !== 'menu') { this.controlsTab(P); return; }
        const s = b.dataset.s, a = b.dataset.a;
        // remove the key from any other action on the same keyboard
        for (const k of ACTIONS) B[s][k] = B[s][k].filter(c => c !== code);
        B[s][a] = [code]; Save.write(); this.controlsTab(P); Audio2.sfx('pick');
      };
    }));
    body.querySelector('[data-rb]').addEventListener('click', () => { Save.data.settings.binds = deepCopy(DEFAULT_BINDS); Save.write(); this.controlsTab(P); });
  },
  // ---------- Match rules (host) ----------
  rules(tab) {
    const R = Save.data.rules, W = Save.data.weights;
    const P = this.open('<h2>📋 Match rules</h2><div class="tabs"></div><div class="body" style="min-width:min(640px,86vw)"></div><div class="row" style="margin-top:12px"><button class="btn f" data-close>Done</button><button class="btn red f" data-def>Reset rules to default</button></div>', { width: 760 });
    P.querySelector('[data-def]').addEventListener('click', () => { Save.data.rules = deepCopy(DEFAULT_RULES); Save.data.weights = {}; Save.write(); this.close(); this.rules(); toast('Rules reset'); });
    const sec = v => v + 's';
    this.tabs(P, [['match', '🏁 Match'], ['score', '⭐ Scoring'], ['mods', '🧪 Modifiers'], ['items', '📦 Items'], ['balance', '⚖️ Score balancer']], id => {
      if (id === 'match') this.fields(P, '.body', [
        { type: 'range', label: 'Points to win', min: 30, max: 300, step: 10, get: () => R.winScore, set: v => R.winScore = v },
        { type: 'range', label: 'Round limit (0 = none)', min: 0, max: 30, get: () => R.roundLimit, set: v => R.roundLimit = v, fmt: v => v || '∞' },
        { type: 'range', label: 'Items per player per round', min: 1, max: 3, get: () => R.perPlayer, set: v => R.perPlayer = v },
        { type: 'range', label: 'Extra items in party box', min: 0, max: 6, get: () => R.extraItems, set: v => R.extraItems = v },
        { type: 'select', label: 'Item assignment', opts: [['draft', 'Draft from the party box'], ['random', 'Random items handed out']], get: () => R.assign, set: v => R.assign = v },
        { type: 'select', label: 'Turn order', opts: [['rotate', 'Rotate each round'], ['shuffle', 'Shuffle each round'], ['fixed', 'Fixed (lobby order)']], get: () => R.order, set: v => R.order = v },
        { type: 'range', label: 'Pick timer', min: 4, max: 30, get: () => R.pickTime, set: v => R.pickTime = v, fmt: sec },
        { type: 'range', label: 'Placement timer', min: 6, max: 60, get: () => R.buildTime, set: v => R.buildTime = v, fmt: sec },
        { type: 'range', label: 'Race timer', min: 20, max: 180, step: 5, get: () => R.raceTime, set: v => R.raceTime = v, fmt: sec },
      ]);
      if (id === 'score') this.fields(P, '.body', [
        { type: 'range', label: '🚩 Finish', min: 0, max: 50, get: () => R.ptsFinish, set: v => R.ptsFinish = v },
        { type: 'range', label: '⭐ First to finish', min: 0, max: 30, get: () => R.ptsFirst, set: v => R.ptsFirst = v },
        { type: 'range', label: '🦸 Only finisher', min: 0, max: 40, get: () => R.ptsSolo, set: v => R.ptsSolo = v },
        { type: 'range', label: '🌰 Golden acorn', min: 0, max: 30, get: () => R.ptsCoin, set: v => R.ptsCoin = v },
        { type: 'range', label: '🐢 Underdog', min: 0, max: 30, get: () => R.ptsUnderdog, set: v => R.ptsUnderdog = v },
        { type: 'range', label: '🪤 Per trapped player', min: 0, max: 20, get: () => R.ptsTrap, set: v => R.ptsTrap = v },
        { type: 'check', label: '"Too easy" rule (no points if everyone finishes)', get: () => R.tooEasy, set: v => R.tooEasy = v },
      ]);
      if (id === 'mods') this.fields(P, '.body', [
        { type: 'range', label: 'Gravity', min: .4, max: 1.6, step: .05, get: () => R.gravity, set: v => R.gravity = v, fmt: v => Math.round(v * 100) + '%' },
        { type: 'range', label: 'Run speed', min: .6, max: 1.6, step: .05, get: () => R.speed, set: v => R.speed = v, fmt: v => Math.round(v * 100) + '%' },
        { type: 'range', label: 'Air control', min: .2, max: 1.5, step: .05, get: () => R.airControl, set: v => R.airControl = v, fmt: v => Math.round(v * 100) + '%' },
        { type: 'check', label: 'Respawn after popping (race lasts until timer)', get: () => R.respawn, set: v => R.respawn = v },
        { type: 'check', label: 'Golden acorns can appear', get: () => R.coins, set: v => R.coins = v },
        { type: 'check', label: 'Allow undo right after placing', get: () => R.allowUndo, set: v => R.allowUndo = v },
        { type: 'check', label: 'Allow overlapping placements', get: () => R.allowOverlap, set: v => R.allowOverlap = v, note: 'Lets items be placed inside terrain or other items (start & flag areas stay protected).' },
      ]);
      if (id === 'items') {
        const body = P.querySelector('.body');
        body.innerHTML = '<p class="small">How often each item shows up in the party box. 0 = never.</p><div class="row"><button class="btn alt f" data-rnd>🎲 Randomise</button><button class="btn alt f" data-dflt>Reset to default</button><button class="btn alt f" data-noh>Blocks only</button></div><div class="ilist"></div>';
        const fill = () => this.fields(P, '.ilist', ITEM_ORDER.map(id2 => ({ type: 'range', label: ITEMS[id2].name + (ITEMS[id2].cat === 'hazard' ? ' ⚠️' : ''), min: 0, max: 6, get: () => weightOf(id2), set: v => W[id2] = v })));
        fill();
        body.querySelector('[data-rnd]').addEventListener('click', () => { for (const id2 of ITEM_ORDER) W[id2] = randi(0, 6); fill(); });
        body.querySelector('[data-dflt]').addEventListener('click', () => { for (const k in W) delete W[k]; fill(); });
        body.querySelector('[data-noh]').addEventListener('click', () => { for (const id2 of ITEM_ORDER) W[id2] = ITEMS[id2].cat === 'hazard' ? 0 : ITEMS[id2].weight; fill(); });
      }
      if (id === 'balance') this.fields(P, '.body', [{ html: '<p class="small">Give newer players a boost (or handicap the pros). Each player\'s points are multiplied by their percentage.</p>' }].concat(Session.roster.map((e, i) => ({ type: 'range', label: COLOR_SHAPES[i] + ' ' + e.name, min: .5, max: 2, step: .1, get: () => R.handicap[i] == null ? 1 : R.handicap[i], set: v => R.handicap[i] = v, fmt: v => Math.round(v * 100) + '%' }))));
    }, tab);
  },
  // ---------- Players / couch ----------
  players() {
    const P = this.open('<h2>🛋️ Players</h2><div class="plist"></div><h3>Add local players</h3><p>Press <b>A / Cross</b> on a controller, or <span class="kbd">Enter</span> for Keyboard 2. Up to 8 players.</p><p class="small">Online play arrives in the next update — remote friends will show up here with a 🌐 badge.</p><div class="row"><button class="btn alt f" data-kb2>Add Keyboard 2</button><button class="btn f" data-close>Done</button></div>', { width: 620 });
    const draw = () => {
      P.querySelector('.plist').innerHTML = Session.roster.map((e, i) => '<div class="ach"><div class="ico" style="color:' + e.color + '">' + COLOR_SHAPES[e.colorIdx] + '</div><div style="flex:1"><b>' + esc(e.name) + '</b>' + (i === 0 ? ' 👑 host' : '') + '<br><span class="small">' + CHARS[e.char].name + ' · ' + (e.input === 'kb1' ? 'Keyboard 1' : e.input === 'kb2' ? 'Keyboard 2' : 'Controller ' + (+e.input.slice(3) + 1)) + '</span></div><button class="btn alt f" data-ed="' + i + '">Customise</button>' + (i > 0 ? '<button class="btn red f" data-rm="' + i + '">Remove</button>' : '') + '</div>').join('');
      P.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', () => { Session.remove(Session.roster[+b.dataset.rm]); draw(); }));
      P.querySelectorAll('[data-ed]').forEach(b => b.addEventListener('click', () => this.wardrobe(Session.roster[+b.dataset.ed])));
    };
    draw(); P.querySelector('[data-kb2]').addEventListener('click', () => { if (Session.addLocal('kb2')) { draw(); toast('Keyboard 2: IJKL to move, Right-Shift to jump, Enter to interact'); } });
  },
  // ---------- Wardrobe ----------
  wardrobe(e) {
    const P = this.open('<h2>👗 Wardrobe — <span class="wn"></span></h2><div class="row" style="align-items:flex-start;gap:16px"><canvas class="prev" width="200" height="220" style="border:3px solid var(--ink);border-radius:14px;background:#d6f5fa"></canvas><div style="flex:1;min-width:280px"><label class="set" style="grid-template-columns:80px 1fr"><span>Name</span><input class="txt f nm" maxlength="14"></label><h3>Colour</h3><div class="row cols"></div><h3>Character</h3><div class="cards chars"></div><h3>Hat</h3><div class="cards hats"></div></div></div><div class="row" style="margin-top:12px"><button class="btn f" data-close>Done</button></div>', { width: 860, onclose: () => { cancelAnimationFrame(raf); Session.persist(e); } });
    const nm = P.querySelector('.nm'); nm.value = e.name; P.querySelector('.wn').textContent = e.name;
    nm.addEventListener('input', () => { e.name = nm.value.trim() || 'Player'; P.querySelector('.wn').textContent = e.name; });
    const cv = P.querySelector('.prev'), g = cv.getContext('2d'); let raf, t0 = performance.now();
    const loop = () => { const t = (performance.now() - t0) / 1000; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 200, 220); g.fillStyle = '#9ad86a'; g.fillRect(0, 180, 200, 40); const st = Math.floor(t / 2.5) % 3; drawChar(g, e.char, { x: 100, y: 180, scale: 3.4, facing: 1, state: ['idle', 'run', 'dance'][st], t, phase: t * 12, hat: e.hat, color: e.color, happy: st === 2, blink: (t % 3) < .12 }); raf = requestAnimationFrame(loop); }; loop();
    const draw = () => {
      P.querySelector('.cols').innerHTML = PLAYER_COLORS.map((c, i) => { const taken = Session.roster.some(r => r !== e && r.colorIdx === i); return '<button class="btn f" data-c="' + i + '" style="background:' + c + ';min-width:44px;color:#fff' + (e.colorIdx === i ? ';box-shadow:0 0 0 4px #ff5fa2' : '') + '" title="' + COLOR_NAMES[i] + (taken ? ' (taken — will swap)' : '') + '">' + COLOR_SHAPES[i] + '</button>'; }).join('');
      P.querySelector('.chars').innerHTML = CHAR_IDS.map(id => { const un = Progress.charUnlocked(id); return '<div class="card f' + (e.char === id ? ' on' : '') + (un ? '' : ' locked') + '" tabindex="0" data-ch="' + id + '"><canvas width="90" height="80"></canvas><div class="nm">' + CHARS[id].name + '</div><div class="small">' + (un ? CHARS[id].desc : '🔒 Level ' + CHARS[id].unlock) + '</div></div>'; }).join('');
      P.querySelector('.hats').innerHTML = HAT_IDS.map(id => { const un = Progress.hatUnlocked(id); const a = HATS[id].ach && ACHIEVEMENTS.find(x => x.id === HATS[id].ach); return '<div class="card f' + (e.hat === id ? ' on' : '') + (un ? '' : ' locked') + '" tabindex="0" data-h="' + id + '"><canvas width="90" height="60"></canvas><div class="nm">' + HATS[id].name + '</div>' + (un ? '' : '<div class="small">🔒 ' + (a ? a.name : '') + '</div>') + '</div>'; }).join('');
      P.querySelectorAll('[data-ch] canvas').forEach(c => { const id = c.parentNode.dataset.ch; drawChar(c.getContext('2d'), id, { x: 45, y: 74, scale: 1.7, facing: 1, state: 'idle', t: 1, hat: 'none', color: e.color }); });
      P.querySelectorAll('[data-h] canvas').forEach(c => { const id = c.parentNode.dataset.h; const g2 = c.getContext('2d'); g2.translate(45, 46); g2.scale(2, 2); drawHat(g2, id, 1); if (id === 'none') txt(g2, '—', 0, -6, 12, INK, 'center', null); });
      P.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => { const i = +b.dataset.c; const other = Session.roster.find(r => r !== e && r.colorIdx === i); if (other) { other.colorIdx = e.colorIdx; other.color = PLAYER_COLORS[e.colorIdx]; } e.colorIdx = i; e.color = PLAYER_COLORS[i]; draw(); }));
      P.querySelectorAll('[data-ch]').forEach(b => { const f = () => { const id = b.dataset.ch; if (!Progress.charUnlocked(id)) { Audio2.sfx('bad'); return; } e.char = id; Audio2.sfx('pick'); draw(); }; b.addEventListener('click', f); b.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') f(); }); });
      P.querySelectorAll('[data-h]').forEach(b => { const f = () => { const id = b.dataset.h; if (!Progress.hatUnlocked(id)) { Audio2.sfx('bad'); return; } e.hat = id; Audio2.sfx('pick'); draw(); }; b.addEventListener('click', f); b.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') f(); }); });
    };
    draw();
  },
});
