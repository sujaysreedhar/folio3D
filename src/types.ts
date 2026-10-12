export type PageMode = 'auto' | 'single' | 'double';
export type ResolvedPageMode = Exclude<PageMode, 'auto'>;
export type RendererMode = 'auto' | 'webgl' | 'flat';
export type Source = { type: 'pdf'; data: string | Blob | Uint8Array } | { type: 'images'; pages: Array<{ src: string; alt?: string }> };
export interface FlipbookOptions {
  source: Source;
  renderer?: RendererMode;
  pageMode?: PageMode;
  initialPage?: number;
  assetBaseUrl?: string;
  memoryBudgetMB?: number;
  duration?: number;
  label?: string;
}
export interface FlipbookState {
  page: number;
  pageCount: number;
  visiblePages: (number | null)[];
  zoom: number;
  pageMode: ResolvedPageMode;
  renderer: Exclude<RendererMode, 'auto'>;
  status: 'loading' | 'ready' | 'turning' | 'error' | 'destroyed';
}
export interface FlipbookEvents {
  pagechange: FlipbookState;
  zoomchange: FlipbookState;
  rendererchange: FlipbookState;
  error: Error;
}
export interface Flipbook {
  readonly ready: Promise<void>;
  next(): void;
  previous(): void;
  goToPage(page: number): void;
  setZoom(scale: number): void;
  resetZoom(): void;
  getState(): FlipbookState;
  on<K extends keyof FlipbookEvents>(event: K, listener: (data: FlipbookEvents[K]) => void): () => void;
  destroy(): void;
}
export interface PageSize { width: number; height: number }
export interface PageSurface { canvas: HTMLCanvasElement; bytes: number; dispose(): void }
export interface DocumentProvider {
  readonly pageCount: number;
  size(page: number, signal: AbortSignal): Promise<PageSize>;
  render(page: number, size: PageSize, signal: AbortSignal): Promise<PageSurface>;
  dispose(): void;
}
