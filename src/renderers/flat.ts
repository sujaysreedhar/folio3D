import type {BookRenderer,View} from './renderer';
export class FlatBookRenderer implements BookRenderer {
  readonly element=document.createElement('div');
  private spread=document.createElement('div');
  private view?:View;private width=1;private height=1;
  constructor(){this.element.className='folio3d-flat';this.spread.className='folio3d-spread';this.element.append(this.spread);}
  resize(width:number,height:number){this.width=width;this.height=height;this.fit();}
  private fit(){if(!this.view)return;const ratio=this.view.size.height/this.view.size.width,columns=this.view.pages.length;const pageWidth=Math.min(this.width*.9/columns,this.height*.88/ratio);this.spread.style.width=`${pageWidth*columns}px`;this.spread.style.height=`${pageWidth*ratio}px`;}
  show(view:View){this.view=view;this.spread.replaceChildren();for(const number of view.pages){const page=document.createElement('div');page.className='folio3d-page';if(number){const surface=view.surfaces.get(number);if(surface)page.append(surface.canvas);}else page.classList.add('folio3d-blank');this.spread.append(page);}this.fit();}
  turn(from:View,to:View,_direction:1|-1,progress:number){this.show(progress<.5?from:to);}
  setTransform(zoom:number,x:number,y:number){this.spread.style.transform=`translate(${x}px,${y}px) scale(${zoom})`;}
  dispose(){this.element.remove();this.spread.replaceChildren();this.view=undefined;}
}
