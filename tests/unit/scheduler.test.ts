import { expect, it } from 'vitest';
import { RenderScheduler } from '../../src/scheduler';
import type { DocumentProvider, PageSurface } from '../../src/types';

function provider(delay = 0, ignoreAbort = false) {
  let active = 0,
    peak = 0,
    disposed = 0;
  const value: DocumentProvider = {
    pageCount: 200,
    async size() {
      return { width: 600, height: 800 };
    },
    async render(_page, size, signal) {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, delay));
      active--;
      if (signal.aborted && !ignoreAbort) throw new DOMException('Cancelled', 'AbortError');
      let done = false;
      const canvas = { width: size.width, height: size.height } as HTMLCanvasElement;
      return {
        canvas,
        bytes: size.width * size.height * 8,
        dispose() {
          if (!done) {
            disposed++;
            done = true;
            canvas.width = canvas.height = 0;
          }
        },
      } satisfies PageSurface;
    },
    dispose() {},
  };
  return { value, stats: () => ({ active, peak, disposed }) };
}
it('limits concurrency and allocated plus reserved bytes under navigation', async () => {
  const p = provider(2),
    s = new RenderScheduler(p.value, 1024 * 1024);
  for (const pages of [
    [1, 2, 3, 4],
    [50, 51, 52, 53],
    [198, 199, 200],
  ]) {
    const result = await s.prepare(pages, { width: 2048, height: 2048 });
    expect([...result.keys()]).toEqual(pages);
    expect(s.stats().bytes + s.stats().reservedBytes).toBeLessThanOrEqual(1024 * 1024);
    expect(s.stats().cachedPages).toBeLessThanOrEqual(6);
  }
  expect(p.stats().peak).toBeLessThanOrEqual(2);
  expect(p.stats().disposed).toBeGreaterThan(0);
  s.dispose();
  expect(s.stats().bytes).toBe(0);
});
it('retains the displayed surfaces when replacement preparation fails', async () => {
  const p = provider(),
    s = new RenderScheduler(p.value, Math.floor(1.83 * 1024 * 1024));
  const displayed = await s.prepare([4, 5], { width: 2048, height: 2048 });
  s.retainView(displayed.values());
  await s.prepare([10, 11, 12, 13], { width: 2048, height: 2048 });
  const render = p.value.render.bind(p.value);
  p.value.render = (page, size, signal) => {
    if (page === 5) return Promise.reject(new Error('Replacement image unavailable'));
    return render(page, size, signal);
  };
  await expect(s.prepare([4, 5], { width: 1600, height: 1600 })).rejects.toThrow('unavailable');
  for (const surface of displayed.values()) expect(surface.canvas.width).toBeGreaterThan(0);
  expect(s.stats().bytes + s.stats().reservedBytes).toBeLessThanOrEqual(
    Math.floor(1.83 * 1024 * 1024),
  );
  s.dispose();
  for (const surface of displayed.values()) expect(surface.canvas.width).toBe(0);
});
it('rejects obsolete generations and disposes work even if the provider finishes late', async () => {
  const p = provider(15, true),
    s = new RenderScheduler(p.value, 1024 * 1024);
  const old = s.prepare([1, 2, 3], { width: 600, height: 800 }).catch((e) => e.name);
  await new Promise((resolve) => setTimeout(resolve, 0));
  const fresh = s.prepare([80], { width: 600, height: 800 });
  expect(await old).toBe('AbortError');
  expect([...(await fresh)].map(([page]) => page)).toEqual([80]);
  expect(p.stats().disposed).toBeGreaterThan(0);
  s.dispose();
  expect(s.stats().bytes).toBe(0);
});

it('promotes matching in-flight prefetches without rendering the page twice', async () => {
  const p = provider(40),
    calls: number[] = [];
  const render = p.value.render.bind(p.value);
  p.value.render = (page, size, signal) => {
    calls.push(page);
    return render(page, size, signal);
  };
  const s = new RenderScheduler(p.value, 1024 * 1024);
  const size = { width: 100, height: 100 };
  await s.prepare([1], size);
  s.prefetch([2, 3], size);
  await new Promise((resolve) => setTimeout(resolve, 5));
  expect([...(await s.prepare([1, 2, 3], size)).keys()]).toEqual([1, 2, 3]);
  expect(calls.filter((page) => page === 2)).toHaveLength(1);
  expect(calls.filter((page) => page === 3)).toHaveLength(1);
  expect(p.stats().peak).toBeLessThanOrEqual(2);
  s.dispose();
});

it('runs visible pages before queued prefetches and releases reservations after disposal', async () => {
  const p = provider(20),
    calls: number[] = [];
  const render = p.value.render.bind(p.value);
  p.value.render = (page, size, signal) => {
    calls.push(page);
    return render(page, size, signal);
  };
  const s = new RenderScheduler(p.value, 1024 * 1024);
  const size = { width: 100, height: 100 };
  await s.prepare([1], size);
  s.prefetch([2, 3, 4, 5], size);
  await new Promise((resolve) => setTimeout(resolve, 1));
  await s.prepare([50], size);
  expect(calls.indexOf(50)).toBeGreaterThan(0);
  expect(calls).not.toContain(4);
  s.dispose();
  await new Promise((resolve) => setTimeout(resolve, 25));
  expect(s.stats()).toMatchObject({ bytes: 0, reservedBytes: 0, active: 0 });
});

it('keeps the six-surface cache bound when concurrent prefetches complete together', async () => {
  const p = provider(5),
    s = new RenderScheduler(p.value, 1024 * 1024);
  const displayed = await s.prepare([1, 2, 3], { width: 100, height: 100 });
  s.retainView(displayed.values());
  s.prefetch([4, 5, 6, 7], { width: 100, height: 100 });
  await new Promise((resolve) => setTimeout(resolve, 30));
  expect(s.stats().cachedPages).toBeLessThanOrEqual(6);
  for (const surface of displayed.values()) expect(surface.canvas.width).toBeGreaterThan(0);
  s.dispose();
});
