import type { DocumentProvider, PageSize, PageSurface, Source } from '../types';
import { checkAbort, contain, createSurface } from './surface';

async function loadImage(
  src: string,
  signal: AbortSignal,
): Promise<{ image: HTMLImageElement; dispose(): void }> {
  checkAbort(signal);
  let response: Response;
  try {
    response = await fetch(src, { signal });
  } catch (e) {
    checkAbort(signal);
    throw new Error(`Image could not be loaded. Check its URL and CORS headers.`, { cause: e });
  }
  if (!response.ok) throw new Error(`Image request failed (HTTP ${response.status}).`);
  const url = URL.createObjectURL(await response.blob()),
    image = new Image();
  const dispose = () => {
    image.src = '';
    URL.revokeObjectURL(url);
  };
  const cancel = () => dispose();
  signal.addEventListener('abort', cancel, { once: true });
  try {
    image.src = url;
    await image.decode();
    checkAbort(signal);
    return { image, dispose };
  } catch (e) {
    dispose();
    checkAbort(signal);
    throw new Error('The image could not be decoded.', { cause: e });
  } finally {
    signal.removeEventListener('abort', cancel);
  }
}
export class ImageProvider implements DocumentProvider {
  readonly pageCount: number;
  constructor(private pages: Extract<Source, { type: 'images' }>['pages']) {
    if (!pages.length) throw new Error('An image book needs at least one page.');
    this.pageCount = pages.length;
  }
  async size(page: number, signal: AbortSignal): Promise<PageSize> {
    const item = await loadImage(this.pages[page - 1]!.src, signal);
    try {
      return { width: item.image.naturalWidth, height: item.image.naturalHeight };
    } finally {
      item.dispose();
    }
  }
  async render(page: number, size: PageSize, signal: AbortSignal): Promise<PageSurface> {
    const item = await loadImage(this.pages[page - 1]!.src, signal);
    let surface: PageSurface | undefined;
    try {
      checkAbort(signal);
      surface = createSurface(size);
      const ctx = surface.canvas.getContext('2d')!;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, size.width, size.height);
      const rect = contain(
        { width: item.image.naturalWidth, height: item.image.naturalHeight },
        size,
      );
      ctx.drawImage(item.image, rect.x, rect.y, rect.width, rect.height);
      return surface;
    } catch (e) {
      surface?.dispose();
      throw e;
    } finally {
      item.dispose();
    }
  }
  dispose(): void {}
}
