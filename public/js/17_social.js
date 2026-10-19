// ===================== CHAT & EMOTES =====================
// Emotes: number keys 1–6 (or R3 / right-stick click on a controller) pop an emoji over your head.
// Chat (online): Enter or T opens the chat box; messages show in the corner and as a speech bubble.
const EMOTES = ['👋', '😂', '😮', '😡', '👍', '💀'];
const EMOTE_KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'];

const Social = {
  log: [], el: null, open: false, lastSend: 0, cool: new Map(),
  init() {
    // opening the chat box must beat the game's own key handler (so the T isn't typed or used as a game key)
    addEventListener('keydown', e => {
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || Input.rebinding) return;
      if (!Net.online || Input.uiCapture || this.open) return;
      if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'KeyT') { e.preventDefault(); e.stopImmediatePropagation(); this.openChat(); }
    }, true);
  },
  // everyone on screen right now (lobby or match)
  players() {
    const sc = Game.worldScene(); if (!sc) return [];
    if (sc.scene.key === 'Match' && Match.M) return Match.M.players;
    return (sc.view && sc.view.players) || sc.players || [];
  },
  findBy(fn) { return this.players().find(fn); },
  // show an emote / chat bubble over a player's head
  bubble(p, s, emoji) { if (!p) return; const now = performance.now(); p.say = { s, emoji, at: now, until: now + (emoji ? 2400 : 5500) }; if (emoji) p.squash = -.2; },
  emote(p, k) {
    if (!p || !EMOTES[k]) return;
    const id = p.entry && (p.entry.netId || p.entry.id); const now = performance.now();
    if (now - (this.cool.get(id) || 0) < 600) return; this.cool.set(id, now);
    this.bubble(p, EMOTES[k], true); Audio2.sfx('click');
    if (Net.online && p.entry && !p.entry.remote) Net.cast({ t: 'emote', e: k });
  },
  // per frame: emote keys for local players
  tick(dt) {
    if (Input.uiCapture || this.open || Input.skip) return;
    const ps = this.players(); if (!ps.length) return;
    const local = ps.filter(p => p.entry && !p.entry.remote);
    for (let k = 0; k < EMOTE_KEYS.length; k++) if (Input.pressed.has(EMOTE_KEYS[k])) {
      const p = local.find(q => q.entry.input === 'kb1' || q.entry.input === 'any') || local[0]; this.emote(p, k);
    }
    for (let i = 0; i < 4; i++) {
      const pad = Input.pads[i], prev = Input.padPrev[i]; if (!pad || !pad.buttons[11] || (prev && prev.buttons[11])) continue;
      const p = local.find(q => q.entry.input === 'pad' + i || q.entry.input === 'any'); if (p) this.emote(p, (p._emoteCycle = ((p._emoteCycle == null ? -1 : p._emoteCycle) + 1) % EMOTES.length));
    }
  },
  // ---------- chat box ----------
  ensure() {
    if (this.el) return;
    const el = this.el = document.createElement('div'); el.id = 'chat';
    el.innerHTML = '<div class="ch-log"></div><div class="ch-bar"><input class="ch-in" maxlength="120" placeholder="Say something… (Enter to send, Esc to close)" autocomplete="off"><div class="ch-emo">' +
      EMOTES.map((e, i) => '<button data-e="' + i + '" title="Emote ' + (i + 1) + '">' + e + '</button>').join('') + '</div></div><div class="ch-hint">💬 <b>Enter</b> chat · <b>1–6</b> emotes</div>';
    document.body.appendChild(el);
    const inp = el.querySelector('.ch-in');
    inp.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); const s = inp.value.trim(); inp.value = ''; if (s) this.send(s); this.closeChat(); }
      else if (e.key === 'Escape') { e.preventDefault(); inp.value = ''; this.closeChat(); }
    });
    inp.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== inp) this.closeChat(); }, 120));
    el.querySelectorAll('[data-e]').forEach(b => b.addEventListener('mousedown', e => { e.preventDefault(); const me = this.players().find(p => p.entry && !p.entry.remote); this.emote(me, +b.dataset.e); }));
  },
  show(on) { if (on) this.ensure(); if (this.el) this.el.style.display = on ? '' : 'none'; if (on) this.render(); },
  openChat() {
    this.ensure(); this.show(true); this.open = true; this.el.classList.add('open');
    Input.down.clear(); // let go of any held movement keys while typing
    const inp = this.el.querySelector('.ch-in'); inp.focus(); this.render();
  },
  closeChat() { if (!this.el) return; this.open = false; this.el.classList.remove('open'); const inp = this.el.querySelector('.ch-in'); if (document.activeElement === inp) inp.blur(); this.render(); },
  send(s) {
    const now = performance.now(); if (now - this.lastSend < 700) { toast('Slow down a little 🙂'); return; } this.lastSend = now;
    s = s.slice(0, 120);
    Net.cast({ t: 'chat', s });
    this.receive(Online.id, s);
  },
  receive(id, s) {
    s = String(s || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 120); if (!s) return;
    const m = Online.members.find(x => x.id === id);
    const name = m ? m.name : 'Someone', color = m ? PLAYER_COLORS[m.colorIdx % 8] : '#888';
    this.log.push({ name, color, s, at: performance.now() }); if (this.log.length > 40) this.log.shift();
    this.bubble(this.findBy(p => p.entry && p.entry.netId === id), s, false);
    if (id !== Online.id) Audio2.sfx('pick');
    this.render();
  },
  render() {
    if (!this.el) return;
    const now = performance.now(), list = this.open ? this.log.slice(-12) : this.log.slice(-6).filter(m => now - m.at < 12000);
    this.el.querySelector('.ch-log').innerHTML = list.map(m => '<div class="ch-m' + (!this.open && now - m.at > 9000 ? ' fade' : '') + '"><b style="color:' + m.color + '">' + esc(m.name) + '</b> ' + esc(m.s) + '</div>').join('');
  },
  update(dt) {
    const want = Net.online && Game.scene !== 'title';
    if (!want) { if (this.el && this.el.style.display !== 'none') { this.closeChat(); this.show(false); } return; }
    if (!this.el || this.el.style.display === 'none') this.show(true);
    this.el.classList.toggle('lobby', Game.scene === 'lobby');
    this._rt = (this._rt || 0) - dt; if (this._rt <= 0) { this._rt = .5; this.render(); }
  },
  reset() { this.log = []; if (this.el) this.render(); },
};
Net.on('chat', (a, from) => { if (typeof a.s !== 'string') return false; Social.receive(from, a.s); return true; });
Net.on('emote', (a, from) => { const k = a.e | 0; if (!EMOTES[k]) return false; const p = Social.findBy(q => q.entry && q.entry.netId === from); if (p) { Social.bubble(p, EMOTES[k], true); } return true; });
