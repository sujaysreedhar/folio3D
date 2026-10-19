import type { FlipbookState, Source } from './types';
import { applyTheme } from './themes';
export type Action =
  'previous' | 'next' | 'zoomIn' | 'zoomOut' | 'fit' | 'fullscreen' | 'sound' | 'bookmark';
let controlsId = 0;
export class ReaderUI {
  readonly root = document.createElement('section');
  readonly stage = document.createElement('div');
  readonly message = document.createElement('div');
  readonly input = document.createElement('input');
  readonly browse = document.createElement('button');
  private more = document.createElement('button');
  private secondary = document.createElement('div');
  private compact = false;
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
    let controls: HTMLElement = toolbar;
    this.browse.type = 'button';
    this.browse.textContent = 'Browse';
    this.browse.setAttribute('aria-label', 'Browse book');
    toolbar.append(this.browse);
    const button = (action: Action, text: string, aria: string) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.textContent = text;
      el.setAttribute('aria-label', aria);
      el.addEventListener(
        'click',
        () => {
          el.focus();
          onAction(action);
        },
        { signal },
      );
      controls.append(el);
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
    this.secondary.className = 'folio3d-secondary';
    this.secondary.id = `folio3d-controls-${++controlsId}`;
    this.secondary.setAttribute('role', 'group');
    this.secondary.setAttribute('aria-label', 'More book controls');
    controls = this.secondary;
    this.more.type = 'button';
    this.more.className = 'folio3d-more';
    this.more.textContent = 'More';
    this.more.setAttribute('aria-label', 'More controls');
    this.more.setAttribute('aria-expanded', 'false');
    this.more.setAttribute('aria-controls', this.secondary.id);
    this.more.addEventListener(
      'pointerdown',
      (event) => {
        event.preventDefault();
        this.more.focus();
      },
      { signal },
    );
    this.more.addEventListener(
      'click',
      () => {
        if (this.more.getAttribute('aria-expanded') === 'true') this.closeMore(true);
        else {
          this.secondary.hidden = false;
          this.more.setAttribute('aria-expanded', 'true');
          this.secondary.querySelector<HTMLElement>('button:not(:disabled),a')?.focus();
        }
      },
      { signal },
    );
    this.secondary.addEventListener(
      'keydown',
      (event) => {
        if (!this.compact) return;
        if (event.key === 'Escape') {
          event.preventDefault();
          this.closeMore(true);
        }
        event.stopPropagation();
      },
      { signal },
    );
    this.secondary.addEventListener(
      'pointerdown',
      (event) => {
        const control =
          event.target instanceof Element ? event.target.closest<HTMLElement>('button,a') : null;
        if (control) {
          // Safari otherwise focuses the surrounding region and dismisses this
          // disclosure before the control receives its click.
          event.preventDefault();
          control.focus();
        }
      },
      { signal },
    );
    this.root.addEventListener(
      'keydown',
      (event) => {
        if (
          event.key === 'Escape' &&
          this.compact &&
          this.more.getAttribute('aria-expanded') === 'true'
        ) {
          event.preventDefault();
          event.stopPropagation();
          this.closeMore(true);
        }
      },
      { signal },
    );
    this.browse.addEventListener('click', () => this.closeMore(false), { signal });
    document.addEventListener(
      'pointerdown',
      (event) => {
        if (
          this.compact &&
          event.target instanceof Node &&
          !this.secondary.contains(event.target) &&
          !this.more.contains(event.target)
        )
          this.closeMore(false);
      },
      { signal },
    );
    document.addEventListener(
      'focusin',
      (event) => {
        if (
          this.compact &&
          event.target instanceof Node &&
          event.target !== document.body &&
          event.target !== document.documentElement &&
          !this.secondary.contains(event.target) &&
          !this.more.contains(event.target)
        )
          this.closeMore(false);
      },
      { signal },
    );
    const divider = document.createElement('span');
    divider.className = 'folio3d-divider';
    divider.setAttribute('aria-hidden', 'true');
    this.secondary.append(divider);
    button('zoomOut', '−', 'Zoom out');
    button('zoomIn', '+', 'Zoom in');
    button('fit', 'Fit', 'Reset zoom');
    button('sound', 'Sound off', 'Enable page-turn sound');
    button('bookmark', 'Bookmark', 'Bookmark this page');
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
      this.secondary.append(original);
    }
    toolbar.append(this.more, this.secondary);
    this.live.className = 'folio3d-sr';
    this.live.setAttribute('aria-live', 'polite');
    this.live.setAttribute('aria-atomic', 'true');
    this.root.append(this.stage, this.message, toolbar, this.live);
    container.append(this.root);
    this.setCompact(this.root.clientWidth < 720);
  }
  setCompact(compact: boolean): void {
    if (compact === this.compact && this.root.dataset.compact !== undefined) return;
    const active = document.activeElement;
    this.compact = compact;
    this.root.dataset.compact = String(compact);
    if (compact && active && this.secondary.contains(active)) this.more.focus();
    this.closeMore(false);
    if (!compact && active === this.more)
      this.secondary.querySelector<HTMLElement>('button:not(:disabled),a')?.focus();
  }
  private closeMore(focus: boolean): void {
    this.secondary.hidden = this.compact;
    this.more.setAttribute('aria-expanded', 'false');
    if (focus) this.more.focus();
  }
  update(state: FlipbookState): void {
    applyTheme(this.root, state.theme, state.themeOverrides);
    this.root.dataset.status = state.status;
    this.root.dataset.renderer = state.renderer;
    this.stage.dataset.zoomed = String(state.zoom > 1);
    this.input.value = String(state.page);
    this.input.max = String(state.pageCount);
    this.count.textContent = ` / ${state.pageCount || '—'}`;
    const inactive =
      state.status === 'loading' || state.status === 'error' || state.status === 'destroyed';
    this.input.disabled = inactive;
    this.browse.disabled = inactive;
    this.more.disabled = inactive;
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
  updateBookmark(saved: boolean): void {
    const button = this.buttons.get('bookmark')!;
    button.textContent = saved ? 'Bookmarked' : 'Bookmark';
    button.setAttribute(
      'aria-label',
      saved ? 'Remove bookmark for this page' : 'Bookmark this page',
    );
    button.setAttribute('aria-pressed', String(saved));
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
