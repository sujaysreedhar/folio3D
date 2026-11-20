/** Lazily loads the page-turn recording and plays it after a committed turn. */
export declare class PageTurnSound {
    private enabled;
    private readonly url;
    private context?;
    private buffer?;
    private loading?;
    private readonly lifetime;
    private resuming?;
    private stop?;
    private disposed;
    private playback;
    constructor(enabled: boolean, url: string);
    setEnabled(enabled: boolean): void;
    /** Called synchronously from viewer input, so browsers can allow audio. */
    unlock(): void;
    private load;
    play(): void;
    dispose(): void;
}
