/**
 * audio.js
 * Efeitos sonoros gerados via Web Audio API (osciladores), sem depender
 * de arquivos externos. Isso mantém o projeto 100% autocontido.
 */
const AudioFX = (() => {
  const MUTE_KEY = 'muted';
  let muted = Storage.get(MUTE_KEY, false);
  let ctx = null;

  function getContext() {
    if (!ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      ctx = new AudioContextClass();
    }
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function tone({ freq = 440, duration = 0.12, type = 'square', volume = 0.15, slideTo = null, delay = 0 }) {
    if (muted) return;
    const audioCtx = getContext();
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(1, slideTo),
        audioCtx.currentTime + delay + duration
      );
    }

    gain.gain.setValueAtTime(volume, audioCtx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + delay + duration);

    osc.connect(gain).connect(audioCtx.destination);
    osc.start(audioCtx.currentTime + delay);
    osc.stop(audioCtx.currentTime + delay + duration + 0.02);
  }

  function playJump() {
    tone({ freq: 340, slideTo: 620, duration: 0.14, type: 'square', volume: 0.14 });
  }

  function playDuck() {
    tone({ freq: 220, slideTo: 140, duration: 0.1, type: 'triangle', volume: 0.1 });
  }

  function playHit() {
    tone({ freq: 220, slideTo: 40, duration: 0.35, type: 'sawtooth', volume: 0.22 });
    tone({ freq: 120, duration: 0.4, type: 'square', volume: 0.15, delay: 0.03 });
  }

  function playScoreTick() {
    tone({ freq: 880, duration: 0.06, type: 'sine', volume: 0.06 });
  }

  function playButton() {
    tone({ freq: 500, slideTo: 700, duration: 0.08, type: 'square', volume: 0.1 });
  }

  function playStart() {
    tone({ freq: 400, duration: 0.09, type: 'square', volume: 0.14 });
    tone({ freq: 600, duration: 0.09, type: 'square', volume: 0.14, delay: 0.09 });
    tone({ freq: 900, duration: 0.14, type: 'square', volume: 0.16, delay: 0.18 });
  }

  function playRankingEntry() {
    [523, 659, 784, 1046].forEach((f, i) => {
      tone({ freq: f, duration: 0.16, type: 'square', volume: 0.14, delay: i * 0.11 });
    });
  }

  function isMuted() {
    return muted;
  }

  function setMuted(value) {
    muted = value;
    Storage.set(MUTE_KEY, muted);
  }

  function toggleMuted() {
    setMuted(!muted);
    return muted;
  }

  return {
    playJump,
    playDuck,
    playHit,
    playScoreTick,
    playButton,
    playStart,
    playRankingEntry,
    isMuted,
    setMuted,
    toggleMuted
  };
})();
