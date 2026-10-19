// ===================== INPUT =====================
const ACTIONS = ['left', 'right', 'up', 'down', 'jump', 'sprint', 'interact', 'rotate', 'undo', 'prev', 'next', 'test', 'fav', 'menu'];
const ACTION_LABELS = { left: 'Move left', right: 'Move right', up: 'Up / climb', down: 'Down / drop', jump: 'Jump / confirm', sprint: 'Sprint (hold)', interact: 'Interact / place', rotate: 'Rotate item', undo: 'Undo / cancel', prev: 'Previous item', next: 'Next item', test: 'Test level (editor)', fav: 'Favourite map', menu: 'Pause menu' };
const DEFAULT_BINDS = {
  kb1: { left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'], up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], jump: ['Space'], sprint: ['ShiftLeft', 'KeyC'], interact: ['KeyE'], rotate: ['KeyR'], undo: ['KeyQ', 'Backspace'], prev: ['KeyZ'], next: ['KeyX'], test: ['Tab'], fav: ['KeyF'], menu: ['Escape'] },
  kb2: { left: ['KeyJ'], right: ['KeyL'], up: ['KeyI'], down: ['KeyK'], jump: ['ShiftRight', 'Numpad0'], sprint: ['Slash', 'Numpad1'], interact: ['Enter', 'NumpadEnter'], rotate: ['Period'], undo: ['Comma'], prev: ['BracketLeft'], next: ['BracketRight'], test: ['Backslash'], fav: ['Quote'], menu: ['Backquote'] },
};
// Standard gamepad mapping
const PAD_MAP = { jump: [0], sprint: [7, 1], undo: [1], interact: [2], rotate: [3], prev: [4], next: [5], test: [8], menu: [9], fav: [10], up: [12], down: [13], left: [14], right: [15] };
const PAD_LABELS = { jump: 'A / Cross', sprint: 'RT / R2 or B / Circle', undo: 'B / Circle', interact: 'X / Square', rotate: 'Y / Triangle', prev: 'LB / L1', next: 'RB / R1', test: 'Back / Share', menu: 'Start / Options', fav: 'L3 (stick click)', up: 'D-pad / stick up', down: 'D-pad / stick down', left: 'D-pad / stick left', right: 'D-pad / stick right' };

function keyLabel(code) {
  if (!code) return '—';
  const arrows = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓' };
  if (arrows[code]) return arrows[code];
  return code.replace(/^Key/, '').replace(/^Digit/, '').replace('ShiftRight', 'R-Shift').replace('ShiftLeft', 'L-Shift').replace('ControlRight', 'R-Ctrl').replace('ControlLeft', 'L-Ctrl').replace('Numpad', 'Num ').replace('Backquote', '`').replace('BracketLeft', '[').replace('BracketRight', ']').replace('Backslash', '\\').replace('Period', '.').replace('Comma', ',').replace('Quote', "'").replace('Escape', 'Esc').replace('Space', 'Space');
}

const Input = {
  down: new Set(), pressed: new Set(),
  mouse: { x: 0, y: 0, down: false, right: false, clicked: false, rclicked: false, wheel: 0, moved: false, inside: false },
  pads: [], padPrev: [], kb2Active: false,
  uiCapture: false, // true while a DOM menu is open
  rebinding: null,
  init() {
    const S = Save.data.settings;
    if (!S.binds) S.binds = deepCopy(DEFAULT_BINDS);
    for (const k of ['kb1', 'kb2']) for (const a of ACTIONS) if (!S.binds[k][a]) S.binds[k][a] = deepCopy(DEFAULT_BINDS[k][a]);
    addEventListener('keydown', e => {
      if (this.rebinding) { e.preventDefault(); this.rebinding(e.code); this.rebinding = null; return; }
      const tag = (e.target && e.target.tagName) || '';
      const typing = tag === 'INPUT' && e.target.type === 'text' || tag === 'TEXTAREA';
      if (typing) { if (e.code === 'Escape') e.target.blur(); return; }
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Backspace'].includes(e.code)) { if (!this.uiCapture || e.code === 'Tab') e.preventDefault(); }
      if (!this.down.has(e.code)) this.pressed.add(e.code);
      this.down.add(e.code);
      Audio2.unlock();
    });
    addEventListener('keyup', e => { this.down.delete(e.code); });
    addEventListener('blur', () => { this.down.clear(); });
    const cv = document.getElementById('c');
    cv.addEventListener('mousemove', e => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; this.mouse.moved = true; this.mouse.inside = true; });
    cv.addEventListener('mouseleave', () => { this.mouse.inside = false; });
    cv.addEventListener('mousedown', e => { Audio2.unlock(); if (e.button === 0) { this.mouse.down = true; this.mouse.clicked = true; } if (e.button === 2) { this.mouse.right = true; this.mouse.rclicked = true; } });
    addEventListener('mouseup', e => { if (e.button === 0) this.mouse.down = false; if (e.button === 2) this.mouse.right = false; });
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('wheel', e => { this.mouse.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
    addEventListener('gamepadconnected', e => toast('🎮 Controller ' + (e.gamepad.index + 1) + ' connected'));
    addEventListener('gamepaddisconnected', e => toast('🎮 Controller ' + (e.gamepad.index + 1) + ' disconnected'));
  },
  binds(src) {
    const B = Save.data.settings.binds;
    if (src === 'kb1' && this.kb2Active) {
      // When a second keyboard player exists, keyboard 1 gives up any keys keyboard 2 uses (and the arrows).
      const used = new Set(Object.values(B.kb2).flat());
      const out = {};
      for (const a in B.kb1) out[a] = B.kb1[a].filter(c => !used.has(c) && !c.startsWith('Arrow'));
      return out;
    }
    return B[src];
  },
  poll() {
    let gp = [];
    if (this.padsBlocked !== true) { try { gp = navigator.getGamepads ? navigator.getGamepads() : []; } catch (e) { this.padsBlocked = true; gp = []; } }
    this.padPrev = this.pads;
    this.pads = [];
    for (let i = 0; i < 4; i++) {
      const p = gp && gp[i];
      if (!p || !p.connected) { this.pads[i] = null; continue; }
      this.pads[i] = { buttons: p.buttons.map(b => b.pressed || b.value > 0.5), axes: p.axes.slice(0, 4) };
    }
  },
  skip: false,
  endFrame() { this.skip = false; this.pressed.clear(); this.mouse.clicked = false; this.mouse.rclicked = false; this.mouse.wheel = 0; this.mouse.moved = false; },
  padHeld(i, a) {
    const p = this.pads[i]; if (!p) return false;
    if ((PAD_MAP[a] || []).some(b => p.buttons[b])) return true;
    const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
    if (a === 'left') return ax < -0.45; if (a === 'right') return ax > 0.45;
    if (a === 'up') return ay < -0.6; if (a === 'down') return ay > 0.6;
    return false;
  },
  padPressed(i, a) {
    const p = this.pads[i], q = this.padPrev[i]; if (!p) return false;
    const was = q ? (() => { const s = this.pads; this.pads = this.padPrev; const r = this.padHeld(i, a); this.pads = s; return r; })() : false;
    return this.padHeld(i, a) && !was;
  },
  // Unified read for a player's input source. Returns held + pressed flags and analog x.
  read(src) {
    const r = { ix: 0, iy: 0, held: {}, pressed: {} };
    if (!src || this.uiCapture || this.skip) return r;
    if (src === 'any') { // online: the one local player can use keyboard 1 or any controller
      const list = ['kb1', 'pad0', 'pad1', 'pad2', 'pad3'].map(s2 => this.read(s2));
      for (const a of ACTIONS) { r.held[a] = list.some(q => q.held[a]); r.pressed[a] = list.some(q => q.pressed[a]); }
      const pad = list.slice(1).find(q => q.ix || q.iy);
      r.ix = pad && Math.abs(pad.ix) > Math.abs(list[0].ix) ? pad.ix : list[0].ix; r.iy = pad && Math.abs(pad.iy) > Math.abs(list[0].iy) ? pad.iy : list[0].iy;
      r.fine = list.some(q => q.fine);
      return r;
    }
    if (src.startsWith('kb')) {
      const B = this.binds(src);
      for (const a of ACTIONS) {
        const codes = B[a] || [];
        r.held[a] = codes.some(c => this.down.has(c));
        r.pressed[a] = codes.some(c => this.pressed.has(c));
      }
      r.fine = this.down.has(src === 'kb1' ? 'ShiftLeft' : 'ControlRight');
    } else if (src.startsWith('pad')) {
      const i = +src.slice(3);
      for (const a of ACTIONS) { r.held[a] = this.padHeld(i, a); r.pressed[a] = this.padPressed(i, a); }
      const p = this.pads[i];
      if (p) {
        const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
        if (Math.abs(ax) > 0.22) r.ix = ax; if (Math.abs(ay) > 0.22) r.iy = ay;
        r.fine = !!p.buttons[6]; // LT for fine adjust
      }
    }
    if (!r.ix) r.ix = (r.held.right ? 1 : 0) - (r.held.left ? 1 : 0);
    if (!r.iy) r.iy = (r.held.down ? 1 : 0) - (r.held.up ? 1 : 0);
    return r;
  },
  // Any gamepad pressing a button this frame (for joining)
  padJoinPressed() {
    for (let i = 0; i < 4; i++) if (this.pads[i] && (this.padPressed(i, 'jump') || this.padPressed(i, 'menu'))) return i;
    return -1;
  },
  anyPressed(a) {
    if (this.skip) return false;
    if (Object.values(Save.data.settings.binds).some(b => (b[a] || []).some(c => this.pressed.has(c)))) return true;
    for (let i = 0; i < 4; i++) if (this.padPressed(i, a)) return true;
    return false;
  },
};
