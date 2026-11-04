import type { DocumentProvider, Source, LoadProgress } from '../types';
import { ImageProvider } from './images';
import { checkAbort } from './surface';
export async function openDocument(
  source: Source,
  assetBase: string,
  signal: AbortSignal,
  progress?: (value: LoadProgress) => void,
): Promise<DocumentProvider> {
  checkAbort(signal);
  if (source.type === 'images') return new ImageProvider(source.pages);
  const { PDFProvider } = await import('./pdf');
  checkAbort(signal);
  return PDFProvider.open(source.data, assetBase, signal, progress);
}
