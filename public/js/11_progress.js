// ===================== PROGRESSION =====================
const ACHIEVEMENTS = [
  { id: 'firstfinish', icon: '🚩', name: 'First Flag', desc: 'Reach the flag once.', test: s => s.finishes >= 1, reward: 'flower' },
  { id: 'winner', icon: '🏆', name: 'Champion', desc: 'Win a match.', test: s => s.wins >= 1, reward: 'crown' },
  { id: 'trapper', icon: '🪤', name: 'Trapper', desc: 'Catch 10 players with your traps.', test: s => s.traps >= 10, reward: 'cowboy' },
  { id: 'jumper', icon: '🦘', name: 'Boing Boing', desc: 'Jump 500 times.', test: s => s.jumps >= 500, reward: 'propeller' },
  { id: 'bomber', icon: '💣', name: 'Demolition', desc: 'Blow up 10 placed items with bombs.', test: s => s.bombs >= 10, reward: 'viking' },
  { id: 'architect', icon: '📐', name: 'Architect', desc: 'Publish a level to the community shelf.', test: s => s.published >= 1, reward: 'chef' },
  { id: 'coins', icon: '🌰', name: 'Acorn Hoarder', desc: 'Bring 5 golden acorns to the flag.', test: s => s.coins >= 5, reward: 'bow' },
  { id: 'bell', icon: '🔔', name: 'Ding Dong', desc: 'Ring the treehouse bell 10 times.', test: s => s.bellRings >= 10, reward: 'headphones' },
  { id: 'feathers', icon: '🪶', name: 'Feathers Everywhere', desc: 'Get popped 50 times.', test: s => s.deaths >= 50, reward: 'halo' },
  { id: 'party', icon: '🎉', name: 'Party Animal', desc: 'Finish 5 matches.', test: s => s.matches >= 5 },
  { id: 'solo', icon: '🦸', name: 'Lone Survivor', desc: 'Be the only one to finish a round.', test: s => s.solos >= 1 },
  { id: 'underdog', icon: '🐢', name: 'Comeback Kid', desc: 'Earn 3 underdog bonuses.', test: s => s.underdogs >= 3 },
  { id: 'builder', icon: '🔨', name: 'Busy Builder', desc: 'Place 50 items.', test: s => s.placed >= 50 },
  { id: 'marathon', icon: '🏃', name: 'Marathon', desc: 'Play 50 rounds.', test: s => s.rounds >= 50 },
  { id: 'medalist', icon: '🥉', name: 'Medalist', desc: 'Earn 5 challenge medals.', test: () => Object.keys(Save.data.medals).length >= 5 },
  { id: 'golden', icon: '🥇', name: 'Golden Hooves', desc: 'Earn a gold medal in a challenge.', test: () => Object.values(Save.data.medals).includes('gold') },
];
const Progress = {
  level() { return Math.floor(Math.sqrt(Save.data.stats.xp / 150)) + 1; },
  xpFor(l) { return (l - 1) * (l - 1) * 150; },
  charUnlocked() { return true; },
  hatUnlocked() { return true; },
  check() {
    const s = Save.data.stats;
    for (const a of ACHIEVEMENTS) if (!Save.data.ach[a.id] && a.test(s)) {
      Save.data.ach[a.id] = Date.now();
      toast(a.icon + ' <b>' + a.name + '</b><br><span class="small">' + a.desc + '</span>', 'gold'); Audio2.sfx('ach');
    }
    Save.write();
  },
};

function encodeLevel(L) { const j = JSON.stringify({ v: 1, n: L.name, m: L.map, i: L.items.map(i => [ITEM_ORDER.indexOf(i[0]), Math.round(i[1]), Math.round(i[2]), i[3]]) }); return 'UHC1-' + btoa(unescape(encodeURIComponent(j))); }
function decodeLevel(code) {
  try {
    const s = code.trim().replace(/^UHC1-/, ''); const o = JSON.parse(decodeURIComponent(escape(atob(s))));
    if (!MAP_BY_ID[o.m]) return null;
    const items = (o.i || []).filter(a => ITEM_ORDER[a[0]]).slice(0, 400).map(a => [ITEM_ORDER[a[0]], +a[1] || 0, +a[2] || 0, (+a[3] || 0) & 3]);
    return { name: String(o.n || 'Shared level').slice(0, 40), map: o.m, items };
  } catch (e) { return null; }
}
