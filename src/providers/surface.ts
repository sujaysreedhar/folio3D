import type { PageSize, PageSurface } from '../types';
export function createSurface(size: PageSize): PageSurface {
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const listeners = new Set<() => void>();
  let disposed = false;
  return {
    canvas,
    bytes: size.width * size.height * 8,
    onDispose(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const fn of listeners) fn();
      listeners.clear();
      canvas.width = 0;
      canvas.height = 0;
    },
  };
}
export function contain(
  source: PageSize,
  target: PageSize,
): { x: number; y: number; width: number; height: number } {
  const scale = Math.min(target.width / source.width, target.height / source.height);
  const width = source.width * scale,
    height = source.height * scale;
  return { x: (target.width - width) / 2, y: (target.height - height) / 2, width, height };
}
export function checkAbort(signal: AbortSignal): void {
  if (signal.aborted) throw new DOMException('Document load cancelled.', 'AbortError');
}
