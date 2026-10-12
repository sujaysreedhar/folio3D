export type { Flipbook, FlipbookOptions, FlipbookState, FlipbookEvents, Source, PageMode, RendererMode } from './types';
import type {Flipbook,FlipbookOptions} from './types';
import {FlipbookController} from './controller';
import {createLightbox} from './lightbox';
import './style.css';
const defaultAssets=new URL(/* @vite-ignore */ './assets/',import.meta.url).href;
export function createFlipbook(container:HTMLElement,options:FlipbookOptions):Flipbook {
  const assets=options.assetBaseUrl?new URL(options.assetBaseUrl.endsWith('/')?options.assetBaseUrl:`${options.assetBaseUrl}/`,document.baseURI).href:defaultAssets;
  return new FlipbookController(container,options,assets);
}
export function openFlipbook(options:FlipbookOptions):Flipbook {return createLightbox(options,createFlipbook);}
