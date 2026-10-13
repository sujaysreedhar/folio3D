export type { Flipbook, FlipbookOptions, FlipbookState, FlipbookEvents, Source, PageMode, RendererMode, Theme, ContentsEntry, } from './types';
import type { Flipbook, FlipbookOptions } from './types';
export declare function createFlipbook(container: HTMLElement, options: FlipbookOptions): Flipbook;
export declare function openFlipbook(options: FlipbookOptions): Flipbook;
