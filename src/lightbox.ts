import type { Flipbook, FlipbookOptions } from './types';
import { applyTheme, normalizeThemeOverrides, validateTheme } from './themes';
export function createLightbox(
  options: FlipbookOptions,
  create: (element: HTMLElement, options: FlipbookOptions) => Flipbook,
): Flipbook {
  validateTheme(options.theme ?? 'classic');
  const overrides = normalizeThemeOverrides(options.themeOverrides ?? {});
  const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const dialog = document.createElement('dialog');
  dialog.className = 'folio3d-dialog';
  applyTheme(dialog, options.theme ?? 'classic', overrides);
  dialog.setAttribute('aria-label', options.label ?? 'Flipbook reader');
  const close = document.createElement('button');
  close.className = 'folio3d-close';
  close.type = 'button';
  close.textContent = 'Close';
  close.setAttribute('aria-label', 'Close flipbook');
  const mount = document.createElement('div');
  mount.className = 'folio3d-modal-mount';
  dialog.append(close, mount);
  document.body.append(dialog);
  dialog.showModal();
  let book: Flipbook;
  try {
    book = create(mount, options);
  } catch (e) {
    dialog.close();
    dialog.remove();
    previous?.focus();
    throw e;
  }
  const destroy = book.destroy.bind(book);
  let closed = false;
  book.destroy = () => {
    if (closed) return;
    closed = true;
    destroy();
    dialog.close();
    dialog.remove();
    if (previous?.isConnected) previous.focus();
  };
  close.addEventListener('click', () => book.destroy());
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    book.destroy();
  });
  dialog.addEventListener('close', () => book.destroy());
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      )
        book.destroy();
    }
  });
  close.focus();
  return book;
}
