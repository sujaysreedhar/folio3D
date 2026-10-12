import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.goto('/reader-probe.html');await page.waitForFunction(()=>!!(window as any).reader);});
async function mount(page:import('@playwright/test').Page,options:Record<string,unknown>={}){
  await page.evaluate(async options=>{const r=(window as any).reader;const book=r.createFlipbook(document.querySelector('#one'),{source:r.images,renderer:'flat',...options});Object.assign(window,{book});await book.ready;},options);
}
test('reader exposes one-based navigation, validation and zoom',async({page})=>{
  await mount(page);
  expect(await page.evaluate(()=>(window as any).book.getState().visiblePages)).toEqual([null,1]);
  await page.getByRole('button',{name:'Next page',exact:true}).first().click();
  await expect.poll(()=>page.evaluate(()=>(window as any).book.getState().page)).toBe(2);
  await page.evaluate(()=>(window as any).book.goToPage(6));
  await expect.poll(()=>page.evaluate(()=>(window as any).book.getState().page)).toBe(6);
  const result=await page.evaluate(()=>{const b=(window as any).book;let invalid='';try{b.goToPage(0);}catch(e){invalid=(e as Error).name;}b.setZoom(3);return {invalid,zoom:b.getState().zoom};});
  expect(result).toEqual({invalid:'RangeError',zoom:3});
});
test('keyboard is scoped to the focused viewer and instances are independent',async({page})=>{
  await mount(page);
  await page.evaluate(async()=>{const r=(window as any).reader;const second=r.createFlipbook(document.querySelector('#two'),{source:r.images,renderer:'flat',duration:0});Object.assign(window,{second});await second.ready;});
  await page.locator('#two .folio3d').focus();await page.keyboard.press('ArrowRight');
  await expect.poll(()=>page.evaluate(()=>(window as any).second.getState().page)).toBe(2);
  expect(await page.evaluate(()=>(window as any).book.getState().page)).toBe(1);
});
test('resizing changes layout and preserves the selected page',async({page})=>{
  await mount(page);await page.evaluate(()=>(window as any).book.goToPage(3));
  await expect.poll(()=>page.evaluate(()=>(window as any).book.getState().page)).toBe(3);
  await page.locator('#one').evaluate(el=>(el as HTMLElement).style.width='400px');
  await expect.poll(()=>page.evaluate(()=>(window as any).book.getState().visiblePages)).toEqual([3]);
});
test('lightbox closes with Escape and returns focus',async({page})=>{
  await page.locator('#opener').focus();
  await page.evaluate(async()=>{const r=(window as any).reader;const modal=r.openFlipbook({source:r.images,renderer:'flat'});Object.assign(window,{modal});await modal.ready;});
  await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('#opener')).toBeFocused();
});
test('reduced motion uses flat renderer and destroy is idempotent',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await mount(page,{renderer:'auto'});
  expect(await page.evaluate(()=>(window as any).book.getState().renderer)).toBe('flat');
  await page.evaluate(()=>{(window as any).book.destroy();(window as any).book.destroy();});
  await expect(page.locator('.folio3d')).toHaveCount(0);
  expect(await page.evaluate(()=>(window as any).book.getState().status)).toBe('destroyed');
});
test('latest queued navigation wins during a 3D turn',async({page})=>{
  await mount(page,{renderer:'webgl',duration:200});
  await page.evaluate(()=>{const b=(window as any).book;b.next();b.goToPage(4);b.goToPage(6);});
  await expect.poll(()=>page.evaluate(()=>(window as any).book.getState().page)).toBe(6);
  await expect.poll(()=>page.evaluate(()=>(window as any).book.getState().status)).toBe('ready');
});
test('partial drag reverses, complete drag advances, pointer cancellation settles',async({page})=>{
  await mount(page,{renderer:'webgl',duration:120});
  const stage=page.locator('#one .folio3d-stage'),box=(await stage.boundingBox())!;
  await page.mouse.move(box.x+box.width-30,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width-100,box.y+box.height/2,{steps:4});await page.mouse.up();
  await expect.poll(()=>page.evaluate(()=>(window as any).book.getState().status)).toBe('ready');
  expect(await page.evaluate(()=>(window as any).book.getState().page)).toBe(1);
  await page.mouse.move(box.x+box.width-30,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width*.45,box.y+box.height/2,{steps:10});await page.mouse.up();
  await expect.poll(()=>page.evaluate(()=>(window as any).book.getState().page)).toBe(2);
  await page.mouse.move(box.x+box.width-30,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width*.5,box.y+box.height/2,{steps:5});
  await stage.dispatchEvent('pointercancel',{pointerId:1,pointerType:'mouse'});await page.mouse.up();
  await expect.poll(()=>page.evaluate(()=>(window as any).book.getState().status)).toBe('ready');
  expect(await page.evaluate(()=>(window as any).book.getState().page)).toBe(2);
});
test('context loss switches to a usable flat renderer',async({page})=>{
  await mount(page,{renderer:'webgl',duration:0});
  await page.locator('#one canvas').first().dispatchEvent('webglcontextlost');
  await expect.poll(()=>page.evaluate(()=>(window as any).book.getState().renderer)).toBe('flat');
  await page.evaluate(()=>(window as any).book.next());await expect.poll(()=>page.evaluate(()=>(window as any).book.getState().page)).toBe(2);
});
test('resize during a turn preserves the selected logical page',async({page})=>{
  await mount(page,{renderer:'webgl',duration:1000});await page.evaluate(()=>(window as any).book.next());
  await expect.poll(()=>page.evaluate(()=>(window as any).book.getState().status)).toBe('turning');
  await page.locator('#one').evaluate(el=>(el as HTMLElement).style.width='400px');
  await expect.poll(()=>page.evaluate(()=>(window as any).book.getState().status)).toBe('ready');
  expect(await page.evaluate(()=>(window as any).book.getState().page)).toBe(1);
});
test('destroy during loading rejects ready and releases late work',async({page})=>{
  const result=await page.evaluate(async()=>{const r=(window as any).reader;const b=r.createFlipbook(document.querySelector('#one'),{source:r.images,renderer:'flat'});b.destroy();try{await b.ready;return 'unexpected-ready';}catch(e){return {error:(e as Error).name,status:b.getState().status};}});
  expect(result).toEqual({error:'AbortError',status:'destroyed'});await expect(page.locator('.folio3d')).toHaveCount(0);
});
test('50 mount/destroy cycles leave no viewers, loads, observers or animations running',async({page})=>{
  const result=await page.evaluate(async()=>{
    const r=(window as any).reader;let events=0;
    for(let i=0;i<50;i++){const b=r.createFlipbook(document.querySelector('#one'),{source:r.images,renderer:'flat',duration:0});b.on('pagechange',()=>events++);await b.ready;b.destroy();b.next();}
    return {roots:document.querySelectorAll('.folio3d').length,events};
  });expect(result).toEqual({roots:0,events:0});
});
