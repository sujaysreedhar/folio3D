import type { DocumentProvider, Source } from '../types';
export declare function openDocument(source: Source, assetBase: string, signal: AbortSignal): Promise<DocumentProvider>;
