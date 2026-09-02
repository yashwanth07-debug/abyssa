// ── ABYSSA procedural audio ─────────────────────────────────────────────
// One hydrophone: pressure drone + marine wash + sonar pings + bubbles +
// whale phrases + hull creaks. Zero audio files — all WebAudio nodes.
export class AbyssAudio {
  constructor() {
    this.ctx = null;
    this.on = true;
    this._lastBubble = 0;
    this._lastCreak = 0;
    this._whaleTimer = null;
  }

  start() {
    if (this.ctx) return;
    const ctx = (this.ctx = new (window.AudioContext || window.webkitAudioContext)());
    const M = (this.master = ctx.createGain());
    M.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    M.connect(comp).connect(ctx.destination);
    M.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 2.5);

    // echo bus for pings + whale
    const delay = ctx.createDelay(2.0);
    delay.delayTime.value = 0.42;
    const fb = ctx.createGain(); fb.gain.value = 0.38;
    const fbf = ctx.createBiquadFilter(); fbf.frequency.value = 900;
    delay.connect(fb).connect(fbf).connect(delay);
    const echoOut = ctx.createGain(); echoOut.gain.value = 0.35;
    delay.connect(echoOut).connect(M);
    this.echo = delay;

    // ── pressure drone ──
    this.droneFilter = ctx.createBiquadFilter();
    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.value = 320;
    this.droneFilter.Q.value = 1.1;
    const droneGain = ctx.createGain(); droneGain.gain.value = 0.16;
    this.droneFilter.connect(droneGain).connect(M);
    for (const [freq, det] of [[46, -6], [46.6, 5], [92.5, -3]]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freq;
      o.detune.value = det;
      const g = ctx.createGain(); g.gain.value = freq > 90 ? 0.25 : 0.5;
      o.connect(g).connect(this.droneFilter);
      o.start();
    }
    const sub = ctx.createOscillator();
    sub.type = 'sine'; sub.frequency.value = 27.5;
    const subG = ctx.createGain(); subG.gain.value = 0.22;
    sub.connect(subG).connect(M);
    sub.start();
    this.subGain = subG;

    // ── hydro wash (filtered noise, band follows depth) ──
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this._noiseBuf = buf;
    const noise = ctx.createBufferSource();
    noise.buffer = buf; noise.loop = true;
    this.washFilter = ctx.createBiquadFilter();
    this.washFilter.type = 'bandpass';
    this.washFilter.frequency.value = 1400;
    this.washFilter.Q.value = 2.4;
    this.washGain = ctx.createGain(); this.washGain.gain.value = 0.05;
    noise.connect(this.washFilter).connect(this.washGain).connect(M);
    noise.start();
    // slow swell LFO on the wash
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.025;
    lfo.connect(lfoG).connect(this.washGain.gain);
    lfo.start();
  }

  // depth 0..1 — everything sinks with pressure
  setDepth(k) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.droneFilter.frequency.linearRampToValueAtTime(320 - k * 240, t + 0.4);
    this.washFilter.frequency.linearRampToValueAtTime(1400 - k * 1250, t + 0.6);
    this.washGain.gain.linearRampToValueAtTime(0.05 - k * 0.03, t + 0.6);
    this.subGain.gain.linearRampToValueAtTime(0.22 + k * 0.18, t + 0.6);
  }

  // sonar ping → echo bus (docks, milestones, UI)
  ping(vol = 0.3, f0 = 620) {
    if (!this.ctx || !this.on) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f0 * 0.72, t + 0.55);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    o.connect(g);
    g.connect(this.master);
    g.connect(this.echo);
    o.start(t); o.stop(t + 1.0);
  }

  // bubble chatter while descending fast
  bubbles(speed, now) {
    if (!this.ctx || !this.on) return;
    if (speed < 0.05 || now - this._lastBubble < 90 + Math.random() * 260 / speed) return;
    this._lastBubble = now;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    const f = 500 + Math.random() * 1400 + speed * 600;
    bp.frequency.value = f;
    bp.Q.value = 9;
    const g = ctx.createGain();
    const v = 0.028 + Math.random() * 0.04 * speed;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    src.connect(bp).connect(g).connect(this.master);
    src.start(t, Math.random() * 1.2, 0.2);
  }

  // one whale phrase — gliding FM call, 3 notes
  whale() {
    if (!this.ctx || !this.on) return;
    const ctx = this.ctx, t0 = ctx.currentTime;
    const notes = [[220, 340, 1.1], [300, 190, 1.4], [180, 260, 0.9]];
    let t = t0;
    for (const [fA, fB, dur] of notes) {
      const c = ctx.createOscillator();
      c.type = 'sine';
      c.frequency.setValueAtTime(fA, t);
      c.frequency.exponentialRampToValueAtTime(fB, t + dur);
      const mod = ctx.createOscillator();
      mod.frequency.value = 5.2;
      const mg = ctx.createGain(); mg.gain.value = fA * 0.06;
      mod.connect(mg).connect(c.frequency);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.14, t + dur * 0.3);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.4);
      c.connect(g);
      g.connect(this.master);
      g.connect(this.echo);
      c.start(t); c.stop(t + dur * 1.5);
      mod.start(t); mod.stop(t + dur * 1.5);
      t += dur * 1.05;
    }
  }

  // hull creak under pressure — deep zones only
  creak(depthM, now) {
    if (!this.ctx || !this.on) return;
    if (depthM < 3800 || now - this._lastCreak < 6000 + (1 - depthM / 12000) * 9000) return;
    this._lastCreak = now;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuf;
    src.playbackRate.value = 0.2;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 160; lp.Q.value = 7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.16, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
    src.connect(lp).connect(g).connect(this.master);
    src.start(t, Math.random()); src.stop(t + 1);
  }

  toggle() {
    if (!this.ctx) return true;
    this.on = !this.on;
    this.master.gain.linearRampToValueAtTime(this.on ? 0.5 : 0, this.ctx.currentTime + 0.3);
    return this.on;
  }
}
