import type { ContentsEntry, DocumentProvider, FlipbookState, PageSurface } from './types';

type Panel = 'pages' | 'contents' | 'bookmarks';
let nextId = 0;

/** A paged thumbnail tray keeps document size independent of canvas allocation. */
export class ReaderNavigation {
  readonly element = document.createElement('aside');
  private body = document.createElement('div');
  private tabs = new Map<Panel, HTMLButtonElement>();
  private panel: Panel = 'pages';
  private state?: FlipbookState;
  private provider?: DocumentProvider;
  private batch = 0;
  private generation = new AbortController();
  private surfaces: PageSurface[] = [];
  private queue: Promise<void> = Promise.resolve();
  private readonly pageSize = 6;
  private thumbnailSize = { width: 120, height: 160 };
  constructor(
    private trigger: HTMLButtonElement,
    private goTo: (page: number) => void,
    private contents: () => Promise<ContentsEntry[]>,
    private bookmarks: () => number[],
    private toggleBookmark: (page: number) => void,
    private signal: AbortSignal,
  ) {
    this.element.className = 'folio3d-navigation';
    this.element.id = `folio3d-navigation-${++nextId}`;
    this.element.setAttribute('aria-label', 'Book navigation');
    this.element.hidden = true;
    trigger.setAttribute('aria-controls', this.element.id);
    trigger.setAttribute('aria-expanded', 'false');
    trigger.addEventListener('click', () => this.toggle(), { signal });
    const header = document.createElement('div');
    header.className = 'folio3d-navigation-heading';
    const title = document.createElement('strong');
    title.textContent = 'Explore the book';
    const close = this.button('×', 'Close navigation', () => this.close());
    header.append(title, close);
    const tabs = document.createElement('div');
    tabs.className = 'folio3d-navigation-tabs';
    tabs.setAttribute('role', 'group');
    tabs.setAttribute('aria-label', 'Navigation views');
    for (const [id, label] of [
      ['pages', 'Pages'],
      ['contents', 'Contents'],
      ['bookmarks', 'Bookmarks'],
    ] as const) {
      const tab = this.button(label, label, () => {
        this.panel = id;
        this.render();
      });
      this.tabs.set(id, tab);
      tabs.append(tab);
    }
    this.body.className = 'folio3d-navigation-body';
    this.element.append(header, tabs, this.body);
    this.element.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          this.close();
        }
        // Arrow/Home/End belong to navigation controls, not the underlying book.
        event.stopPropagation();
      },
      { signal },
    );
    signal.addEventListener('abort', () => this.clear(), { once: true });
  }
  private button(text: string, label: string, action: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = text;
    button.setAttribute('aria-label', label);
    button.addEventListener('click', () => {
      button.focus();
      action();
    });
    return button;
  }
  connect(provider: DocumentProvider, budget: number): void {
    this.provider = provider;
    const scale = Math.min(1, Math.sqrt(budget / (this.pageSize * 120 * 160 * 8)));
    this.thumbnailSize = { width: Math.floor(120 * scale), height: Math.floor(160 * scale) };
  }
  update(state: FlipbookState): void {
    this.state = state;
    for (const button of this.body.querySelectorAll<HTMLElement>('[data-page]'))
      button.setAttribute(
        'aria-current',
        Number(button.dataset.page) === state.page ? 'page' : 'false',
      );
  }
  bookmarksChanged(): void {
    if (!this.element.hidden && this.panel === 'bookmarks') this.render();
  }
  private toggle(): void {
    if (!this.element.hidden) return this.close();
    if (!this.provider || !this.state) return;
    this.batch = Math.floor((this.state.page - 1) / this.pageSize);
    this.element.hidden = false;
    this.trigger.setAttribute('aria-expanded', 'true');
    this.render();
    this.tabs.get(this.panel)!.focus();
  }
  private close(): void {
    this.element.hidden = true;
    this.trigger.setAttribute('aria-expanded', 'false');
    this.clear();
    this.trigger.focus();
  }
  private clear(): void {
    this.generation.abort();
    this.generation = new AbortController();
    for (const surface of this.surfaces) surface.dispose();
    this.surfaces = [];
    this.body.replaceChildren();
  }
  private message(text: string): void {
    const p = document.createElement('p');
    p.textContent = text;
    p.setAttribute('role', 'status');
    this.body.append(p);
  }
  private pageButton(text: string, label: string, page: number): HTMLButtonElement {
    const button = this.button(text, label, () => this.goTo(page));
    button.dataset.page = String(page);
    button.setAttribute('aria-current', page === this.state?.page ? 'page' : 'false');
    return button;
  }
  private render(): void {
    const focusedLabel = this.body.contains(document.activeElement)
      ? document.activeElement?.getAttribute('aria-label')
      : null;
    this.clear();
    const signal = this.generation.signal;
    for (const [id, tab] of this.tabs) tab.setAttribute('aria-pressed', String(id === this.panel));
    if (this.panel === 'pages') this.renderPages(signal);
    else if (this.panel === 'bookmarks') {
      const pages = this.bookmarks();
      if (!pages.length) this.message('No bookmarks yet.');
      for (const page of pages) {
        const row = document.createElement('div');
        row.className = 'folio3d-bookmark-row';
        row.append(
          this.pageButton(`Page ${page}`, `Go to bookmarked page ${page}`, page),
          this.button('Remove', `Remove bookmark for page ${page}`, () =>
            this.toggleBookmark(page),
          ),
        );
        this.body.append(row);
      }
    } else {
      this.message('Loading contents…');
      void this.contents()
        .then((entries) => {
          if (signal.aborted || this.signal.aborted) return;
          this.body.replaceChildren();
          if (!entries.length) this.message('No contents available for this book.');
          else this.body.append(this.contentsList(entries));
        })
        .catch(() => {
          if (signal.aborted || this.signal.aborted) return;
          this.body.replaceChildren();
          this.message('Contents could not be loaded. Try reopening this view.');
        });
    }
    if (focusedLabel) {
      const controls = [...this.body.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
      (
        controls.find((button) => button.getAttribute('aria-label') === focusedLabel) ??
        controls[0] ??
        this.tabs.get(this.panel)
      )?.focus();
    }
  }
  private contentsList(entries: ContentsEntry[]): HTMLUListElement {
    const list = document.createElement('ul');
    list.className = 'folio3d-contents';
    for (const entry of entries) {
      const item = document.createElement('li');
      if (entry.page !== undefined)
        item.append(this.pageButton(entry.title, `${entry.title}, page ${entry.page}`, entry.page));
      else {
        const span = document.createElement('span');
        span.textContent = entry.title;
        item.append(span);
      }
      if (entry.children?.length) item.append(this.contentsList(entry.children));
      list.append(item);
    }
    return list;
  }
  private renderPages(signal: AbortSignal): void {
    const count = this.state!.pageCount;
    const start = this.batch * this.pageSize + 1;
    const end = Math.min(start + this.pageSize - 1, count);
    const pager = document.createElement('div');
    pager.className = 'folio3d-thumbnail-pager';
    const previous = this.button('←', 'Previous thumbnails', () => {
      this.batch--;
      this.render();
    });
    const next = this.button('→', 'Next thumbnails', () => {
      this.batch++;
      this.render();
    });
    previous.disabled = start === 1;
    next.disabled = end === count;
    const range = document.createElement('span');
    range.textContent = `${start}–${end} of ${count}`;
    pager.append(previous, range, next);
    const grid = document.createElement('div');
    grid.className = 'folio3d-thumbnails';
    this.body.append(pager, grid);
    const slots: Array<{ page: number; button: HTMLButtonElement }> = [];
    for (let page = start; page <= end; page++) {
      const button = this.pageButton(String(page), `Go to page ${page}`, page);
      const preview = document.createElement('span');
      preview.className = 'folio3d-thumbnail-placeholder';
      preview.textContent = '…';
      preview.setAttribute('aria-hidden', 'true');
      button.prepend(preview);
      grid.append(button);
      slots.push({ page, button });
    }
    // Serialize across cancelled batches too: never overlap thumbnail raster jobs.
    this.queue = this.queue.then(async () => {
      for (const { page, button } of slots) {
        if (signal.aborted || this.signal.aborted) return;
        try {
          const surface = await this.provider!.render(page, this.thumbnailSize, signal);
          if (signal.aborted || this.signal.aborted) {
            surface.dispose();
            return;
          }
          this.surfaces.push(surface);
          surface.canvas.setAttribute('aria-hidden', 'true');
          button.firstChild!.replaceWith(surface.canvas);
        } catch {
          if (signal.aborted || this.signal.aborted) return;
          button.firstChild!.textContent = 'Preview unavailable';
        }
      }
    });
  }
}
