import { openFlipbook, type Flipbook, type PageMode } from 'folio3d';
import { assetBaseUrl, type Publication } from './publications';

let modal: Flipbook | undefined;
export function openPublication(
  publication: Publication,
  initialPage = 1,
  pageMode: PageMode = 'auto',
) {
  modal?.destroy();
  const next = openFlipbook({
    source: publication.source,
    label: publication.title,
    assetBaseUrl,
    initialPage,
    pageMode,
    contents: publication.sections.length ? publication.sections : undefined,
    storageKey:
      publication.source.type === 'pdf' && typeof publication.source.data !== 'string'
        ? undefined
        : `demo:${publication.title}:v1`,
    theme: pageMode === 'single' ? 'modern' : 'sepia',
  });
  modal = next;
  // The reader itself presents loading errors in its accessible alert.
  void next.ready.catch(() => {});
}
window.addEventListener('pagehide', () => modal?.destroy());
