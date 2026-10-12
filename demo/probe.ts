import { WebGLBookRenderer } from '../src/renderers/webgl';
import type { PageSurface } from '../src/types';
const stage = document.querySelector<HTMLElement>('#probe')!;
const renderer = new WebGLBookRenderer(() => {});
stage.append(renderer.element);
renderer.resize(960, 650);
const surfaces = new Map<number, PageSurface>();
for (let n = 1; n <= 5; n++) {
  const image = new Image();
  image.src = `./samples/page-${n}.svg`;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 800;
  canvas.getContext('2d')!.drawImage(image, 0, 0);
  surfaces.set(n, {
    canvas,
    bytes: 600 * 800 * 8,
    dispose() {
      canvas.width = 0;
      canvas.height = 0;
    },
  });
}
const size = { width: 600, height: 800 };
function progress(t: number, direction: 1 | -1 = 1, single = false) {
  renderer.turn(
    { pages: single ? [direction === 1 ? 1 : 2] : [2, 3], surfaces, size },
    {
      pages: single ? [direction === 1 ? 2 : 1] : direction === 1 ? [4, 5] : [null, 1],
      surfaces,
      size,
    },
    direction,
    t,
  );
}
document
  .querySelector<HTMLInputElement>('#progress')!
  .addEventListener('input', (e) => progress(Number((e.target as HTMLInputElement).value)));
Object.assign(window, { probe: { progress, renderer } });
progress(0);
