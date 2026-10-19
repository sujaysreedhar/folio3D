import type { FlipbookState, Source } from './types';
export type Action = 'previous' | 'next' | 'zoomIn' | 'zoomOut' | 'fit' | 'fullscreen' | 'sound' | 'bookmark';
export declare class ReaderUI {
    readonly root: HTMLElement;
    readonly stage: HTMLDivElement;
    readonly message: HTMLDivElement;
    readonly input: HTMLInputElement;
    readonly browse: HTMLButtonElement;
    private more;
    private secondary;
    private compact;
    private count;
    private live;
    private buttons;
    private objectUrl?;
    constructor(container: HTMLElement, label: string, source: Source, onAction: (action: Action) => void, onPage: (page: number) => void, signal: AbortSignal);
    setCompact(compact: boolean): void;
    private closeMore;
    update(state: FlipbookState): void;
    updateBookmark(saved: boolean): void;
    status(text: string, error?: boolean): void;
    dispose(): void;
}
