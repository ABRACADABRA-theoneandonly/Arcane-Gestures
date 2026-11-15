class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private lastFireballSoundTime: number = 0;
  private lastWaterSoundTime: number = 0;
  private lastZombieGroanTime: number = 0;
  private musicTimer: number | null = null;
  private musicMode: 'none' | 'arena' | 'ambient' = 'none';
  private musicStep: number = 0;

  constructor() {
    // Lazily initialize on first interaction
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : 0.3;
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.36;
      this.musicGain.connect(this.masterGain);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public unlockAndResumeMusic() {
    this.initContext();
    if (this.musicMode !== 'none' && this.musicTimer === null) {
      this.startBackgroundMusic(this.musicMode);
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.3, this.ctx.currentTime);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public startBackgroundMusic(mode: 'arena' | 'ambient') {
    if (this.musicMode === mode && this.musicTimer !== null) {
      this.initContext();
      return;
    }
    this.stopBackgroundMusic();
    this.musicMode = mode;
    this.musicStep = 0;
    this.initContext();

    const intervalMs = mode === 'arena' ? 320 : 520;
    this.playMusicTick();
    this.musicTimer = window.setInterval(() => {
      this.playMusicTick();
    }, intervalMs);
  }

  public stopBackgroundMusic() {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    this.musicMode = 'none';
  }

  private playMusicTick() {
    if (!this.ctx || !this.musicGain || this.isMuted || this.ctx.state === 'suspended') return;
    const now = this.ctx.currentTime;
    const step = this.musicStep++;

    if (this.musicMode === 'arena') {
      // Dark atmospheric battle score in D minor: Dm -> Bb -> C -> Am (16-step bar, 64-step phrase)
      const chordIdx = Math.floor((step % 64) / 16);
      const bassRoots = [73.42, 58.27, 65.41, 55.0]; // D2, Bb1, C2, A1
      const arpPatterns = [
        [293.66, 349.23, 440.0, 587.33, 440.0, 349.23, 523.25, 440.0], // Dm
        [233.08, 293.66, 349.23, 466.16, 349.23, 293.66, 440.0, 349.23], // Bb
        [261.63, 329.63, 392.0, 523.25, 392.0, 329.63, 440.0, 392.0], // C
        [220.0, 261.63, 329.63, 440.0, 392.0, 329.63, 293.66, 329.63] // Am
      ];

      // Deep pulsing bass & pad chord at the start of every 8 steps
      if (step % 8 === 0) {
        this.scheduleMusicTone(bassRoots[chordIdx], 2.3, 'sawtooth', 0.2, 260, now);
        this.scheduleMusicTone(bassRoots[chordIdx] * 2, 1.9, 'triangle', 0.14, 420, now);
      }

      // Battle frame-drum thud on 0, 3, 4, 6
      const barStep = step % 8;
      if (barStep === 0 || barStep === 4) {
        this.scheduleDrumHit(98, 42, 0.24, 0.28, now);
      } else if (barStep === 3 || barStep === 6) {
        this.scheduleDrumHit(76, 38, 0.16, 0.16, now);
      }

      // Eerie dark-fantasy bell/string arpeggio
      const arpFreq = arpPatterns[chordIdx][step % 8];
      this.scheduleMusicTone(arpFreq, 0.48, 'triangle', 0.13, 1800, now);
      if (step % 4 === 2) {
        this.scheduleMusicTone(arpFreq * 1.5, 0.42, 'sine', 0.06, 2200, now + 0.02);
      }
    } else if (this.musicMode === 'ambient') {
      // Calm enchanted fantasy atmosphere in A minor: Am -> F -> C -> G
      const chordIdx = Math.floor((step % 32) / 8);
      const padRoots = [110.0, 87.31, 130.81, 98.0];
      const chimeScale = [
        [440.0, 523.25, 659.25, 880.0],
        [349.23, 440.0, 523.25, 698.46],
        [392.0, 523.25, 659.25, 783.99],
        [392.0, 493.88, 587.33, 783.99]
      ];
      if (step % 8 === 0) {
        this.scheduleMusicTone(padRoots[chordIdx], 3.8, 'sine', 0.15, 600, now);
        this.scheduleMusicTone(padRoots[chordIdx] * 2, 3.6, 'triangle', 0.08, 700, now);
      }
      if (step % 2 === 0) {
        const note = chimeScale[chordIdx][(step / 2) % 4];
        this.scheduleMusicTone(note, 0.9, 'sine', 0.09, 2400, now);
      }
    }
  }

  private scheduleMusicTone(
    freq: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    cutoff: number,
    startTime: number
  ) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.04);
  }

  private scheduleDrumHit(startFreq: number, endFreq: number, duration: number, volume: number, startTime: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration);

    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  public playFireball() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    
    // Throttle audio triggers during extreme rapid fire (max 10 sounds/sec) to avoid audio clipping
    if (now - this.lastFireballSoundTime < 0.08) return;
    this.lastFireballSoundTime = now;

    // Pitch sweep whoosh
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    const startFreq = 380 + Math.random() * 80;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.18);

    oscGain.gain.setValueAtTime(0.28, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.2);

    this.playNoiseBurst(0.14, 520, 'lowpass');
  }

  public playWaterBlast() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    if (now - this.lastWaterSoundTime < 0.07) return;
    this.lastWaterSoundTime = now;

    // Fluid bubbling whoosh
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(340 + Math.random() * 60, now);
    osc.frequency.linearRampToValueAtTime(680, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.14);

    oscGain.gain.setValueAtTime(0.25, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.15);

    this.playNoiseBurst(0.12, 1400, 'bandpass');
  }

  public playLightning() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(960 + Math.random() * 200, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.14);

    oscGain.gain.setValueAtTime(0.25, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.16);

    this.playNoiseBurst(0.12, 3400, 'highpass');
  }

  public playShield() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.2);

    oscGain.gain.setValueAtTime(0.25, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  public playShieldDeflect() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.18);

    oscGain.gain.setValueAtTime(0.35, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playFrostNova() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Crystalline freeze chime
    [659.25, 830.61, 1046.5].forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);
      osc.frequency.linearRampToValueAtTime(freq * 1.25, now + idx * 0.04 + 0.25);

      oscGain.gain.setValueAtTime(0.22, now + idx * 0.04);
      oscGain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.04 + 0.35);

      osc.connect(oscGain);
      oscGain.connect(this.masterGain);
      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.38);
    });

    this.playNoiseBurst(0.35, 2400, 'bandpass');
  }

  public playCelestialBeam() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    [520, 780, 1040].forEach((freq, i) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.linearRampToValueAtTime(freq * 1.4, now + 0.25);

      oscGain.gain.setValueAtTime(0.14 / (i + 1), now);
      oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      osc.connect(oscGain);
      oscGain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.32);
    });
  }

  public playMeteorCrash() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Sub-bass impact
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(140, now);
    subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.6);

    subGain.gain.setValueAtTime(0.6, now);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.65);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(now);
    subOsc.stop(now + 0.7);

    // Fiery debris explosion
    this.playNoiseBurst(0.5, 260, 'lowpass');
  }

  public playZombieGroan() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    if (now - this.lastZombieGroanTime < 1.25) return;
    this.lastZombieGroanTime = now;

    // Classic Minecraft-inspired low guttural undead groan ("Uuurrghh...")
    const pitchMult = 0.85 + Math.random() * 0.32;
    const dur = 0.52 + Math.random() * 0.22;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const formant = this.ctx.createBiquadFilter();
    const outGain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(98 * pitchMult, now);
    osc1.frequency.linearRampToValueAtTime(112 * pitchMult, now + dur * 0.25);
    osc1.frequency.exponentialRampToValueAtTime(66 * pitchMult, now + dur);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(49 * pitchMult, now);
    osc2.frequency.exponentialRampToValueAtTime(34 * pitchMult, now + dur);

    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(22, now);
    lfoGain.gain.setValueAtTime(14, now);
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);

    formant.type = 'bandpass';
    formant.Q.setValueAtTime(3.2, now);
    formant.frequency.setValueAtTime(290, now);
    formant.frequency.linearRampToValueAtTime(430, now + dur * 0.35);
    formant.frequency.linearRampToValueAtTime(210, now + dur);

    outGain.gain.setValueAtTime(0.01, now);
    outGain.gain.linearRampToValueAtTime(0.32, now + 0.08);
    outGain.gain.exponentialRampToValueAtTime(0.008, now + dur);

    osc1.connect(formant);
    osc2.connect(formant);
    formant.connect(outGain);
    outGain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    lfo.start(now);
    osc1.stop(now + dur + 0.04);
    osc2.stop(now + dur + 0.04);
    lfo.stop(now + dur + 0.04);

    this.playNoiseBurst(dur * 0.65, 380, 'bandpass');
  }

  public playZombieHit() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Classic blocky undead hurt grunt + bone crunch
    const pitchMult = 0.9 + Math.random() * 0.24;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(195 * pitchMult, now);
    osc.frequency.exponentialRampToValueAtTime(82 * pitchMult, now + 0.14);

    filter.type = 'bandpass';
    filter.Q.setValueAtTime(2.6, now);
    filter.frequency.setValueAtTime(520, now);
    filter.frequency.exponentialRampToValueAtTime(240, now + 0.14);

    oscGain.gain.setValueAtTime(0.34, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(filter);
    filter.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.16);

    this.playNoiseBurst(0.09, 1350, 'bandpass');
  }

  public playZombieAttack() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(220, now + 0.05);
    osc.frequency.exponentialRampToValueAtTime(58, now + 0.22);

    oscGain.gain.setValueAtTime(0.42, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.24);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.25);

    this.playNoiseBurst(0.14, 900, 'lowpass');
  }

  public playZombieDeath() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Classic Minecraft-style descending zombie death rattle ("Bwaaarrghh...")
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    const oscGain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(235, now);
    osc1.frequency.exponentialRampToValueAtTime(52, now + 0.44);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(118, now);
    osc2.frequency.exponentialRampToValueAtTime(34, now + 0.44);

    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(20, now);
    lfoGain.gain.setValueAtTime(18, now);
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);

    filter.type = 'lowpass';
    filter.Q.setValueAtTime(3.0, now);
    filter.frequency.setValueAtTime(860, now);
    filter.frequency.exponentialRampToValueAtTime(180, now + 0.44);

    oscGain.gain.setValueAtTime(0.38, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.46);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(oscGain);
    oscGain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    lfo.start(now);
    osc1.stop(now + 0.48);
    osc2.stop(now + 0.48);
    lfo.stop(now + 0.48);

    this.playNoiseBurst(0.32, 420, 'lowpass');
  }

  public playBloodBender() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Deep heartbeat thud followed by eerie dissonant frequency
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(60, now);
    subOsc.frequency.exponentialRampToValueAtTime(35, now + 0.3);

    subGain.gain.setValueAtTime(0.5, now);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(now);
    subOsc.stop(now + 0.38);

    // Dissonant harmonic tendril tone
    const harmOsc = this.ctx.createOscillator();
    const harmGain = this.ctx.createGain();
    harmOsc.type = 'sawtooth';
    harmOsc.frequency.setValueAtTime(190, now + 0.05);
    harmOsc.frequency.linearRampToValueAtTime(260, now + 0.25);

    harmGain.gain.setValueAtTime(0.18, now + 0.05);
    harmGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    harmOsc.connect(harmGain);
    harmGain.connect(this.masterGain);
    harmOsc.start(now + 0.05);
    harmOsc.stop(now + 0.38);
  }

  public playBloodExplosion() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Massive visceral hemorrhagic explosion
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.5);

    oscGain.gain.setValueAtTime(0.65, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.55);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.6);

    this.playNoiseBurst(0.45, 380, 'lowpass');
  }

  public playArmorUpgrade() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Metallic resonance chord
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      oscGain.gain.setValueAtTime(0.3, now + idx * 0.06);
      oscGain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.06 + 0.4);

      osc.connect(oscGain);
      oscGain.connect(this.masterGain);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.45);
    });
  }

  public playShieldBreak() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.22);

    oscGain.gain.setValueAtTime(0.4, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.26);

    this.playNoiseBurst(0.2, 1800, 'bandpass');
  }

  public playBeastRoar() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Primal wolf growl / predator roar
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.linearRampToValueAtTime(220, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.55);

    oscGain.gain.setValueAtTime(0.45, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.62);

    this.playNoiseBurst(0.4, 450, 'lowpass');
  }

  public playHotAirBalloonBurner() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Sustained hot propane flame whoosh
    this.playNoiseBurst(1.2, 600, 'lowpass');

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.linearRampToValueAtTime(140, now + 0.6);
    osc.frequency.exponentialRampToValueAtTime(70, now + 1.2);

    oscGain.gain.setValueAtTime(0.35, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 1.25);
  }

  public playAncientRune() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    [440, 659.25, 987.77].forEach((f, i) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.05);

      oscGain.gain.setValueAtTime(0.28, now + i * 0.05);
      oscGain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.6);

      osc.connect(oscGain);
      oscGain.connect(this.masterGain);
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.65);
    });
  }

  public playLevelUp() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880, 1108.73];

    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      oscGain.gain.setValueAtTime(0.35, now + idx * 0.08);
      oscGain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.3);

      osc.connect(oscGain);
      oscGain.connect(this.masterGain);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.32);
    });
  }

  public playRealmWarp() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.6);

    oscGain.gain.setValueAtTime(0.3, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.85);

    this.playNoiseBurst(0.7, 900, 'bandpass');
  }

  private playNoiseBurst(duration: number, filterFreq: number, filterType: BiquadFilterType) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(this.ctx.currentTime);
  }

  public playGestureBlocked() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Dissonant low rejection buzz
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.linearRampToValueAtTime(95, now + 0.18);

    oscGain.gain.setValueAtTime(0.35, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  public playGestureSuccess() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Crisp crystal chord chime
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);

      oscGain.gain.setValueAtTime(0.24, now + idx * 0.04);
      oscGain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.04 + 0.45);

      osc.connect(oscGain);
      oscGain.connect(this.masterGain);
      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.48);
    });
  }
}

export const audioEngine = new SoundSynthesizer();
