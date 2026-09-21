/**
 * Efeitos sonoros sintetizados na hora (Web Audio API): nenhum arquivo para
 * baixar, o jogo abre instantaneamente até em conexão ruim.
 */
type SoundName = 'eat' | 'tick' | 'go' | 'death' | 'record';

const STORAGE_KEY = 'osvaldo:muted';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;

  constructor() {
    try {
      this.muted = localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      this.muted = false;
    }
  }

  /** Precisa ser chamado dentro de um gesto do usuário (regra dos navegadores). */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    try {
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.22;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    try {
      localStorage.setItem(STORAGE_KEY, this.muted ? '1' : '0');
    } catch {
      /* modo privado: segue sem persistir */
    }
    return this.muted;
  }

  private blip(freq: number, start: number, duration: number, type: OscillatorType, gain = 1): void {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(env);
    env.connect(this.master);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  private slide(from: number, to: number, start: number, duration: number, type: OscillatorType): void {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, to), start + duration);
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(0.9, start + 0.02);
    env.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(env);
    env.connect(this.master);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  play(name: SoundName): void {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    switch (name) {
      case 'eat':
        this.blip(620, t, 0.09, 'square', 0.7);
        this.blip(880, t + 0.06, 0.12, 'square', 0.5);
        break;
      case 'tick':
        this.blip(440, t, 0.12, 'triangle', 0.6);
        break;
      case 'go':
        this.blip(660, t, 0.1, 'triangle', 0.7);
        this.blip(990, t + 0.08, 0.18, 'triangle', 0.6);
        break;
      case 'death':
        this.slide(420, 90, t, 0.55, 'sawtooth');
        break;
      case 'record':
        [523, 659, 784, 1047].forEach((f, i) => this.blip(f, t + i * 0.09, 0.16, 'triangle', 0.6));
        break;
    }
  }
}

export const audio = new AudioEngine();
