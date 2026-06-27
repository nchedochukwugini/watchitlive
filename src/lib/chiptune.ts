// Shared background chiptune engine (Web Audio, no asset).
// Singleton so the Nav sound toggle and the intro screen control the same
// audio source — starting it once keeps it playing across page navigations
// since this module-level instance survives route changes.

class ChipTune {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer = 0;
  playing = false;

  private ensure() {
    if (this.ctx) return;
    const AC = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.12;
    this.master.connect(this.ctx.destination);
  }

  private blip(freq: number, start: number, dur: number, type: OscillatorType = 'square', vol = 0.25) {
    if (!this.ctx || !this.master) return;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, start);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(vol, start + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g).connect(this.master);
    o.start(start);
    o.stop(start + dur + 0.02);
  }

  private noise(start: number, dur: number, vol = 0.18) {
    if (!this.ctx || !this.master) return;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(g).connect(this.master);
    src.start(start);
  }

  // arcade-y A-minor pentatonic loop
  start() {
    this.ensure();
    if (!this.ctx || this.playing) return;
    this.playing = true;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const T = 0.14; // 8th-note in seconds (~107 bpm in 8ths)
    const lead: [number, number][] = [
      [440, 1], [523, 1], [659, 1], [523, 1],
      [880, 1], [659, 1], [523, 1], [659, 1],
      [440, 1], [523, 1], [784, 1], [659, 1],
      [523, 1], [440, 1], [392, 1], [440, 2],
    ];
    const bass: [number, number][] = [
      [110, 4], [165, 4], [196, 4], [110, 4],
    ];
    const beats = lead.reduce((s, [, b]) => s + b, 0);
    const loopDur = beats * T;

    const schedule = () => {
      if (!this.playing || !this.ctx) return;
      const base = this.ctx.currentTime + 0.05;
      let t = base;
      for (const [f, b] of lead) {
        this.blip(f, t, b * T * 0.85, 'square', 0.22);
        t += b * T;
      }
      let bt = base;
      for (const [f, b] of bass) {
        this.blip(f, bt, b * T * 0.9, 'triangle', 0.35);
        bt += b * T;
      }
      for (let bar = 0; bar < 4; bar++) {
        this.noise(base + bar * 4 * T, 0.06, 0.18);
        this.noise(base + bar * 4 * T + 2 * T, 0.05, 0.12);
      }
      this.timer = window.setTimeout(schedule, loopDur * 1000 - 80);
    };
    schedule();
  }

  stop() {
    this.playing = false;
    clearTimeout(this.timer);
    if (this.master && this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.08);
    }
  }

  coin() {
    this.ensure();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const t = this.ctx.currentTime;
    this.blip(988, t, 0.08, 'square', 0.3);
    this.blip(1319, t + 0.08, 0.16, 'square', 0.3);
  }
}

let instance: ChipTune | null = null;

export function getChiptune(): ChipTune {
  if (!instance) instance = new ChipTune();
  return instance;
}
