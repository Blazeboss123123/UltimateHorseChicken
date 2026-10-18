// ===================== AUDIO (all synthesised, no files) =====================
const Audio2 = {
  ctx: null, master: null, musicBus: null, sfxBus: null, noiseBuf: null,
  track: null, nextNote: 0, step: 0, timer: null,
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      // Share Phaser's WebAudio context when the engine has one, so the engine handles unlocking.
      const pc = window.GAME && GAME.sound && GAME.sound.context;
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = pc || new AC();
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) { return; }
    const c = this.ctx;
    this.master = c.createGain(); this.master.connect(c.destination);
    this.musicBus = c.createGain(); this.musicBus.connect(this.master);
    this.sfxBus = c.createGain(); this.sfxBus.connect(this.master);
    const len = c.sampleRate * 0.5; this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.applyVolumes();
    this.timer = setInterval(() => this.schedule(), 50);
    if (this.wanted) this.play(this.wanted);
  },
  applyVolumes() {
    if (!this.ctx) return;
    const S = Save.data.settings;
    this.master.gain.value = S.master; this.musicBus.gain.value = S.music * 0.5; this.sfxBus.gain.value = S.sfx;
  },
  tone(freq, dur, opt = {}) {
    const c = this.ctx; if (!c) return;
    const t = (opt.at || c.currentTime) + (opt.delay || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = opt.type || 'square'; o.frequency.setValueAtTime(freq, t);
    if (opt.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, opt.slide), t + dur);
    const v = opt.vol != null ? opt.vol : 0.15;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + (opt.attack || 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(opt.bus || this.sfxBus); o.start(t); o.stop(t + dur + 0.05);
  },
  noise(dur, opt = {}) {
    const c = this.ctx; if (!c) return;
    const t = (opt.at || c.currentTime) + (opt.delay || 0);
    const s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = opt.filter || 'lowpass'; f.frequency.setValueAtTime(opt.freq || 1200, t);
    if (opt.slide) f.frequency.exponentialRampToValueAtTime(opt.slide, t + dur);
    const g = c.createGain(); const v = opt.vol != null ? opt.vol : 0.2;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(opt.bus || this.sfxBus); s.start(t); s.stop(t + dur + 0.05);
  },
  sfx(name) {
    if (!this.ctx) return;
    const T0 = this.ctx.currentTime;
    switch (name) {
      case 'jump': this.tone(380, 0.12, { slide: 720, type: 'square', vol: 0.06 }); break;
      case 'walljump': this.tone(300, 0.12, { slide: 820, type: 'triangle', vol: 0.1 }); break;
      case 'land': this.noise(0.07, { freq: 500, vol: 0.12 }); break;
      case 'bounce': this.tone(220, 0.25, { slide: 900, type: 'sine', vol: 0.18 }); break;
      case 'death': this.tone(900, 0.35, { slide: 160, type: 'sawtooth', vol: 0.1 }); this.noise(0.3, { freq: 2500, slide: 300, vol: 0.15 }); this.tone(600, .12, { type: 'square', vol: .06, delay: .05, slide: 1200 }); break;
      case 'place': this.noise(0.08, { freq: 900, vol: 0.25 }); this.tone(140, 0.12, { type: 'sine', vol: 0.25, slide: 80 }); break;
      case 'bad': this.tone(200, 0.18, { type: 'square', vol: 0.08, slide: 140 }); break;
      case 'pick': this.tone(660, 0.07, { type: 'triangle', vol: 0.15 }); this.tone(990, 0.1, { type: 'triangle', vol: 0.12, delay: 0.06 }); break;
      case 'click': this.tone(520, 0.05, { type: 'triangle', vol: 0.1 }); break;
      case 'move': this.tone(420, 0.03, { type: 'triangle', vol: 0.05 }); break;
      case 'coin': this.tone(988, 0.08, { type: 'square', vol: 0.08 }); this.tone(1319, 0.25, { type: 'square', vol: 0.08, delay: 0.07 }); break;
      case 'arrow': this.noise(0.12, { filter: 'bandpass', freq: 3000, slide: 800, vol: 0.12 }); break;
      case 'cannon': this.noise(0.35, { freq: 400, slide: 60, vol: 0.35 }); this.tone(90, 0.3, { type: 'sine', vol: 0.3, slide: 40 }); break;
      case 'boom': this.noise(0.7, { freq: 900, slide: 50, vol: 0.5 }); this.tone(70, 0.6, { type: 'sine', vol: 0.4, slide: 30 }); break;
      case 'punch': this.noise(0.1, { freq: 700, vol: 0.3 }); this.tone(160, .1, { type: 'square', vol: .1 }); break;
      case 'teleport': this.tone(300, 0.3, { slide: 1600, type: 'sine', vol: 0.12 }); break;
      case 'goal': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.18, { type: 'square', vol: 0.08, delay: i * 0.08 })); break;
      case 'beep': this.tone(660, 0.15, { type: 'square', vol: 0.1 }); break;
      case 'go': this.tone(1320, 0.4, { type: 'square', vol: 0.1 }); break;
      case 'tick': this.tone(1200, 0.03, { type: 'square', vol: 0.04 }); break;
      case 'win': [523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, { type: 'square', vol: 0.09, delay: i * 0.12 })); break;
      case 'toohard': [400, 340, 280].forEach((f, i) => this.tone(f, 0.25, { type: 'sawtooth', vol: 0.06, delay: i * 0.16 })); break;
      case 'bell': [880, 1760, 2640].forEach((f, i) => this.tone(f, 1.4 - i * .3, { type: 'sine', vol: 0.12 / (i + 1) })); break;
      case 'crumble': this.noise(0.25, { freq: 600, vol: 0.18 }); break;
      case 'laser': this.tone(1800, 0.2, { type: 'sawtooth', vol: 0.03, slide: 1400 }); break;
      case 'flame': this.noise(0.4, { freq: 1500, vol: 0.1, filter: 'bandpass' }); break;
      case 'ach': [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.25, { type: 'triangle', vol: 0.12, delay: i * 0.09 })); break;
      case 'splash': this.noise(0.4, { freq: 1800, slide: 300, vol: 0.25 }); break;
      case 'quack': this.tone(500, 0.12, { type: 'sawtooth', vol: 0.08, slide: 350 }); this.tone(480, 0.12, { type: 'sawtooth', vol: 0.08, slide: 330, delay: .15 }); break;
    }
  },
  // ---------- tiny procedural music sequencer ----------
  TRACKS: {
    lobby: { bpm: 104, root: 60, prog: [0, 5, 7, 5], scale: [0, 2, 4, 7, 9], seed: 11, lead: 'triangle' },
    build: { bpm: 92, root: 57, prog: [0, 3, 5, 3], scale: [0, 2, 3, 7, 8], seed: 23, lead: 'sine' },
    race: { bpm: 144, root: 62, prog: [0, 0, 5, 7], scale: [0, 2, 4, 7, 9], seed: 37, lead: 'square' },
    results: { bpm: 120, root: 65, prog: [0, 5, 0, 7], scale: [0, 2, 4, 7, 9], seed: 5, lead: 'triangle' },
    editor: { bpm: 84, root: 55, prog: [0, 4, 5, 4], scale: [0, 2, 4, 7, 9], seed: 71, lead: 'sine' },
  },
  play(name) {
    this.wanted = name;
    if (!this.ctx || this.track === name) return;
    this.track = name; this.step = 0; this.nextNote = this.ctx.currentTime + 0.1;
    const tr = this.TRACKS[name]; const rng = mulberry(tr.seed);
    tr.mel = []; for (let i = 0; i < 64; i++) tr.mel.push(rng() < 0.62 ? Math.floor(rng() * 8) : -1);
  },
  schedule() {
    if (!this.ctx || !this.track) return;
    const tr = this.TRACKS[this.track]; const spb = 60 / tr.bpm / 2; // eighth notes
    const midi = n => 440 * Math.pow(2, (n - 69) / 12);
    while (this.nextNote < this.ctx.currentTime + 0.25) {
      const s = this.step, at = this.nextNote, bar = Math.floor(s / 8) % tr.prog.length, ch = tr.prog[bar];
      const bus = this.musicBus;
      if (s % 4 === 0) this.tone(midi(tr.root - 24 + ch), spb * 3.5, { type: 'triangle', vol: 0.22, at, bus });
      if (s % 8 === 4) this.tone(midi(tr.root - 24 + ch + 7), spb * 1.8, { type: 'triangle', vol: 0.16, at, bus });
      if (s % 2 === 0) [0, 4, 7].forEach((iv, k) => { if ((s / 2 + k) % 3 === 0) this.tone(midi(tr.root - 12 + ch + iv + (ch === 3 || ch === 8 ? -1 : 0)), spb * 0.9, { type: 'sine', vol: 0.05, at, bus }); });
      const m = tr.mel[s % 64];
      if (m >= 0) { const deg = tr.scale[m % 5] + (m >= 5 ? 12 : 0); this.tone(midi(tr.root + ch + deg), spb * 0.85, { type: tr.lead, vol: tr.lead === 'square' ? 0.035 : 0.07, at, bus }); }
      if (this.track === 'race' && s % 2 === 1) this.noise(0.04, { freq: 7000, filter: 'highpass', vol: 0.05, at, bus });
      if (this.track === 'race' && s % 4 === 0) this.tone(120, 0.1, { type: 'sine', vol: 0.25, slide: 50, at, bus });
      this.nextNote += spb; this.step++;
    }
  },
};
