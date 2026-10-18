// ---------- Achievements, stats, random, community, editor bars ----------
Object.assign(UI, {
  achievements() {
    const got = Object.keys(Save.data.ach).length;
    this.open('<h2>🏆 Trophies <span class="small">' + got + ' / ' + ACHIEVEMENTS.length + '</span></h2><div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(250px,1fr))">' + ACHIEVEMENTS.map(a => '<div class="ach' + (Save.data.ach[a.id] ? '' : ' no') + '"><div class="ico">' + a.icon + '</div><div><b>' + a.name + '</b><br><span class="small">' + a.desc + '</span></div></div>').join('') + '</div><div class="row" style="margin-top:10px"><button class="btn f" data-close>Close</button></div>', { width: 820 });
  },
  stats() {
    const s = Save.data.stats, lv = Progress.level();
    const rows = [['Matches played', s.matches], ['Matches won', s.wins], ['Rounds played', s.rounds], ['Flags reached', s.finishes], ['First to the flag', s.firsts], ['Solo finishes', s.solos], ['Times popped', s.deaths], ['Players trapped', s.traps], ['Golden acorns delivered', s.coins], ['Items placed', s.placed], ['Items blown up', s.bombs], ['Jumps', s.jumps], ['Challenge medals', Object.keys(Save.data.medals).length], ['Levels published', s.published], ['Time in the treehouse', Math.round(s.playTime / 60) + ' min']];
    const best = MAPS.filter(m => Save.data.best[m.id]).map(m => '<tr><td>' + m.name + '</td><td>' + fmtTime(Save.data.best[m.id]) + ' ' + ({ gold: '🥇', silver: '🥈', bronze: '🥉' }[Save.data.medals[m.id]] || '') + '</td></tr>').join('');
    this.open('<h2>📒 Stats</h2><p class="small">Shared by everyone playing on this device.</p><table class="stats">' + rows.map(r => '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td></tr>').join('') + '</table>' + (best ? '<h3>Personal records (Challenge)</h3><table class="stats">' + best + '</table>' : '') + '<div class="row" style="margin-top:10px"><button class="btn f" data-close>Close</button></div>', { width: 560 });
  },
  random() {
    const themes = [...new Set(MAPS.map(m => m.theme))];
    const P = this.open('<h2>🎲 Random map</h2><div class="body"></div><div class="row" style="margin-top:12px"><button class="btn green f" data-roll>Roll!</button><button class="btn f" data-close>Cancel</button></div>', { width: 560 });
    const F = this.randomF || (this.randomF = { pool: 'unlocked', themes: {} });
    this.fields(P, '.body', [
      { type: 'select', label: 'Choose from', opts: [['unlocked', 'All unlocked maps'], ['favs', 'Favourites ♥'], ['recent', 'Recently played'], ['custom', 'Community levels'], ['themes', 'Selected themes below']], get: () => F.pool, set: v => F.pool = v },
      { h: 'Themes' },
    ].concat(themes.map(th => ({ type: 'check', label: th, get: () => F.themes[th] !== false, set: v => F.themes[th] = v }))));
    P.querySelector('[data-roll]').addEventListener('click', () => {
      let list = MAPS.filter(mapUnlocked).map(m => ({ map: m }));
      if (F.pool === 'favs') list = list.filter(x => Save.data.favs[x.map.id]);
      if (F.pool === 'recent') list = list.filter(x => Save.data.recent.includes(x.map.id));
      if (F.pool === 'themes') list = list.filter(x => F.themes[x.map.theme] !== false);
      if (F.pool === 'custom') list = Save.data.custom.map(c => ({ map: MAP_BY_ID[c.map], custom: c })).filter(x => x.map);
      if (!list.length) { toast('Nothing matches those filters'); Audio2.sfx('bad'); return; }
      const ch = pick(list); this.close(); Session.mapId = ch.map.id;
      toast('🎲 Rolled <b>' + (ch.custom ? ch.custom.name : ch.map.name) + '</b>!');
      Lobby.startLaunch(ch.map.id, ch.custom || null);
    });
  },
  community() {
    const P = this.open('<h2>📚 Community shelf</h2><p class="small">Levels you publish from Free Build (and codes friends send you) live here. They play as Party courses with the published items already in place.</p><div class="cards clist"></div><h3>Import a share code</h3><div class="row"><button class="btn alt f" data-imp>Paste a code…</button><button class="btn f" data-close>Close</button></div>', { width: 820 });
    const draw = () => {
      const L = Save.data.custom;
      P.querySelector('.clist').innerHTML = L.length ? L.map((c, i) => '<div class="card"><div class="tag" style="position:absolute;left:6px;top:6px;background:#a35be0">COMMUNITY</div><canvas width="200" height="130"></canvas><div class="nm">' + esc(c.name) + '</div><div class="small">' + MAP_BY_ID[c.map].name + ' · ' + c.items.length + ' items</div><div class="row" style="justify-content:center"><button class="btn green f" data-p="' + i + '" style="font-size:13px">Play</button><button class="btn alt f" data-e="' + i + '" style="font-size:13px">Edit</button><button class="btn alt f" data-s="' + i + '" style="font-size:13px">Share</button><button class="btn red f" data-d="' + i + '" style="font-size:13px">✖</button></div></div>').join('') : '<p>No community levels yet — build one in <b>Free Build</b> mode and publish it!</p>';
      P.querySelectorAll('.clist canvas').forEach((cv, i) => { const c = L[i]; const items = c.items.map(a => makeItem(a[0], a[1], a[2], a[3], -1)); const W0 = { t: 1, dt: 0, forces: [], pushers: [], projs: [], solids: [], hazards: [], racing: false, map: MAP_BY_ID[c.map] }; items.forEach(it => { if (ITEMS[it.id].dyn) ITEMS[it.id].dyn(it, W0); }); cv.getContext('2d').drawImage(mapThumb(MAP_BY_ID[c.map], 200, 130, items), 0, 0); });
      P.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => { const c = L[+b.dataset.p]; this.closeAll(); Session.mapId = c.map; if (Session.mode !== 'party' && Session.mode !== 'creative') Net.dispatch({ t: 'lobbyMode', mode: 'party' }); Lobby.startLaunch(c.map, c); }));
      P.querySelectorAll('[data-e]').forEach(b => b.addEventListener('click', () => { const c = L[+b.dataset.e]; this.closeAll(); Game.launch('freebuild', c.map, null, { name: c.name, items: c.items }); }));
      P.querySelectorAll('[data-s]').forEach(b => b.addEventListener('click', () => this.shareCode(L[+b.dataset.s])));
      P.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', () => this.confirm('Delete "' + esc(L[+b.dataset.d].name) + '" from the shelf?', () => { L.splice(+b.dataset.d, 1); Save.write(); draw(); })));
    };
    draw();
    P.querySelector('[data-imp]').addEventListener('click', () => this.prompt('Paste a level code', '', v => { const lv = decodeLevel(v); if (!lv) { toast('That code didn\'t work 😕'); return; } Save.data.custom.push(lv); Save.write(); toast('📥 Added "' + esc(lv.name) + '" to the shelf'); this.community(); }, true));
  },
  shareCode(level) {
    const code = encodeLevel(level);
    const P = this.open('<h2>🔗 Share code</h2><p>Send this to a friend — they can paste it on the Community shelf or in Free Build.</p><textarea class="code f" readonly spellcheck="false"></textarea><div class="row" style="margin-top:8px"><button class="btn green f" data-cp>Copy</button><button class="btn f" data-close>Close</button></div>', { width: 600 });
    const ta = P.querySelector('textarea'); ta.value = code;
    P.querySelector('[data-cp]').addEventListener('click', () => { ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) { } if (navigator.clipboard) navigator.clipboard.writeText(code).then(() => toast('Copied!'), () => { if (!ok) toast('Select the text and copy it manually'); }); else toast(ok ? 'Copied!' : 'Select the text and copy it manually'); });
  },
  // ---------- Editor toolbars ----------
  editorBars(show, remove) {
    let pal = document.getElementById('palette'), bar = document.getElementById('editbar');
    if (remove || !show) { if (pal) pal.remove(); if (bar) bar.remove(); this.pointerOverBars = false; if (remove) return; }
    const E = Ed.E; if (!E) return;
    if (!bar) {
      bar = document.createElement('div'); bar.id = 'editbar'; document.body.appendChild(bar);
      bar.addEventListener('mouseenter', () => this.pointerOverBars = true); bar.addEventListener('mouseleave', () => this.pointerOverBars = false);
    }
    bar.innerHTML = '<input class="txt" id="edname" maxlength="40" style="width:170px" title="Level name"><select class="txt" id="edmap" title="Base map">' + MAPS.filter(mapUnlocked).map(m => '<option value="' + m.id + '"' + (m.id === E.map.id ? ' selected' : '') + '>' + m.name + '</option>').join('') + '</select>' +
      '<button class="btn green" data-x="test">' + (E.mode === 'edit' ? '▶ Test' : '✏️ Edit') + '</button><button class="btn" data-x="save">💾 Save</button><button class="btn" data-x="load">📂 Load</button><button class="btn alt" data-x="pub">📚 Publish</button><button class="btn alt" data-x="share">🔗 Share</button><button class="btn alt" data-x="imp">📥 Import</button><button class="btn alt" data-x="grid">▦ Grid</button><button class="btn red" data-x="clear">🗑 Clear</button><button class="btn red" data-x="exit">🚪 Exit</button>';
    const nm = bar.querySelector('#edname'); nm.value = E.name; nm.addEventListener('input', () => E.name = nm.value);
    bar.querySelector('#edmap').addEventListener('change', ev => { const lv = Ed.level(); this.confirm('Switch the base map? Your items will be kept where they fit.', () => { Ed.start(ev.target.value, { name: lv.name, items: lv.items }); }); });
    bar.querySelectorAll('[data-x]').forEach(b => b.addEventListener('click', () => { b.blur(); this.editorAction(b.dataset.x); }));
    if (!pal && E.mode === 'edit') {
      pal = document.createElement('div'); pal.id = 'palette'; document.body.appendChild(pal);
      pal.addEventListener('mouseenter', () => this.pointerOverBars = true); pal.addEventListener('mouseleave', () => this.pointerOverBars = false);
    }
    if (pal && E.mode !== 'edit') { pal.remove(); pal = null; this.pointerOverBars = false; }
    if (pal) {
      const cats = [['block', 'Blocks & platforms'], ['hazard', 'Hazards'], ['util', 'Utility']];
      const sel = E.cursors[0] ? E.cursors[0].id : null;
      pal.innerHTML = cats.map(([c, n]) => '<div class="cat">' + n + '</div>' + ITEM_ORDER.filter(id => ITEMS[id].cat === c).map(id => '<div class="pi' + (id === sel ? ' on' : '') + '" data-id="' + id + '" title="' + esc(ITEMS[id].desc) + '"><canvas width="34" height="28"></canvas>' + ITEMS[id].name + '</div>').join('')).join('');
      pal.querySelectorAll('.pi').forEach(d => { drawItemIcon(d.querySelector('canvas').getContext('2d'), d.dataset.id, 17, 14, 26, 1); d.addEventListener('click', () => Ed.select(0, d.dataset.id)); });
    }
  },
  editorAction(x) {
    const E = Ed.E; if (!E) return;
    const lv = Ed.level();
    if (x === 'test') Ed.toggleTest();
    if (x === 'grid') { Save.data.settings.grid = !Save.data.settings.grid; toast('Grid snapping ' + (Save.data.settings.grid ? 'on' : 'off')); }
    if (x === 'clear') this.confirm('Remove every item you placed?', () => { E.W.items = E.W.items.filter(i => i.mapOwned); if (Ed.scene) Ed.scene.view.syncItems(); Ed.changed(); });
    if (x === 'exit') this.confirm('Leave the editor? Unsaved changes will be lost.', () => Ed.exit());
    if (x === 'save') {
      const D = Save.data.drafts; const entry = { name: lv.name, map: lv.map, items: lv.items, t: Date.now() };
      if (E.draftIdx >= 0 && D[E.draftIdx]) D[E.draftIdx] = entry; else { D.unshift(entry); E.draftIdx = 0; if (D.length > 20) D.pop(); }
      Save.write(); toast('💾 Saved "' + esc(lv.name) + '"');
    }
    if (x === 'load') {
      const D = Save.data.drafts;
      const P = this.open('<h2>📂 Your saved levels</h2>' + (D.length ? D.map((d, i) => '<div class="ach"><div style="flex:1"><b>' + esc(d.name) + '</b><br><span class="small">' + MAP_BY_ID[d.map].name + ' · ' + d.items.length + ' items · ' + new Date(d.t).toLocaleString() + '</span></div><button class="btn green f" data-l="' + i + '">Load</button><button class="btn red f" data-d="' + i + '">✖</button></div>').join('') : '<p>Nothing saved yet.</p>') + '<div class="row"><button class="btn f" data-close>Close</button></div>', { width: 620 });
      P.querySelectorAll('[data-l]').forEach(b => b.addEventListener('click', () => { const d = D[+b.dataset.l]; this.closeAll(); Ed.start(d.map, { name: d.name, items: d.items, draftIdx: +b.dataset.l }); }));
      P.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', () => { D.splice(+b.dataset.d, 1); Save.write(); this.close(); this.editorAction('load'); }));
    }
    if (x === 'pub') {
      if (!E.verified) { toast('▶ Test it first — someone has to reach the flag before you can publish.'); Audio2.sfx('bad'); return; }
      Save.data.custom.push({ name: lv.name, map: lv.map, items: lv.items }); Save.data.stats.published++; Progress.check(); Save.write();
      toast('📚 Published "' + esc(lv.name) + '" to the community shelf!', 'gold');
    }
    if (x === 'share') this.shareCode(lv);
    if (x === 'imp') this.prompt('Paste a level code', '', v => { const d = decodeLevel(v); if (!d) { toast('That code didn\'t work 😕'); return; } Ed.start(d.map, d); toast('Loaded "' + esc(d.name) + '"'); }, true);
  },
});
