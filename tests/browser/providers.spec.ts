import {test,expect} from '@playwright/test';
import {resolve} from 'node:path';
test.beforeEach(async({page,context})=>{
  await context.route('**/test-assets/**',route=>route.fulfill({path:resolve('dist/assets',new URL(route.request().url()).pathname.split('/test-assets/')[1]!)}));
  await context.route('**/fixtures/**',route=>route.fulfill({path:resolve('tests/fixtures',new URL(route.request().url()).pathname.split('/fixtures/')[1]!)}));
  await page.goto('/provider-probe.html');await page.waitForFunction(()=>!!(window as any).documents);
});
test('opens text, scanned, rotated/mixed and large PDFs on demand',async({page})=>{
  for(const [name,count] of [['magazine',6],['scanned',3],['mixed',4],['large',200]] as const){
    const result=await page.evaluate(async({name})=>{
      const {openDocument,RenderScheduler}=(window as any).documents,signal=new AbortController().signal;
      const p=await openDocument({type:'pdf',data:`/fixtures/${name}.pdf`},`${location.origin}/test-assets/`,signal);
      const s=new RenderScheduler(p,1024*1024);const surfaces=await s.prepare([1],{width:600,height:800});
      const canvas=surfaces.get(1).canvas,rgba=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
      const result={count:p.pageCount,ink:Array.from(rgba as Uint8Array).some((v,i)=>i%4!==3&&v<200),stats:s.stats(),rotated:name==='mixed'?await p.size(3,signal):null};
      s.dispose();p.dispose();return result;
    },{name});
    expect(result.count).toBe(count);expect(result.ink).toBe(true);expect(result.stats.renderedPages).toBe(1);expect(result.stats.bytes).toBeLessThanOrEqual(1024*1024);
    if(name==='mixed')expect(result.rotated).toEqual({width:800,height:600});
  }
});
test('copies caller-owned bytes and supports a local Blob',async({page})=>{
  const result=await page.evaluate(async()=>{
    const {openDocument}=(window as any).documents,signal=new AbortController().signal;
    const bytes=new Uint8Array(await (await fetch('/fixtures/magazine.pdf')).arrayBuffer()),length=bytes.length;
    const p=await openDocument({type:'pdf',data:bytes},`${location.origin}/test-assets/`,signal);p.dispose();
    const blob=new Blob([bytes],{type:'application/pdf'});
    const b=await openDocument({type:'pdf',data:blob},`${location.origin}/test-assets/`,signal);const count=b.pageCount;b.dispose();
    return {length:bytes.length,expected:length,count};
  });expect(result.length).toBe(result.expected);expect(result.count).toBe(6);
});
test('reports malformed PDFs and failed image URLs',async({page})=>{
  const errors=await page.evaluate(async()=>{
    const {openDocument}=(window as any).documents,signal=new AbortController().signal;const errors=[];
    for(const source of [{type:'pdf',data:'/fixtures/malformed.pdf'},{type:'images',pages:[{src:'/missing-image.png'}]}]){
      let p;try{p=await openDocument(source,`${location.origin}/test-assets/`,signal);await p.size(1,signal);}catch(e){errors.push((e as Error).message);}finally{p?.dispose();}
    }return errors;
  });expect(errors[0]).toContain('PDF could not be opened');expect(errors[1]).toMatch(/Image|image/);
});
