import type { ContentsEntry, DocumentProvider, FlipbookState } from './types';
/** A paged thumbnail tray keeps document size independent of canvas allocation. */
export declare class ReaderNavigation {
    private trigger;
    private goTo;
    private contents;
    private bookmarks;
    private toggleBookmark;
    private signal;
    readonly element: HTMLElement;
    private body;
    private tabs;
    private panel;
    private state?;
    private provider?;
    private batch;
    private generation;
    private surfaces;
    private queue;
    private readonly pageSize;
    private thumbnailSize;
    constructor(trigger: HTMLButtonElement, goTo: (page: number) => void, contents: () => Promise<ContentsEntry[]>, bookmarks: () => number[], toggleBookmark: (page: number) => void, signal: AbortSignal);
    private button;
    connect(provider: DocumentProvider, budget: number): void;
    update(state: FlipbookState): void;
    bookmarksChanged(): void;
    private toggle;
    private close;
    private clear;
    private message;
    private pageButton;
    private render;
    private contentsList;
    private renderPages;
}
