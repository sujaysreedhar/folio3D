import type { PageMode, ResolvedPageMode } from './types';
export declare function visiblePages(page: number, count: number, mode: ResolvedPageMode): (number | null)[];
export declare function adjacentPage(page: number, count: number, mode: ResolvedPageMode, direction: 1 | -1): number;
export declare function resolveMode(mode: PageMode, width: number): ResolvedPageMode;
export declare function validatePage(page: number, count: number): void;
