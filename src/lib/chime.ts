/*
 * Synthesized acoustic mallet chime engine, adapted from ding (MIT, Yusuf Cengiz).
 * Generates organic soft mallet tones via Web Audio API without needing external audio files.
 */

export type ChimeType = "success" | "error" | "warning" | "info";

let audioCtx: AudioContext | undefined;

// [frequency Hz, start offset s, level]. Rising = good news, falling = alert.
const CUES: Record<ChimeType, [number, number, number][]> = {
  success: [
    [392, 0, 1],
    [523.3, 0.1, 1],
  ],
  error: [
    [233.1, 0, 1],
    [185, 0.13, 1],
  ],
  warning: [
    [349.2, 0, 0.8],
    [349.2, 0.16, 0.6],
  ],
  info: [[466.2, 0, 0.9]],
};

/**
 * Soft mallet: a warm low tone with a faint octave, no sharp overtones.
 * Slightly humanized in pitch to replicate physical mallet strikes.
 */
function strikeMallet(c: AudioContext, out: AudioNode, freq: number, at: number, level: number) {
  const t = c.currentTime + at;
  const f = freq * (1 + (Math.random() - 0.5) * 0.008);
  for (const [mult, gain, decay] of [
    [1, 0.6, 0.5],
    [2, 0.06, 0.15],
  ] as const) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.frequency.value = f * mult;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain * level, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    osc.connect(g).connect(out);
    osc.start(t);
    osc.stop(t + decay + 0.05);
  }
}

/**
 * Play a synthesized chime cue for an event.
 * Completely safe to call anywhere: silences gracefully if AudioContext is missing, locked, or throws.
 */
export function playChime(type: ChimeType, volume = 0.5): void {
  const cue = CUES[type];
  if (!cue || typeof AudioContext === "undefined") return;
  try {
    audioCtx ??= new AudioContext();
    if (audioCtx.state === "suspended") void audioCtx.resume();
    if (audioCtx.state === "closed") return;

    const master = audioCtx.createGain();
    master.gain.value = Math.min(1, Math.max(0, volume)) * 0.45;

    // Rounded-off highs via lowpass filter (1300Hz)
    const soften = audioCtx.createBiquadFilter();
    soften.type = "lowpass";
    soften.frequency.value = 1300;

    // Faint room acoustic echo delay (110ms)
    const echo = audioCtx.createDelay();
    echo.delayTime.value = 0.11;
    const wet = audioCtx.createGain();
    wet.gain.value = 0.1;

    master.connect(soften);
    soften.connect(audioCtx.destination);
    soften.connect(echo).connect(wet).connect(audioCtx.destination);

    for (const [f, at, level] of cue) {
      strikeMallet(audioCtx, master, f, at, level);
    }
  } catch {
    // Audio is a subtle enhancement: never throw or break UI
  }
}
