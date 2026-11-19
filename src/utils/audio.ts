// Synthesized Web Audio API sound effects + Portuguese Web Speech API narrator
// Zero external audio dependencies; gentle, cheerful tones crafted for children with ASD.

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let globalSoundEnabled = true;

export function syncAudioPreferences(soundEnabled: boolean, narrationEnabled: boolean) {
  globalSoundEnabled = soundEnabled;
  if (masterGain && audioCtx) {
    masterGain.gain.setValueAtTime(soundEnabled ? 1 : 0, audioCtx.currentTime);
  }
  if (!narrationEnabled) {
    stopSpeaking();
  }
}

export function stopAllAudio() {
  globalSoundEnabled = false;
  if (masterGain && audioCtx) {
    try {
      masterGain.gain.setValueAtTime(0, audioCtx.currentTime);
    } catch {
      // Ignore
    }
  }
  stopSpeaking();
}

function getAudioContext(): { ctx: AudioContext; out: AudioNode } | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(globalSoundEnabled ? 1 : 0, audioCtx.currentTime);
      masterGain.connect(audioCtx.destination);
    }
  }
  if (!audioCtx || !masterGain) return null;
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  masterGain.gain.setValueAtTime(globalSoundEnabled ? 1 : 0, audioCtx.currentTime);
  return { ctx: audioCtx, out: masterGain };
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.14,
  delay = 0
) {
  if (!globalSoundEnabled) return;
  const audio = getAudioContext();
  if (!audio) return;
  const { ctx, out } = audio;

  const now = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(out);

  osc.start(now);
  osc.stop(now + duration + 0.02);
}

export function playPinchGrab(enabled: boolean) {
  if (!enabled) return;
  playTone(523.25, 0.11, 'sine', 0.12, 0);
  playTone(659.25, 0.12, 'triangle', 0.09, 0.05);
}

export function playItemDrop(enabled: boolean) {
  if (!enabled) return;
  playTone(440, 0.1, 'sine', 0.1, 0);
  playTone(587.33, 0.14, 'sine', 0.11, 0.05);
}

export function playSoftHover(enabled: boolean) {
  if (!enabled) return;
  playTone(392, 0.06, 'sine', 0.04, 0);
}

export function playTelepathySparkle(enabled: boolean) {
  if (!enabled) return;
  const notes = [659.25, 783.99, 987.77, 1174.66];
  notes.forEach((n, idx) => {
    playTone(n, 0.16, 'sine', 0.08, idx * 0.055);
  });
}

export function playGentleEncourage(enabled: boolean) {
  // Never play harsh error buzzers — play a soft warm wooden double-tap
  if (!enabled) return;
  playTone(329.63, 0.16, 'triangle', 0.09, 0);
  playTone(293.66, 0.18, 'triangle', 0.07, 0.12);
}

export function playChallengeSuccess(enabled: boolean) {
  if (!enabled) return;
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((n, idx) => {
    playTone(n, 0.22, 'triangle', 0.14, idx * 0.08);
  });
}

export function playStellaFanfare(enabled: boolean) {
  if (!enabled) return;
  const melody = [
    { f: 523.25, d: 0.16, t: 0 },
    { f: 659.25, d: 0.16, t: 0.12 },
    { f: 783.99, d: 0.16, t: 0.24 },
    { f: 1046.5, d: 0.35, t: 0.36 },
    { f: 880.0, d: 0.16, t: 0.58 },
    { f: 1046.5, d: 0.55, t: 0.72 },
  ];
  melody.forEach((m) => {
    playTone(m.f, m.d, 'triangle', 0.15, m.t);
    playTone(m.f * 0.5, m.d, 'sine', 0.06, m.t);
  });
}

export function playTraceConnectNote(stepIndex: number, enabled: boolean) {
  if (!enabled) return;
  const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
  const freq = scale[stepIndex % scale.length];
  playTone(freq, 0.18, 'triangle', 0.13, 0);
  playTone(freq * 1.5, 0.12, 'sine', 0.06, 0.05);
}

export function playCloudSweep(enabled: boolean) {
  if (!enabled) return;
  playTone(480, 0.14, 'sine', 0.08, 0);
  playTone(720, 0.18, 'sine', 0.07, 0.06);
}

export function playHighFiveCelebration(enabled: boolean) {
  if (!enabled) return;
  // Soft clapping pop + cheerful ascending triad
  playTone(280, 0.09, 'triangle', 0.15, 0);
  playTone(587.33, 0.16, 'triangle', 0.13, 0.07);
  playTone(783.99, 0.18, 'triangle', 0.13, 0.15);
  playTone(1174.66, 0.34, 'sine', 0.14, 0.24);
}

export function playBondBorf(enabled: boolean) {
  if (!enabled) return;
  // Gentle, cute warm double "Borf!" tone
  playTone(195, 0.11, 'triangle', 0.12, 0);
  playTone(155, 0.13, 'sine', 0.09, 0.09);
}

export type CharacterVoiceId = 'anya' | 'loid' | 'yor' | 'bond' | 'default';

const VOICE_PROFILES: Record<CharacterVoiceId, { rate: number; pitch: number }> = {
  anya: { rate: 0.99, pitch: 1.32 },
  loid: { rate: 0.89, pitch: 0.84 },
  yor: { rate: 0.92, pitch: 1.13 },
  bond: { rate: 0.88, pitch: 0.78 },
  default: { rate: 0.94, pitch: 1.06 },
};

export function resolveVoiceId(characterName?: string): CharacterVoiceId {
  if (!characterName) return 'default';
  const lower = characterName.toLowerCase();
  if (lower.includes('bond')) return 'bond';
  if (lower.includes('yor')) return 'yor';
  if (lower.includes('loid') || lower.includes('twilight') || lower.includes('henderson')) {
    return 'loid';
  }
  if (lower.includes('anya') || lower.includes('becky') || lower.includes('damian')) {
    return 'anya';
  }
  return 'default';
}

export interface SpeechActivityState {
  speaking: boolean;
  pulse: number;
  text: string;
}

type SpeechListener = (state: SpeechActivityState) => void;

const speechListeners = new Set<SpeechListener>();
let currentSpeechState: SpeechActivityState = { speaking: false, pulse: 0, text: '' };
let fallbackPulseTimer: number | null = null;
let fallbackEndTimer: number | null = null;

function notifySpeechListeners(next: SpeechActivityState) {
  currentSpeechState = next;
  speechListeners.forEach((cb) => cb(next));
}

function clearSpeechTimers() {
  if (fallbackPulseTimer !== null) {
    window.clearInterval(fallbackPulseTimer);
    fallbackPulseTimer = null;
  }
  if (fallbackEndTimer !== null) {
    window.clearTimeout(fallbackEndTimer);
    fallbackEndTimer = null;
  }
}

export function subscribeSpeechState(listener: SpeechListener): () => void {
  speechListeners.add(listener);
  listener(currentSpeechState);
  return () => {
    speechListeners.delete(listener);
  };
}

export function speakPtBr(
  text: string,
  enabled: boolean,
  voiceId: CharacterVoiceId = 'default'
) {
  if (typeof window === 'undefined') return;

  clearSpeechTimers();

  // Even when audio narration is muted, ensure speechSynthesis is cancelled cleanly
  // and run a brief calm visual speech animation so the portrait still presents the prompt.
  if (!enabled || !('speechSynthesis' in window)) {
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
    const estimatedMs = Math.min(3000, Math.max(1400, text.length * 36));
    notifySpeechListeners({ speaking: true, pulse: 1, text });
    fallbackPulseTimer = window.setInterval(() => {
      notifySpeechListeners({
        speaking: true,
        pulse: currentSpeechState.pulse + 1,
        text,
      });
    }, 260);
    fallbackEndTimer = window.setTimeout(() => {
      clearSpeechTimers();
      notifySpeechListeners({ speaking: false, pulse: 0, text: '' });
    }, estimatedMs);
    return;
  }

  if (voiceId === 'bond') {
    playBondBorf(globalSoundEnabled);
  }

  try {
    window.speechSynthesis.cancel();
    const profile = VOICE_PROFILES[voiceId] || VOICE_PROFILES.default;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = profile.rate;
    utterance.pitch = profile.pitch;
    utterance.volume = 0.95;

    const voices = window.speechSynthesis.getVoices();
    const ptVoice =
      voices.find((v) => v.lang.toLowerCase().startsWith('pt-br')) ||
      voices.find((v) => v.lang.toLowerCase().startsWith('pt'));
    if (ptVoice) {
      utterance.voice = ptVoice;
    }

    const startVisualPulse = () => {
      clearSpeechTimers();
      notifySpeechListeners({ speaking: true, pulse: 1, text });
      fallbackPulseTimer = window.setInterval(() => {
        notifySpeechListeners({
          speaking: true,
          pulse: currentSpeechState.pulse + 1,
          text,
        });
      }, 240);
      // Safety cap in case browser speechSynthesis misses onend
      const safetyMs = Math.min(11000, Math.max(2600, text.length * 90));
      fallbackEndTimer = window.setTimeout(() => {
        clearSpeechTimers();
        notifySpeechListeners({ speaking: false, pulse: 0, text: '' });
      }, safetyMs);
    };

    utterance.onstart = () => {
      startVisualPulse();
    };
    utterance.onboundary = () => {
      notifySpeechListeners({
        speaking: true,
        pulse: currentSpeechState.pulse + 1,
        text,
      });
    };
    utterance.onend = () => {
      clearSpeechTimers();
      notifySpeechListeners({ speaking: false, pulse: 0, text: '' });
    };
    utterance.onerror = () => {
      clearSpeechTimers();
      notifySpeechListeners({ speaking: false, pulse: 0, text: '' });
    };

    startVisualPulse();
    window.speechSynthesis.speak(utterance);
  } catch {
    clearSpeechTimers();
    notifySpeechListeners({ speaking: false, pulse: 0, text: '' });
  }
}

export function stopSpeaking() {
  if (typeof window !== 'undefined') {
    clearSpeechTimers();
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
    if (currentSpeechState.speaking) {
      notifySpeechListeners({ speaking: false, pulse: 0, text: '' });
    }
  }
}

