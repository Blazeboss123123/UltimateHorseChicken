// Online rooms for Ultimate Horse Chicken.
// One browser hosts the game (it runs the match rules); the server keeps the rooms, hands out
// game codes and relays messages between the players in a room.
//
// Connect:  /ws?op=create            -> new room, you are the host
//           /ws?op=join&code=ABC234  -> join a friend's room
// First message from the client: {t:'hello', name, char, hat, v}
//
// Server -> client
//   {t:'welcome', id, code, hostId, members:[member]}     member = {id, name, char, hat, colorIdx}
//   {t:'join', m}  {t:'leave', id}  {t:'look', id, name, char, hat}
//   {t:'msg', from, m}      a game message relayed from another player
//   {t:'ps', id, s}         another player's position/animation state
//   {t:'pong', c}  {t:'error', msg}  {t:'closed', reason}  {t:'room', state}  (host started/ended a match)
// Client -> server
//   {t:'cast', m, to?}  to = undefined (everyone else) | 'host' | member id
//   {t:'ps', s}  {t:'look', name, char, hat}  {t:'state', v:'lobby'|'match'} (host only)  {t:'ping', c}
'use strict';

const PROTO = 1;
const MAX_PLAYERS = 8;
const CODE_ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
const CODE_RE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

function makeCode() { let s = ''; for (let i = 0; i < 6; i++) s += CODE_ALPHA[Math.floor(Math.random() * CODE_ALPHA.length)]; return s; }
function cleanName(n) { if (typeof n !== 'string') return 'Player'; const s = n.replace(/[^\p{L}\p{N} _\-.!?']/gu, '').trim().slice(0, 16); return s || 'Player'; }
function cleanKey(k, def) { return typeof k === 'string' && /^[a-z0-9_]{1,20}$/i.test(k) ? k : def; }

class Rooms {
  constructor(opts = {}) {
    this.rooms = new Map();
    this.seq = 0;
    this.log = opts.log || (() => {});
    this.build = opts.build | 0; // the game version the server is serving; older pages are asked to refresh
    this.stats = { created: 0, joined: 0, msgs: 0 };
    this.timer = setInterval(() => this.heartbeat(), 20000);
    if (this.timer.unref) this.timer.unref();
  }
  stop() { clearInterval(this.timer); }
  summary() { let players = 0; for (const r of this.rooms.values()) players += r.members.length; return { rooms: this.rooms.size, players, ...this.stats }; }
  heartbeat() {
    const now = Date.now();
    for (const r of this.rooms.values()) for (const m of r.members) { if (now - m.conn.lastPong > 70000) m.conn.terminate('timeout'); else m.conn.ping(); }
  }
  public(m) { return { id: m.id, name: m.name, char: m.char, hat: m.hat, colorIdx: m.colorIdx }; }
  send(m, obj) { if (m.conn.open) m.conn.send(JSON.stringify(obj)); }
  others(r, m, obj) { const s = JSON.stringify(obj); for (const o of r.members) if (o !== m && o.conn.open) o.conn.send(s); }

  // A new socket. It must say hello within 10 s.
  connect(conn, url) {
    const op = url.searchParams.get('op'), code = (url.searchParams.get('code') || '').toUpperCase();
    let member = null, room = null;
    const fail = msg => { conn.send(JSON.stringify({ t: 'error', msg })); setTimeout(() => conn.close(1000, 'error'), 50); };
    const helloTimer = setTimeout(() => { if (!member) conn.close(1000, 'no hello'); }, 10000);
    conn.on('message', raw => {
      let msg; try { msg = JSON.parse(raw); } catch (e) { return; }
      if (!msg || typeof msg.t !== 'string') return;
      if (!member) {
        if (msg.t !== 'hello') return;
        clearTimeout(helloTimer);
        if ((msg.v | 0) !== PROTO || (this.build && (msg.build | 0) !== this.build)) return fail('There\'s a newer version of the game — refresh this page (Ctrl+Shift+R, or pull down on a phone) and try again.');
        if (op === 'create') {
          let c; do c = makeCode(); while (this.rooms.has(c));
          room = { code: c, members: [], state: 'lobby', created: Date.now() };
          this.rooms.set(c, room); this.stats.created++;
        } else if (op === 'join') {
          if (!CODE_RE.test(code)) return fail('Game codes are 6 letters and numbers.');
          room = this.rooms.get(code);
          if (!room) return fail('No game with the code ' + code + '. Check it with your friend.');
          if (room.members.length >= MAX_PLAYERS) return fail('That game is full (8 players).');
          this.stats.joined++;
        } else return fail('Unknown request.');
        const used = new Set(room.members.map(m => m.colorIdx)); let ci = 0; while (used.has(ci)) ci++;
        let name = cleanName(msg.name); if (room.members.some(m => m.name === name)) name = (name.slice(0, 13) + ' ' + (room.members.length + 1));
        member = { id: 'p' + (++this.seq).toString(36), name, char: cleanKey(msg.char, 'horse'), hat: cleanKey(msg.hat, 'none'), colorIdx: ci, conn };
        room.members.push(member);
        this.send(member, { t: 'welcome', id: member.id, code: room.code, hostId: room.members[0].id, members: room.members.map(m => this.public(m)), proto: PROTO, state: room.state });
        this.others(room, member, { t: 'join', m: this.public(member) });
        this.log('join', { code: room.code, id: member.id, name, players: room.members.length });
        return;
      }
      this.stats.msgs++;
      switch (msg.t) {
        case 'cast': {
          if (msg.m === undefined) return;
          const out = JSON.stringify({ t: 'msg', from: member.id, m: msg.m });
          if (msg.to === 'host') { const h = room.members[0]; if (h && h !== member && h.conn.open) h.conn.send(out); }
          else if (typeof msg.to === 'string') { const o = room.members.find(x => x.id === msg.to); if (o && o.conn.open) o.conn.send(out); }
          else for (const o of room.members) if (o !== member && o.conn.open) o.conn.send(out);
          return;
        }
        case 'ps': this.others(room, member, { t: 'ps', id: member.id, s: msg.s }); return;
        case 'look': {
          member.name = cleanName(msg.name); member.char = cleanKey(msg.char, member.char); member.hat = cleanKey(msg.hat, member.hat);
          this.others(room, member, { t: 'look', id: member.id, name: member.name, char: member.char, hat: member.hat });
          return;
        }
        case 'state': if (member === room.members[0] && (msg.v === 'lobby' || msg.v === 'match') && room.state !== msg.v) { room.state = msg.v; this.others(room, member, { t: 'room', state: msg.v }); } return;
        case 'ping': this.send(member, { t: 'pong', c: msg.c }); return;
      }
    });
    conn.on('close', () => {
      clearTimeout(helloTimer);
      if (!member || !room) return;
      const wasHost = room.members[0] === member;
      room.members = room.members.filter(m => m !== member);
      this.log('leave', { code: room.code, id: member.id, host: wasHost, players: room.members.length });
      if (wasHost) {
        for (const m of room.members) { this.send(m, { t: 'closed', reason: 'The host left, so the game has ended.' }); m.conn.close(1000, 'host left'); }
        room.members = [];
      } else this.others(room, member, { t: 'leave', id: member.id });
      if (!room.members.length) this.rooms.delete(room.code);
    });
  }
}

module.exports = { Rooms, PROTO, CODE_RE, makeCode };
