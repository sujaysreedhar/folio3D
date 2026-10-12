/** A short, original paper rustle. No audio files, downloads or idle audio loop. */
export class PageTurnSound {
  private context?: AudioContext;
  private buffer?: AudioBuffer;
  private resuming?: Promise<void>;
  private stop?: () => void;
  private disposed = false;

  constructor(private enabled: boolean) {}

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.stop?.();
    else this.unlock();
  }

  /** Called synchronously from viewer input, so browsers can allow audio. */
  unlock(): void {
    if (this.disposed || !this.enabled) return;
    if (navigator.userActivation && !navigator.userActivation.isActive) return;
    try {
      const context = (this.context ??= new AudioContext());
      if (context.state === 'suspended') this.resuming = context.resume().catch(() => {});
    } catch {
      // Audio may be unavailable or blocked; navigation still works.
    }
  }

  play(): void {
    const context = this.context;
    if (!this.enabled || this.disposed || !context) return;
    void (this.resuming ?? Promise.resolve()).then(() => {
      if (!this.enabled || this.disposed || context.state !== 'running') return;
      try {
        this.stop?.();
        if (!this.buffer) {
          this.buffer = context.createBuffer(
            1,
            Math.ceil(context.sampleRate * 0.32),
            context.sampleRate,
          );
          const samples = this.buffer.getChannelData(0);
          for (let i = 0; i < samples.length; i++) {
            const t = i / samples.length;
            const envelope = Math.sin(Math.PI * t) ** 2 * (0.6 + 0.4 * Math.sin(t * 47) ** 2);
            samples[i] = (Math.random() * 2 - 1) * envelope;
          }
        }
        const source = context.createBufferSource();
        const filter = context.createBiquadFilter();
        const gain = context.createGain();
        source.buffer = this.buffer;
        filter.type = 'bandpass';
        filter.frequency.value = 1800;
        filter.Q.value = 0.65;
        gain.gain.value = 0.18;
        source.connect(filter).connect(gain).connect(context.destination);
        const cleanup = () => {
          source.disconnect();
          filter.disconnect();
          gain.disconnect();
          if (this.stop === stop) this.stop = undefined;
        };
        const stop = () => {
          try {
            source.stop();
          } catch {
            /* Already ended. */
          }
          cleanup();
        };
        source.onended = cleanup;
        this.stop = stop;
        source.start();
      } catch {
        // A device or audio context can disappear between input and playback.
      }
    });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stop?.();
    this.buffer = undefined;
    if (this.context && this.context.state !== 'closed') void this.context.close().catch(() => {});
    this.context = undefined;
  }
}
