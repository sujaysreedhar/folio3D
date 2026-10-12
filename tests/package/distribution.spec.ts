import {test,expect} from '@playwright/test';
for(const path of ['/nested/','/npm/'])test(`${path} consumer loads PDF and navigates`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(path);
  await expect(page.locator('.folio3d')).toHaveAttribute('data-status','ready');
  await expect(page.getByRole('spinbutton',{name:'Page number'})).toHaveValue('1');
  await page.getByRole('button',{name:'Next page',exact:true}).click();
  await expect(page.getByRole('spinbutton',{name:'Page number'})).toHaveValue('2');expect(errors).toEqual([]);
});
test('missing worker assets produce a visible useful failure',async({page,context})=>{
  await context.route('**/pdf.worker.min.mjs',route=>route.abort());await page.goto('/nested/');
  await expect(page.locator('.folio3d')).toHaveAttribute('data-status','error');await expect(page.getByRole('alert')).toContainText(/worker|assetBaseUrl/i);
});
test('static showcase supports image-only loading, sample/local PDF and lightbox',async({page})=>{
  const pdfRequests:string[]=[];page.on('request',req=>{if(/pdf[-.]|\.pdf$/.test(req.url()))pdfRequests.push(req.url());});
  await page.goto('/showcase/');await expect(page.locator('.folio3d')).toHaveAttribute('data-status','ready');
  expect(pdfRequests).toEqual([]);await page.screenshot({path:'artifacts/demo-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'Sample PDF',exact:true}).click();await expect(page.locator('#publication-status')).toHaveText('Sample PDF · 6 pages');
  await page.getByRole('button',{name:'Open lightbox'}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator('#file').setInputFiles('tests/fixtures/mixed.pdf');await expect(page.locator('#publication-status')).toHaveText('mixed.pdf · 4 pages');
});
test('mobile showcase fits the viewport',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/showcase/');await expect(page.locator('.folio3d')).toHaveAttribute('data-status','ready');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'artifacts/demo-mobile.png',fullPage:true});
});
