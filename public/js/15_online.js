// ===================== ONLINE PLAY (client side) =====================
// One friend hosts (their browser runs the match rules), everyone else joins with the 6-character
// game code. The server (server.js) only keeps the rooms and passes messages along.
const NET_PROTO = 1;
const PS_STATES = ['idle', 'run', 'jump', 'fall', 'wall', 'climb', 'stun', 'dance'];
const CODE_ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
// actions a guest may ask the host to perform (always about their own player)
const GUEST_REQUESTS = new Set(['pick', 'place', 'undo', 'death', 'fin', 'coin']);
// cosmetic messages any player may send directly
const DIRECT_MSGS = new Set(['cur', 'pcur', 'crumble', 'respawn', 'pfail']);
// events that belong to a running match (queued if the match scene isn't up yet)
const MATCH_EVENTS = new Set(['round', 'pick', 'build', 'place', 'undo', 'skip', 'race', 'death', 'fin', 'coin', 'endRace', 'podium', 'gone', 'cur', 'pcur', 'respawn', 'crumble', 'pfail']);

function cleanCode(s) { return String(s || '').toUpperCase().replace(/O/g, '0').replace(/I/g, '1').split('').filter(c => CODE_ALPHA.includes(c)).join('').slice(0, 6); }

const Online = {
  ws: null, id: null, code: null, hostId: null, members: [], states: new Map(), ping: 0,
  psT: 0, pingT: 0, pending: [], lastPs: '', sameT: 0,
  available() { return /^https?:$/.test(location.protocol); },
  wsUrl(q) { return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws' + q; },
  inviteLink() { return location.origin + location.pathname + '?code=' + this.code; },
  send(o) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(o)); },
  // op: 'create' or 'join'. Resolves with the welcome message, rejects with a friendly Error.
  connect(op, code, onSlow) {
    return new Promise((resolve, reject) => {
      if (!this.available()) { reject(new Error('Online play works when the game is opened from its web link (your Render site), not from a downloaded file.')); return; }
      this.leave(true);
      let ws, settled = false;
      try { ws = new WebSocket(this.wsUrl(op === 'create' ? '?op=create' : '?op=join&code=' + encodeURIComponent(code))); } catch (e) { reject(new Error('Could not open a connection.')); return; }
      this.ws = ws;
      const finish = (err, val) => { if (settled) return; settled = true; clearTimeout(slow); clearTimeout(give); if (err) { if (this.ws === ws) this.ws = null; try { ws.close(); } catch (e) { } reject(err); } else resolve(val); };
      const slow = setTimeout(() => { if (onSlow) onSlow(); }, 3500);
      const give = setTimeout(() => finish(new Error("Couldn't reach the game server. Free servers nap when nobody's playing — wait a moment and try again.")), 70000);
      ws.onopen = () => { const e = Session.local() || Session.roster[0] || Save.data.slots[0]; ws.send(JSON.stringify({ t: 'hello', v: NET_PROTO, name: e.name, char: e.char, hat: e.hat })); };
      ws.onmessage = ev => {
        let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
        if (!settled) { if (m.t === 'welcome') { this.onWelcome(m); finish(null, m); } else if (m.t === 'error') finish(new Error(m.msg)); return; }
        try { this.onMessage(m); } catch (e) { Game.reportError(e); }
      };
      ws.onclose = () => { if (!settled) finish(new Error("Couldn't connect to the game server.")); else if (this.ws === ws) this.dropped(this.closedReason || 'Lost the connection to the game.'); };
      ws.onerror = () => { };
    });
  },
  onWelcome(m) {
    this.id = m.id; this.code = m.code; this.hostId = m.hostId; this.members = m.members.slice(); this.states.clear(); this.pending = []; this.closedReason = null;
    Net.online = true; Net.isHost = m.hostId === m.id; Net.rules = null; Net.inMatch = false;
    this.buildRoster();
    try { history.replaceState(null, '', location.pathname + '?code=' + m.code); } catch (e) { }
    NetBar.show();
  },
  // Roster = room members in join order (host first) — identical on every browser.
  buildRoster() {
    const old = new Map(Session.roster.filter(e => e.netId).map(e => [e.netId, e]));
    const me = Session.local();
    Session.roster = this.members.map(m => {
      let e = old.get(m.id);
      if (!e && m.id === this.id && me) e = me;
      if (!e) e = { id: m.id };
      Object.assign(e, { netId: m.id, name: m.name, char: m.char, hat: m.hat, colorIdx: m.colorIdx, color: PLAYER_COLORS[m.colorIdx % 8], input: m.id === this.id ? 'any' : 'net', remote: m.id !== this.id, slot: 0, conn: 'online', ready: true, gone: false });
      return e;
    });
    Input.kb2Active = false;
    for (const e of Session.roster) { if (typeof bakeCharacter === 'function' && TEX.scene) { bakeCharacter(e); bakePortrait(e); } }
  },
  sendLook(e) { this.send({ t: 'look', name: e.name, char: e.char, hat: e.hat }); const m = this.members.find(x => x.id === this.id); if (m) Object.assign(m, { name: e.name, char: e.char, hat: e.hat }); },
  onMessage(m) {
    switch (m.t) {
      case 'ps': this.states.set(m.id, { s: m.s, at: performance.now() }); return;
      case 'msg': return this.onGameMsg(m.from, m.m);
      case 'pong': this.ping = Math.round(performance.now() - m.c); return;
      case 'join': {
        this.members.push(m.m); toast('👋 <b>' + esc(m.m.name) + '</b> joined the game'); Audio2.sfx('pick');
        if (!Net.inMatch) this.buildRoster();
        return;
      }
      case 'leave': {
        const mem = this.members.find(x => x.id === m.id); this.members = this.members.filter(x => x.id !== m.id); this.states.delete(m.id);
        if (Net.inMatch && Match.M) { const p = Match.M.players.find(q => q.entry.netId === m.id); if (p && Net.isHost) Net.dispatch({ t: 'gone', pi: p.idx }); }
        else { if (mem) toast('👋 ' + esc(mem.name) + ' left'); if (!Net.inMatch) this.buildRoster(); }
        return;
      }
      case 'look': {
        const mem = this.members.find(x => x.id === m.id); if (mem) Object.assign(mem, { name: m.name, char: m.char, hat: m.hat });
        const e = Session.roster.find(x => x.netId === m.id); if (e) { e.name = m.name; e.char = m.char; e.hat = m.hat; if (TEX.scene) { bakeCharacter(e); bakePortrait(e); } }
        return;
      }
      case 'closed': this.closedReason = m.reason; return;
      case 'error': toast('⚠️ ' + esc(m.msg)); return;
    }
  },
  onGameMsg(from, a) {
    if (!a || typeof a.t !== 'string') return;
    if (a.req) {
      if (!Net.isHost || !GUEST_REQUESTS.has(a.t)) return;
      delete a.req;
      const M = Match.M; if (!M) return;
      const p = M.players[a.pi]; if (!p || p.entry.netId !== from) return; // only about their own player
      if (a.t === 'place') a.uid = uid();
      Net.remote = false;
      const ok = Net.apply(a, from);
      if (ok !== false) this.send({ t: 'cast', m: a });
      return;
    }
    if (!DIRECT_MSGS.has(a.t) && from !== this.hostId) return; // match decisions only come from the host
    if (MATCH_EVENTS.has(a.t) && !Match.M) { if (Net.inMatch) this.pending.push([from, a]); return; }
    Net.remote = true;
    try { Net.apply(a, from); } finally { Net.remote = false; }
  },
  flushPending() { const list = this.pending; this.pending = []; for (const [from, a] of list) this.onGameMsg(from, a); },
  // Each frame: stream our own player's position, keep the ping fresh.
  tick(dt) {
    if (!Net.online || !this.ws) return;
    this.pingT -= dt; if (this.pingT <= 0) { this.pingT = 3; this.send({ t: 'ping', c: performance.now() }); }
    this.psT -= dt; if (this.psT > 0) return; this.psT = 1 / 20;
    const sc = Game.worldScene(); if (!sc) return;
    const list = sc.scene.key === 'Lobby' ? sc.players : sc.scene.key === 'Match' && Match.M ? Match.M.players : null;
    const p = list && list.find(q => q.entry && !q.entry.remote);
    if (!p || !p.alive || p.finished) return;
    const s = [Math.round(p.x), Math.round(p.y), Math.round(p.vx || 0), Math.round(p.vy || 0), p.facing < 0 ? -1 : 1, Math.max(0, PS_STATES.indexOf(p.state)), (p.scared ? 1 : 0) | (p.onGround ? 2 : 0)];
    const k = s.join(','); if (k === this.lastPs) { this.sameT += 1 / 20; if (this.sameT < .5) return; } this.sameT = 0; this.lastPs = k;
    this.send({ t: 'ps', s });
  },
  dropped(reason) {
    const was = Net.online; this.cleanup();
    if (was) { toast('⚠️ ' + esc(reason)); Game.toTitle(true); }
  },
  leave(silent) { const ws = this.ws; this.cleanup(); if (ws) try { ws.close(); } catch (e) { } },
  cleanup() {
    this.ws = null; this.id = null; this.members = []; this.states.clear(); this.pending = [];
    Net.online = false; Net.isHost = true; Net.rules = null; Net.inMatch = false;
    NetBar.hide();
  },
};

// Lobby launch flow online: the host's map choice counts down on every screen, then the host starts it.
Net.on('prelaunch', a => { if (!Lobby.scene) return false; Session.mapId = a.mapId; if (a.mode) Session.mode = a.mode; Lobby.launch = { mapId: a.mapId, custom: a.custom || null, t: 1.6 }; Audio2.sfx('pick'); return true; });
Net.on('cancelLaunch', () => { if (!Lobby.launch) return false; Lobby.launch = null; toast('Cancelled'); Audio2.sfx('bad'); return true; });
Net.on('launch', a => {
  if (Net.online) {
    Net.rules = a.rules || deepCopy(DEFAULT_RULES);
    const byId = new Map(Session.roster.map(e => [e.netId, e]));
    const list = (a.ids || []).map(id => byId.get(id)).filter(Boolean);
    if (!list.some(e => !e.remote)) { toast('A match started just as you arrived — hang out in the treehouse until the next one!'); return true; }
    Session.roster = list;
    Net.inMatch = true;
    if (Net.isHost) Online.send({ t: 'state', v: 'match' });
  }
  Session.mode = a.mode; Session.mapId = a.mapId; Lobby.launch = null;
  Game.launch(a.mode, a.mapId, a.custom || null);
  return true;
});

// ---------- the wooden "game code" bar shown in the treehouse while online ----------
const NetBar = {
  el: null,
  show() {
    if (!this.el) { this.el = document.createElement('div'); this.el.id = 'netbar'; document.body.appendChild(this.el); }
    this.render(); this.el.style.display = '';
  },
  hide() { if (this.el) this.el.style.display = 'none'; },
  render() {
    if (!this.el || !Online.code) return;
    const tiles = Online.code.split('').map(c => '<span class="tile">' + c + '</span>').join('');
    this.el.innerHTML = '<div class="lbl">GAME CODE</div><div class="tiles">' + tiles + '</div>' +
      '<button class="btn sm" data-a="copy">📋 Copy invite link</button>' +
      '<span class="nb-info"><span class="nb-n"></span> · <span class="nb-ping"></span></span>' +
      '<button class="btn sm red" data-a="leave">' + (Net.isHost ? 'Close game' : 'Leave') + '</button>';
    this.el.querySelector('[data-a=copy]').onclick = () => {
      const link = Online.inviteLink();
      const ok = () => toast('📋 Invite link copied — send it to your friends!'), bad = () => UI.prompt('Copy this invite link', link, () => { });
      try { navigator.clipboard.writeText(link).then(ok, bad); } catch (e) { bad(); }
    };
    this.el.querySelector('[data-a=leave]').onclick = () => UI.confirm(Net.isHost ? 'Close the game for everyone?' : 'Leave this online game?', () => Game.toTitle());
  },
  update() {
    if (!this.el || this.el.style.display === 'none') return;
    const inLobby = Game.scene === 'lobby';
    this.el.classList.toggle('mini', !inLobby);
    const n = this.el.querySelector('.nb-n'), pg = this.el.querySelector('.nb-ping');
    if (n) n.textContent = Online.members.length + '/8 players'; if (pg) pg.textContent = Online.ping ? Online.ping + ' ms' : '…';
  },
};
