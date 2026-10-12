/** A short, original paper rustle. No audio files, downloads or idle audio loop. */
export declare class PageTurnSound {
    private enabled;
    private context?;
    private buffer?;
    private resuming?;
    private stop?;
    private disposed;
    constructor(enabled: boolean);
    setEnabled(enabled: boolean): void;
    /** Called synchronously from viewer input, so browsers can allow audio. */
    unlock(): void;
    play(): void;
    dispose(): void;
}
