import {createFlipbook,openFlipbook,type Flipbook,type Source} from 'folio3d';
import 'folio3d/style.css';
import './site.css';

const base=new URL(import.meta.env.BASE_URL,location.href);
const assets=new URL('lib/assets/',base).href;
const images:Source={type:'images',pages:Array.from({length:6},(_,i)=>({src:new URL(`samples/page-${i+1}.svg`,base).href,alt:`Fieldnotes, original page ${i+1}`}))};
const pdf:Source={type:'pdf',data:new URL('samples/magazine.pdf',base).href};
const mount=document.querySelector<HTMLElement>('#book')!,status=document.querySelector<HTMLElement>('#publication-status')!;
let book:Flipbook|undefined,currentSource:Source=images,currentTitle='Image book';
async function show(source:Source,title:string,initialPage=1){
  book?.destroy();currentSource=source;currentTitle=title;
  document.querySelector('#images')!.setAttribute('aria-pressed',String(source===images));document.querySelector('#pdf')!.setAttribute('aria-pressed',String(source===pdf));
  status.textContent=`Opening ${title.toLowerCase()}…`;
  const next=createFlipbook(mount,{source,initialPage,assetBaseUrl:assets,label:title});book=next;
  try{await next.ready;if(book!==next)return;const state=next.getState();status.textContent=`${title} · ${state.pageCount} pages`;}
  catch(e){if(book===next)status.textContent=(e as Error).name==='AbortError'?'Book closed.':'Unable to open this publication.';}
}
document.querySelector('#images')!.addEventListener('click',()=>void show(images,'Image book',2));
document.querySelector('#pdf')!.addEventListener('click',()=>void show(pdf,'Sample PDF',2));
document.querySelector<HTMLInputElement>('#file')!.addEventListener('change',event=>{const input=event.target as HTMLInputElement,file=input.files?.[0];if(file)void show({type:'pdf',data:file},file.name);input.value='';});
document.querySelector('#lightbox')!.addEventListener('click',()=>{const modal=openFlipbook({source:currentSource,label:currentTitle,assetBaseUrl:assets,initialPage:book?.getState().page??1});void modal.ready.catch(()=>{});});
document.querySelector<HTMLButtonElement>('#copy')!.addEventListener('click',async event=>{const button=event.target as HTMLButtonElement;try{await navigator.clipboard.writeText(document.querySelector('#snippet')!.textContent!);button.textContent='Copied';}catch{button.textContent='Select code to copy';}setTimeout(()=>button.textContent='Copy code',2000);});
window.addEventListener('pagehide',()=>book?.destroy(),{once:true});
void show(images,'Image book',2);
