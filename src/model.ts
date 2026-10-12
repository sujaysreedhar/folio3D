import type { PageMode, ResolvedPageMode } from './types';
export function visiblePages(page: number, count: number, mode: ResolvedPageMode): (number | null)[] {
  validatePage(page, count);
  if (mode === 'single') return [page];
  const left = page - page % 2;
  return [left || null, left + 1 <= count ? left + 1 : null];
}
export function adjacentPage(page: number, count: number, mode: ResolvedPageMode, direction: 1 | -1): number {
  if (mode === 'single') return Math.max(1, Math.min(count, page + direction));
  const left = page - page % 2;
  const target = direction === 1 ? left + 2 : Math.max(1, left - 2);
  return target > count ? page : target;
}
export function resolveMode(mode: PageMode, width: number): ResolvedPageMode {
  return mode === 'auto' ? width < 720 ? 'single' : 'double' : mode;
}
export function validatePage(page: number, count: number): void {
  if (!Number.isInteger(page) || page < 1 || page > count) throw new RangeError(`Page must be an integer between 1 and ${count}.`);
}
