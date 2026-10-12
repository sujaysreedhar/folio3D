import type {DocumentProvider,PageSurface,PageSize} from './types';
const abortError=()=>new DOMException('Rendering cancelled.','AbortError');
export class RenderScheduler {
  private cache=new Map<string,PageSurface>();
  private pending=new Map<string,Promise<PageSurface>>();
  private pins=new Set<string>();
  private abort=new AbortController();
  private active=0; private bytes=0; private reserved=0; private rendered=0;
  private waiting:Array<()=>void>=[];
  private disposed=false;
  constructor(private provider:DocumentProvider,private budget:number){}
  private key(page:number,size:PageSize){return `${page}:${size.width}x${size.height}`;}
  async prepare(pages:number[],size:PageSize):Promise<Map<number,PageSurface>> {
    if(this.disposed)throw abortError();
    this.abort.abort();this.abort=new AbortController();
    const signal=this.abort.signal;
    this.pending.clear();
    this.pins=new Set(pages.map(page=>this.key(page,size)));
    const entries=await Promise.all([...new Set(pages)].map(async page=>[page,await this.load(page,size,signal,pages.length)] as const));
    if(signal.aborted)throw abortError();
    return new Map(entries);
  }
  prefetch(pages:number[],size:PageSize):void {
    for(const page of pages)if(page>0&&page<=this.provider.pageCount)void this.load(page,size,this.abort.signal,Math.max(4,this.pins.size)).catch(()=>{});
  }
  private async slot(signal:AbortSignal):Promise<void> {
    while(this.active>=2){await new Promise<void>(resolve=>this.waiting.push(resolve));if(signal.aborted)throw abortError();}
    if(signal.aborted)throw abortError();
    this.active++;
  }
  private evict(key:string):void {
    const value=this.cache.get(key);if(!value)return;
    this.cache.delete(key);this.bytes-=value.bytes;value.dispose();
  }
  private load(page:number,size:PageSize,signal:AbortSignal,count:number):Promise<PageSurface> {
    const key=this.key(page,size),cached=this.cache.get(key);
    if(cached){this.cache.delete(key);this.cache.set(key,cached);return Promise.resolve(cached);}
    const pending=this.pending.get(key);if(pending)return pending;
    const operation=(async()=>{
      await this.slot(signal);
      let reservation=0;
      try {
        if(signal.aborted)throw abortError();
        const nominal=this.budget/(Math.max(count,4)+2);
        for(const [old] of this.cache) {
          if((this.budget-this.bytes-this.reserved>=nominal)&&this.cache.size<6)break;
          if(!this.pins.has(old))this.evict(old);
        }
        const available=Math.min(nominal,this.budget-this.bytes-this.reserved);
        if(available<8)throw new Error('The render memory budget is exhausted. Increase memoryBudgetMB.');
        const scale=Math.min(1,2048/Math.max(size.width,size.height),Math.sqrt(available/(size.width*size.height*8)));
        const raster={width:Math.max(1,Math.floor(size.width*scale)),height:Math.max(1,Math.floor(size.height*scale))};
        reservation=raster.width*raster.height*8;this.reserved+=reservation;
        const surface=await this.provider.render(page,raster,signal);
        if(signal.aborted||this.disposed){surface.dispose();throw abortError();}
        if(surface.bytes>reservation){surface.dispose();throw new Error('Document provider exceeded its raster allocation.');}
        const old=this.cache.get(key);if(old)this.evict(key);
        this.cache.set(key,surface);this.bytes+=surface.bytes;this.rendered++;
        return surface;
      } finally {
        this.reserved-=reservation;this.active--;
        this.waiting.splice(0).forEach(resolve=>resolve());
      }
    })();
    this.pending.set(key,operation);
    void operation.finally(()=>{if(this.pending.get(key)===operation)this.pending.delete(key);}).catch(()=>{});
    return operation;
  }
  stats(){return {bytes:this.bytes,reservedBytes:this.reserved,cachedPages:this.cache.size,active:this.active,renderedPages:this.rendered};}
  dispose():void {
    if(this.disposed)return;this.disposed=true;this.abort.abort();this.pins.clear();
    for(const [key] of this.cache)this.evict(key);
    this.waiting.splice(0).forEach(resolve=>resolve());
  }
}
