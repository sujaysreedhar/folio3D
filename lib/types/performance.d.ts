import type { FlipbookOptions } from './types';
interface DeviceHints {
    deviceMemory?: number;
    hardwareConcurrency?: number;
    connection?: {
        saveData?: boolean;
    };
}
/** Conservative defaults when browsers report limited device resources. */
export declare function renderPolicy(options: Pick<FlipbookOptions, 'memoryBudgetMB' | 'maxPixelRatio'>, hints: DeviceHints, deviceRatio: number): {
    memoryBudgetMB: number;
    pixelRatio: number;
    prefetch: boolean;
};
export {};
