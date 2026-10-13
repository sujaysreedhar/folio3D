import type { ContentsEntry, DocumentProvider, PageSize, PageSurface } from '../types';
export declare class PDFProvider implements DocumentProvider {
    private document;
    private task;
    readonly pageCount: number;
    private disposed;
    private constructor();
    static open(data: string | Blob | Uint8Array, assetBase: string, signal: AbortSignal): Promise<PDFProvider>;
    size(page: number, signal: AbortSignal): Promise<PageSize>;
    contents(signal: AbortSignal): Promise<ContentsEntry[]>;
    render(page: number, size: PageSize, signal: AbortSignal): Promise<PageSurface>;
    dispose(): void;
}
