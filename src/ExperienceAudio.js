const RESUME_TICK_VOLUME = 0.018;

class ExperienceAudio {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.master = null;
    this.windGain = null;
    this.windFilter = null;
    this.noiseBuffer = null;
    this.voices = new Set();
    this.lastAnyTick = -Infinity;
    this.lastCompletion = -Infinity;
    this.unsupportedWarned = false;
  }

  get ready() {
    return this.enabled && this.ctx?.state === 'running';
  }

  createGraph(AudioConstructor) {
    const ctx = new AudioConstructor();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = 0;
    this.master = master;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -16;
    limiter.knee.value = 16;
    limiter.ratio.value = 5;
    limiter.attack.value = 0.006;
    limiter.release.value = 0.16;
    master.connect(limiter);
    limiter.connect(ctx.destination);

    // One looping, synthesized noise source drives both the falling wind and
    // the low background air of the portal. No media files are downloaded.
    const length = Math.floor(ctx.sampleRate * 2);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) channel[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buffer;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 420;
    filter.Q.value = 0.55;
    const windGain = ctx.createGain();
    windGain.gain.value = 0;
    source.connect(filter);
    filter.connect(windGain);
    windGain.connect(master);
    source.start();
    this.windFilter = filter;
    this.windGain = windGain;
    this.windSource = source;
  }

  async unlock() {
    if (typeof window === 'undefined') return false;
    const AudioConstructor = window.AudioContext || window.webkitAudioContext;
    if (!AudioConstructor) {
      if (!this.unsupportedWarned) {
        this.unsupportedWarned = true;
        console.warn('[NEXUS-9 AUDIO] Web Audio is not supported in this browser.');
      }
      return false;
    }

    if (!this.ctx || this.ctx.state === 'closed') {
      try {
        this.createGraph(AudioConstructor);
      } catch (error) {
        console.warn('[NEXUS-9 AUDIO] Could not create audio graph:', error);
        return false;
      }
    }

    // Call resume() directly inside the gesture handler; the promise can
    // settle later. Calling it again on another gesture is safe and lets us
    // recover from wheel-only scroll, which might not count as activation.
    try {
      if (this.ctx.state !== 'running') await this.ctx.resume();
      if (this.ctx.state !== 'running') return false;
      this.enabled = true;
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setTargetAtTime(0.52, t, 0.10);
      return true;
    } catch (error) {
      console.info('[NEXUS-9 AUDIO] Waiting for a permitted click, tap or keypress.', error);
      return false;
    }
  }

  setWind(level, frequency = 420) {
    if (!this.ctx || !this.windGain || !this.windFilter) return;
    const t = this.ctx.currentTime;
    const safeLevel = this.ready && !document.hidden ? Math.max(0, Math.min(0.46, level)) : 0;
    this.windGain.gain.setTargetAtTime(safeLevel, t, 0.10);
    this.windFilter.frequency.setTargetAtTime(Math.max(80, frequency), t, 0.12);
  }

  addVoice(source, connections = []) {
    this.voices.add(source);
    source.onended = () => {
      this.voices.delete(source);
      try { source.disconnect(); } catch {}
      connections.forEach(node => { try { node.disconnect(); } catch {} });
    };
  }

  tone(from, to, duration, volume = 0.10, delay = 0, type = 'sine') {
    if (!this.ready || document.hidden) return;
    const ctx = this.ctx;
    if (this.voices.size > 18) return;
    const t = ctx.currentTime + Math.max(0, delay);
    const len = Math.max(0.025, duration);
    const source = ctx.createOscillator();
    const gain = ctx.createGain();
    source.type = type;
    source.frequency.setValueAtTime(Math.max(1, from), t);
    source.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + len);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), t + Math.min(0.045, len / 3));
    gain.gain.exponentialRampToValueAtTime(0.0001, t + len);
    source.connect(gain);
    gain.connect(this.master);
    this.addVoice(source, [gain]);
    source.start(t);
    source.stop(t + len + 0.012);
  }

  // Audible but controlled burst, and a frequency sweep through noise.
  whoosh() {
    if (!this.ready || document.hidden || this.voices.size > 18) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const duration = 1.48;
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    noise.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 0.7;
    filter.frequency.setValueAtTime(135, t);
    filter.frequency.exponentialRampToValueAtTime(2100, t + 1.0);
    filter.frequency.exponentialRampToValueAtTime(180, t + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.34, t + 0.75);
    gain.gain.linearRampToValueAtTime(0.0001, t + duration);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    this.addVoice(noise, [filter, gain]);
    noise.start(t);
    noise.stop(t + duration + 0.01);
  }

  silence() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.setWind(0);
    for (const source of this.voices) {
      try { source.stop(t + 0.02); } catch {}
    }
  }

  startup() {
    this.tone(100, 154, 0.56, 0.16, 0, 'triangle');
    this.tone(460, 660, 0.17, 0.085, 0.57);
    this.tone(680, 900, 0.21, 0.085, 0.78);
  }

  
crystal(id) {
  const n = Math.max(1, Math.min(9, Number(id) || 1));
  const frequency = 350 * Math.pow(2, (n - 1) / 12);

  this.tone(frequency, frequency * 1.04, 0.42, 0.28);
  this.tone(frequency * 1.5, frequency * 1.5, 0.55, 0.15, 0.065);
}

  sweep(reverse = false) {
    this.tone(reverse ? 750 : 215, reverse ? 215 : 750, 0.46, 0.095, 0, 'triangle');
  }

  // The résumé alone owns typing ticks and stops them when decoding ends.
  tick() {
    if (!this.ready || document.hidden) return;
    const now = performance.now();
    if (now - this.lastAnyTick < 85) return;
    this.lastAnyTick = now;
    this.tone(1080, 590, 0.055, RESUME_TICK_VOLUME, 0, 'triangle');
  }

  complete() {
    if (!this.ready || document.hidden) return;
    const now = performance.now();
    if (now - this.lastCompletion < 35000) return;
    this.lastCompletion = now;
    this.tone(520, 520, 0.36, 0.115);
    this.tone(780, 780, 0.55, 0.085, 0.15);
  }
}

export const experienceAudio = new ExperienceAudio();
