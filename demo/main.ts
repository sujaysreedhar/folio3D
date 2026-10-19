import {
  createFlipbook,
  openFlipbook,
  type Flipbook,
  type Source,
  type Theme,
  type ThemeTokens,
} from 'folio3d';
import 'folio3d/style.css';
import './site.css';

const base = new URL(import.meta.env.BASE_URL, location.href);
const assets = new URL('lib/assets/', base).href;
const images: Source = {
  type: 'images',
  pages: Array.from({ length: 6 }, (_, i) => ({
    src: new URL(`samples/page-${i + 1}.svg`, base).href,
    alt: `Fieldnotes, original page ${i + 1}`,
  })),
};
const pdf: Source = { type: 'pdf', data: new URL('samples/magazine.pdf', base).href };
const mount = document.querySelector<HTMLElement>('#book')!,
  status = document.querySelector<HTMLElement>('#publication-status')!;
let book: Flipbook | undefined,
  currentSource: Source = images,
  currentTitle = 'Image book';
let theme: Theme = 'modern';
let themeOverrides: Partial<ThemeTokens> = {};
const customPalette: ThemeTokens = {
  ink: '#173b4a',
  paper: '#f1fafb',
  stage: '#dcecf2',
  muted: '#45616d',
  border: '#a8c4cf',
  hover: '#dceef5',
  accent: '#005a7a',
  font: 'Georgia, serif',
};
function updateSnippet(): void {
  const custom = Object.keys(themeOverrides).length
    ? `\n  themeOverrides: ${JSON.stringify(themeOverrides, null, 2).replace(/\n/g, '\n  ')},`
    : '';
  document.querySelector('#snippet')!.textContent =
    `import { createFlipbook } from './lib/folio3d.js';\n\nconst book = createFlipbook(element, {\n  source: { type: 'pdf', data: './catalog.pdf' },\n  theme: '${theme}',${custom}\n});\n\nawait book.ready;\nbook.goToPage(4);\n\n// When the view unmounts\nbook.destroy();`;
}
const imageContents = [
  { title: 'Small wonders', page: 1 },
  { title: 'A slower kind of reading', page: 2 },
  { title: 'Room for a new perspective', page: 5 },
];
function navigationOptions(source: Source) {
  return {
    theme,
    themeOverrides,
    contents: source === images ? imageContents : undefined,
    storageKey:
      source === images ? 'fieldnotes-images-v1' : source === pdf ? 'fieldnotes-pdf-v1' : undefined,
  };
}
async function show(source: Source, title: string, initialPage = 1) {
  book?.destroy();
  currentSource = source;
  currentTitle = title;
  document.querySelector('#images')!.setAttribute('aria-pressed', String(source === images));
  document.querySelector('#pdf')!.setAttribute('aria-pressed', String(source === pdf));
  status.textContent = `Opening ${title.toLowerCase()}…`;
  const next = createFlipbook(mount, {
    source,
    initialPage,
    assetBaseUrl: assets,
    label: title,
    sound: true,
    ...navigationOptions(source),
  });
  book = next;
  try {
    await next.ready;
    if (book !== next) return;
    const state = next.getState();
    status.textContent = `${title} · ${state.pageCount} pages`;
  } catch (e) {
    if (book === next)
      status.textContent =
        (e as Error).name === 'AbortError' ? 'Book closed.' : 'Unable to open this publication.';
  }
}
document
  .querySelector('#images')!
  .addEventListener('click', () => void show(images, 'Image book', 2));
document.querySelector('#pdf')!.addEventListener('click', () => void show(pdf, 'Sample PDF', 2));
document.querySelector<HTMLInputElement>('#file')!.addEventListener('change', (event) => {
  const input = event.target as HTMLInputElement,
    file = input.files?.[0];
  if (file) void show({ type: 'pdf', data: file }, file.name);
  input.value = '';
});
document.querySelector('#lightbox')!.addEventListener('click', () => {
  const modal = openFlipbook({
    source: currentSource,
    label: currentTitle,
    assetBaseUrl: assets,
    initialPage: book?.getState().page ?? 1,
    sound: book?.getState().sound ?? true,
    ...navigationOptions(currentSource),
  });
  void modal.ready.catch(() => {});
});
document.querySelector<HTMLSelectElement>('#reader-theme')!.addEventListener('change', (event) => {
  theme = (event.target as HTMLSelectElement).value as Theme;
  book?.setTheme(theme);
  updateSnippet();
});
document.querySelector<HTMLButtonElement>('#custom-theme')!.addEventListener('click', (event) => {
  const enabled = !Object.keys(themeOverrides).length;
  themeOverrides = enabled ? { ...customPalette } : {};
  book?.setThemeOverrides(themeOverrides);
  (event.currentTarget as HTMLButtonElement).setAttribute('aria-pressed', String(enabled));
  updateSnippet();
});
function copyExample(buttonId: string, snippetId: string, label: string): void {
  document.querySelector<HTMLButtonElement>(buttonId)!.addEventListener('click', async (event) => {
    const button = event.target as HTMLButtonElement;
    try {
      await navigator.clipboard.writeText(document.querySelector(snippetId)!.textContent!);
      button.textContent = 'Copied';
    } catch {
      button.textContent = 'Select code to copy';
    }
    setTimeout(() => (button.textContent = label), 2000);
  });
}
copyExample('#copy', '#snippet', 'Copy code');
copyExample('#copy-css', '#css-snippet', 'Copy CSS');
updateSnippet();
window.addEventListener('pagehide', () => book?.destroy(), { once: true });
void show(images, 'Image book', 2);
