import type { DocumentProvider, PageSize, PageSurface, Source } from '../types';
export declare class ImageProvider implements DocumentProvider {
    private pages;
    readonly pageCount: number;
    constructor(pages: Extract<Source, {
        type: 'images';
    }>['pages']);
    size(page: number, signal: AbortSignal): Promise<PageSize>;
    render(page: number, size: PageSize, signal: AbortSignal): Promise<PageSurface>;
    dispose(): void;
}
