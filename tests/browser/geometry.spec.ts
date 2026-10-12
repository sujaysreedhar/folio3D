import { test, expect } from '@playwright/test';
test('inspect curved forward, reverse and single-page turns', async ({ page }, info) => {
  const directory = `artifacts/geometry/${info.project.name}`;
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/probe.html');
  await page.waitForFunction(() => typeof (window as any).probe?.progress === 'function');
  for (const t of [0, 0.25, 0.5, 0.75, 1]) {
    await page.evaluate((t) => (window as any).probe.progress(t), t);
    await page.locator('#probe').screenshot({ path: `${directory}/forward-${t}.png` });
  }
  for (const direction of [-1, 1])
    for (const single of [false, true]) {
      await page.evaluate(
        ({ direction, single }) => (window as any).probe.progress(0.5, direction, single),
        { direction, single },
      );
      await page
        .locator('#probe')
        .screenshot({ path: `${directory}/turn-${direction}-${single}.png` });
      if (single) {
        await page.evaluate(({ direction }) => (window as any).probe.progress(1, direction, true), {
          direction,
        });
        await page
          .locator('#probe')
          .screenshot({ path: `${directory}/single-end-${direction}.png` });
      }
    }
  expect(errors).toEqual([]);
});
