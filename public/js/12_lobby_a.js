// ===================== TREEHOUSE LOBBY: layout & static art =====================
const MODES = [
  { id: 'party', name: 'Party', icon: '🎉', desc: 'Draft random items, build, race. First to the target score wins.' },
  { id: 'creative', name: 'Creative', icon: '🎨', desc: 'Like Party, but everyone chooses from the full item inventory.' },
  { id: 'freebuild', name: 'Free Build', icon: '🔨', desc: 'Level editor: build together, test, save, publish and share codes.' },
  { id: 'challenge', name: 'Challenge', icon: '⏱️', desc: 'Beat a pre-built course for gold, silver and bronze times.' },
];
const LW = 2200, LH = 1240, LG = 1180; // lobby size and ground height
const LOBBY = (() => {
  const planks = [], climbs = [], acts = [], cards = [];
  const plank = (x0, x1, y) => planks.push({ x: x0, y, w: x1 - x0, h: 14, oneway: true, terrain: true });
  plank(500, 1960, 290); plank(380, 1960, 500); plank(500, 1960, 710); plank(700, 1700, 920);
  // clubhouse floors
  plank(40, 500, 960); plank(90, 420, 760);
  climbs.push({ x: 1100, y: 190, w: 40, h: LG - 190 }, { x: 520, y: 280, w: 32, h: LG - 280 }, { x: 1930, y: 280, w: 32, h: LG - 280 }, { x: 462, y: 752, w: 30, h: LG - 752 });
  const rows = [[290, [680, 940, 1340, 1600, 1860]], [500, [470, 760, 1460, 1760]], [710, [680, 940, 1340, 1600, 1860]], [920, [830, 1450]]];
  let k = 0; for (const [y, xs] of rows) for (const x of xs) { const m = MAPS[k++]; if (!m) break; cards.push({ map: m, x: x - 75, y: y - 118, w: 150, h: 112 }); }
  for (const c of cards) acts.push({ kind: 'card', x: c.x, y: c.y + 20, w: c.w, h: c.h, card: c });
  acts.push(
    { kind: 'couch', x: 66, y: LG - 70, w: 170, h: 70, label: 'Players couch', host: false },
    { kind: 'wardrobe', x: 300, y: LG - 110, w: 90, h: 110, label: 'Wardrobe' },
    { kind: 'trophies', x: 70, y: 960 - 110, w: 120, h: 110, label: 'Trophy shelf' },
    { kind: 'stats', x: 220, y: 960 - 90, w: 80, h: 90, label: 'Stats book' },
    { kind: 'settings', x: 340, y: 960 - 90, w: 100, h: 90, label: 'Settings radio' },
    { kind: 'credits', x: 190, y: 760 - 90, w: 130, h: 90, label: 'Credits' },
    { kind: 'mode', x: 600, y: LG - 170, w: 140, h: 170, label: 'Change mode', host: true },
    { kind: 'controls', x: 760, y: LG - 80, w: 70, h: 80, label: 'Controls' },
    { kind: 'well', x: 1230, y: LG - 90, w: 110, h: 90, label: 'Wishing well' },
    { kind: 'community', x: 1380, y: LG - 120, w: 120, h: 120, label: 'Community shelf', host: true },
    { kind: 'rules', x: 1640, y: LG - 190, w: 220, h: 190, label: 'Rules & score balancer', host: true },
    { kind: 'random', x: 1990, y: LG - 160, w: 160, h: 160, label: 'Random map', host: true },
    { kind: 'bell', x: 1085, y: 120, w: 70, h: 80, label: 'Ring the bell' },
  );
  const solids = planks.concat([
    { x: -200, y: -2000, w: 200, h: 5000, terrain: true, wall: true }, { x: LW, y: -2000, w: 200, h: 5000, terrain: true, wall: true },
    { x: -500, y: LG, w: LW + 1000, h: 400, terrain: true },
    { x: 900, y: LG - 40, w: 60, h: 40, terrain: true, surf: 'bounce', mush: true },
  ]);
  return { planks, climbs, acts, cards, solids };
})();

function drawTree(ctx, t) {
  const bark = '#e9e2d2', barkD = '#c9bfa8';
  // branches (behind leaves, in front of sky)
  const br = (x1, y1, cx, cy, x2, y2, w) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(cx, cy, x2, y2); ctx.strokeStyle = barkD; ctx.lineWidth = w + 6; ctx.lineCap = 'round'; ctx.stroke(); ctx.strokeStyle = bark; ctx.lineWidth = w; ctx.stroke(); };
  br(1120, 700, 900, 520, 560, 300, 30); br(1120, 640, 1400, 500, 1900, 300, 30); br(1120, 900, 800, 760, 460, 520, 26); br(1120, 860, 1500, 760, 1880, 520, 26);
  br(1120, 1000, 900, 900, 600, 720, 24); br(1120, 980, 1500, 900, 1900, 730, 24); br(1120, 1100, 900, 1010, 760, 930, 20); br(1120, 1080, 1400, 1010, 1650, 930, 20);
  br(1120, 400, 1000, 260, 820, 150, 18); br(1120, 380, 1300, 230, 1500, 140, 18);
  // leaf clumps
  const leaf = (x, y, r, c) => { ctx.fillStyle = c; ctx.beginPath(); for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; ctx.lineTo(x + Math.cos(a) * r * (1 + (i % 2) * .25), y + Math.sin(a) * r * .7 * (1 + (i % 2) * .25)); } ctx.closePath(); ctx.fill(); };
  const R = mulberry(77);
  for (let i = 0; i < 46; i++) { const x = 300 + R() * 1800, y = 40 + R() * 300 + (Math.abs(x - 1120) > 700 ? 220 : 0); leaf(x + Math.sin(t * .8 + i) * 2, y, 50 + R() * 70, i % 3 ? '#5f9f55' : '#4f8f48'); }
  // trunk
  ctx.beginPath(); ctx.moveTo(1050, LG + 4); ctx.bezierCurveTo(1075, 900, 1060, 500, 1090, 180); ctx.lineTo(1150, 180); ctx.bezierCurveTo(1180, 500, 1165, 900, 1195, LG + 4); ctx.closePath(); fillStroke(ctx, bark, 4, '#b8ad94');
  ctx.strokeStyle = barkD; ctx.lineWidth = 3; for (let y = 260; y < LG; y += 70) { ctx.beginPath(); ctx.moveTo(1080, y); ctx.quadraticCurveTo(1100, y + 20, 1090, y + 45); ctx.stroke(); ctx.beginPath(); ctx.moveTo(1160, y + 30); ctx.quadraticCurveTo(1150, y + 50, 1162, y + 70); ctx.stroke(); }
  // roots
  for (const [x, d] of [[1050, -1], [1195, 1]]) { ctx.beginPath(); ctx.moveTo(x, LG - 40); ctx.quadraticCurveTo(x + d * 30, LG - 10, x + d * 70, LG + 4); ctx.lineTo(x, LG + 4); ctx.closePath(); fillStroke(ctx, bark, 3, '#b8ad94'); }
}
function drawLadder(ctx, c) { line(ctx, c.x + 3, c.y, c.x + 3, c.y + c.h, '#8a5a30', 5); line(ctx, c.x + c.w - 3, c.y, c.x + c.w - 3, c.y + c.h, '#8a5a30', 5); for (let y = c.y + 14; y < c.y + c.h; y += 22) line(ctx, c.x + 3, y, c.x + c.w - 3, y, '#b07a45', 4); }
function drawCard(ctx, c, t, sel) {
  const m = c.map, unlocked = mapUnlocked(m);
  const x = c.x, y = c.y, w = c.w, h = c.h;
  // little stand
  rr(ctx, x + 6, y + h - 4, w - 12, 10, 3); fillStroke(ctx, '#9aa1aa', 2.5);
  ctx.save(); rr(ctx, x, y, w, h - 4, 6); fillStroke(ctx, '#fffaf0', 3); ctx.clip();
  ctx.drawImage(mapThumb(m, 300, 216), x, y, w, h - 4);
  if (!unlocked) { ctx.fillStyle = 'rgba(40,30,30,.6)'; ctx.fillRect(x, y, w, h); txt(ctx, '🔒', x + w / 2, y + h / 2 + 6, 30, '#fff', 'center', null); }
  ctx.restore();
  rr(ctx, x, y, w, h - 4, 6); ctx.lineWidth = sel ? 5 : 3; ctx.strokeStyle = sel ? '#ff5fa2' : INK; ctx.stroke();
  // name label
  ctx.font = '700 17px Fredoka, sans-serif'; const tw = Math.min(w + 20, ctx.measureText(m.name).width + 14);
  txt(ctx, m.name, x + w / 2, y + 16, m.name.length > 14 ? 15 : 17, unlocked ? '#fff' : '#ddd', 'center', INK);
  if (unlocked && Save.data.seen[m.id] === false) { const s = 1 + Math.sin(t * 6) * .08; ctx.save(); ctx.translate(x + w - 12, y + h - 26); ctx.scale(s, s); ctx.rotate(-.2); starPath(ctx, 0, 0, 22, 14, 10); fillStroke(ctx, '#ffe14d', 2); txt(ctx, 'NEW', 0, 1, 12, '#e8473f', 'center', null); ctx.restore(); }
  if (Save.data.favs[m.id]) txt(ctx, '♥', x + 12, y + h - 22, 20, '#ff5fa2', 'center', INK);
  if (Save.data.recent.includes(m.id)) txt(ctx, '⟲', x + 30, y + h - 22, 16, '#fff', 'center', INK);
  const med = Save.data.medals[m.id]; if (med) txt(ctx, { gold: '🥇', silver: '🥈', bronze: '🥉' }[med], x + w - 14, y + 36, 16, '#fff', 'center', null);
}
function drawClubhouse(ctx, t) {
  // stilts & frame
  for (const x of [40, 494]) drawWood(ctx, x, 700, 14, LG - 700, x, '#9a6a40');
  rr(ctx, 40, 760, 470, LG - 760, 4); ctx.fillStyle = '#e8d4b0'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
  ctx.strokeStyle = 'rgba(138,90,48,.25)'; ctx.lineWidth = 2; for (let y = 790; y < LG; y += 26) { ctx.beginPath(); ctx.moveTo(42, y); ctx.lineTo(508, y); ctx.stroke(); }
  // roof
  poly(ctx, [[20, 772], [255, 560], [530, 772]], '#d8473c', 3.5);
  ctx.strokeStyle = 'rgba(0,0,0,.18)'; for (let i = 1; i < 7; i++) line(ctx, 20 + i * 36, 772 - i * 4, 255, 560, 'rgba(0,0,0,.12)', 2);
  rr(ctx, 205, 600, 100, 70, 6); fillStroke(ctx, '#ffe9a8', 3); line(ctx, 255, 600, 255, 670, INK, 2); line(ctx, 205, 635, 305, 635, INK, 2);
  // floors
  for (const p of LOBBY.planks) drawWood(ctx, p.x, p.y, p.w, p.h, p.x + p.y, p.y >= 760 && p.x < 510 ? '#b07a45' : '#c48a52');
  // couch
  rr(ctx, 70, LG - 56, 160, 46, 12); fillStroke(ctx, '#e8473f', 3); rr(ctx, 64, LG - 76, 24, 66, 10); fillStroke(ctx, '#d0352d', 3); rr(ctx, 214, LG - 76, 24, 66, 10); fillStroke(ctx, '#d0352d', 3); rr(ctx, 90, LG - 84, 120, 34, 10); fillStroke(ctx, '#e8473f', 3);
  // wardrobe & mirror
  rr(ctx, 300, LG - 116, 86, 112, 6); fillStroke(ctx, '#8a5a30', 3); ell(ctx, 343, LG - 62, 26, 40, '#cfe8ff', 3); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(330, LG - 90, 6, 30);
  line(ctx, 410, LG - 4, 410, LG - 110, '#5a3a20', 4); line(ctx, 396, LG - 104, 426, LG - 104, '#5a3a20', 4); ctx.save(); ctx.translate(398, LG - 104); drawHat(ctx, 'top', t); ctx.restore(); ctx.save(); ctx.translate(424, LG - 98); drawHat(ctx, 'party', t); ctx.restore();
  // trophy shelf
  rr(ctx, 70, 860, 124, 96, 4); fillStroke(ctx, '#a0703f', 3); line(ctx, 72, 905, 192, 905, INK, 3);
  // stats book on a stand
  rr(ctx, 235, 905, 50, 52, 4); fillStroke(ctx, '#8a5a30', 3); poly(ctx, [[222, 902], [258, 880], [298, 902], [260, 912]], '#fff', 2.5); line(ctx, 258, 880, 260, 912, INK, 2);
  // radio
  rr(ctx, 350, 900, 84, 56, 8); fillStroke(ctx, '#3f8de8', 3); circ(ctx, 375, 928, 15, '#cfe8ff', 2.5); for (let i = 0; i < 3; i++) line(ctx, 400, 914 + i * 10, 426, 914 + i * 10, INK, 2); line(ctx, 420, 900, 440, 872, INK, 2.5);
  // credits board in the attic
  rr(ctx, 195, 678, 120, 70, 6); fillStroke(ctx, '#f6efe0', 3); txt(ctx, 'Credits', 255, 700, 18, INK, 'center', null); txt(ctx, '♥ made for friends', 255, 726, 11, INK, 'center', null, 500);
  // window boxes & lamp
  rr(ctx, 120, 790, 90, 50, 4); fillStroke(ctx, '#bfe8ff', 3); line(ctx, 165, 790, 165, 840, INK, 2); line(ctx, 120, 815, 210, 815, INK, 2);
}
function drawModeMachine(ctx, a, t) {
  const m = Lobby.modeObj();
  rr(ctx, a.x + 30, a.y + 70, 80, 100, 8); fillStroke(ctx, '#7a8490', 3);
  rr(ctx, a.x, a.y, a.w, 80, 10); fillStroke(ctx, '#3a2a4a', 3.5);
  ctx.fillStyle = '#ff5a4a'; txt(ctx, 'MODE', a.x + a.w / 2, a.y + 22, 20, '#ff6a5a', 'center', null);
  rr(ctx, a.x + 10, a.y + 38, a.w - 20, 34, 6); fillStroke(ctx, '#f6efe0', 2.5);
  txt(ctx, m.icon + ' ' + m.name, a.x + a.w / 2, a.y + 55, m.name.length > 8 ? 15 : 18, INK, 'center', null);
  for (let i = 0; i < 4; i++) circ(ctx, a.x + 22 + i * 32, a.y + 6, 5, MODES[i].id === Session.mode ? '#ffd34d' : '#665', 1.5);
  // lever
  const ang = Math.sin(t * 2) * .05 - .4; line(ctx, a.x + 110, a.y + 120, a.x + 110 + Math.sin(ang) * 40, a.y + 120 - Math.cos(ang) * 40, INK, 5); circ(ctx, a.x + 110 + Math.sin(ang) * 40, a.y + 120 - Math.cos(ang) * 40, 8, '#e8473f', 2.5);
}
function drawRulesBoard(ctx, a) {
  const R = Save.data.rules;
  line(ctx, a.x + 30, a.y + 120, a.x + 30, LG, '#8a5a30', 7); line(ctx, a.x + a.w - 30, a.y + 120, a.x + a.w - 30, LG, '#8a5a30', 7);
  rr(ctx, a.x, a.y, a.w, 130, 6); fillStroke(ctx, '#f6efe0', 3);
  txt(ctx, 'Score Balancer', a.x + a.w / 2, a.y + 16, 15, INK, 'center', null);
  txt(ctx, 'Win ' + R.winScore + ' · ' + (R.roundLimit ? R.roundLimit + ' rnds' : '∞ rnds') + ' · ' + R.perPlayer + ' item' + (R.perPlayer > 1 ? 's' : ''), a.x + a.w / 2, a.y + 34, 11, INK, 'center', null, 500);
  Session.roster.slice(0, 8).forEach((e, i) => { const yy = a.y + 46 + i * 10; ctx.fillStyle = e.color; ctx.fillRect(a.x + 14, yy, 8, 8); rr(ctx, a.x + 28, yy, (a.w - 70) * Math.min(1, (R.handicap[i] || 1) / 1.5), 8, 3); ctx.fillStyle = 'rgba(58,42,30,.35)'; ctx.fill(); txt(ctx, Math.round((R.handicap[i] || 1) * 100) + '%', a.x + a.w - 22, yy + 4, 9, INK, 'center', null, 600); });
  rr(ctx, a.x + 20, a.y + 138, 46, 22, 4); fillStroke(ctx, '#ff9e8c', 2); txt(ctx, '-10', a.x + 43, a.y + 149, 12, INK, 'center', null);
  rr(ctx, a.x + 76, a.y + 138, 46, 22, 4); fillStroke(ctx, '#bfe8ff', 2); txt(ctx, '+10', a.x + 99, a.y + 149, 12, INK, 'center', null);
  rr(ctx, a.x + 132, a.y + 138, 66, 22, 4); fillStroke(ctx, '#a9e59a', 2); txt(ctx, 'Rules', a.x + 165, a.y + 149, 12, INK, 'center', null);
}

// Everything that never changes is painted once into one big texture.
function bakeLobby() {
  if (TEX.has('lobby_static')) return;
  const c = TEX.canvas(LW, LH + 60), ctx = c.getContext('2d'), t = 0;
  drawTree(ctx, t);
  ctx.save(); ctx.translate(225, 290); ctx.scale(.85, .85); ctx.rotate(-.04); line(ctx, -150, -90, -150, 0, '#6a4a2a', 3); line(ctx, 150, -90, 150, 0, '#6a4a2a', 3); rr(ctx, -210, -10, 420, 110, 14); fillStroke(ctx, '#ffd56b', 4);
  txt(ctx, 'ULTIMATE', 0, 18, 26, '#e8473f', 'center', INK); txt(ctx, 'Horse Chicken', 0, 60, 40, '#fff', 'center', INK); ctx.restore();
  ctx.fillStyle = '#9ad86a'; ctx.fillRect(0, LG, LW, 60); ctx.fillStyle = '#7cc452'; for (let x = 0; x < LW; x += 14) { ctx.beginPath(); ctx.moveTo(x, LG + 2); ctx.lineTo(x + 5, LG - 10 - Math.sin(x * .7) * 4); ctx.lineTo(x + 10, LG + 2); ctx.fill(); }
  drawClubhouse(ctx, t);
  for (const cl of LOBBY.climbs) drawLadder(ctx, cl);
  for (const p of LOBBY.planks) if (!(p.y >= 760 && p.x < 510)) drawWood(ctx, p.x, p.y, p.w, p.h, p.x * 3 + p.y, '#c48a52');
  for (const a of LOBBY.acts) {
    if (a.kind === 'mode') { rr(ctx, a.x + 30, a.y + 70, 80, 100, 8); fillStroke(ctx, '#7a8490', 3); rr(ctx, a.x, a.y, a.w, 80, 10); fillStroke(ctx, '#3a2a4a', 3.5); txt(ctx, 'MODE', a.x + a.w / 2, a.y + 22, 20, '#ff6a5a', 'center', null); rr(ctx, a.x + 10, a.y + 38, a.w - 20, 34, 6); fillStroke(ctx, '#f6efe0', 2.5); }
    else if (a.kind === 'rules') { line(ctx, a.x + 30, a.y + 120, a.x + 30, LG, '#8a5a30', 7); line(ctx, a.x + a.w - 30, a.y + 120, a.x + a.w - 30, LG, '#8a5a30', 7); rr(ctx, a.x, a.y, a.w, 130, 6); fillStroke(ctx, '#f6efe0', 3); txt(ctx, 'Score Balancer', a.x + a.w / 2, a.y + 16, 15, INK, 'center', null); rr(ctx, a.x + 20, a.y + 138, 46, 22, 4); fillStroke(ctx, '#ff9e8c', 2); txt(ctx, '-10', a.x + 43, a.y + 149, 12, INK, 'center', null); rr(ctx, a.x + 76, a.y + 138, 46, 22, 4); fillStroke(ctx, '#bfe8ff', 2); txt(ctx, '+10', a.x + 99, a.y + 149, 12, INK, 'center', null); rr(ctx, a.x + 132, a.y + 138, 66, 22, 4); fillStroke(ctx, '#a9e59a', 2); txt(ctx, 'Rules', a.x + 165, a.y + 149, 12, INK, 'center', null); }
    else if (a.kind === 'random') { line(ctx, a.x + 80, a.y + 100, a.x + 80, LG, '#8a5a30', 8); rr(ctx, a.x, a.y, a.w, 110, 8); fillStroke(ctx, '#fff', 3); }
    else if (a.kind === 'well') { rr(ctx, a.x + 10, a.y + 40, 90, 50, 6); fillStroke(ctx, '#9aa1aa', 3); for (let x = a.x + 16; x < a.x + 96; x += 22) line(ctx, x, a.y + 44, x, a.y + 88, 'rgba(0,0,0,.15)', 2); line(ctx, a.x + 18, a.y + 40, a.x + 18, a.y - 10, '#8a5a30', 5); line(ctx, a.x + 92, a.y + 40, a.x + 92, a.y - 10, '#8a5a30', 5); poly(ctx, [[a.x, a.y - 6], [a.x + 55, a.y - 40], [a.x + 110, a.y - 6]], '#c49a5a', 3); }
    else if (a.kind === 'community') { rr(ctx, a.x, a.y, a.w, a.h, 4); fillStroke(ctx, '#8a5a30', 3); for (let s = 0; s < 3; s++) { line(ctx, a.x + 4, a.y + 38 + s * 38, a.x + a.w - 4, a.y + 38 + s * 38, INK, 2.5); for (let b = 0; b < 5; b++) { rr(ctx, a.x + 10 + b * 20, a.y + 10 + s * 38, 14, 27, 2); fillStroke(ctx, ['#e8473f', '#3f8de8', '#f2b81f', '#3fb35a', '#a35be0'][(b + s) % 5], 1.5); } } rr(ctx, a.x + 8, a.y - 26, a.w - 16, 22, 4); fillStroke(ctx, '#fff', 2); }
    else if (a.kind === 'controls') { rr(ctx, a.x, a.y, a.w, 56, 6); fillStroke(ctx, '#fff', 3); txt(ctx, '🎮', a.x + a.w / 2, a.y + 22, 22, '#fff', 'center', null); txt(ctx, 'Controls', a.x + a.w / 2, a.y + 44, 11, INK, 'center', null); line(ctx, a.x + a.w / 2, a.y + 56, a.x + a.w / 2, LG, '#8a5a30', 5); }
    else if (a.kind === 'bell') line(ctx, a.x + 35, a.y - 20, a.x + 35, a.y + 10, '#5a3a20', 3);
  }
  rr(ctx, 915, LG - 40, 30, 40, 6); fillStroke(ctx, '#f6efe0', 3); ctx.beginPath(); ctx.ellipse(930, LG - 40, 42, 22, 0, Math.PI, 0); fillStroke(ctx, '#e8473f', 3); for (const [dx, dy] of [[-20, -50], [8, -56], [24, -46]]) circ(ctx, 930 + dx, LG + dy + 2, 5, '#fff', 0);
  TEX.add('lobby_static', c);
  TEX.bake('bell', 40, 44, g => { g.translate(20, 2); g.beginPath(); g.moveTo(-18, 34); g.quadraticCurveTo(-18, 0, 0, 0); g.quadraticCurveTo(18, 0, 18, 34); g.closePath(); fillStroke(g, '#f2c230', 3); circ(g, 0, 36, 5, '#a07a20', 2); }, 4);
  const sky = TEX.canvas(4, 256), sg = sky.getContext('2d'), gr = sg.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#8fdcf0'); gr.addColorStop(1, '#d6f5fa'); sg.fillStyle = gr; sg.fillRect(0, 0, 4, 256); TEX.add('lobby_sky', sky);
}
