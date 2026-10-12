import type { DocumentProvider, PageSize, PageSurface } from '../types';
import { checkAbort, contain, createSurface } from './surface';
import type { PDFDocumentProxy, PDFDocumentLoadingTask } from 'pdfjs-dist';

export class PDFProvider implements DocumentProvider {
  readonly pageCount: number;
  private disposed = false;
  private constructor(
    private document: PDFDocumentProxy,
    private task: PDFDocumentLoadingTask,
  ) {
    this.pageCount = document.numPages;
  }
  static async open(
    data: string | Blob | Uint8Array,
    assetBase: string,
    signal: AbortSignal,
  ): Promise<PDFProvider> {
    checkAbort(signal);
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    checkAbort(signal);
    const input =
      typeof data === 'string'
        ? { url: data }
        : {
            data:
              data instanceof Blob
                ? new Uint8Array(await data.arrayBuffer())
                : new Uint8Array(data),
          };
    checkAbort(signal);
    // Worker creation is synchronous within getDocument. Do not leave a global
    // URL override spanning Blob conversion, where another viewer can change it.
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdf.worker.min.mjs', assetBase).href;
    const task = pdfjs.getDocument({
      ...input,
      cMapUrl: new URL('cmaps/', assetBase).href,
      cMapPacked: true,
      standardFontDataUrl: new URL('standard_fonts/', assetBase).href,
      wasmUrl: new URL('wasm/', assetBase).href,
    });
    const cancel = () => {
      void task.destroy();
    };
    signal.addEventListener('abort', cancel, { once: true });
    try {
      const document = await task.promise;
      checkAbort(signal);
      return new PDFProvider(document, task);
    } catch (e) {
      void task.destroy();
      checkAbort(signal);
      const error = e as Error;
      if (error.name === 'PasswordException')
        throw new Error(
          'This PDF requires a password. Password-protected documents are not supported in v0.1.',
        );
      if (/worker|fetch.*module/i.test(error.message))
        throw new Error(
          'The PDF worker could not be loaded. Check assetBaseUrl and serve the matching worker assets.',
          { cause: e },
        );
      throw new Error(
        `PDF could not be opened. Check the file, URL and CORS headers. ${error.message}`,
        { cause: e },
      );
    } finally {
      signal.removeEventListener('abort', cancel);
    }
  }
  async size(page: number, signal: AbortSignal): Promise<PageSize> {
    checkAbort(signal);
    const p = await this.document.getPage(page);
    checkAbort(signal);
    const v = p.getViewport({ scale: 1 });
    return { width: v.width, height: v.height };
  }
  async render(page: number, size: PageSize, signal: AbortSignal): Promise<PageSurface> {
    checkAbort(signal);
    const p = await this.document.getPage(page);
    checkAbort(signal);
    const native = p.getViewport({ scale: 1 }),
      rect = contain(native, size);
    const viewport = p.getViewport({ scale: rect.width / native.width });
    const surface = createSurface(size);
    const ctx = surface.canvas.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size.width, size.height);
    const task = p.render({
      canvasContext: ctx,
      canvas: surface.canvas,
      viewport,
      transform: [1, 0, 0, 1, rect.x, rect.y],
    });
    const cancel = () => task.cancel();
    signal.addEventListener('abort', cancel, { once: true });
    try {
      checkAbort(signal);
      await task.promise;
      checkAbort(signal);
      return surface;
    } catch (e) {
      surface.dispose();
      checkAbort(signal);
      throw e;
    } finally {
      signal.removeEventListener('abort', cancel);
      p.cleanup();
    }
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    void this.task.destroy();
  }
}
