export class Bookmarks {
  private pages = new Set<number>();
  private key?: string;
  private persistent = true;
  constructor(
    private count: number,
    storageKey: string | undefined,
    changed: () => void,
    signal: AbortSignal,
  ) {
    if (!storageKey) return;
    this.key = `folio3d:bookmarks:${storageKey}`;
    this.reload();
    window.addEventListener(
      'storage',
      (event) => {
        if (event.key === this.key || event.key === null) {
          this.reload();
          changed();
        }
      },
      { signal },
    );
    window.addEventListener(
      'folio3d-bookmarks',
      (event) => {
        const detail = (event as CustomEvent).detail;
        if (detail?.key !== this.key || detail.owner === this) return;
        this.read(detail.pages);
        changed();
      },
      { signal },
    );
  }
  private read(saved: unknown): void {
    if (!Array.isArray(saved)) return;
    this.pages.clear();
    for (const page of saved)
      if (Number.isInteger(page) && page >= 1 && page <= this.count) this.pages.add(page);
  }
  private reload(): void {
    if (!this.key || !this.persistent) return;
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(this.key) ?? '[]');
      this.read(saved);
    } catch {
      this.persistent = false;
      /* Storage may be unavailable or contain invalid JSON. Keep session bookmarks. */
    }
  }
  get(): number[] {
    return [...this.pages].sort((a, b) => a - b);
  }
  toggle(page: number): void {
    if (!Number.isInteger(page) || page < 1 || page > this.count)
      throw new RangeError(`Bookmark page must be between 1 and ${this.count}.`);
    this.reload();
    if (this.pages.has(page)) this.pages.delete(page);
    else this.pages.add(page);
    if (this.key) {
      try {
        localStorage.setItem(this.key, JSON.stringify(this.get()));
      } catch {
        this.persistent = false;
        /* Session bookmarks remain usable when storage is blocked/full. */
      }
      window.dispatchEvent(
        new CustomEvent('folio3d-bookmarks', {
          detail: { key: this.key, pages: this.get(), owner: this },
        }),
      );
    }
  }
}
