import { expect, it } from 'vitest';
import { renderPolicy } from '../../src/performance';

it('reduces pixel allocation and memory defaults on constrained devices', () => {
  for (const hints of [{ deviceMemory: 2 }, { hardwareConcurrency: 4 }]) {
    const policy = renderPolicy({}, hints, 3);
    expect(policy).toEqual({ memoryBudgetMB: 32, pixelRatio: 1.5, prefetch: true });
    expect(policy.pixelRatio ** 2 / 2 ** 2).toBe(0.5625);
  }
});
it('keeps existing defaults when resource hints are unavailable', () => {
  expect(renderPolicy({}, {}, 3)).toEqual({ memoryBudgetMB: 96, pixelRatio: 2, prefetch: true });
  expect(renderPolicy({}, { deviceMemory: 0, hardwareConcurrency: 0 }, 1).pixelRatio).toBe(1);
});
it('honors explicit quality and memory settings and data saving', () => {
  expect(
    renderPolicy(
      { memoryBudgetMB: 48, maxPixelRatio: 2 },
      {
        deviceMemory: 2,
        connection: { saveData: true },
      },
      3,
    ),
  ).toEqual({ memoryBudgetMB: 48, pixelRatio: 2, prefetch: false });
});
