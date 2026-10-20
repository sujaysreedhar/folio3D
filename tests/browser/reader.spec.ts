import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  await page.goto('/reader-probe.html');
  await page.waitForFunction(() => !!(window as any).reader);
});
async function mount(page: import('@playwright/test').Page, options: Record<string, unknown> = {}) {
  await page.evaluate(async (options) => {
    const r = (window as any).reader;
    const book = r.createFlipbook(document.querySelector('#one'), {
      source: r.images,
      renderer: 'flat',
      ...options,
    });
    Object.assign(window, { book });
    await book.ready;
  }, options);
}
test('reader exposes one-based navigation, validation and zoom', async ({ page }) => {
  await mount(page);
  expect(await page.evaluate(() => (window as any).book.getState().visiblePages)).toEqual([
    null,
    1,
  ]);
  await page.getByRole('button', { name: 'Next page', exact: true }).first().click();
  await expect.poll(() => page.evaluate(() => (window as any).book.getState().page)).toBe(2);
  await page.evaluate(() => (window as any).book.goToPage(6));
  await expect.poll(() => page.evaluate(() => (window as any).book.getState().page)).toBe(6);
  const result = await page.evaluate(() => {
    const b = (window as any).book;
    let invalid = '';
    try {
      b.goToPage(0);
    } catch (e) {
      invalid = (e as Error).name;
    }
    b.setZoom(3);
    return { invalid, zoom: b.getState().zoom };
  });
  expect(result).toEqual({ invalid: 'RangeError', zoom: 3 });
});
test('keyboard is scoped to the focused viewer and instances are independent', async ({ page }) => {
  await mount(page);
  await page.evaluate(async () => {
    const r = (window as any).reader;
    const second = r.createFlipbook(document.querySelector('#two'), {
      source: r.images,
      renderer: 'flat',
      duration: 0,
    });
    Object.assign(window, { second });
    await second.ready;
  });
  await page.locator('#two .folio3d').focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => page.evaluate(() => (window as any).second.getState().page)).toBe(2);
  expect(await page.evaluate(() => (window as any).book.getState().page)).toBe(1);
});
test('resizing changes layout and preserves the selected page', async ({ page }) => {
  await mount(page);
  await page.evaluate(() => (window as any).book.goToPage(3));
  await expect.poll(() => page.evaluate(() => (window as any).book.getState().page)).toBe(3);
  await page.locator('#one').evaluate((el) => ((el as HTMLElement).style.width = '400px'));
  await expect
    .poll(() => page.evaluate(() => (window as any).book.getState().visiblePages))
    .toEqual([3]);
});
test('lightbox closes with Escape and returns focus', async ({ page }) => {
  await page.locator('#opener').focus();
  await page.evaluate(async () => {
    const r = (window as any).reader;
    const modal = r.openFlipbook({ source: r.images, renderer: 'flat' });
    Object.assign(window, { modal });
    await modal.ready;
  });
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('#opener')).toBeFocused();
});
test('reduced motion uses flat renderer and destroy is idempotent', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(page, { renderer: 'auto' });
  expect(await page.evaluate(() => (window as any).book.getState().renderer)).toBe('flat');
  await page.evaluate(() => {
    (window as any).book.destroy();
    (window as any).book.destroy();
  });
  await expect(page.locator('.folio3d')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).book.getState().status)).toBe('destroyed');
});
test('latest queued navigation wins during a 3D turn', async ({ page }) => {
  await mount(page, { renderer: 'webgl', duration: 200 });
  await page.evaluate(() => {
    const b = (window as any).book;
    b.next();
    b.goToPage(4);
    b.goToPage(6);
  });
  await expect.poll(() => page.evaluate(() => (window as any).book.getState().page)).toBe(6);
  await expect
    .poll(() => page.evaluate(() => (window as any).book.getState().status))
    .toBe('ready');
});

test('zoom requested during a turn applies after navigation settles', async ({ page }) => {
  await mount(page, { renderer: 'webgl', duration: 600 });
  await page.evaluate(() => {
    const b = (window as any).book;
    b.next();
    b.setZoom(2);
  });
  await expect.poll(() => page.evaluate(() => (window as any).book.getState().page)).toBe(2);
  await expect.poll(() => page.evaluate(() => (window as any).book.getState().zoom)).toBe(2);
});

test('zoom raster debounce does not interrupt an active pan', async ({ page }) => {
  await page
    .locator('#one')
    .evaluate((el) => ((el as HTMLElement).style.width = 'min(900px,95vw)'));
  await mount(page);
  await page.evaluate(() => (window as any).book.setZoom(2));
  const stage = page.locator('#one .folio3d-stage'),
    box = (await stage.boundingBox())!;
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 20, y);
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 250)));
  await page.mouse.move(x + 100, y);
  const translation = await page
    .locator('#one .folio3d-spread')
    .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).e);
  expect(translation).toBeGreaterThan(70);
  await page.mouse.up();
});
test('partial drag reverses, complete drag advances, pointer cancellation settles', async ({
  page,
}) => {
  await page
    .locator('#one')
    .evaluate((el) => ((el as HTMLElement).style.width = 'min(900px,95vw)'));
  await mount(page, { renderer: 'webgl', duration: 120 });
  const stage = page.locator('#one .folio3d-stage'),
    box = (await stage.boundingBox())!;
  await stage.evaluate((el) =>
    el.addEventListener(
      'pointerdown',
      (event) =>
        ((el as HTMLElement).dataset.pointerId = String((event as PointerEvent).pointerId)),
    ),
  );
  await page.mouse.move(box.x + box.width - 30, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 100, box.y + box.height / 2, { steps: 4 });
  await page.evaluate(async () => {
    (window as any).book.setZoom(2);
    // Hold longer than the 180ms raster debounce to expose turn cancellation.
    await new Promise((resolve) => setTimeout(resolve, 250));
  });
  expect(await page.evaluate(() => (window as any).book.getState().status)).toBe('turning');
  await page.mouse.up();
  await expect
    .poll(() => page.evaluate(() => (window as any).book.getState().status))
    .toBe('ready');
  expect(await page.evaluate(() => (window as any).book.getState().page)).toBe(1);
  expect(await page.evaluate(() => (window as any).book.getState().zoom)).toBe(2);
  await page.evaluate(() => (window as any).book.resetZoom());
  await page.mouse.move(box.x + box.width - 30, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.45, box.y + box.height / 2, { steps: 10 });
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => (window as any).book.getState().page)).toBe(2);
  await page.mouse.move(box.x + box.width - 30, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2, { steps: 5 });
  await stage.evaluate((el) =>
    el.dispatchEvent(
      new PointerEvent('pointercancel', {
        pointerId: Number((el as HTMLElement).dataset.pointerId),
        pointerType: 'mouse',
      }),
    ),
  );
  await page.mouse.up();
  await expect
    .poll(() => page.evaluate(() => (window as any).book.getState().status))
    .toBe('ready');
  expect(await page.evaluate(() => (window as any).book.getState().page)).toBe(2);
});
test('context loss switches to a usable flat renderer', async ({ page }) => {
  await mount(page, { renderer: 'webgl', duration: 0 });
  await page.locator('#one canvas').first().dispatchEvent('webglcontextlost');
  await expect
    .poll(() => page.evaluate(() => (window as any).book.getState().renderer))
    .toBe('flat');
  await page.evaluate(() => (window as any).book.next());
  await expect.poll(() => page.evaluate(() => (window as any).book.getState().page)).toBe(2);
});

test('context loss while the first page loads still resolves a ready flat reader', async ({
  page,
}) => {
  let requests = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route('**/samples/page-1.svg', async (route) => {
    if (++requests === 2) await gate;
    await route.continue();
  });
  await page.evaluate(() => {
    const r = (window as any).reader;
    Object.assign(window, {
      book: r.createFlipbook(document.querySelector('#one'), {
        source: r.images,
        renderer: 'webgl',
      }),
    });
  });
  await expect.poll(() => requests).toBe(2);
  await page.locator('#one canvas').first().dispatchEvent('webglcontextlost');
  release();
  await page.evaluate(() => (window as any).book.ready);
  expect(await page.evaluate(() => (window as any).book.getState().status)).toBe('ready');
  await expect(page.locator('#one .folio3d-flat canvas')).toHaveCount(1);
});

test('fallback preserves the current zoom transform', async ({ page }) => {
  await mount(page, { renderer: 'webgl' });
  await page.evaluate(() => (window as any).book.setZoom(2));
  await page.locator('#one canvas').first().dispatchEvent('webglcontextlost');
  await expect(page.locator('#one .folio3d-spread')).toHaveCSS('transform', /matrix\(2, 0, 0, 2,/);
});

test('resizing while initial pages load applies the final responsive layout', async ({ page }) => {
  let release!: () => void;
  let requests = 0;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route('**/samples/page-1.svg', async (route) => {
    if (++requests === 2) await gate;
    await route.continue();
  });
  await page.evaluate(() => {
    const r = (window as any).reader;
    Object.assign(window, {
      book: r.createFlipbook(document.querySelector('#one'), {
        source: r.images,
        renderer: 'flat',
      }),
    });
  });
  await expect.poll(() => requests).toBe(2);
  await page.locator('#one').evaluate((el) => ((el as HTMLElement).style.width = '400px'));
  await expect
    .poll(() => page.evaluate(() => (window as any).book.getState().pageMode))
    .toBe('single');
  release();
  await page.evaluate(() => (window as any).book.ready);
  expect(await page.evaluate(() => (window as any).book.getState().visiblePages)).toEqual([1]);
});
test('resize during a turn preserves the selected logical page', async ({ page }) => {
  await page
    .locator('#one')
    .evaluate((el) => ((el as HTMLElement).style.width = 'min(900px,95vw)'));
  await mount(page, { renderer: 'webgl', duration: 1000 });
  // Hold a drag so the turn cannot finish before the resize reaches the browser.
  const stage = page.locator('#one .folio3d-stage');
  const box = (await stage.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height / 2, { steps: 4 });
  await expect
    .poll(() => page.evaluate(() => (window as any).book.getState().status))
    .toBe('turning');
  await page.locator('#one').evaluate((el) => ((el as HTMLElement).style.width = '300px'));
  await expect
    .poll(() => page.evaluate(() => (window as any).book.getState().status))
    .toBe('ready');
  expect(await page.evaluate(() => (window as any).book.getState().page)).toBe(1);
  await page.mouse.up();
});
test('destroy during loading rejects ready and releases late work', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const r = (window as any).reader;
    const b = r.createFlipbook(document.querySelector('#one'), {
      source: r.images,
      renderer: 'flat',
    });
    b.destroy();
    try {
      await b.ready;
      return 'unexpected-ready';
    } catch (e) {
      return { error: (e as Error).name, status: b.getState().status };
    }
  });
  expect(result).toEqual({ error: 'AbortError', status: 'destroyed' });
  await expect(page.locator('.folio3d')).toHaveCount(0);
});
test('50 mount/destroy cycles leave no viewers, loads, observers or animations running', async ({
  page,
}) => {
  await page.evaluate(() => {
    const observers = new Set<ResizeObserver>(),
      frames = new Set<number>(),
      urls = new Set<string>();
    let fetches = 0;
    const nativeRAF = requestAnimationFrame,
      nativeCancel = cancelAnimationFrame,
      nativeFetch = fetch,
      nativeObserver = ResizeObserver;
    const nativeCreate = URL.createObjectURL.bind(URL),
      nativeRevoke = URL.revokeObjectURL.bind(URL);
    window.requestAnimationFrame = (fn) => {
      const id = nativeRAF((t) => {
        frames.delete(id);
        fn(t);
      });
      frames.add(id);
      return id;
    };
    window.cancelAnimationFrame = (id) => {
      frames.delete(id);
      nativeCancel(id);
    };
    window.fetch = async (...args) => {
      fetches++;
      try {
        return await nativeFetch(...args);
      } finally {
        fetches--;
      }
    };
    window.ResizeObserver = class extends nativeObserver {
      observe(target: Element, options?: ResizeObserverOptions) {
        observers.add(this);
        super.observe(target, options);
      }
      disconnect() {
        observers.delete(this);
        super.disconnect();
      }
    };
    URL.createObjectURL = (blob) => {
      const url = nativeCreate(blob);
      urls.add(url);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      urls.delete(url);
      nativeRevoke(url);
    };
    Object.assign(window, {
      resourceCounts: () => ({
        observers: observers.size,
        frames: frames.size,
        urls: urls.size,
        fetches,
      }),
    });
  });
  const result = await page.evaluate(async () => {
    const r = (window as any).reader;
    let events = 0;
    for (let i = 0; i < 50; i++) {
      const b = r.createFlipbook(document.querySelector('#one'), {
        source: r.images,
        renderer: 'flat',
        duration: 0,
      });
      b.on('pagechange', () => events++);
      await b.ready;
      b.destroy();
      b.next();
    }
    return { roots: document.querySelectorAll('.folio3d').length, events };
  });
  expect(result).toEqual({ roots: 0, events: 0 });
  await expect
    .poll(() => page.evaluate(() => (window as any).resourceCounts()))
    .toEqual({ observers: 0, frames: 0, urls: 0, fetches: 0 });
});
test('missing WebGL and unavailable fullscreen keep a usable flat reader', async ({ page }) => {
  await page.evaluate(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: any[]): any {
      if (type === 'webgl' || type === 'webgl2') return null;
      return original.call(this, type as any, ...args);
    };
    Object.defineProperty(document, 'fullscreenEnabled', { get: () => false });
  });
  await mount(page, { renderer: 'auto' });
  expect(await page.evaluate(() => (window as any).book.getState().renderer)).toBe('flat');
  await expect(page.getByRole('button', { name: 'Toggle fullscreen' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Next page', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).book.getState().page)).toBe(2);
});
test('touch viewport supports page turns and zoomed panning', async ({ page }, info) => {
  test.skip(!info.project.use.hasTouch, 'Touch contexts only');
  await page.locator('#one').evaluate((el) => ((el as HTMLElement).style.width = '360px'));
  await mount(page, { renderer: 'webgl', duration: 0 });
  const stage = page.locator('#one .folio3d-stage'),
    box = (await stage.boundingBox())!;
  await page.touchscreen.tap(box.x + box.width - 25, box.y + box.height / 2);
  await expect.poll(() => page.evaluate(() => (window as any).book.getState().page)).toBe(2);
  expect(await page.evaluate(() => (window as any).book.getState().visiblePages)).toEqual([2]);
  if (info.project.name === 'chromium-mobile') {
    const touch = await page.context().newCDPSession(page);
    const y = box.y + box.height / 2;
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: box.x + box.width - 25, y }],
    });
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: box.x + box.width * 0.35, y }],
    });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(() => page.evaluate(() => (window as any).book.getState().page)).toBe(3);
    await page.evaluate(() => (window as any).book.goToPage(2));
    await expect.poll(() => page.evaluate(() => (window as any).book.getState().page)).toBe(2);
    await touch.detach();
  }
  await page.evaluate(() => (window as any).book.setZoom(2));
  await expect(stage).toHaveAttribute('data-zoomed', 'true');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 + 20);
  await page.mouse.up();
  expect(await page.evaluate(() => (window as any).book.getState().page)).toBe(2);
});
test('destroy releases the owned WebGL context immediately', async ({ page }) => {
  await mount(page, { renderer: 'webgl' });
  const lost = await page.evaluate(() => {
    const canvas = document.querySelector('#one .folio3d-canvas') as HTMLCanvasElement;
    const gl = canvas.getContext('webgl2')!;
    (window as any).book.destroy();
    return gl.isContextLost();
  });
  expect(lost).toBe(true);
});

test('WebGL animation stops at rest and destroy releases PDF workers', async ({ page }) => {
  await page.evaluate(() => {
    const frames = new Set<number>(),
      workers = new Set<Worker>();
    const raf = requestAnimationFrame,
      cancel = cancelAnimationFrame,
      NativeWorker = Worker;
    window.requestAnimationFrame = (fn) => {
      const id = raf((time) => {
        frames.delete(id);
        fn(time);
      });
      frames.add(id);
      return id;
    };
    window.cancelAnimationFrame = (id) => {
      frames.delete(id);
      cancel(id);
    };
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        workers.add(this);
      }
      terminate() {
        workers.delete(this);
        super.terminate();
      }
    };
    Object.assign(window, {
      activeResources: () => ({ frames: frames.size, workers: workers.size }),
    });
  });
  await mount(page, { renderer: 'webgl', duration: 400 });
  await expect.poll(() => page.evaluate(() => (window as any).activeResources().frames)).toBe(0);
  await page.evaluate(() => (window as any).book.next());
  await expect
    .poll(() => page.evaluate(() => (window as any).activeResources().frames))
    .toBeGreaterThan(0);
  await page.evaluate(() => (window as any).book.destroy());
  await expect.poll(() => page.evaluate(() => (window as any).activeResources().frames)).toBe(0);
  await page.evaluate(async () => {
    const b = (window as any).reader.createFlipbook(document.querySelector('#one'), {
      source: { type: 'pdf', data: '/samples/magazine.pdf' },
      assetBaseUrl: '/lib/assets/',
      renderer: 'flat',
    });
    Object.assign(window, { book: b });
    await b.ready;
  });
  expect(await page.evaluate(() => (window as any).activeResources().workers)).toBe(1);
  await page.evaluate(() => (window as any).book.destroy());
  await expect
    .poll(() => page.evaluate(() => (window as any).activeResources()))
    .toEqual({ frames: 0, workers: 0 });
});
