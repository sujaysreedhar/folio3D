import type { FlipbookState, Source } from './types';
export type Action = 'previous' | 'next' | 'zoomIn' | 'zoomOut' | 'fit' | 'fullscreen' | 'sound';
export class ReaderUI {
  readonly root = document.createElement('section');
  readonly stage = document.createElement('div');
  readonly message = document.createElement('div');
  readonly input = document.createElement('input');
  private count = document.createElement('span');
  private live = document.createElement('span');
  private buttons = new Map<Action, HTMLButtonElement>();
  private objectUrl?: string;
  constructor(
    container: HTMLElement,
    label: string,
    source: Source,
    onAction: (action: Action) => void,
    onPage: (page: number) => void,
    signal: AbortSignal,
  ) {
    this.root.className = 'folio3d';
    this.root.tabIndex = 0;
    this.root.setAttribute('role', 'region');
    this.root.setAttribute('aria-label', label);
    this.stage.className = 'folio3d-stage';
    this.stage.setAttribute('role', 'img');
    this.message.className = 'folio3d-message';
    this.message.setAttribute('role', 'status');
    this.message.setAttribute('aria-live', 'polite');
    const toolbar = document.createElement('div');
    toolbar.className = 'folio3d-toolbar';
    toolbar.setAttribute('role', 'group');
    toolbar.setAttribute('aria-label', 'Book controls');
    const button = (action: Action, text: string, aria: string) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.textContent = text;
      el.setAttribute('aria-label', aria);
      el.addEventListener('click', () => onAction(action), { signal });
      toolbar.append(el);
      this.buttons.set(action, el);
    };
    button('previous', '←', 'Previous page');
    const labelElement = document.createElement('label');
    labelElement.className = 'folio3d-page-field';
    const name = document.createElement('span');
    name.className = 'folio3d-sr';
    name.textContent = 'Page number';
    this.input.type = 'number';
    this.input.min = '1';
    this.input.step = '1';
    this.input.setAttribute('aria-label', 'Page number');
    this.input.addEventListener(
      'change',
      () => {
        try {
          onPage(Number(this.input.value));
          this.input.setCustomValidity('');
        } catch (e) {
          this.input.setCustomValidity((e as Error).message);
          this.input.reportValidity();
        }
      },
      { signal },
    );
    labelElement.append(name, this.input, this.count);
    toolbar.append(labelElement);
    button('next', '→', 'Next page');
    const divider = document.createElement('span');
    divider.className = 'folio3d-divider';
    divider.setAttribute('aria-hidden', 'true');
    toolbar.append(divider);
    button('zoomOut', '−', 'Zoom out');
    button('zoomIn', '+', 'Zoom in');
    button('fit', 'Fit', 'Reset zoom');
    button('sound', 'Sound off', 'Enable page-turn sound');
    if (document.fullscreenEnabled) button('fullscreen', 'Full screen', 'Toggle fullscreen');
    if (source.type === 'pdf') {
      const original = document.createElement('a');
      original.className = 'folio3d-original';
      original.textContent = 'Original PDF';
      original.target = '_blank';
      original.rel = 'noopener noreferrer';
      if (typeof source.data === 'string')
        original.href = new URL(source.data, document.baseURI).href;
      else {
        const blob =
          source.data instanceof Blob
            ? source.data
            : new Blob([new Uint8Array(source.data)], { type: 'application/pdf' });
        this.objectUrl = URL.createObjectURL(blob);
        original.href = this.objectUrl;
      }
      toolbar.append(original);
    }
    this.live.className = 'folio3d-sr';
    this.live.setAttribute('aria-live', 'polite');
    this.live.setAttribute('aria-atomic', 'true');
    this.root.append(this.stage, this.message, toolbar, this.live);
    container.append(this.root);
  }
  update(state: FlipbookState): void {
    this.root.dataset.status = state.status;
    this.root.dataset.renderer = state.renderer;
    this.stage.dataset.zoomed = String(state.zoom > 1);
    this.input.value = String(state.page);
    this.input.max = String(state.pageCount);
    this.count.textContent = ` / ${state.pageCount || '—'}`;
    const inactive =
      state.status === 'loading' || state.status === 'error' || state.status === 'destroyed';
    this.input.disabled = inactive;
    for (const button of this.buttons.values()) button.disabled = inactive;
    this.buttons.get('previous')!.disabled = inactive || state.page <= 1;
    this.buttons.get('next')!.disabled = inactive || state.visiblePages.includes(state.pageCount);
    this.buttons.get('zoomOut')!.disabled = inactive || state.zoom <= 1;
    this.buttons.get('zoomIn')!.disabled = inactive || state.zoom >= 3;
    const sound = this.buttons.get('sound')!;
    sound.textContent = state.sound ? 'Sound on' : 'Sound off';
    sound.setAttribute(
      'aria-label',
      state.sound ? 'Mute page-turn sound' : 'Enable page-turn sound',
    );
    sound.setAttribute('aria-pressed', String(state.sound));
    const pages = state.visiblePages.filter(Boolean).join(' and ');
    this.stage.setAttribute(
      'aria-label',
      `Page${state.visiblePages.filter(Boolean).length > 1 ? 's' : ''} ${pages} of ${state.pageCount}. Drag a page or use the controls to navigate.`,
    );
    if (state.status === 'ready')
      this.live.textContent = `Page ${state.page} of ${state.pageCount}`;
  }
  status(text: string, error = false): void {
    this.message.textContent = text;
    this.message.hidden = !text;
    this.message.setAttribute('role', error ? 'alert' : 'status');
  }
  dispose(): void {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.root.remove();
  }
}
