export type PageMode = 'auto' | 'single' | 'double';
export type ResolvedPageMode = Exclude<PageMode, 'auto'>;
export type RendererMode = 'auto' | 'webgl' | 'flat';
export type Theme =
  'classic' | 'modern' | 'sepia' | 'midnight' | 'ocean' | 'forest' | 'slate' | 'high-contrast';
export interface ThemeTokens {
  ink: string;
  paper: string;
  stage: string;
  muted: string;
  border: string;
  hover: string;
  accent: string;
  font: string;
}
export interface ContentsEntry {
  title: string;
  page?: number;
  children?: ContentsEntry[];
}
export type Source =
  | { type: 'pdf'; data: string | Blob | Uint8Array }
  | { type: 'images'; pages: Array<{ src: string; alt?: string }> };
export interface FlipbookOptions {
  source: Source;
  renderer?: RendererMode;
  pageMode?: PageMode;
  initialPage?: number;
  assetBaseUrl?: string;
  memoryBudgetMB?: number;
  duration?: number;
  sound?: boolean;
  label?: string;
  theme?: Theme;
  themeOverrides?: Partial<ThemeTokens>;
  contents?: ContentsEntry[];
  /** Opt in to local bookmark persistence with a unique document/version key. */
  storageKey?: string;
}
export interface FlipbookState {
  page: number;
  pageCount: number;
  visiblePages: (number | null)[];
  zoom: number;
  sound: boolean;
  theme: Theme;
  themeOverrides: Partial<ThemeTokens>;
  pageMode: ResolvedPageMode;
  renderer: Exclude<RendererMode, 'auto'>;
  status: 'loading' | 'ready' | 'turning' | 'error' | 'destroyed';
}
export interface FlipbookEvents {
  pagechange: FlipbookState;
  zoomchange: FlipbookState;
  rendererchange: FlipbookState;
  soundchange: FlipbookState;
  themechange: FlipbookState;
  bookmarkchange: number[];
  error: Error;
}
export interface Flipbook {
  readonly ready: Promise<void>;
  next(): void;
  previous(): void;
  goToPage(page: number): void;
  setZoom(scale: number): void;
  resetZoom(): void;
  setSound(enabled: boolean): void;
  setTheme(theme: Theme): void;
  setThemeOverrides(overrides: Partial<ThemeTokens>): void;
  getContents(): Promise<ContentsEntry[]>;
  getBookmarks(): number[];
  toggleBookmark(page?: number): void;
  getState(): FlipbookState;
  on<K extends keyof FlipbookEvents>(
    event: K,
    listener: (data: FlipbookEvents[K]) => void,
  ): () => void;
  destroy(): void;
}
export interface PageSize {
  width: number;
  height: number;
}
export interface PageSurface {
  canvas: HTMLCanvasElement;
  bytes: number;
  dispose(): void;
  onDispose?(listener: () => void): () => void;
}
export interface DocumentProvider {
  readonly pageCount: number;
  size(page: number, signal: AbortSignal): Promise<PageSize>;
  render(page: number, size: PageSize, signal: AbortSignal): Promise<PageSurface>;
  contents?(signal: AbortSignal): Promise<ContentsEntry[]>;
  dispose(): void;
}
