// ===================== CHARACTERS (side-profile animals, hand-painted) =====================
const CH_OL = 1.25; // character outline width (texture is supersampled)
function furPath(ctx, fill, ol, bb, lw = CH_OL, light = .22, dark = .22) {
  ctx.fillStyle = fill; ctx.fill();
  if (bb) innerShade(ctx, bb[0], bb[1], bb[2], bb[3], light, dark);
  if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = ol; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
}
function oval(ctx, x, y, rx, ry, fill, ol, rot = 0, lw = CH_OL) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(.2, rx), Math.max(.2, ry), rot, 0, TAU); furPath(ctx, fill, ol, [x - rx, y - ry, rx * 2, ry * 2], lw); }
function shape(ctx, pts, fill, ol, lw = CH_OL, curvy = true) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  if (curvy) { for (let i = 1; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); } }
  else for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  furPath(ctx, fill, ol, [x0, y0, x1 - x0, y1 - y0], lw);
}
function limb(ctx, pts, col, ol, w) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
  ctx.strokeStyle = ol; ctx.lineWidth = w + CH_OL * 2; ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke();
}
function eye(ctx, x, y, r, o) {
  if (o.dead) { ctx.lineCap = 'round'; line(ctx, x - r * .7, y - r * .7, x + r * .7, y + r * .7, '#2a1c16', 1.3); line(ctx, x + r * .7, y - r * .7, x - r * .7, y + r * .7, '#2a1c16', 1.3); return; }
  if (o.happy) { ctx.beginPath(); ctx.arc(x, y + r * .4, r * .75, Math.PI * 1.15, Math.PI * 1.85); ctx.strokeStyle = '#2a1c16'; ctx.lineWidth = 1.3; ctx.lineCap = 'round'; ctx.stroke(); return; }
  if (o.blink) { line(ctx, x - r * .8, y + .3, x + r * .8, y + .3, '#2a1c16', 1.2); return; }
  const s = o.scared ? 1.28 : 1;
  ctx.beginPath(); ctx.ellipse(x, y, r * s * .86, r * s, 0, 0, TAU); ctx.fillStyle = '#fffdf8'; ctx.fill(); ctx.lineWidth = .8; ctx.strokeStyle = 'rgba(45,28,20,.65)'; ctx.stroke();
  const pr = o.scared ? r * .36 : r * .6, lx = (o.lookX == null ? .45 : o.lookX) * (r * s - pr) * .75;
  ctx.beginPath(); ctx.arc(x + lx, y + (o.lookY || 0) * r * .3, pr, 0, TAU); ctx.fillStyle = '#21160f'; ctx.fill();
  ctx.beginPath(); ctx.arc(x + lx - pr * .35, y - pr * .4, pr * .32, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fill();
  if (o.scared) line(ctx, x - r * 1.1, y - r * 1.55, x + r * .9, y - r * 1.25, '#2a1c16', 1.1);
}
function mouth(ctx, x, y, o, w = 2.4) {
  if (o.scared || o.dead) { oval(ctx, x, y + .8, 1.5, 2, '#6e2a26', '#3a1a16', 0, .8); return; }
  if (o.happy) { ctx.beginPath(); ctx.arc(x, y - .6, w * 1.1, .15, Math.PI - .15); ctx.fillStyle = '#7a2e28'; ctx.fill(); ctx.strokeStyle = '#3a1a16'; ctx.lineWidth = .9; ctx.stroke(); return; }
  ctx.beginPath(); ctx.arc(x, y - 1, w, .35, Math.PI - .5); ctx.strokeStyle = 'rgba(40,24,18,.85)'; ctx.lineWidth = 1; ctx.stroke();
}
function cheek(ctx, x, y) { ctx.fillStyle = 'rgba(255,120,120,.35)'; ctx.beginPath(); ctx.ellipse(x, y, 2, 1.3, 0, 0, TAU); ctx.fill(); }

const CHARS = {
  horse: {
    name: 'Horse', fur: '#b8784a', belly: '#e2b98e', leg: '#a36a40', foot: 'hoof', footCol: '#4a3226', desc: 'Steady hooves, big heart.', hr: 7,
    tail(ctx, t, C) { ctx.save(); ctx.translate(-6.5, -19); ctx.rotate(.5 + Math.sin(t * 5) * .08); shape(ctx, [[0, -2], [-5, 2], [-7, 10], [-4, 16], [-2, 9], [1, 3]], '#5b3420', '#3a2014'); ctx.restore(); },
    head(ctx, o, C) {
      const ol = C.ol;
      shape(ctx, [[-4, -6], [-4.6, -14.5], [-.6, -8]], C.fur, ol, CH_OL, false); shape(ctx, [[-.6, -8.6], [1.6, -15.5], [3.4, -7.6]], C.fur, ol, CH_OL, false);
      shape(ctx, [[-6.5, -3], [-3, -8.5], [3, -8.6], [8, -4.5], [12.4, 2], [14.6, 6.6], [12.6, 10], [7.6, 9.6], [2, 6.6], [-3.6, 5.6], [-7, 2.4]], C.fur, ol);
      oval(ctx, 12.2, 7.4, 3.4, 2.9, '#d9a77c', ol, .5, .9);
      ctx.fillStyle = '#4a2a1a'; ctx.beginPath(); ctx.ellipse(13.4, 6, .9, .6, .6, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff7ea'; ctx.beginPath(); ctx.moveTo(4, -7); ctx.quadraticCurveTo(8, -4.5, 10.4, .6); ctx.lineTo(9, 1.2); ctx.quadraticCurveTo(6.6, -3.2, 3.2, -5.8); ctx.fill();
      shape(ctx, [[-1.6, -9.4], [3.6, -9], [2, -6], [-1, -5.4], [-4.6, -1], [-6.4, 6], [-9.6, 4], [-7.6, -3]], '#5b3420', '#3a2014');
      eye(ctx, 2.6, -2.6, 2.2, o); mouth(ctx, 10.4, 9.2, o, 1.6);
    }, hatY: -9,
  },
  chicken: {
    name: 'Chicken', fur: '#fbf6ec', belly: '#ffffff', leg: '#f0a432', foot: 'bird', footCol: '#e08d1c', ol: '#9a8a78', arms: 'wing', desc: 'Flappy, fearless, mostly.', hr: 6.2,
    tail(ctx, t, C) { ctx.save(); ctx.translate(-6, -21); ctx.rotate(-.2 + Math.sin(t * 6) * .06); shape(ctx, [[0, 0], [-6, -8], [-4, -2], [-9, -5], [-5, 2], [-8, 3], [-1, 5]], '#f1ebdd', C.ol); ctx.restore(); },
    head(ctx, o, C) {
      shape(ctx, [[-2, -7], [-.5, -12], [1.6, -8.4], [3.6, -12.6], [5, -7.5], [7, -10], [7, -5.4]], '#e8473f', '#a12c26');
      oval(ctx, 1.4, 0, 6.3, 6.6, C.fur, C.ol);
      shape(ctx, [[6.8, -1.8], [12.6, .4], [6.8, 2.6]], '#f2b02a', '#a8701a', CH_OL, false);
      oval(ctx, 6.6, 5.2, 1.6, 2.6, '#e8473f', '#a12c26', 0, .9);
      eye(ctx, 2.8, -1.6, 2.2, o);
    }, hatY: -10,
  },
  sheep: {
    name: 'Sheep', fur: '#fbfaf5', belly: null, leg: '#2b2522', foot: 'hoof', footCol: '#181412', ol: '#a49c90', desc: 'Fluffy and unflappable.', hr: 6.5,
    bodyFn(ctx, bob, C) { for (const [x, y, r] of [[-5.6, -22, 5], [4.6, -22.5, 5], [-6.5, -15.5, 5.2], [5.5, -15, 5], [0, -12.5, 5.5], [0, -25.5, 5]]) oval(ctx, x, y + bob, r, r, C.fur, C.ol); oval(ctx, 0, -19 + bob, 7.6, 8.4, C.fur, null, 0, 0); },
    tail(ctx, t, C) { oval(ctx, -8.5, -18, 3, 3, C.fur, C.ol); },
    head(ctx, o, C) {
      for (const [x, y, r] of [[-3.5, -6, 4.2], [1.5, -8, 4.2], [-5.5, -1.5, 3.4]]) oval(ctx, x, y, r, r, C.fur, C.ol);
      shape(ctx, [[-2, -4], [5, -5], [10, 0], [9.5, 5.5], [5, 7.5], [0, 5], [-2.5, 1]], '#2b2522', '#120e0c');
      oval(ctx, -3.6, 1.2, 3.6, 1.6, '#2b2522', '#120e0c', .55, .9);
      eye(ctx, 4.8, -.6, 2.2, o);
      if (o.scared || o.dead || o.happy) mouth(ctx, 7.5, 5, o, 1.5);
    }, hatY: -11,
  },
  raccoon: {
    name: 'Raccoon', fur: '#9a9da6', belly: '#d2d4da', leg: '#5c5f68', foot: 'paw', footCol: '#3e4048', desc: 'Sneaky snacker.', hr: 7,
    tail(ctx, t, C) { ctx.save(); ctx.translate(-6, -14); ctx.rotate(-.55 + Math.sin(t * 4) * .1); for (let i = 3; i >= 0; i--) oval(ctx, -i * 4.2, -i * 1.6, 4.3, 3.9, i % 2 ? '#3f4148' : '#a8abb3', C.ol); ctx.restore(); },
    head(ctx, o, C) {
      oval(ctx, -3, -7.5, 3, 3.2, C.fur, C.ol); oval(ctx, 3.6, -8, 3, 3.2, C.fur, C.ol);
      oval(ctx, -3, -7.5, 1.4, 1.6, '#4a4c54', null, 0, 0); oval(ctx, 3.6, -8, 1.4, 1.6, '#4a4c54', null, 0, 0);
      shape(ctx, [[-6, -2], [-2, -7], [5, -7.5], [9, -3], [14, 1.5], [12, 4], [6, 6.5], [-1, 6], [-6, 3]], C.fur, C.ol);
      ctx.fillStyle = '#3c3e45'; ctx.beginPath(); ctx.moveTo(-2, -3.5); ctx.quadraticCurveTo(4, -6.5, 9.5, -2.5); ctx.quadraticCurveTo(5, 1.6, -1.6, .4); ctx.closePath(); ctx.fill();
      oval(ctx, 9.5, 2.8, 3.6, 2.4, '#ecedf0', C.ol, .1, .9); oval(ctx, 13.4, 1.6, 1.2, 1, '#22232a', null, 0, 0);
      eye(ctx, 4, -2.3, 2.1, o); mouth(ctx, 8.6, 5.6, o, 1.5);
    }, hatY: -10,
  },
  frog: {
    name: 'Frog', fur: '#6cc455', belly: '#d4ee9a', leg: '#55a843', foot: 'paw', footCol: '#3f8a30', desc: 'Springy legs, sticky feet.', hr: 7.5,
    head(ctx, o, C) {
      oval(ctx, -1.5, -6, 4.2, 4.2, C.fur, C.ol); oval(ctx, 6.5, -6.4, 4.2, 4.2, C.fur, C.ol);
      shape(ctx, [[-7, -1], [-2, -5], [6, -5], [11, -2.5], [12.5, 2], [9, 6], [1, 6.5], [-6, 4]], C.fur, C.ol);
      eye(ctx, -1.4, -6.6, 2.5, o); eye(ctx, 6.6, -7, 2.5, o);
      ctx.beginPath(); ctx.moveTo(-1, 2.6); ctx.quadraticCurveTo(5, o.scared ? 7 : 5.6, 11.4, 1.4); ctx.strokeStyle = '#2c4a20'; ctx.lineWidth = 1.1; ctx.stroke();
      cheek(ctx, -2, 2.6);
    }, hatY: -11,
  },
  fox: {
    name: 'Fox', fur: '#ea7a34', belly: '#fff3e2', leg: '#3e2b22', foot: 'paw', footCol: '#2a1c16', desc: 'Quick paws, quicker wits.', hr: 6.8,
    tail(ctx, t, C) { ctx.save(); ctx.translate(-6, -14); ctx.rotate(-.7 + Math.sin(t * 4) * .14); shape(ctx, [[0, 0], [-6, -6], [-14, -6], [-19, -1], [-15, 4], [-7, 4.5]], C.fur, C.ol); shape(ctx, [[-14, -6], [-19, -1], [-15, 4], [-13, -1]], '#fff3e2', C.ol); ctx.restore(); },
    head(ctx, o, C) {
      shape(ctx, [[-5, -5], [-5, -16], [1, -7]], C.fur, C.ol, CH_OL, false); shape(ctx, [[1, -8], [6, -16.5], [7, -5]], C.fur, C.ol, CH_OL, false);
      shape(ctx, [[-4.6, -11], [-5, -16], [-2.6, -12.4]], '#2a1c16', '#2a1c16', .6, false); shape(ctx, [[4.6, -13], [6, -16.5], [6.5, -12]], '#2a1c16', '#2a1c16', .6, false);
      shape(ctx, [[-6, -2], [-2, -7], [5, -7], [10, -3], [17, 2.5], [10, 6], [2, 6.5], [-5, 4]], C.fur, C.ol);
      shape(ctx, [[5, 1.6], [17, 2.5], [10, 6], [3, 6.2]], '#fff3e2', C.ol);
      oval(ctx, 16.6, 2, 1.4, 1.2, '#22160f', null, 0, 0);
      eye(ctx, 3.5, -2.3, 2.1, o);
    }, hatY: -10,
  },
  penguin: {
    name: 'Penguin', fur: '#2f3444', belly: '#f6f6f0', leg: '#f0a022', foot: 'bird', footCol: '#e08d1c', ol: '#15171f', arms: 'flipper', desc: 'Born for the ice levels.', hr: 7,
    head(ctx, o, C) {
      oval(ctx, 1, 0, 7.4, 7.2, C.fur, C.ol);
      shape(ctx, [[2, -3], [7, -4.5], [8.4, 1], [6, 5.5], [2.5, 4]], '#f6f6f0', '#b8b8b0', .7);
      shape(ctx, [[7.6, -.6], [13.6, 1.2], [7.6, 3]], '#f2a42a', '#a8701a', CH_OL, false);
      eye(ctx, 4.6, -1.4, 2.1, o);
    }, hatY: -10,
  },
  pig: {
    name: 'Pig', fur: '#f4a8b6', belly: '#fbcdd6', leg: '#e38fa1', foot: 'hoof', footCol: '#a8566a', desc: 'Muddy and proud of it.', hr: 7.4,
    tail(ctx, t, C) { ctx.beginPath(); ctx.arc(-9, -15.5, 2.6, 0, Math.PI * 1.7 + Math.sin(t * 8) * .3); ctx.strokeStyle = C.ol; ctx.lineWidth = 3.4; ctx.stroke(); ctx.strokeStyle = '#e38fa1'; ctx.lineWidth = 1.8; ctx.stroke(); },
    head(ctx, o, C) {
      shape(ctx, [[-4, -6], [-6, -12], [0, -8]], '#ec95a8', C.ol, CH_OL, false);
      oval(ctx, 1, 0, 7.8, 7.4, C.fur, C.ol);
      shape(ctx, [[1, -8], [5.5, -12], [6.6, -5.5]], '#ec95a8', C.ol, CH_OL, false);
      oval(ctx, 9.2, 2.4, 3.6, 3.8, '#f08aa0', C.ol, 0, .9); oval(ctx, 8.6, 1.6, .7, .9, '#8a3c4c', null, 0, 0); oval(ctx, 10.2, 3.4, .7, .9, '#8a3c4c', null, 0, 0);
      eye(ctx, 3.6, -2.2, 2.1, o); cheek(ctx, 2, 3.4); if (o.scared || o.dead || o.happy) mouth(ctx, 5, 5.6, o, 1.4);
    }, hatY: -10,
  },
  owl: {
    name: 'Owl', fur: '#94704e', belly: '#ead6b4', leg: '#e0a438', foot: 'bird', footCol: '#c28420', arms: 'wing', desc: 'Sees every trap coming.', hr: 8,
    head(ctx, o, C) {
      shape(ctx, [[-7, -3], [-8, -13], [-2, -7]], C.fur, C.ol, CH_OL, false); shape(ctx, [[4, -7], [10, -13], [9.6, -3]], C.fur, C.ol, CH_OL, false);
      oval(ctx, 1, 0, 8.6, 7.8, C.fur, C.ol);
      oval(ctx, -2, -.6, 4.2, 4.2, '#f3e2c3', '#c4a882', 0, .8); oval(ctx, 5.4, -.6, 4.2, 4.2, '#f3e2c3', '#c4a882', 0, .8);
      eye(ctx, -2, -.6, 2.6, o); eye(ctx, 5.4, -.6, 2.6, o);
      shape(ctx, [[.6, 2.2], [3.6, 2.2], [2.1, 6.6]], '#f0b030', '#a87818', .9, false);
    }, hatY: -11,
  },
  cow: {
    name: 'Cow', fur: '#fbfbf8', belly: '#ffdce2', leg: '#e9e6e0', foot: 'hoof', footCol: '#3a3433', ol: '#8f8a85', spots: true, desc: 'Moo-ves surprisingly well.', hr: 7.4,
    tail(ctx, t, C) { ctx.save(); ctx.translate(-7, -21); ctx.rotate(.4 + Math.sin(t * 4) * .2); line(ctx, 0, 0, -3, 10, C.ol, 1.4); oval(ctx, -3, 11, 1.8, 2.4, '#3a3433', null, 0, 0); ctx.restore(); },
    head(ctx, o, C) {
      shape(ctx, [[-4, -6], [-9, -12], [-2, -8]], '#efe0bc', '#a8946a', CH_OL, false); shape(ctx, [[2.5, -8], [6.5, -13], [6, -6]], '#efe0bc', '#a8946a', CH_OL, false);
      shape(ctx, [[-6, -2], [-1, -7.4], [6, -7], [10, -2], [13.5, 3], [11, 7], [3, 7], [-5, 4]], C.fur, C.ol);
      ctx.fillStyle = '#3a3433'; ctx.beginPath(); ctx.ellipse(-1.8, -2.8, 3.4, 3.8, .3, 0, TAU); ctx.fill();
      oval(ctx, 10.4, 4, 4, 3.1, '#ffc4ce', '#c48a94', .1, .9); oval(ctx, 9.2, 3.6, .7, .8, '#7a4048', null, 0, 0); oval(ctx, 11.8, 3.6, .7, .8, '#7a4048', null, 0, 0);
      eye(ctx, 4, -2.4, 2.1, o);
    }, hatY: -11,
  },
  duck: {
    name: 'Duck', fur: '#f7d548', belly: '#fbe88f', leg: '#f08a20', foot: 'bird', footCol: '#d4700e', arms: 'wing', desc: 'Quack first, ask later.', hr: 6.6,
    tail(ctx, t, C) { shape(ctx, [[-6, -22], [-12, -26], [-8, -17]], C.fur, C.ol, CH_OL, false); },
    head(ctx, o, C) {
      oval(ctx, 1, 0, 6.8, 6.8, C.fur, C.ol);
      shape(ctx, [[-1, -6.5], [0, -10], [1.6, -6.6]], C.fur, C.ol, .9, false);
      shape(ctx, [[6, .2], [13.8, 1.4], [14, 4], [6.6, 4.8]], '#f08a20', '#a85a0e', CH_OL);
      eye(ctx, 2.8, -1.8, 2.1, o); cheek(ctx, 1, 3);
    }, hatY: -9,
  },
  hedgehog: {
    name: 'Hedgehog', fur: '#cfa47c', belly: '#f1dcc0', leg: '#8a6444', foot: 'paw', footCol: '#5a3e28', desc: 'Prickly but polite.', hr: 7,
    tail(ctx, t, C) { ctx.save(); ctx.translate(-1, -19); const pts = []; for (let i = 0; i < 9; i++) { const a = -2.9 + i * .36; pts.push([Math.cos(a) * 13, Math.sin(a) * 12]); pts.push([Math.cos(a + .18) * 7.5, Math.sin(a + .18) * 7]); } shape(ctx, pts, '#6e4a2e', '#3e2818', CH_OL, false); ctx.restore(); },
    head(ctx, o, C) {
      const pts = []; for (let i = 0; i < 6; i++) { const a = -2.95 + i * .42; pts.push([Math.cos(a) * 12.5 - 2, Math.sin(a) * 11.5]); pts.push([Math.cos(a + .21) * 7 - 2, Math.sin(a + .21) * 7]); } shape(ctx, pts, '#6e4a2e', '#3e2818', CH_OL, false);
      shape(ctx, [[-4, 0], [0, -6], [6, -5], [10, -1], [14, 2.4], [10, 5.4], [3, 6], [-3, 4]], C.fur, C.ol);
      oval(ctx, 13.8, 2.2, 1.6, 1.4, '#22160f', null, 0, 0);
      eye(ctx, 4.6, -1.4, 2.1, o); if (o.scared || o.dead || o.happy) mouth(ctx, 8, 4.6, o, 1.4);
    }, hatY: -9,
  },
};
for (const id in CHARS) { const C = CHARS[id]; C.ol = C.ol || shade(C.fur, -.5); C.legOl = shade(C.leg, -.5); }
const CHAR_IDS = Object.keys(CHARS);
// legacy fields used elsewhere
for (const id in CHARS) CHARS[id].body = CHARS[id].fur;

const HATS = {
  none: { name: 'No hat' }, party: { name: 'Party Hat' }, beanie: { name: 'Beanie' }, top: { name: 'Top Hat' },
  crown: { name: 'Crown' }, cowboy: { name: 'Cowboy Hat' }, propeller: { name: 'Propeller Cap' },
  flower: { name: 'Flower' }, viking: { name: 'Viking Helmet' }, chef: { name: "Chef's Hat" },
  bow: { name: 'Big Bow' }, headphones: { name: 'Headphones' }, halo: { name: 'Halo' },
};
const HAT_IDS = Object.keys(HATS);
function hatPart(ctx, pts, fill, curvy = true) { shape(ctx, pts, fill, shade(fill, -.5), CH_OL, curvy); }
function drawHat(ctx, id, t) {
  switch (id) {
    case 'party': hatPart(ctx, [[-5.5, 0], [0, -15], [5.5, 0]], '#7ad0ff', false); line(ctx, -3.6, -4, 3.4, -5.4, '#ff5fa2', 1.6); line(ctx, -2, -9, 2.2, -9.8, '#ffd34d', 1.6); oval(ctx, 0, -15.5, 2.2, 2.2, '#ffd34d', '#b8901a'); break;
    case 'beanie': ctx.beginPath(); ctx.arc(0, 0, 7.2, Math.PI, 0); furPath(ctx, '#e8574f', '#9a2a24', [-7, -7, 14, 7]); rr(ctx, -8, -2, 16, 3.6, 1.8); furPath(ctx, '#f4f0ea', '#a8a49c', null); oval(ctx, 0, -8.4, 2.3, 2.3, '#fff', '#b0aca4'); break;
    case 'top': rr(ctx, -9, -2, 18, 3, 1.4); furPath(ctx, '#30303a', '#111116', null); rr(ctx, -5.8, -14, 11.6, 13, 1.4); furPath(ctx, '#30303a', '#111116', [-6, -14, 12, 13]); ctx.fillStyle = '#c0392b'; ctx.fillRect(-5.6, -4.6, 11.2, 2.2); break;
    case 'crown': hatPart(ctx, [[-7, 0], [-7.5, -8.5], [-3.6, -4.6], [0, -11], [3.6, -4.6], [7.5, -8.5], [7, 0]], '#ffd34d', false); oval(ctx, 0, -3.6, 1.4, 1.4, '#e8473f', '#9a2a24', 0, .7); break;
    case 'cowboy': ctx.beginPath(); ctx.ellipse(0, 0, 13, 3, 0, 0, TAU); furPath(ctx, '#a8763f', '#5e3e1c', [-13, -3, 26, 6]); rr(ctx, -5.6, -9.4, 11.2, 9.4, 3.6); furPath(ctx, '#a8763f', '#5e3e1c', [-6, -9, 12, 9]); ctx.fillStyle = '#5a3a1e'; ctx.fillRect(-5.6, -3, 11.2, 1.8); break;
    case 'propeller': ctx.beginPath(); ctx.arc(0, 0, 7.2, Math.PI, 0); furPath(ctx, '#3f8de8', '#1f4e8a', [-7, -7, 14, 7]); line(ctx, 0, -7, 0, -10, INK, 1.6); { const s = Math.sin(t * 25) * 8; oval(ctx, 0, -10.6, Math.abs(s) + 1, 1.7, '#ffd34d', '#b8901a', 0, .8); } break;
    case 'flower': for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + t * .5; oval(ctx, Math.cos(a) * 3.6, -5.6 + Math.sin(a) * 3.6, 2.7, 2.7, '#ff8fc8', '#c45a90', 0, .8); } oval(ctx, 0, -5.6, 2.3, 2.3, '#ffd34d', '#b8901a', 0, .8); break;
    case 'viking': ctx.beginPath(); ctx.arc(0, 0, 7.8, Math.PI, 0); furPath(ctx, '#a2abb5', '#5c646e', [-8, -8, 16, 8]); hatPart(ctx, [[-7, -3], [-13.5, -11], [-10, -1.6]], '#f5ecd5', false); hatPart(ctx, [[7, -3], [13.5, -11], [10, -1.6]], '#f5ecd5', false); break;
    case 'chef': rr(ctx, -5.4, -7.4, 10.8, 7.4, 1.6); furPath(ctx, '#fff', '#aaa49c', null); oval(ctx, -3.6, -10, 4, 4, '#fff', '#aaa49c'); oval(ctx, 3.6, -10, 4, 4, '#fff', '#aaa49c'); oval(ctx, 0, -12, 4.6, 4.6, '#fff', '#aaa49c'); break;
    case 'bow': hatPart(ctx, [[0, -3], [-9, -8.4], [-9, 1.8]], '#ff5fa2', false); hatPart(ctx, [[0, -3], [9, -8.4], [9, 1.8]], '#ff5fa2', false); oval(ctx, 0, -3, 2.6, 2.6, '#ff8fc0', '#b84a7c'); break;
    case 'headphones': ctx.beginPath(); ctx.arc(0, 4, 10, Math.PI * 1.1, Math.PI * 1.9); ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 2.6; ctx.stroke(); rr(ctx, -12, 2, 4.4, 7, 2); furPath(ctx, '#e8473f', '#8a2420', null); rr(ctx, 7.6, 2, 4.4, 7, 2); furPath(ctx, '#e8473f', '#8a2420', null); break;
    case 'halo': ctx.beginPath(); ctx.ellipse(0, -7 + Math.sin(t * 3), 8, 2.6, 0, 0, TAU); ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 2.6; ctx.stroke(); break;
  }
}

// o: {x,y (feet), facing, state, t, phase, squash, color, hat, scared, happy, dead, blink, lookX, alpha, scale, noSpin}
function drawChar(ctx, id, o) {
  const C = CHARS[id] || CHARS.horse;
  const t = o.t || 0, st = o.state || 'idle';
  ctx.save(); ctx.translate(o.x, o.y);
  const sc = o.scale || 1, sq = o.squash || 0;
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  ctx.scale(sc * (o.facing || 1) * (1 + sq * .45), sc * (1 - sq));
  let bob = 0, lean = 0, legA = 0, knee = 0, armA = 0, armUp = 0, spin = 0, elbow = .5;
  if (st === 'idle') { bob = Math.sin(t * 3) * .7; armA = Math.sin(t * 3) * .08; }
  else if (st === 'run') { const ph = o.phase || 0; legA = Math.sin(ph) * .85; knee = Math.max(0, -Math.cos(ph)) * 1.1; bob = -Math.abs(Math.sin(ph)) * 1.8; lean = .14; armA = -Math.sin(ph) * .9; elbow = .9; }
  else if (st === 'jump') { legA = .5; knee = .9; armUp = .8; }
  else if (st === 'fall') { armUp = 1; armA = Math.sin(t * 22) * .45; legA = Math.sin(t * 18) * .3; knee = .4; }
  else if (st === 'wall') { armUp = 1; lean = -.12; legA = .45; knee = .8; }
  else if (st === 'climb') { armUp = 1; armA = Math.sin(t * 10) * .6; legA = Math.sin(t * 10) * .5; knee = .6; }
  else if (st === 'dance') { bob = -Math.abs(Math.sin(t * 7)) * 6; armUp = 1; armA = Math.sin(t * 14) * .7; spin = o.noSpin ? 0 : Math.sin(t * 3.5) * .25; legA = Math.sin(t * 14) * .4; knee = .3; }
  else if (st === 'stun') { lean = Math.sin(t * 9) * .2; armA = .5; }
  else if (st === 'crouch') { legA = .95; knee = 1.75; armA = .35; bob = Math.sin(t * 3) * .4; lean = .08; }
  else if (st === 'crawl') { const ph = o.phase || 0; legA = .9 + Math.sin(ph) * .4; knee = 1.6; armA = -Math.sin(ph) * .55; lean = .22; elbow = .9; }
  else if (st === 'slide') { legA = -1.15; knee = .15; lean = -.32; armUp = .6; armA = .5; }
  if (st === 'crouch' || st === 'crawl') ctx.scale(1.08, .64); else if (st === 'slide') ctx.scale(1.06, .6); // squat down towards the feet
  ctx.rotate(lean + spin);
  const legOf = (side, a, k) => {
    const hx = side * 2.6, hy = -11 + bob * .4, L1 = 5.8, L2 = 5.6;
    const kx = hx + Math.sin(a) * L1, ky = hy + Math.cos(a) * L1, fx = kx + Math.sin(a - k) * L2, fy = Math.min(-.6, ky + Math.cos(a - k) * L2);
    limb(ctx, [[hx, hy], [kx, ky], [fx, fy]], C.leg, C.legOl, 3.3);
    if (C.foot === 'hoof') { rr(ctx, fx - 1.8, fy - 1.4, 4.4, 2.6, 1); furPath(ctx, C.footCol, shade(C.footCol, -.4), null, .9); }
    else if (C.foot === 'bird') { line(ctx, fx, fy, fx + 3.6, fy + .3, C.footCol, 1.4); line(ctx, fx, fy, fx - 1.6, fy + .6, C.footCol, 1.2); line(ctx, fx, fy, fx + 2.6, fy - 1.4, C.footCol, 1.2); }
    else oval(ctx, fx + 1, fy - .3, 2.6, 1.6, C.footCol, shade(C.footCol, -.4), 0, .9);
  };
  const armOf = (side, a) => {
    const sx = side * 2 + 1.5, sy = -22.5 + bob;
    const up = armUp ? -2.3 + a * .55 : .3 + a;
    if (C.arms === 'wing' || C.arms === 'flipper') { ctx.save(); ctx.translate(sx, sy); ctx.rotate(up - .7); if (C.arms === 'wing') shape(ctx, [[-2.4, -.6], [2.6, -.6], [3.4, 5], [1.6, 9], [-2, 6]], shade(C.fur, -.06), C.ol); else oval(ctx, 0, 4.6, 2.2, 6, C.fur, C.ol); ctx.restore(); return; }
    const L = 4.6, ex = sx + Math.sin(up) * L, ey = sy + Math.cos(up) * L, hx = ex + Math.sin(up + elbow * (armUp ? -1 : 1)) * L, hy = ey + Math.cos(up + elbow * (armUp ? -1 : 1)) * L;
    limb(ctx, [[sx, sy], [ex, ey], [hx, hy]], shade(C.fur, -.1), C.ol, 2.7);
    oval(ctx, hx, hy, 1.6, 1.6, C.foot === 'hoof' ? C.footCol : shade(C.fur, -.08), C.ol, 0, .8);
  };
  if (C.tail) C.tail(ctx, t, C, st);
  legOf(-1, -legA, knee * (legA > 0 ? 1 : .2)); armOf(-1, -armA);
  if (C.bodyFn) C.bodyFn(ctx, bob, C);
  else {
    ctx.beginPath(); ctx.moveTo(0, -27.5 + bob); ctx.bezierCurveTo(6.6, -27.5 + bob, 8.4, -17 + bob, 7.6, -13.4 + bob); ctx.bezierCurveTo(6.8, -10 + bob, -6.8, -10 + bob, -7.6, -13.4 + bob); ctx.bezierCurveTo(-8.4, -17 + bob, -6.6, -27.5 + bob, 0, -27.5 + bob); ctx.closePath();
    furPath(ctx, C.fur, C.ol, [-8, -28 + bob, 16, 18]);
    if (C.belly) { ctx.beginPath(); ctx.ellipse(2.6, -16.8 + bob, 4.2, 5.4, -.15, 0, TAU); ctx.fillStyle = C.belly; ctx.fill(); }
    if (C.spots) { ctx.fillStyle = '#3a3433'; ctx.beginPath(); ctx.ellipse(-3.6, -21 + bob, 2.8, 3.4, .4, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(3, -13.5 + bob, 2.2, 1.6, 0, 0, TAU); ctx.fill(); }
  }
  // scarf in the player's colour so everyone can tell who's who
  if (o.color) { ctx.beginPath(); ctx.ellipse(1.6, -25.4 + bob, 6.4, 2.1, .08, 0, TAU); furPath(ctx, o.color, shade(o.color, -.45), null, 1); shape(ctx, [[-3.6, -25.4 + bob], [-8.4 - (st === 'run' ? 2.6 : 0), -20.6 + bob + Math.sin(t * 9) * 1.2], [-5, -20.8 + bob]], o.color, shade(o.color, -.45), 1, false); }
  legOf(1, legA, knee * (legA < 0 ? 1 : .2)); armOf(1, armA);
  ctx.save(); ctx.translate(2.4, -31.5 + bob);
  if (st === 'run') ctx.rotate(.04);
  C.head(ctx, o, C);
  if (o.hat && o.hat !== 'none') { ctx.save(); ctx.translate(1, C.hatY || -10); drawHat(ctx, o.hat, t); ctx.restore(); }
  ctx.restore();
  ctx.restore();
  if (st === 'stun') { for (let i = 0; i < 3; i++) { const a = t * 6 + i * TAU / 3; ctx.fillStyle = '#ffd34d'; starPath(ctx, o.x + Math.cos(a) * 11 * sc, o.y - 46 * sc + Math.sin(a) * 3 * sc, 3.6 * sc, 1.7 * sc, 5); ctx.fill(); } }
}
function drawPortrait(ctx, x, y, r, char, hat, color, opt = {}) {
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = color || '#ddd'; ctx.fill();
  const g = ctx.createRadialGradient(x - r * .3, y - r * .4, r * .1, x, y, r); g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(0,0,0,.12)'); ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r - 1, 0, TAU); ctx.clip();
  const s = r / 13;
  drawChar(ctx, char, { x: x - 2.6 * s, y: y + 33 * s, scale: s, facing: 1, state: 'idle', t: opt.t || 0, hat, happy: opt.happy, dead: opt.dead, lookX: .5 });
  ctx.restore();
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.lineWidth = Math.max(1.5, r * .09); ctx.strokeStyle = shade(color || '#dddddd', -.45); ctx.stroke();
  ctx.restore();
}
