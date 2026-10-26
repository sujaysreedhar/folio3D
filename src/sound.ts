/** Lazily loads the page-turn recording and plays it after a committed turn. */
export class PageTurnSound {
  private context?: AudioContext;
  private buffer?: AudioBuffer;
  private loading?: Promise<AudioBuffer | undefined>;
  private readonly lifetime = new AbortController();
  private resuming?: Promise<void>;
  private stop?: () => void;
  private disposed = false;
  private playback = 0;

  constructor(
    private enabled: boolean,
    private readonly url: string,
  ) {}

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.playback++;
      this.stop?.();
    } else this.unlock();
  }

  /** Called synchronously from viewer input, so browsers can allow audio. */
  unlock(): void {
    if (this.disposed || !this.enabled) return;
    if (navigator.userActivation && !navigator.userActivation.isActive) return;
    try {
      const context = (this.context ??= new AudioContext());
      if (context.state === 'suspended') this.resuming = context.resume().catch(() => {});
      void this.load(context);
    } catch {
      // Audio may be unavailable or blocked; navigation still works.
    }
  }

  private load(context: AudioContext): Promise<AudioBuffer | undefined> {
    if (this.buffer) return Promise.resolve(this.buffer);
    return (this.loading ??= fetch(this.url, { signal: this.lifetime.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Page-turn audio could not be loaded.');
        return response.arrayBuffer();
      })
      .then((data) => context.decodeAudioData(data))
      .then((buffer) => {
        if (!this.disposed) return (this.buffer = buffer);
      })
      .catch(() => undefined)
      .finally(() => {
        this.loading = undefined;
      }));
  }

  play(): void {
    const context = this.context;
    if (!this.enabled || this.disposed || !context) return;
    const playback = ++this.playback;
    void Promise.all([this.resuming, this.load(context)]).then(([, buffer]) => {
      if (
        !buffer ||
        !this.enabled ||
        this.disposed ||
        playback !== this.playback ||
        context.state !== 'running'
      )
        return;
      try {
        this.stop?.();
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        const cleanup = () => {
          source.disconnect();
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
    this.lifetime.abort();
    this.playback++;
    this.stop?.();
    this.buffer = undefined;
    if (this.context && this.context.state !== 'closed') void this.context.close().catch(() => {});
    this.context = undefined;
  }
}
