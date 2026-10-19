// ---------- Match HUD (drawn by the HUD scene in screen space) ----------
const SEG_COLORS = { finish: '#3fae5a', first: '#ffd34d', solo: '#a35be0', coin: '#f2b81f', underdog: '#25bdbd', trap: '#e8473f' };
Object.assign(Match, {
  drawHud(ctx) {
    const M = this.M; if (!M) return;
    const R = M.rig, SW = R.sw, SH = R.shH, u = hudScale(R);
    const SPL = M.scene.split && M.scene.split.on;
    if (SPL) M.scene.split.drawFrames(ctx);
    if (M.phase === 'race' && !SPL) drawOffscreenIndicators(ctx, R, M.players);
    this.drawTopBar(ctx, SW, SH, u);
    this.drawScoreStrip(ctx, SW, SH, u);
    if (M.phase === 'intro') { panel(ctx, SW / 2 - 260 * u, SH / 2 - 70 * u, 520 * u, 140 * u); txt(ctx, M.map.name, SW / 2, SH / 2 - 22 * u, 40 * u, '#fff'); txt(ctx, (M.mode === 'creative' ? 'Creative' : 'Party') + ' · first to ' + M.rules.winScore + (M.rules.roundLimit ? ' · ' + M.rules.roundLimit + ' rounds max' : ''), SW / 2, SH / 2 + 28 * u, 20 * u, INK, 'center', null, 600); }
    if (M.phase === 'spectate') { panel(ctx, SW / 2 - 280 * u, SH * .2, 560 * u, 70 * u, '#fff1c4'); txt(ctx, 'You joined mid-round!', SW / 2, SH * .2 + 24 * u, 24 * u, '#e8573f'); txt(ctx, 'Sit tight — you\'ll jump in at the start of the next round.', SW / 2, SH * .2 + 50 * u, 15 * u, INK, 'center', null, 600); }
    if (M.phase === 'pick') this.drawPick(ctx, SW, SH, u);
    if (M.phase === 'dealt') this.drawDealt(ctx, SW, SH, u);
    if (M.phase === 'build') this.drawBuildHUD(ctx, SW, SH, u);
    if (M.phase === 'race' && M.countdown > 0) { const c = Math.ceil(M.countdown), k = M.countdown % 1; if (c <= 3) txt(ctx, String(c), SW / 2, SH / 2, (90 + k * 60) * u, '#ffd34d'); }
    if (M.phase === 'race' && M.countdown <= 0 && M.goT < .7) txt(ctx, 'GO!', SW / 2, SH / 2, 110 * u, '#7ae07a');
    if (M.phase === 'results') this.drawResults(ctx, SW, SH, u);
    if (M.phase === 'podium') this.drawPodium(ctx, SW, SH, u);
    if (M.msg) { panel(ctx, SW / 2 - 230 * u, SH * .22, 460 * u, 48 * u, '#ffe1d8'); txt(ctx, M.msg.s, SW / 2, SH * .22 + 24 * u, 20 * u, INK, 'center', null, 600); }
    if (M.banner) { const k = Math.min(1, (2.5 - M.banner.t) * 5); txt(ctx, M.banner.s, SW / 2, SH * .32, 72 * u * k + 1, '#ff7a5a'); txt(ctx, M.banner.sub, SW / 2, SH * .32 + 52 * u, 22 * u * k + 1, '#fff'); }
  },
  drawTopBar(ctx, SW, SH, u) {
    const M = this.M; const P = M.phase;
    let title = '', time = null, sub = '';
    if (P === 'pick' || P === 'dealt') { title = 'PICK'; time = P === 'pick' ? M.timer : null; }
    else if (P === 'build') { title = 'BUILD'; time = M.timer; }
    else if (P === 'race') { title = 'RACE'; time = M.countdown > 0 ? null : M.raceT; const mh = MECH[M.map.mech] && MECH[M.map.mech].hud; if (mh) sub = mh(M.W) || ''; }
    else if (P === 'results') title = 'RESULTS'; else if (P === 'podium') title = 'WINNER!'; else if (P === 'spectate') title = 'WATCHING'; else title = 'GET READY';
    const w = 340 * u, h = 54 * u, x = SW / 2 - w / 2, y = 10 * u;
    panel(ctx, x, y, w, h);
    txt(ctx, title, x + 18 * u, y + h / 2, 26 * u, '#e8573f', 'left');
    txt(ctx, 'Round ' + Math.max(1, M.round), x + 34 * u + title.length * 16 * u, y + h / 2, 16 * u, INK, 'left', null, 600);
    if (time != null) txt(ctx, Math.max(0, Math.ceil(time)) + 's', x + w - 18 * u, y + h / 2, 26 * u, time < 5 ? '#ff5a4a' : '#fff', 'right');
    if (sub) txt(ctx, sub, SW / 2, y + h + 22 * u, 22 * u, '#fff');
  },
  drawScoreStrip(ctx, SW, SH, u) {
    const M = this.M; const n = M.players.length; if (M.phase === 'results' || M.phase === 'podium') return;
    const cw = Math.min(150 * u, (SW - 20) / n), h = 46 * u, x0 = SW / 2 - cw * n / 2, y = SH - h - 8 * u;
    M.players.forEach((p, i) => {
      const x = x0 + i * cw;
      rr(ctx, x + 3, y, cw - 6, h, 12); ctx.fillStyle = 'rgba(255,246,230,.9)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = p.color; ctx.stroke();
      hudPortrait(ctx, x + 6 + 18 * u, y + h / 2, 17 * u, p.entry, { dim: p.gone || (M.phase === 'race' && !p.alive && !p.finished) });
      txt(ctx, (p.gone ? '👋 ' : '') + p.name.slice(0, 10) + (M.me === p && Net.online ? ' (you)' : ''), x + 44 * u, y + 15 * u, 12 * u, INK, 'left', null, 600);
      txt(ctx, String(M.scores[i].total), x + 44 * u, y + 33 * u, 18 * u, INK, 'left', null, 700);
      if (M.phase === 'race' && M.countdown <= 0) txt(ctx, p.finished ? '🚩' : !p.alive ? '💫' : '', x + cw - 18 * u, y + h / 2, 18 * u, '#fff', 'center', null);
      if ((M.phase === 'build' && M.builders && M.builders[i] && M.builders[i].queue.length && !this.builderDone(M.builders[i])) || (M.phase === 'pick' && this.needsPick(i))) poly(ctx, [[x + cw / 2 - 8, y - 4], [x + cw / 2 + 8, y - 4], [x + cw / 2, y + 6]], '#ffd34d', 2);
    });
  },
  drawPick(ctx, SW, SH, u) {
    const M = this.M, n = M.box.length;
    const cols = Math.min(8, Math.max(4, Math.ceil(Math.sqrt(n * 1.8)))), rows = Math.ceil(n / cols);
    const cs = Math.min(104 * u, (SW - 80) / cols, (SH - 260 * u) / rows), pw = cols * cs + 40 * u, ph = rows * cs + 120 * u;
    const px = SW / 2 - pw / 2, py = SH / 2 - ph / 2 - 10 * u;
    panel(ctx, px, py, pw, ph);
    const mine = M.order.filter(pi => !M.players[pi].entry.remote && this.needsPick(pi));
    const head = mine.length ? (Net.online || M.players.length === 1 ? 'Pick an item!' : 'Everyone — pick an item!') : M.order.some(pi => this.needsPick(pi)) ? 'Waiting for the others to pick…' : 'All picked!';
    txt(ctx, (M.mode === 'creative' ? '🎨 ' : '🎁 ') + head, px + 24 * u, py + 36 * u, 24 * u, '#e8573f', 'left');
    rr(ctx, px + 20 * u, py + 64 * u, pw - 40 * u, 8 * u, 4); ctx.fillStyle = 'rgba(58,42,30,.15)'; ctx.fill();
    rr(ctx, px + 20 * u, py + 64 * u, Math.max(1, (pw - 40 * u) * clamp(M.timer / M.rules.pickTime, 0, 1)), 8 * u, 4); ctx.fillStyle = M.timer < 3 ? '#ff5a4a' : '#3fae5a'; ctx.fill();
    M.boxRects = [];
    M.box.forEach((b, i) => {
      const cx = px + 20 * u + (i % cols) * cs, cy = py + 84 * u + Math.floor(i / cols) * cs;
      M.boxRects.push({ x: cx, y: cy, w: cs - 6, h: cs - 6 });
      const taken = b.by >= 0;
      rr(ctx, cx, cy, cs - 6, cs - 6, 12); fillStroke(ctx, taken ? '#e8ddd0' : (ITEMS[b.id].cat === 'hazard' ? '#ffe3dc' : ITEMS[b.id].cat === 'util' ? '#e6f0ff' : '#ffffff'), 2.5);
      hudIcon(ctx, b.id, cx + (cs - 6) / 2, cy + (cs - 6) / 2 - 8 * u, cs * .62, taken ? .35 : 1);
      txt(ctx, ITEMS[b.id].name, cx + (cs - 6) / 2, cy + cs - 18 * u, Math.min(12 * u, cs / 8.5), INK, 'center', null, 600);
      if (taken) { const q = M.players[b.by]; hudPortrait(ctx, cx + cs - 22 * u, cy + 16 * u, 14 * u, q.entry); }
      // every player still picking has their own coloured cursor
      let k = 0;
      for (const pi of M.order) {
        if (!this.needsPick(pi) || M.pickCur[pi] !== i) continue;
        const q = M.players[pi], G = ctx.hud.g2; rr(G, cx - 4 + k * 4, cy - 4 + k * 4, cs + 2 - k * 8, cs + 2 - k * 8, 14); G.lineWidth = 5; G.strokeStyle = q.color; G.stroke();
        hudPortrait(ctx, cx + 10 * u + k * 22 * u, cy + 12 * u, 11 * u, q.entry); k++;
      }
    });
    const me = mine.length ? mine[0] : -1, it = me >= 0 ? M.box[M.pickCur[me]] : null; if (it) txt(ctx, ITEMS[it.id].desc, SW / 2, py + ph - 18 * u, 15 * u, INK, 'center', null, 500);
    const ow = 40 * u, ox = SW / 2 - M.order.length * ow / 2;
    M.order.forEach((pi, k) => { const q = M.players[pi], done = !this.needsPick(pi); hudPortrait(ctx, ox + k * ow + ow / 2, py + ph + 30 * u, 15 * u, q.entry, { dim: q.gone }); if (done) txt(ctx, '✔', ox + k * ow + ow / 2 + 12 * u, py + ph + 40 * u, 15 * u, '#7ae07a', 'center', INK); });
  },
  drawDealt(ctx, SW, SH, u) {
    const M = this.M, n = M.players.length; const cw = Math.min(130 * u, (SW - 60) / n), w = cw * n + 40 * u, h = 170 * u, x = SW / 2 - w / 2, y = SH / 2 - h / 2;
    panel(ctx, x, y, w, h); txt(ctx, 'Items dealt!', SW / 2, y + 30 * u, 26 * u, '#e8573f');
    M.players.forEach((p, i) => { const cx = x + 20 * u + i * cw + cw / 2; hudPortrait(ctx, cx, y + 72 * u, 18 * u, p.entry); M.hands[i].forEach((id, k) => hudIcon(ctx, id, cx + (k - (M.hands[i].length - 1) / 2) * 44 * u, y + 125 * u, 40 * u)); });
  },
  drawBuildHUD(ctx, SW, SH, u) {
    const M = this.M; if (!M.builders) return;
    const mine = M.builders.filter(B => B.queue.length && !M.players[B.pi].entry.remote);
    const w = Math.min(560 * u, SW - 20), h = 58 * u, x = SW / 2 - w / 2, y = 74 * u;
    panel(ctx, x, y, w, h);
    const B = mine.find(b => !this.builderDone(b)) || mine[0];
    if (B && !this.builderDone(B)) {
      const pl = M.players[B.pi], id = B.queue[B.n];
      hudIcon(ctx, id, x + 34 * u, y + h / 2, 40 * u);
      txt(ctx, (mine.length > 1 ? pl.name + ': ' : 'Place your ') + ITEMS[id].name + (B.queue.length > 1 ? '  (' + (B.n + 1) + '/' + B.queue.length + ')' : ''), x + 64 * u, y + 20 * u, 19 * u, pl.color, 'left');
      const src = pl.entry.input === 'any' ? 'kb1' : pl.entry.input, kb = src.startsWith('kb'), Bd = kb ? Input.binds(src) : null;
      const k = a => kb ? keyLabel((Bd[a] || [])[0]) : PAD_LABELS[a].split(' ')[0];
      const hint = src === 'kb1' ? 'Mouse/WASD move · Click/E place · R/wheel rotate · Shift fine' : (kb ? 'Move · ' + k('interact') + ' place · ' + k('rotate') + ' rotate' : 'Stick move · A/X place · Y rotate · LT fine');
      txt(ctx, hint + (B.valid && B.valid.attach ? '  ·  🔗 rides along!' : ''), x + 64 * u, y + 42 * u, 13 * u, INK, 'left', null, 500);
      if (B.valid && !B.valid.ok) txt(ctx, B.valid.why, SW / 2, y + h + 20 * u, 17 * u, '#ff7a6a');
    } else {
      const last = mine.find(b => b.last);
      txt(ctx, mine.length ? (last && M.rules.allowUndo ? 'Placed! (' + (keyLabel((Input.binds('kb1').undo || [])[0])) + ' / B to undo) — waiting for the others…' : 'Placed! Waiting for the others…') : 'Watch everyone build!', SW / 2, y + h / 2, 18 * u, INK, 'center', null, 600);
    }
    // who's still building
    const rest = M.builders.filter(b => b.queue.length);
    rest.forEach((b, i) => { const q = M.players[b.pi], done = this.builderDone(b); const yy = 150 * u + i * 44 * u; rr(ctx, 10, yy, 104 * u, 38 * u, 10); ctx.fillStyle = 'rgba(255,246,230,.85)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = q.color; ctx.stroke(); hudPortrait(ctx, 10 + 20 * u, yy + 19 * u, 14 * u, q.entry, { dim: q.gone }); if (done) txt(ctx, '✔', 10 + 70 * u, yy + 19 * u, 22 * u, '#3fae5a', 'center', INK); else hudIcon(ctx, b.queue[b.n], 10 + 70 * u, yy + 19 * u, 30 * u); });
    if (rest.length) txt(ctx, 'Builders', 10 + 52 * u, 136 * u, 14 * u, '#fff');
  },
  drawResults(ctx, SW, SH, u) {
    const M = this.M, n = M.players.length, R = M.rules, A = M.roundAward;
    const rowH = Math.min(58 * u, (SH - 220 * u) / n), w = Math.min(860 * u, SW - 30), h = rowH * n + 110 * u, x = SW / 2 - w / 2, y = SH / 2 - h / 2;
    panel(ctx, x, y, w, h);
    txt(ctx, 'Round ' + M.round + ' results', x + 24 * u, y + 32 * u, 26 * u, '#e8573f', 'left');
    txt(ctx, 'First to ' + R.winScore, x + w - 24 * u, y + 32 * u, 18 * u, INK, 'right', null, 600);
    const bx = x + 190 * u, bw = w - 230 * u, k = clamp((M.resultsT - .4) / 2.2, 0, 1);
    line(ctx, bx + bw, y + 56 * u, bx + bw, y + 64 * u + rowH * n, '#e8473f', 3);
    M.players.forEach((p, i) => {
      const ry = y + 62 * u + i * rowH;
      hudPortrait(ctx, x + 36 * u, ry + rowH / 2, Math.min(20 * u, rowH * .4), p.entry);
      txt(ctx, p.name.slice(0, 12), x + 62 * u, ry + rowH / 2, 16 * u, INK, 'left', null, 600);
      rr(ctx, bx, ry + rowH * .2, bw, rowH * .6, 8); ctx.fillStyle = 'rgba(58,42,30,.1)'; ctx.fill();
      let acc = 0;
      for (const s of M.scores[i].segs) {
        const isNew = s.round === M.round; const pw = s.pts / R.winScore * bw * (isNew ? k : 1);
        const sw = Math.min(pw, bw - acc); if (sw <= 0) continue;
        ctx.globalAlpha = isNew ? 1 : .5; rr(ctx, bx + acc, ry + rowH * .2, sw, rowH * .6, 6); fillStroke(ctx, SEG_COLORS[s.k], 2); ctx.globalAlpha = 1;
        if (isNew && sw > 30) txt(ctx, (s.k === 'trap' ? '✖' : '+') + s.pts, bx + acc + sw / 2, ry + rowH / 2, 13 * u, '#fff', 'center', INK);
        acc += pw;
      }
      txt(ctx, String(Math.round(A.before[i] + (M.scores[i].total - A.before[i]) * k)), bx + bw + 14 * u, ry + rowH / 2, 18 * u, INK, 'left', null, 700);
      const labels = A.aw[i].map(a => a.label).join(' · '); if (labels && k >= 1) txt(ctx, labels, bx + 6, ry + rowH - 4, 11 * u, INK, 'left', null, 500);
    });
    Object.entries({ finish: 'Finish', first: 'First', solo: 'Solo', coin: 'Acorn', underdog: 'Underdog', trap: 'Trap' }).forEach(([kk, name], j) => { const lx = x + 24 * u + j * 100 * u; rr(ctx, lx, y + h - 30 * u, 14 * u, 14 * u, 4); fillStroke(ctx, SEG_COLORS[kk], 1.5); txt(ctx, name, lx + 20 * u, y + h - 23 * u, 13 * u, INK, 'left', null, 500); });
  },
  drawPodium(ctx, SW, SH, u) {
    const M = this.M; const names = M.winners.map(i => M.players[i].name).join(' & ');
    panel(ctx, SW / 2 - 320 * u, 80 * u, 640 * u, 120 * u, '#fff1c4');
    txt(ctx, '🏆 ' + names + (M.winners.length > 1 ? ' tie!' : ' wins!'), SW / 2, 125 * u, 34 * u, '#e8573f');
    txt(ctx, M.resultsT > 2.5 ? (M.host ? 'Press jump to return to the treehouse' : 'The host will take everyone back to the treehouse') : 'What a match!', SW / 2, 170 * u, 17 * u, INK, 'center', null, 600);
    const sorted = M.players.map((p, i) => [i, M.scores[i].total]).sort((a, b) => b[1] - a[1]);
    sorted.forEach(([i, s], k) => { const p = M.players[i]; const x = SW / 2 - (sorted.length - 1) * 50 * u + k * 100 * u; hudPortrait(ctx, x, SH - 70 * u, 26 * u, p.entry); txt(ctx, s + ' pts', x, SH - 32 * u, 15 * u, '#fff'); });
  },
});
