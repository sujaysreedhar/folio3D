import { expect, it } from 'vitest';
import { RenderScheduler } from '../../src/scheduler';
import type { DocumentProvider, PageSurface } from '../../src/types';

function provider(delay=0) {
  let active=0, peak=0, disposed=0;
  const value:DocumentProvider={pageCount:200,async size(){return {width:600,height:800};},async render(_page,size,signal){
    active++;peak=Math.max(peak,active);
    await new Promise(r=>setTimeout(r,delay)); active--;
    if(signal.aborted)throw new DOMException('Cancelled','AbortError');
    let done=false;
    return {canvas:{width:size.width,height:size.height} as HTMLCanvasElement,bytes:size.width*size.height*8,dispose(){if(!done){disposed++;done=true;}}} satisfies PageSurface;
  },dispose(){}};
  return {value,stats:()=>({active,peak,disposed})};
}
it('limits concurrency and allocated plus reserved bytes under navigation',async()=>{
  const p=provider(2),s=new RenderScheduler(p.value,1024*1024);
  for(const pages of [[1,2,3,4],[50,51,52,53],[198,199,200]]){
    const result=await s.prepare(pages,{width:2048,height:2048});
    expect([...result.keys()]).toEqual(pages);
    expect(s.stats().bytes+s.stats().reservedBytes).toBeLessThanOrEqual(1024*1024);
    expect(s.stats().cachedPages).toBeLessThanOrEqual(6);
  }
  expect(p.stats().peak).toBeLessThanOrEqual(2);
  expect(p.stats().disposed).toBeGreaterThan(0);
  s.dispose();expect(s.stats().bytes).toBe(0);
});
it('rejects obsolete generations and disposes work even if the provider finishes late',async()=>{
  const p=provider(15),s=new RenderScheduler(p.value,1024*1024);
  const old=s.prepare([1,2,3],{width:600,height:800}).catch(e=>e.name);
  const fresh=s.prepare([80],{width:600,height:800});
  expect(await old).toBe('AbortError');
  expect([...await fresh].map(([page])=>page)).toEqual([80]);
  s.dispose();expect(s.stats().bytes).toBe(0);
});
