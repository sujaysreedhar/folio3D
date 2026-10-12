import type { PageSize, PageSurface } from '../types';
export interface View {
  pages: (number | null)[];
  surfaces: ReadonlyMap<number, PageSurface>;
  size: PageSize;
}
export interface BookRenderer {
  readonly element: HTMLElement;
  resize(width: number, height: number): void;
  show(view: View): void;
  turn(from: View, to: View, direction: 1 | -1, progress: number): void;
  setTransform(zoom: number, x: number, y: number): void;
  dispose(): void;
}
