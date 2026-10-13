import type { BookRenderer, View } from './renderer';
export declare class FlatBookRenderer implements BookRenderer {
    readonly element: HTMLDivElement;
    private spread;
    private view?;
    private width;
    private height;
    constructor();
    resize(width: number, height: number): void;
    private fit;
    show(view: View): void;
    turn(from: View, to: View, _direction: 1 | -1, progress: number): void;
    setTransform(zoom: number, x: number, y: number): void;
    dispose(): void;
}
