// Web Audio API Synthesizer & Speech Synthesis for Emergency EMS Radio, Hinglish Intercom, and Phone Calls
// 100% Zero-dependency, runs offline and on any modern browser.

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

// 1. Play EMS Walkie-Talkie Radio Squelch & Key-Up Chirp (Two-tone alert: 880Hz -> 1320Hz)
export function playRadioChirp() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  
  // Tone 1
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(880, now);
  osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.08);
  gain1.gain.setValueAtTime(0.12, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
  
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.1);

  // Radio static burst
  try {
    const bufferSize = ctx.sampleRate * 0.04;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.04, now + 0.09);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    whiteNoise.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    whiteNoise.start(now + 0.09);
    whiteNoise.stop(now + 0.14);
  } catch {}
}

// 2. Play Roger Beep on Mic Release
export function playRogerBeep() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1760, now);
  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.13);
}

// 3. Play Telephone Ring Tone (Realistic dual frequency 440Hz + 480Hz)
export function playPhoneRing(durationMs = 1200) {
  const ctx = getAudioContext();
  if (!ctx) return () => {};
  const now = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.frequency.setValueAtTime(440, now);
  osc2.frequency.setValueAtTime(480, now);
  gain.gain.setValueAtTime(0.07, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + durationMs / 1000);
  osc2.stop(now + durationMs / 1000);

  return () => {
    try {
      osc1.stop();
      osc2.stop();
    } catch {}
  };
}

// 4. Play Priority Emergency Chime (Ding-Dong 523Hz -> 659Hz)
export function playPriorityAlert() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(523.25, now);
  osc.frequency.setValueAtTime(659.25, now + 0.15);
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.55);
}

// 5. Hinglish Text-to-Speech (Speaks in Indian English / Hindi voice)
export function speakHinglish(text: string, onEnd?: () => void) {
  if (!('speechSynthesis' in window)) {
    if (onEnd) onEnd();
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 1.05;

  const voices = window.speechSynthesis.getVoices();
  // Prefer Indian English or Hindi voice
  const preferredVoice = voices.find(v => 
    v.lang === 'hi-IN' || 
    v.lang === 'en-IN' || 
    v.name.toLowerCase().includes('india') ||
    v.name.toLowerCase().includes('hindi')
  );
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  utterance.onend = () => {
    playRogerBeep();
    if (onEnd) onEnd();
  };
  utterance.onerror = () => {
    if (onEnd) onEnd();
  };

  playRadioChirp();
  setTimeout(() => {
    window.speechSynthesis.speak(utterance);
  }, 120);
}

// 6. Speech Recognition for Hinglish / Hindi & English Dictation
export function createSpeechRecognizer(
  lang: 'hi-IN' | 'en-IN' = 'hi-IN',
  onResult: (text: string, isFinal: boolean) => void,
  onError?: (err: string) => void
) {
  const SpeechRecognition =
    (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition: unknown }).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognizer = new (SpeechRecognition as any)();
  recognizer.continuous = true;
  recognizer.interimResults = true;
  recognizer.lang = lang;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recognizer.onresult = (event: any) => {
    let interim = '';
    let final = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        final += event.results[i][0].transcript;
      } else {
        interim += event.results[i][0].transcript;
      }
    }
    onResult(final || interim, Boolean(final));
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recognizer.onerror = (event: any) => {
    if (onError) onError(event.error || 'Speech recognition error');
  };

  return recognizer;
}
