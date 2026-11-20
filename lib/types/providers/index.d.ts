import type { DocumentProvider, Source, LoadProgress } from '../types';
export declare function openDocument(source: Source, assetBase: string, signal: AbortSignal, progress?: (value: LoadProgress) => void): Promise<DocumentProvider>;
