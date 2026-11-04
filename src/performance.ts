import type { FlipbookOptions } from './types';

interface DeviceHints {
  deviceMemory?: number;
  hardwareConcurrency?: number;
  connection?: { saveData?: boolean };
}

/** Conservative defaults when browsers report limited device resources. */
export function renderPolicy(
  options: Pick<FlipbookOptions, 'memoryBudgetMB' | 'maxPixelRatio'>,
  hints: DeviceHints,
  deviceRatio: number,
) {
  const constrained =
    (typeof hints.deviceMemory === 'number' && hints.deviceMemory > 0 && hints.deviceMemory <= 4) ||
    (typeof hints.hardwareConcurrency === 'number' &&
      hints.hardwareConcurrency > 0 &&
      hints.hardwareConcurrency <= 4);
  return {
    memoryBudgetMB: options.memoryBudgetMB ?? (constrained ? 32 : 96),
    pixelRatio: Math.min(deviceRatio || 1, options.maxPixelRatio ?? (constrained ? 1.5 : 2)),
    prefetch: !hints.connection?.saveData,
  };
}
