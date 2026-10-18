// Minimal RFC 6455 WebSocket server (text frames, ping/pong, close, fragmentation).
// Written from scratch so the game server has no third-party dependencies.
'use strict';
const crypto = require('crypto');
const { EventEmitter } = require('events');

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

function frameHeader(op, len) {
  const b0 = 0x80 | op;
  if (len < 126) return Buffer.from([b0, len]);
  if (len < 65536) { const h = Buffer.alloc(4); h[0] = b0; h[1] = 126; h.writeUInt16BE(len, 2); return h; }
  const h = Buffer.alloc(10); h[0] = b0; h[1] = 127; h.writeUInt32BE(0, 2); h.writeUInt32BE(len, 6); return h;
}

class WSConn extends EventEmitter {
  constructor(socket, req, maxPayload) {
    super();
    this.socket = socket; this.req = req; this.maxPayload = maxPayload;
    this.buf = Buffer.alloc(0); this.frags = []; this.open = true; this.lastPong = Date.now();
    socket.setNoDelay(true);
    socket.on('data', d => this.onData(d));
    socket.on('close', () => this.terminate('socket closed'));
    socket.on('error', () => this.terminate('socket error'));
  }
  onData(d) {
    this.buf = this.buf.length ? Buffer.concat([this.buf, d]) : d;
    while (this.open) {
      const b = this.buf;
      if (b.length < 2) return;
      const fin = (b[0] & 0x80) !== 0, op = b[0] & 0x0f, masked = (b[1] & 0x80) !== 0;
      if (b[0] & 0x70) return this.fail(1002, 'bad reserved bits');
      let len = b[1] & 0x7f, off = 2;
      if (len === 126) { if (b.length < 4) return; len = b.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (b.length < 10) return; if (b.readUInt32BE(2) !== 0) return this.fail(1009, 'too big'); len = b.readUInt32BE(6); off = 10; }
      if (!masked) return this.fail(1002, 'client frames must be masked');
      if (len > this.maxPayload) return this.fail(1009, 'message too big');
      if (b.length < off + 4 + len) return;
      const mask = b.subarray(off, off + 4), payload = Buffer.from(b.subarray(off + 4, off + 4 + len));
      for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
      this.buf = b.subarray(off + 4 + len);
      this.onFrame(fin, op, payload);
    }
  }
  onFrame(fin, op, payload) {
    if (op === 0x8) { this.sendFrame(0x8, payload.subarray(0, 2)); return this.terminate('closed'); }
    if (op === 0x9) return this.sendFrame(0xa, payload);
    if (op === 0xa) { this.lastPong = Date.now(); return; }
    if (op === 0x0 || op === 0x1 || op === 0x2) {
      this.frags.push(payload);
      const total = this.frags.reduce((a, f) => a + f.length, 0);
      if (total > this.maxPayload) return this.fail(1009, 'message too big');
      if (!fin) return;
      const raw = Buffer.concat(this.frags); this.frags = [];
      this.lastPong = Date.now();
      this.emit('message', raw.toString('utf8'));
      return;
    }
    this.fail(1002, 'bad opcode');
  }
  sendFrame(op, data) {
    if (!this.open || this.socket.destroyed || !this.socket.writable) return;
    this.socket.write(Buffer.concat([frameHeader(op, data.length), data]));
  }
  send(text) { this.sendFrame(0x1, Buffer.from(text, 'utf8')); }
  ping() { this.sendFrame(0x9, Buffer.alloc(0)); }
  fail(code, reason) {
    const b = Buffer.alloc(2 + Buffer.byteLength(reason)); b.writeUInt16BE(code, 0); b.write(reason, 2);
    this.sendFrame(0x8, b); this.terminate(reason);
  }
  close(code = 1000, reason = '') { this.fail(code, reason); }
  terminate(reason) {
    if (!this.open) return;
    this.open = false;
    try { this.socket.end(); } catch (e) { /* ignore */ }
    setTimeout(() => { try { this.socket.destroy(); } catch (e) { /* ignore */ } }, 500);
    this.emit('close', reason);
  }
}

// Attach to a node http server. onConnection(conn, req, url)
function attachWebSocket(httpServer, { path = '/ws', maxPayload = 65536, onConnection }) {
  httpServer.on('upgrade', (req, socket) => {
    const url = new URL(req.url, 'http://x');
    const key = req.headers['sec-websocket-key'];
    if (url.pathname !== path || !key || (req.headers.upgrade || '').toLowerCase() !== 'websocket') { socket.end('HTTP/1.1 400 Bad Request\r\n\r\n'); return; }
    const accept = crypto.createHash('sha1').update(key + GUID).digest('base64');
    socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
    onConnection(new WSConn(socket, req, maxPayload), req, url);
  });
}

module.exports = { attachWebSocket, WSConn };
