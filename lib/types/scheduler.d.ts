import type { DocumentProvider, PageSurface, PageSize } from './types';
export declare class RenderScheduler {
    private provider;
    private budget;
    private cache;
    private pending;
    private pins;
    private displayed;
    private generation;
    private active;
    private bytes;
    private reserved;
    private rendered;
    private waiting;
    private disposed;
    constructor(provider: DocumentProvider, budget: number);
    retainView(surfaces: Iterable<PageSurface>): void;
    private key;
    prepare(pages: number[], size: PageSize): Promise<Map<number, PageSurface>>;
    prefetch(pages: number[], size: PageSize): void;
    private wake;
    private slot;
    private evict;
    private load;
    stats(): {
        bytes: number;
        reservedBytes: number;
        cachedPages: number;
        active: number;
        renderedPages: number;
    };
    dispose(): void;
}
