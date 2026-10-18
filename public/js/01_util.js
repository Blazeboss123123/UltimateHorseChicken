'use strict';
// ===================== CORE UTILITIES =====================
const T = 32;                 // tile size in px
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function mulberry(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const rectsOverlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
function rectCircle(r, c) { const cx = clamp(c.x, r.x, r.x + r.w), cy = clamp(c.y, r.y, r.y + r.h); const dx = c.x - cx, dy = c.y - cy; return dx * dx + dy * dy < c.r * c.r; }
function shapeHitsRect(s, r) { return s.k === 'c' ? rectCircle(r, s) : rectsOverlap(s, r); }
function fmtTime(s) { if (s == null || !isFinite(s)) return '—'; const m = Math.floor(s / 60), r = s - m * 60; return (m ? m + ':' + (r < 10 ? '0' : '') : '') + r.toFixed(2); }
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function uid() { return Math.random().toString(36).slice(2, 9); }
function deepCopy(o) { return JSON.parse(JSON.stringify(o)); }

// Rotation helpers (quarter turns clockwise, y-down screen space)
function rotSize(w, h, r) { return (r & 1) ? [h, w] : [w, h]; }
function rotPoint(lx, ly, w, h, r) {
  switch (r & 3) { case 0: return [lx, ly]; case 1: return [h - ly, lx]; case 2: return [w - lx, h - ly]; default: return [ly, w - lx]; }
}
function rotRect(x, y, rw, rh, w, h, r) {
  const a = rotPoint(x, y, w, h, r), b = rotPoint(x + rw, y + rh, w, h, r);
  return { x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), w: Math.abs(a[0] - b[0]), h: Math.abs(a[1] - b[1]) };
}
function rotDir(dx, dy, r) { for (let i = 0; i < (r & 3); i++) { const t = dx; dx = -dy; dy = t; } return [dx, dy]; }

// ===================== CONSTANT DATA =====================
const PLAYER_COLORS = ['#e8473f', '#3f8de8', '#f2b81f', '#3fb35a', '#a35be0', '#f28a2e', '#25bdbd', '#e85fae'];
const COLOR_NAMES = ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange', 'Teal', 'Pink'];
const COLOR_SHAPES = ['●', '■', '▲', '◆', '★', '✚', '⬟', '♥']; // colour-blind friendly markers

const DEFAULT_RULES = {
  winScore: 100, roundLimit: 0, pickTime: 12, buildTime: 20, raceTime: 75,
  perPlayer: 1, extraItems: 2, order: 'rotate', assign: 'draft',
  respawn: false, coins: true, allowUndo: true, allowOverlap: false,
  ptsFinish: 25, ptsFirst: 10, ptsTrap: 6, ptsCoin: 10, ptsSolo: 15, ptsUnderdog: 8,
  tooEasy: true, gravity: 1, airControl: 1, speed: 1,
  handicap: [1, 1, 1, 1, 1, 1, 1, 1],
};
const DEFAULT_SETTINGS = {
  master: 0.8, music: 0.45, sfx: 0.8,
  camMode: 'shared', minZoom: 0.5, renderer: 'auto', shake: true, reduceFlash: false, contrast: false,
  indicators: true, uiScale: 1, grid: true, hitboxes: false, names: true,
  binds: null, // filled in by Input
};

// ===================== SAVE DATA =====================
const Save = {
  key: 'uhc_save_v1',
  data: null,
  fresh() {
    return {
      v: 1,
      slots: [0, 1, 2, 3].map(i => ({ name: ['Player 1', 'Player 2', 'Player 3', 'Player 4'][i], char: ['horse', 'chicken', 'sheep', 'raccoon'][i], hat: 'none' })),
      stats: { rounds: 0, matches: 0, wins: 0, finishes: 0, deaths: 0, traps: 0, coins: 0, solos: 0, bombs: 0, jumps: 0, placed: 0, firsts: 0, underdogs: 0, xp: 0, playTime: 0, bellRings: 0, published: 0, streak: 0, bestStreak: 0 },
      medals: {}, best: {}, ach: {}, seen: {}, favs: {}, recent: [], custom: [], drafts: [],
      settings: deepCopy(DEFAULT_SETTINGS), rules: deepCopy(DEFAULT_RULES), weights: {},
    };
  },
  load() {
    let d = null;
    try { const raw = localStorage.getItem(this.key); if (raw) d = JSON.parse(raw); } catch (e) { d = null; }
    const f = this.fresh();
    if (!d || d.v !== 1) d = f;
    // merge missing keys so older saves keep working
    for (const k in f) if (d[k] === undefined) d[k] = f[k];
    for (const k in f.stats) if (d.stats[k] === undefined) d.stats[k] = f.stats[k];
    for (const k in f.settings) if (d.settings[k] === undefined) d.settings[k] = f.settings[k];
    for (const k in f.rules) if (d.rules[k] === undefined) d.rules[k] = f.rules[k];
    while (d.slots.length < 4) d.slots.push(f.slots[d.slots.length]);
    this.data = d;
    return d;
  },
  write() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { /* storage unavailable */ } },
};

// ===================== TOASTS =====================
function toast(msg, cls = '') {
  const box = document.getElementById('toasts');
  if (!box) return;
  const d = document.createElement('div');
  d.className = 'toast ' + cls;
  d.innerHTML = msg;
  box.appendChild(d);
  setTimeout(() => { d.style.transition = 'opacity .4s'; d.style.opacity = '0'; }, 2600);
  setTimeout(() => d.remove(), 3100);
}

function starPath(ctx, x, y, r1, r2, n) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) { const r = i & 1 ? r2 : r1, a = i * Math.PI / n - Math.PI / 2; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  ctx.closePath();
}

// ===================== NETWORK HOOK =====================
// All match-changing actions go through Net.dispatch so the online version can
// relay them to other players. Locally it just applies them straight away.
const Net = {
  online: false, isHost: true,
  handlers: {},
  on(type, fn) { this.handlers[type] = fn; },
  dispatch(action) {
    // online version: if (!this.isHost) { socket.send(action); return; }
    const h = this.handlers[action.t];
    if (h) h(action);
    // online version: if host, broadcast action to clients here.
  },
};
