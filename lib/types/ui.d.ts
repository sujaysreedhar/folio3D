import type { FlipbookState, Source } from './types';
export type Action = 'previous' | 'next' | 'zoomIn' | 'zoomOut' | 'fit' | 'fullscreen' | 'sound';
export declare class ReaderUI {
    readonly root: HTMLElement;
    readonly stage: HTMLDivElement;
    readonly message: HTMLDivElement;
    readonly input: HTMLInputElement;
    private count;
    private live;
    private buttons;
    private objectUrl?;
    constructor(container: HTMLElement, label: string, source: Source, onAction: (action: Action) => void, onPage: (page: number) => void, signal: AbortSignal);
    update(state: FlipbookState): void;
    status(text: string, error?: boolean): void;
    dispose(): void;
}
