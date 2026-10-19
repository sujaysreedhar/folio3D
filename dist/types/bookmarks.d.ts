export declare class Bookmarks {
    private count;
    private pages;
    private key?;
    private persistent;
    constructor(count: number, storageKey: string | undefined, changed: () => void, signal: AbortSignal);
    private read;
    private reload;
    get(): number[];
    toggle(page: number): void;
}
