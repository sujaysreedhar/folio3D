import type { PageSize, PageSurface } from '../types';
export declare function createSurface(size: PageSize): PageSurface;
export declare function contain(source: PageSize, target: PageSize): {
    x: number;
    y: number;
    width: number;
    height: number;
};
export declare function checkAbort(signal: AbortSignal): void;
