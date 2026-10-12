import { describe, expect, it } from 'vitest';
import { visiblePages, adjacentPage, resolveMode, validatePage } from '../../src/model';

describe('one-based book model', () => {
  for (let count = 1; count <= 5; count++) {
    it(`maps all ${count} pages without inventing document pages`, () => {
      for (let page = 1; page <= count; page++) {
        const spread = visiblePages(page, count, 'double');
        expect(spread).toContain(page);
        expect(
          spread.filter((p): p is number => p !== null).every((p) => p >= 1 && p <= count),
        ).toBe(true);
        expect(visiblePages(page, count, 'single')).toEqual([page]);
      }
    });
  }
  it('starts on a right-hand cover and ends with a synthetic blank when needed', () => {
    expect(visiblePages(1, 4, 'double')).toEqual([null, 1]);
    expect(visiblePages(3, 4, 'double')).toEqual([2, 3]);
    expect(visiblePages(4, 4, 'double')).toEqual([4, null]);
  });
  it('moves by spread in double mode and by page in single mode', () => {
    expect(adjacentPage(1, 5, 'double', 1)).toBe(2);
    expect(adjacentPage(3, 5, 'double', 1)).toBe(4);
    expect(adjacentPage(4, 5, 'double', -1)).toBe(2);
    expect(adjacentPage(3, 5, 'single', -1)).toBe(2);
    expect(adjacentPage(1, 5, 'double', -1)).toBe(1);
    expect(adjacentPage(5, 5, 'double', 1)).toBe(5);
  });
  it('uses container width for auto layout without changing the selected page', () => {
    expect(resolveMode('auto', 719)).toBe('single');
    expect(resolveMode('auto', 720)).toBe('double');
    expect(resolveMode('single', 900)).toBe('single');
    expect(visiblePages(3, 5, resolveMode('auto', 400))).toEqual([3]);
  });
  it('rejects fractional, nonfinite and out-of-range pages', () => {
    for (const page of [0, -1, 6, 1.5, NaN, Infinity])
      expect(() => validatePage(page, 5)).toThrow(RangeError);
    expect(() => validatePage(5, 5)).not.toThrow();
  });
});
