import type { PageSize, PageSurface } from '../types';
export declare function createSurface(size: PageSize): PageSurface;
export declare function contain(source: PageSize, target: PageSize): {
    x: number;
    y: number;
    width: number;
    height: number;
};
export declare function checkAbort(signal: AbortSignal): void;
/** Stop waiting for work that cannot itself be cancelled, such as Blob.arrayBuffer(). */
export declare function abortable<T>(operation: Promise<T>, signal: AbortSignal): Promise<T>;
