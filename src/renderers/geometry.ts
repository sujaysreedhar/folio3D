import { PlaneGeometry } from 'three';
/** Integral of a unit tangent whose angle varies linearly along the sheet.
 * The arc is intrinsically unit-length; curvature vanishes at both endpoints. */
export function sheetPoint(s: number, progress: number): { x: number; z: number } {
  const t = Math.max(0, Math.min(1, progress));
  if (s === 0) return { x: 0, z: 0 };
  if (t === 0) return { x: s, z: 0 };
  if (t === 1) return { x: -s, z: 0 };
  const curvature = 1.2 * Math.sin(Math.PI * t);
  const angle = Math.PI * t - curvature / 2;
  return {
    x: (Math.sin(angle + curvature * s) - Math.sin(angle)) / curvature,
    z: (Math.cos(angle) - Math.cos(angle + curvature * s)) / curvature,
  };
}
export function createSheetGeometry(): PlaneGeometry {
  return new PlaneGeometry(1, 1, 40, 4);
}
export function deformSheet(
  geometry: PlaneGeometry,
  progress: number,
  height: number,
  direction: 1 | -1,
): void {
  const positions = geometry.getAttribute('position');
  const columns = geometry.parameters.widthSegments + 1;
  const rows = geometry.parameters.heightSegments;
  for (let i = 0; i < positions.count; i++) {
    const p = sheetPoint((i % columns) / (columns - 1), progress);
    positions.setXYZ(
      i,
      direction * p.x,
      (0.5 - Math.floor(i / columns) / rows) * height,
      p.z + 0.014,
    );
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
}
