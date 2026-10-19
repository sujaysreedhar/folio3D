import { PlaneGeometry } from 'three';
/** Integral of a unit tangent whose angle varies linearly along the sheet.
 * The arc is intrinsically unit-length; curvature vanishes at both endpoints. */
export declare function sheetPoint(s: number, progress: number): {
    x: number;
    z: number;
};
export declare function createSheetGeometry(): PlaneGeometry;
export declare function deformSheet(geometry: PlaneGeometry, progress: number, height: number, direction: 1 | -1): void;
