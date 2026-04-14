let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

/** Short bright "ding" — word found by teammate */
export function playWordFound() {
  navigator.vibrate?.(100);
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.08);
    osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.16);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // Audio not supported
  }
}

/** Triumphant fanfare — game won */
export function playVictory() {
  navigator.vibrate?.([100, 50, 100, 50, 200]);
  try {
    const ctx = getCtx();
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    const startTime = ctx.currentTime;

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, startTime + i * 0.15);

      gain.gain.setValueAtTime(0, startTime + i * 0.15);
      gain.gain.linearRampToValueAtTime(0.35, startTime + i * 0.15 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + i * 0.15 + 0.5);

      osc.start(startTime + i * 0.15);
      osc.stop(startTime + i * 0.15 + 0.5);
    });

    // Final chord
    setTimeout(() => {
      [523, 659, 784, 1047].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 1);
      });
    }, 700);
  } catch {
    // Audio not supported
  }
}
