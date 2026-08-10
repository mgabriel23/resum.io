/**
 * Short UI sound effects (success / warning / error), synthesized on the fly
 * with the Web Audio API — no audio files to load or license. Fails silently
 * wherever Web Audio isn't available (older browsers, autoplay restrictions
 * before any user gesture has happened) since sound is a nice-to-have, never
 * something the app depends on.
 */
const ResumeSound = (function () {
  let audioCtx = null;

  function getContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioCtx) audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  // Plays one short tone starting `startTime` seconds from now, with a quick
  // fade in/out envelope so it clicks/pops as little as possible.
  function playTone(ctx, freq, startTime, duration, type, peakGain) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(ctx.destination);

    const t = ctx.currentTime + startTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(peakGain, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  function success() {
    const ctx = getContext();
    if (!ctx) return;
    playTone(ctx, 1046.50, 0, 0.13, 'sine', 0.32);   // C6
    playTone(ctx, 1567.98, 0.09, 0.16, 'sine', 0.32); // G6
  }

  function warning() {
    const ctx = getContext();
    if (!ctx) return;
    playTone(ctx, 440, 0, 0.16, 'sine', 0.30); // A4
  }

  function error() {
    const ctx = getContext();
    if (!ctx) return;
    playTone(ctx, 293.66, 0, 0.13, 'triangle', 0.34);  // D4
    playTone(ctx, 220.00, 0.11, 0.18, 'triangle', 0.34); // A3
  }

  return { success, warning, error };
})();
