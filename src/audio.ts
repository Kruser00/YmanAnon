export class RetroAudio {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;

  isMuted: boolean = false;
  bgmStarted: boolean = false;
  bgmGain: GainNode | null = null;
  sequencerTimer: any = null;
  currentStep: number = 0;
  tempo: number = 110; 
  currentMood: string = 'neutral';

  notes: Record<string, number> = {
    'C2': 65.41, 'D2': 73.42, 'E2': 82.41, 'F2': 87.31, 'G2': 98.00, 'A2': 110.00, 'B2': 123.47,
    'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
    'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88
  };

  patterns: Record<string, { bass: (string|null)[], lead: (string|null)[] }> = {
    neutral: {
      bass: ['A2', null, 'A2', 'E2', 'A2', null, 'G2', 'B2'],
      lead: ['A3', 'C4', 'E4', 'G4', 'E4', 'C4', 'A3', null]
    },
    energetic: {
      bass: ['C2', 'G2', 'C2', 'G2', 'D2', 'A2', 'D2', 'A2'],
      lead: ['C4', 'E4', 'G4', 'B4', 'A4', 'F4', 'D4', 'B3']
    },
    anxious: {
      bass: ['F2', 'F2', 'Gb2', 'F2', 'F2', 'Gb2', 'F2', 'E2'],
      lead: ['F3', 'Ab3', 'B3', 'D4', 'F4', 'D4', 'B3', 'Ab3']
    },
    space: {
      bass: ['D2', null, null, 'A2', 'D2', null, null, 'G2'],
      lead: ['D4', 'F4', 'A4', 'D5', 'A4', 'F4', 'D4', null]
    },
    melodic: {
      bass: ['G2', 'B2', 'D3', 'B2', 'C3', 'E3', 'G3', 'E3'],
      lead: ['G4', 'D4', 'B3', 'G3', 'A3', 'C4', 'E4', 'C4']
    }
  };

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : 0.2; // Slightly lower default
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.2, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  startBGM() {
    if (!this.ctx || !this.masterGain || this.bgmStarted) return;
    this.bgmStarted = true;

    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = 0.15;
    this.bgmGain.connect(this.masterGain);

    this.startSequencer();
  }

  startSequencer() {
    if (this.sequencerTimer) return;
    
    const stepDuration = 60 / this.tempo / 2; // 8th notes
    
    const tick = () => {
      if (this.isMuted) {
        this.sequencerTimer = setTimeout(tick, stepDuration * 1000);
        return;
      }
      
      const pattern = this.patterns[this.currentMood] || this.patterns.neutral;
      const bassNote = pattern.bass[this.currentStep % pattern.bass.length];
      const leadNote = pattern.lead[this.currentStep % pattern.lead.length];

      if (bassNote) this.playTone(this.notes[bassNote], 'triangle', 0.1, stepDuration * 0.9);
      if (leadNote) this.playTone(this.notes[leadNote], 'square', 0.05, stepDuration * 0.4);

      this.currentStep++;
      this.sequencerTimer = setTimeout(tick, stepDuration * 1000);
    };

    tick();
  }

  playTone(freq: number, type: OscillatorType, volume: number, duration: number) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    g.gain.setValueAtTime(volume, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

    osc.connect(g);
    g.connect(this.bgmGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  updateMood(mood: string | null) {
    if (mood === 'energetic') this.currentMood = 'energetic';
    else if (mood === 'anxious') this.currentMood = 'anxious';
    else if (mood === 'thoughtful') this.currentMood = 'space';
    else if (mood === 'lonely') this.currentMood = 'melodic';
    else this.currentMood = 'neutral';
  }

  // A short typing/click beep with spatialization
  playKeystroke() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const panner = this.ctx.createPanner();
    
    panner.positionX.setValueAtTime((Math.random() - 0.5) * 2, this.ctx.currentTime);
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400 + Math.random() * 600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.08);
    
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(panner);
    panner.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  // Low frequency rumble ramping up
  playBootUp() {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(50, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 1.5);
    
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 0.5);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.5);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 1.5);
  }

  // Chime for successful match
  playMatchFound() {
    if (!this.ctx || !this.masterGain) return;
    const startFreq = 440;
    
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc1.type = 'sine';
    osc2.type = 'sine';
    
    osc1.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
    osc1.frequency.setValueAtTime(startFreq * 1.5, this.ctx.currentTime + 0.15); // jump up a fifth
    
    osc2.frequency.setValueAtTime(startFreq * 2, this.ctx.currentTime);
    osc2.frequency.setValueAtTime(startFreq * 3, this.ctx.currentTime + 0.15); 
    
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.1, this.ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(this.ctx.currentTime);
    osc2.start(this.ctx.currentTime);
    osc1.stop(this.ctx.currentTime + 0.5);
    osc2.stop(this.ctx.currentTime + 0.5);
  }

  // Alert/Notification
  playAlert() {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
    osc.frequency.setValueAtTime(800, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.1, this.ctx.currentTime + 0.02);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playDegauss() {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(40, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.1);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.8);
    
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.5, this.ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.8);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.8);

    // High freq noise component
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
    noise.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(this.ctx.currentTime);
  }

  playGlitch() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(Math.random() * 50 + 20, this.ctx.currentTime);
    osc.frequency.setValueAtTime(Math.random() * 2000 + 100, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }
}

export const audioService = new RetroAudio();
