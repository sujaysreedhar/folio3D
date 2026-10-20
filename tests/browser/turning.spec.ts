import { test, expect, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/reader-probe.html');
  await page.waitForFunction(() => !!(window as any).reader);
  await page.locator('#one').evaluate((el) => {
    (el as HTMLElement).style.width = '95vw';
  });
});

async function mount(page: Page, options: Record<string, unknown> = {}) {
  await page.evaluate(async (options) => {
    const r = (window as any).reader;
    const book = r.createFlipbook(document.querySelector('#one'), {
      source: r.images,
      renderer: 'webgl',
      duration: 150,
      ...options,
    });
    Object.assign(window, { book });
    await book.ready;
  }, options);
}

async function selected(page: Page, expected: number) {
  await expect.poll(() => page.evaluate(() => (window as any).book.getState().page)).toBe(expected);
  await expect(page.locator('.folio3d')).toHaveAttribute('data-status', 'ready');
}

async function drag(page: Page, start: number, end: number) {
  const stage = page.locator('.folio3d-stage');
  const box = (await stage.boundingBox())!;
  const y = box.y + box.height / 2;
  await stage.evaluate((element) =>
    element.addEventListener(
      'pointerdown',
      (event) => {
        (element as HTMLElement).dataset.pointerId = String((event as PointerEvent).pointerId);
      },
      { once: true },
    ),
  );
  await page.mouse.move(box.x + box.width * start, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * end, y, { steps: 12 });
  return stage;
}

test('grab the middle of either page to turn a curved sheet forwards and backwards', async ({
  page,
}, info) => {
  await mount(page, { pageMode: 'double', initialPage: 2 });
  const stage = await drag(page, 0.7, 0.3);
  await expect(stage).toHaveAttribute('data-dragging', 'true');
  await expect(page.locator('.folio3d')).toHaveAttribute('data-status', 'turning');
  await stage.screenshot({ path: `artifacts/drag/${info.project.name}/curved-page.png` });
  await page.mouse.up();
  await selected(page, 4);
  await expect(stage).toHaveAttribute('data-dragging', 'false');
  await drag(page, 0.3, 0.7);
  await page.mouse.up();
  await selected(page, 2);
});

test('single-page swipes follow movement from either side; a central tap stays put', async ({
  page,
}) => {
  await mount(page, { pageMode: 'single' });
  const stage = page.locator('.folio3d-stage');
  await stage.click({ position: { x: (await stage.boundingBox())!.width / 2, y: 150 } });
  await selected(page, 1);
  await drag(page, 0.45, 0.1);
  await page.mouse.up();
  await selected(page, 2);
  await drag(page, 0.55, 0.9);
  await page.mouse.up();
  await selected(page, 1);
});

test('a short drag and pointer cancellation restore the page and grab state', async ({ page }) => {
  await mount(page, { pageMode: 'single', initialPage: 2 });
  const stage = await drag(page, 0.6, 0.52);
  await page.mouse.up();
  await selected(page, 2);
  await drag(page, 0.6, 0.2);
  await stage.dispatchEvent('pointercancel', {
    pointerId: Number(await stage.getAttribute('data-pointer-id')),
  });
  await page.mouse.up();
  await selected(page, 2);
  await expect(stage).toHaveAttribute('data-dragging', 'false');
});

test('keyboard navigation waits for a held pointer instead of starting a competing turn', async ({
  page,
}) => {
  await mount(page, { pageMode: 'single' });
  const box = (await page.locator('.folio3d-stage').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.locator('.folio3d').evaluate((root) => {
    root.addEventListener('keydown', () => {
      Object.assign(window, { statusWhileHeld: (window as any).book.getState().status });
    });
  });
  await page.keyboard.press('ArrowRight');
  expect(await page.evaluate(() => (window as any).statusWhileHeld)).toBe('ready');
  await page.mouse.up();
  await selected(page, 2);
});

async function trackAudio(page: Page) {
  // An exposed AudioContext API does not imply an available output device.
  // Probe from a real click so autoplay restrictions cannot cause a false skip.
  await page.evaluate(() => {
    const button = document.createElement('button');
    button.id = 'audio-capability';
    button.textContent = 'Check audio output';
    button.onclick = () => {
      Object.assign(window, {
        audioAvailable: (async () => {
          let context: AudioContext | undefined;
          try {
            context = new AudioContext();
            const resumed = context.resume().then(
              () => true,
              () => false,
            );
            const running = await Promise.race([
              resumed,
              new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 1500)),
            ]);
            return running && context.state === 'running';
          } catch {
            return false;
          } finally {
            await context?.close().catch(() => {});
          }
        })(),
      });
    };
    document.body.append(button);
  });
  await page.locator('#audio-capability').click();
  const available = await page.evaluate(async () => {
    const available = await (window as any).audioAvailable;
    document.querySelector('#audio-capability')!.remove();
    return available;
  });
  if (!available) return false;
  return page.evaluate(() => {
    if (typeof window.AudioContext !== 'function') return false;
    const stats = { created: 0, played: 0, closed: 0 };
    const NativeContext = window.AudioContext;
    window.AudioContext = class extends NativeContext {
      constructor(options?: AudioContextOptions) {
        super(options);
        stats.created++;
      }
      createBufferSource() {
        const source = super.createBufferSource();
        const start = source.start.bind(source);
        source.start = (...args: Parameters<typeof start>) => {
          stats.played++;
          start(...args);
        };
        return source;
      }
      close() {
        stats.closed++;
        return super.close();
      }
    };
    Object.assign(window, { audioStats: stats });
    return true;
  });
}

test('sound is opt-in, plays on a completed turn, mutes and closes on destroy', async ({
  page,
}) => {
  test.skip(
    !(await trackAudio(page)),
    'Audio playback is unavailable in this environment; fallback is tested separately.',
  );
  await mount(page, { pageMode: 'single' });
  expect(await page.evaluate(() => (window as any).audioStats.created)).toBe(0);
  const more = page.getByRole('button', { name: 'More controls' });
  if (await more.isVisible()) await more.click();
  await page.getByRole('button', { name: 'Enable page-turn sound', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Mute page-turn sound' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Next page', exact: true }).click();
  await selected(page, 2);
  await expect.poll(() => page.evaluate(() => (window as any).audioStats.played)).toBe(1);
  await drag(page, 0.6, 0.55);
  await page.mouse.up();
  await selected(page, 2);
  expect(await page.evaluate(() => (window as any).audioStats.played)).toBe(1);
  if (await more.isVisible()) await more.click();
  await page.getByRole('button', { name: 'Mute page-turn sound', exact: true }).click();
  await page.getByRole('button', { name: 'Next page', exact: true }).click();
  await selected(page, 3);
  expect(await page.evaluate(() => (window as any).audioStats.played)).toBe(1);
  await page.evaluate(() => {
    (window as any).book.destroy();
    (window as any).book.destroy();
  });
  expect(await page.evaluate(() => (window as any).audioStats)).toEqual({
    created: 1,
    played: 1,
    closed: 1,
  });
});

test('enabled sound waits for interaction', async ({ page }) => {
  test.skip(
    !(await trackAudio(page)),
    'Audio playback is unavailable in this environment; fallback is tested separately.',
  );
  await mount(page, { sound: true, renderer: 'flat', pageMode: 'single' });
  expect(await page.evaluate(() => (window as any).audioStats.created)).toBe(0);
  await page.getByRole('spinbutton', { name: 'Page number' }).fill('2');
  await page.getByRole('spinbutton', { name: 'Page number' }).press('Enter');
  await selected(page, 2);
  await expect.poll(() => page.evaluate(() => (window as any).audioStats.played)).toBe(1);
});

test('unavailable audio does not break navigation or the sound preference', async ({ page }) => {
  await page.evaluate(() => {
    window.AudioContext = class {
      constructor() {
        throw new Error('Audio unavailable');
      }
    } as unknown as typeof AudioContext;
  });
  await mount(page, { sound: true, renderer: 'flat', pageMode: 'single' });
  await page.getByRole('button', { name: 'Next page', exact: true }).click();
  await selected(page, 2);
  const result = await page.evaluate(() => {
    const book = (window as any).book;
    const changes: boolean[] = [];
    const off = book.on('soundchange', (state: { sound: boolean }) => changes.push(state.sound));
    book.setSound(false);
    book.setSound(false);
    off();
    book.setSound(true);
    return { changes, sound: book.getState().sound };
  });
  expect(result).toEqual({ changes: [false], sound: true });
});
