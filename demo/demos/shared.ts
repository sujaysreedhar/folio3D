import { createFlipbook, type FlipbookState } from 'folio3d';
import 'folio3d/style.css';
import '../site.css';
import './demos.css';
import { assetBaseUrl, catalog, portfolio } from './publications';
import { openPublication } from './reader';

const isPortfolio = document.body.dataset.publication === 'portfolio';
const publication = isPortfolio ? portfolio : catalog;
const pageMode = isPortfolio ? 'single' : 'auto';
const mount = document.querySelector<HTMLElement>('#demo-book')!;
const status = document.querySelector<HTMLElement>('#publication-status')!;
const note = document.querySelector<HTMLElement>('#project-note')!;
const shortcuts = document.querySelector<HTMLElement>('#section-buttons')!;
const lightbox = document.querySelector<HTMLButtonElement>('#demo-lightbox')!;
const retry = document.querySelector<HTMLButtonElement>('#retry')!;

const book = createFlipbook(mount, {
  source: publication.source,
  label: publication.title,
  assetBaseUrl,
  pageMode,
  contents: publication.sections,
  storageKey: `demo:${publication.title}:v1`,
  theme: isPortfolio ? 'modern' : 'sepia',
});
const buttons = publication.sections.map((section) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.disabled = true;
  button.textContent = section.title;
  button.setAttribute('aria-pressed', 'false');
  button.addEventListener('click', () => book.goToPage(section.page));
  shortcuts.append(button);
  return button;
});
function update(state: FlipbookState) {
  let active = 0;
  publication.sections.forEach((section, index) => {
    if (section.page <= state.page) active = index;
  });
  buttons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === active)));
  note.textContent = publication.sections[active]!.note;
  status.textContent = `Page ${state.page} of ${state.pageCount}`;
}
book.on('pagechange', update);
book.on('error', (error) => {
  status.textContent = `Unable to open this publication. ${error.message}`;
  retry.hidden = false;
});
void book.ready
  .then(() => {
    update(book.getState());
    buttons.forEach((button) => (button.disabled = false));
    lightbox.disabled = false;
  })
  .catch(() => {});
lightbox.addEventListener('click', () => {
  // WebKit does not focus buttons on pointer clicks. Give the dialog a return target.
  lightbox.focus();
  openPublication(publication, book.getState().page, pageMode);
});
retry.addEventListener('click', () => location.reload());
window.addEventListener('pagehide', (event) => {
  // A cached document resumes its existing module state on browser Back.
  if (!event.persisted) book.destroy();
});
