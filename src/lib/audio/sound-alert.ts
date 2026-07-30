export const playRestChimeSound = () => {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const bellPartials: { ratio: number; gain: number; decay: number }[] = [
      { ratio: 1, gain: 0.30, decay: 2.4 },
      { ratio: 2.756, gain: 0.20, decay: 1.6 },
      { ratio: 5.404, gain: 0.12, decay: 0.9 },
      { ratio: 8.933, gain: 0.06, decay: 0.5 },
    ];

    const BASE_FREQ = 523.25; // C5 — clear gym bell pitch

    const strike = (startTime: number, volume: number) => {
      bellPartials.forEach(({ ratio, gain, decay }) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(BASE_FREQ * ratio, startTime);

        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(gain * volume, startTime + 0.003);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + decay);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + decay + 0.05);
      });
    };

    // Two strikes: DING — ding
    strike(now, 1.0);
    strike(now + 0.45, 0.60);
  } catch (err) {
    console.error("Erro ao reproduzir som de notificação:", err);
  }
};
