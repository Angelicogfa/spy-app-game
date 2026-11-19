// Synthesized Web Audio API sound effects + Portuguese Web Speech API narrator
// Zero external audio dependencies; gentle, cheerful tones crafted for children with ASD.

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.14,
  delay = 0
) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

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

export function speakPtBr(text: string, enabled: boolean) {
  if (typeof window === 'undefined') return;

  clearSpeechTimers();

  // Even when audio narration is muted, run a brief calm visual speech animation (~2.2s)
  // so the character portrait still visibly presents the challenge to the child.
  if (!enabled || !('speechSynthesis' in window)) {
    const estimatedMs = Math.min(3400, Math.max(1600, text.length * 42));
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

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 0.94;
    utterance.pitch = 1.08;
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

