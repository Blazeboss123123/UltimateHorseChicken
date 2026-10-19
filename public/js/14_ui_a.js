// ===================== DOM MENUS =====================
const UI = {
  stack: [], pointerOverBars: false, navT: 0,
  root() { return document.getElementById('ui'); },
  open(html, opts = {}) {
    const bd = document.createElement('div'); bd.className = 'backdrop';
    bd.innerHTML = '<div class="panel" style="' + (opts.width ? 'width:' + opts.width + 'px' : '') + '">' + html + '</div>';
    bd.addEventListener('mousedown', e => { if (e.target === bd && !opts.modal) this.close(); });
    this.root().appendChild(bd);
    const P = bd.firstChild; P.onclose = opts.onclose;
    this.stack.push(bd); Input.uiCapture = true; Input.down.clear();
    P.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => this.close()));
    setTimeout(() => { const f = P.querySelector('.f:not([disabled])'); if (f && !opts.nofocus) f.focus(); }, 30);
    Audio2.sfx('click');
    return P;
  },
  close() {
    const bd = this.stack.pop(); if (!bd) return;
    const P = bd.firstChild; if (P.onclose) P.onclose();
    bd.remove(); Input.uiCapture = this.stack.length > 0; Input.down.clear(); Audio2.sfx('click'); Save.write();
  },
  closeAll() { while (this.stack.length) this.close(); },
  top() { return this.stack.length ? this.stack[this.stack.length - 1].firstChild : null; },
  // Gamepad + arrow-key navigation between focusable elements
  update(dt) {
    const P = this.top(); if (!P) return;
    let dir = null;
    const padDir = () => { for (let i = 0; i < 4; i++) for (const a of ['up', 'down', 'left', 'right']) if (Input.padPressed(i, a)) return a; return null; };
    const kd = Input.pressed.has('ArrowUp') ? 'up' : Input.pressed.has('ArrowDown') ? 'down' : Input.pressed.has('ArrowLeft') ? 'left' : Input.pressed.has('ArrowRight') ? 'right' : null;
    dir = padDir() || kd;
    const act = document.activeElement;
    const typing = act && (act.tagName === 'TEXTAREA' || (act.tagName === 'INPUT' && act.type === 'text'));
    if (Input.pressed.has('Escape') && !Input.rebinding) { if (typing) act.blur(); else this.close(); return; }
    for (let i = 0; i < 4; i++) { if (Input.padPressed(i, 'undo') || Input.padPressed(i, 'menu')) { this.close(); return; } }
    for (let i = 0; i < 4; i++) if (Input.padPressed(i, 'jump') && act && P.contains(act)) { if (act.type === 'checkbox') { act.checked = !act.checked; act.dispatchEvent(new Event('change')); } else act.click(); return; }
    if (!dir || typing) return;
    if (act && P.contains(act) && (dir === 'left' || dir === 'right')) {
      if (act.type === 'range' && padDir()) { const st = +act.step || 1; act.value = +act.value + (dir === 'right' ? st : -st); act.dispatchEvent(new Event('input')); return; }
      if (act.type === 'range') return; // keyboard handles natively
      if (act.tagName === 'SELECT' && padDir()) { act.selectedIndex = clamp(act.selectedIndex + (dir === 'right' ? 1 : -1), 0, act.options.length - 1); act.dispatchEvent(new Event('change')); return; }
      if (act.tagName === 'SELECT') return;
    }
    if (act && act.tagName === 'SELECT' && (dir === 'up' || dir === 'down') && !padDir()) return;
    const els = [...P.querySelectorAll('.f:not([disabled])')].filter(e => e.offsetParent);
    if (!els.length) return;
    if (!act || !P.contains(act)) { els[0].focus(); return; }
    const a = act.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    let best = null, bs = 1e9;
    for (const e of els) {
      if (e === act) continue; const r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      const dx = x - ax, dy = y - ay;
      const ok = dir === 'up' ? dy < -4 : dir === 'down' ? dy > 4 : dir === 'left' ? dx < -4 : dx > 4;
      if (!ok) continue;
      const main = dir === 'up' || dir === 'down' ? Math.abs(dy) : Math.abs(dx), cross = dir === 'up' || dir === 'down' ? Math.abs(dx) : Math.abs(dy);
      const s = main + cross * 2.2; if (s < bs) { bs = s; best = e; }
    }
    if (best) { best.focus(); best.scrollIntoView({ block: 'nearest' }); Audio2.sfx('move'); }
  },
  // ---------- tiny form builder ----------
  fields(P, sel, list) {
    const box = P.querySelector(sel); box.innerHTML = '';
    for (const f of list) {
      if (f.h) { const h = document.createElement('h3'); h.textContent = f.h; box.appendChild(h); continue; }
      if (f.html) { const d = document.createElement('div'); d.innerHTML = f.html; box.appendChild(d); continue; }
      const L = document.createElement('label'); L.className = 'set';
      const name = document.createElement('span'); name.textContent = f.label; L.appendChild(name);
      const val = document.createElement('span'); val.className = 'val';
      let inp;
      if (f.type === 'range') {
        inp = document.createElement('input'); inp.type = 'range'; inp.min = f.min; inp.max = f.max; inp.step = f.step || 1; inp.value = f.get();
        const show = () => val.textContent = f.fmt ? f.fmt(+inp.value) : inp.value; show();
        inp.addEventListener('input', () => { f.set(+inp.value); show(); });
      } else if (f.type === 'select') {
        inp = document.createElement('select'); for (const [v, l] of f.opts) { const o = document.createElement('option'); o.value = v; o.textContent = l; inp.appendChild(o); } inp.value = f.get();
        inp.addEventListener('change', () => f.set(inp.value));
      } else if (f.type === 'check') {
        inp = document.createElement('input'); inp.type = 'checkbox'; inp.checked = !!f.get(); inp.style.width = '22px'; inp.style.height = '22px';
        inp.addEventListener('change', () => f.set(inp.checked)); val.textContent = '';
      }
      inp.className = 'f'; if (f.disabled) inp.disabled = true;
      L.appendChild(inp); L.appendChild(val); box.appendChild(L);
      if (f.note) { const n = document.createElement('div'); n.className = 'small'; n.style.margin = '-2px 0 6px'; n.textContent = f.note; box.appendChild(n); }
    }
  },
  tabs(P, tabs, onTab, initial) {
    const bar = P.querySelector('.tabs');
    bar.innerHTML = tabs.map(([id, name]) => '<button class="tab f" data-tab="' + id + '">' + name + '</button>').join('');
    const go = id => { bar.querySelectorAll('.tab').forEach(b => b.classList.toggle('on', b.dataset.tab === id)); onTab(id); };
    bar.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => go(b.dataset.tab)));
    go(initial || tabs[0][0]);
  },
  // ---------- pause ----------
  pause(ctx) {
    const inGame = ctx !== 'lobby';
    const P = this.open('<h2>⏸ Paused</h2><div class="grid" style="grid-template-columns:1fr;min-width:280px">' +
      '<button class="btn f" data-a="resume">Resume</button>' +
      '<button class="btn alt f" data-a="settings">Settings</button>' +
      '<button class="btn alt f" data-a="controls">Controls</button>' +
      '<button class="btn alt f" data-a="howto">How to play</button>' +
      (ctx === 'lobby' ? '<button class="btn alt f" data-a="players">Players</button>' : '') +
      (ctx === 'lobby' && (!Net.online || Net.isHost) ? '<button class="btn alt f" data-a="rules">Match rules</button>' : '') +
      (Net.online ? (inGame && Net.isHost && ctx === 'match' ? '<button class="btn red f" data-a="quit">Back to treehouse (everyone)</button>' : '') + '<button class="btn red f" data-a="leave">' + (Net.isHost ? 'Close online game' : 'Leave online game') + '</button>'
        : (inGame ? '<button class="btn red f" data-a="quit">Quit to treehouse</button>' : '<button class="btn red f" data-a="title">Back to title screen</button>')) + '</div>' +
      (Net.online ? '<p class="small" style="text-align:center">Game code <b>' + Online.code + '</b> · the game keeps running while this menu is open</p>' : ''));
    P.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => {
      const a = b.dataset.a;
      if (a === 'resume') this.close();
      if (a === 'settings') this.settings();
      if (a === 'controls') this.settings('controls');
      if (a === 'howto') this.howto();
      if (a === 'players') this.players();
      if (a === 'rules') this.rules();
      if (a === 'quit') { this.closeAll(); if (Game.scene === 'editor') Ed.exit(); else if (Net.online) Net.dispatch({ t: 'toLobby' }); else Game.toLobby(); }
      if (a === 'leave') this.confirm(Net.isHost ? 'Close the game for everyone? Your friends will go back to the title screen.' : 'Leave this online game?', () => Game.toTitle());
      if (a === 'title') { this.closeAll(); Game.toTitle(); }
    }));
  },
  howto() {
    this.open('<h2>📖 How to play</h2>' +
      '<p><b>The idea:</b> together you build an obstacle course, then race through it. Make it hard enough to trap your friends — but not so hard that you can\'t finish yourself!</p>' +
      '<h3>Each round</h3><p>1. <b>Pick</b> — everyone grabs an item from the party box at the same time (first come, first served).<br>2. <b>Build</b> — everyone places their item at the same time, anywhere on the level (not on the start or flag). Put things on windmill sails or moving platforms and they ride along!<br>3. <b>Race</b> — everyone runs at once. Reach the flag! The green <b>safe zone</b> around the start protects you through the countdown and for 3 seconds after GO: traps can\'t hurt you there, lasers stop at its edge and arrows pop on it. Then it fades — get moving!</p>' +
      '<h3>Points</h3><p>🚩 Finish · ⭐ First to finish · 🦸 Only finisher · 🌰 Bring the golden acorn · 🐢 Underdog (finish while in last place) · 🪤 Your traps catch other players.<br><b>Too easy</b> (everyone finishes) or <b>too hard</b> (nobody finishes) = no points for anyone.</p>' +
      '<h3>Moves</h3><p><b>Crouch</b> by holding down — you\'re shorter, so you can duck under arrows and lasers. Crouch while sprinting to <b>slide</b>. <b>Sprint</b> by holding <span class="kbd">Left Shift</span> (or <span class="kbd">C</span>, RT/B on a controller) — faster runs and longer jumps, but harder to stop. Hold jump to jump higher. Slide down walls and jump off them. To climb a wall, hold towards it and keep tapping jump — every bounce takes you a little higher. Hold up on vines and ladders. Down + jump drops through cloud platforms. Honey lets you cling to walls.</p>' +
      '<h3>Chat &amp; emotes</h3><p>Press <span class="kbd">1</span>–<span class="kbd">6</span> to emote (👋 😂 😮 😡 👍 💀) — click the right stick on a controller. Online, press <span class="kbd">Enter</span> or <span class="kbd">T</span> to chat.</p><h3>Online with friends</h3><p>On the title screen one person presses <b>Host a game</b> and gets a 6-letter <b>game code</b>. Everyone else types that code under <b>Join</b> (or opens the invite link). The host picks the map; everybody plays on their own device.</p>' +
      '<h3>Local multiplayer</h3><p>Keyboard 1 joins automatically. Press <span class="kbd">Enter</span> to add Keyboard 2 (IJKL, Right-Shift jump, Enter interact) or press <b>A</b> on any controller to add a gamepad player — up to 8 players.</p>' +
      '<div class="row"><button class="btn f" data-close>Got it!</button></div>', { width: 640 });
  },
  credits() {
    this.open('<h2>🎬 Credits</h2><p><b>Ultimate Horse Chicken</b> — a homemade party platformer for playing with friends.</p>' +
      '<p>Everything you see is drawn with code and every sound is synthesised live — no image or audio files.</p>' +
      '<p>Inspired by the build-it-then-race-it party platformer genre. All characters, levels and art here are original.</p>' +
      '<p class="small">Built with Claude for the treehouse crew.</p><div class="row"><button class="btn f" data-close>Close</button></div>', { width: 520 });
  },
  confirm(msg, yes) {
    const P = this.open('<h2>Are you sure?</h2><p>' + msg + '</p><div class="row"><button class="btn red f" data-y>Yes</button><button class="btn f" data-close>No</button></div>');
    P.querySelector('[data-y]').addEventListener('click', () => { this.close(); yes(); });
  },
  prompt(title, value, cb, multiline) {
    const P = this.open('<h2>' + title + '</h2>' + (multiline ? '<textarea class="code f" spellcheck="false"></textarea>' : '<input class="txt f" style="width:100%" maxlength="40">') + '<div class="row" style="margin-top:10px"><button class="btn green f" data-ok>OK</button><button class="btn f" data-close>Cancel</button></div>');
    const inp = P.querySelector(multiline ? 'textarea' : 'input'); inp.value = value || '';
    P.querySelector('[data-ok]').addEventListener('click', () => { const v = inp.value; this.close(); cb(v); });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !multiline) { e.preventDefault(); P.querySelector('[data-ok]').click(); } });
    setTimeout(() => inp.focus(), 50);
  },
};
