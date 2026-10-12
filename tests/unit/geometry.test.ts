import { describe, it, expect } from 'vitest';
import { sheetPoint, createSheetGeometry, deformSheet } from '../../src/renderers/geometry';

describe('arc-length-preserving sheet', () => {
  it('is flat and fully extended at both endpoints', () => {
    expect(sheetPoint(1, 0)).toEqual({ x: 1, z: 0 });
    const end = sheetPoint(1, 1);
    expect(end.x).toBeCloseTo(-1); expect(end.z).toBeCloseTo(0);
  });
  it('keeps the spine anchored through the turn', () => {
    for (const t of [0, .25, .5, .75, 1]) expect(sheetPoint(0, t)).toEqual({x:0,z:0});
  });
  it('bends instead of rotating a rigid plane and preserves sheet length', () => {
    const middle = sheetPoint(.5, .5), edge = sheetPoint(1, .5);
    expect(Math.abs(middle.x * edge.z - edge.x * middle.z)).toBeGreaterThan(.05);
    let length=0, prev=sheetPoint(0,.5);
    for(let i=1;i<=400;i++){const p=sheetPoint(i/400,.5);length+=Math.hypot(p.x-prev.x,p.z-prev.z);prev=p;}
    expect(length).toBeCloseTo(1,4);
  });
  it('updates finite geometry and normals at every inspection point', () => {
    const geometry=createSheetGeometry();
    expect(geometry.getAttribute('position').count).toBe(41*5);
    for(const t of [0,.25,.5,.75,1]) {
      deformSheet(geometry,t,1.4,1);
      for(const attr of ['position','normal']) expect(Array.from(geometry.getAttribute(attr).array).every(Number.isFinite)).toBe(true);
    }
    geometry.dispose();
  });
});
