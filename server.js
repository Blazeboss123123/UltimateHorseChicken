// Ultimate Horse Chicken — game server (no dependencies).
// Serves the Phaser game from ./public and runs the online rooms over WebSocket at /ws.
//   node server.js            (PORT env var or 3000)
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { attachWebSocket } = require('./server/ws');
const { Rooms } = require('./server/rooms');

const ROOT = path.join(__dirname, 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8' };

function startServer(port = process.env.PORT || 3000, opts = {}) {
  const started = Date.now();
  let build = 0; try { const m = /[?&]v=(\d+)/.exec(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')); if (m) build = +m[1]; } catch (e) { }
  const rooms = new Rooms({ build, log: opts.quiet ? null : (ev, d) => console.log(JSON.stringify({ ev, ...d })) });
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ ok: true, game: 'ultimate-horse-chicken', uptime: Math.round((Date.now() - started) / 1000), ...rooms.summary() }));
      return;
    }
    let file = decodeURIComponent(url.pathname);
    if (file.endsWith('/')) file += 'index.html';
    const full = path.normalize(path.join(ROOT, file));
    if (!full.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }
    fs.stat(full, (err, st) => {
      if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found'); return; }
      const ext = path.extname(full).toLowerCase();
      res.writeHead(200, { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': ext === '.html' || ext === '.js' ? 'no-cache' : 'public, max-age=3600' });
      fs.createReadStream(full).pipe(res);
    });
  });
  attachWebSocket(server, { path: '/ws', maxPayload: 256 * 1024, onConnection: (conn, req, url) => rooms.connect(conn, url) });
  server.listen(port, () => { if (!opts.quiet) console.log('Ultimate Horse Chicken running on http://localhost:' + server.address().port); });
  server.rooms = rooms;
  server.on('close', () => rooms.stop());
  return server;
}

if (require.main === module) startServer();
module.exports = { startServer };
