import type {
  Flipbook,
  FlipbookOptions,
  FlipbookState,
  FlipbookEvents,
  DocumentProvider,
  PageSize,
} from './types';
import { visiblePages, adjacentPage, resolveMode, validatePage } from './model';
import { openDocument } from './providers';
import { RenderScheduler } from './scheduler';
import { WebGLBookRenderer } from './renderers/webgl';
import { FlatBookRenderer } from './renderers/flat';
import type { BookRenderer, View } from './renderers/renderer';
import { ReaderUI, type Action } from './ui';
import { PageTurnSound } from './sound';

interface Gesture {
  id: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  direction: 1 | -1;
  progress: number;
  finished: boolean;
  commit: boolean;
  started: boolean;
  edgeTap: boolean;
  pan: boolean;
  panX: number;
  panY: number;
}
interface Turn {
  from: View;
  to: View;
  target: number;
  direction: 1 | -1;
  progress: number;
  gesture?: Gesture;
}

export class FlipbookController implements Flipbook {
  readonly ready: Promise<void>;
  private readonly lifetime = new AbortController();
  private readonly ui: ReaderUI;
  private readonly observer: ResizeObserver;
  private readonly sound: PageTurnSound;
  private readonly motion = matchMedia('(prefers-reduced-motion: reduce)');
  private events = new EventTarget();
  private provider?: DocumentProvider;
  private scheduler?: RenderScheduler;
  private renderer?: BookRenderer;
  private size: PageSize = { width: 600, height: 800 };
  private view?: View;
  private state: FlipbookState;
  private version = 0;
  private busy = false;
  private pending?: number;
  private pendingZoom?: number;
  private target?: number;
  private turn?: Turn;
  private gesture?: Gesture;
  private raf = 0;
  private zoomTimer: ReturnType<typeof setTimeout> | undefined;
  private refreshAfterPan = false;
  private panX = 0;
  private panY = 0;
  private width = 0;
  private height = 0;
  constructor(
    container: HTMLElement,
    private options: FlipbookOptions,
    private assetBase: string,
  ) {
    if (!(container instanceof HTMLElement))
      throw new TypeError('A container HTMLElement is required.');
    if (!options?.source) throw new TypeError('A PDF or image source is required.');
    if (
      options.initialPage !== undefined &&
      (!Number.isInteger(options.initialPage) || options.initialPage < 1)
    )
      throw new RangeError('initialPage must be a positive integer.');
    if (
      options.memoryBudgetMB !== undefined &&
      (!Number.isFinite(options.memoryBudgetMB) || options.memoryBudgetMB < 1)
    )
      throw new RangeError('memoryBudgetMB must be at least 1.');
    if (
      options.duration !== undefined &&
      (!Number.isFinite(options.duration) || options.duration < 0)
    )
      throw new RangeError('duration must be nonnegative.');
    this.state = {
      page: options.initialPage ?? 1,
      pageCount: 0,
      visiblePages: [],
      zoom: 1,
      sound: options.sound ?? false,
      pageMode: resolveMode(options.pageMode ?? 'auto', container.clientWidth),
      renderer: 'flat',
      status: 'loading',
    };
    this.sound = new PageTurnSound(this.state.sound);
    this.ui = new ReaderUI(
      container,
      options.label ?? 'Interactive flipbook',
      options.source,
      this.action,
      (page) => this.goToPage(page),
      this.lifetime.signal,
    );
    this.ui.update(this.state);
    this.ui.status('Opening book…');
    this.ui.root.addEventListener('keydown', this.keydown, { signal: this.lifetime.signal });
    for (const type of [
      'pointerdown',
      'pointermove',
      'pointerup',
      'pointercancel',
      'lostpointercapture',
    ] as const)
      this.ui.stage.addEventListener(type, this.pointer, { signal: this.lifetime.signal });
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(this.ui.root);
    this.motion.addEventListener('change', this.motionChanged, { signal: this.lifetime.signal });
    this.ready = this.initialize();
    void this.ready.catch(() => {});
  }
  private alive() {
    return this.state.status !== 'destroyed';
  }
  private checkAlive() {
    if (!this.alive() || this.lifetime.signal.aborted)
      throw new DOMException('Flipbook destroyed.', 'AbortError');
  }
  private emit<K extends keyof FlipbookEvents>(name: K, data: FlipbookEvents[K]): void {
    this.events.dispatchEvent(new CustomEvent(name, { detail: data }));
  }
  on<K extends keyof FlipbookEvents>(
    event: K,
    listener: (data: FlipbookEvents[K]) => void,
  ): () => void {
    const wrapper = (e: Event) => listener((e as CustomEvent<FlipbookEvents[K]>).detail);
    const target = this.events;
    target.addEventListener(event, wrapper);
    return () => target.removeEventListener(event, wrapper);
  }
  getState(): FlipbookState {
    return { ...this.state, visiblePages: [...this.state.visiblePages] };
  }
  private async initialize(): Promise<void> {
    try {
      this.provider = await openDocument(this.options.source, this.assetBase, this.lifetime.signal);
      this.checkAlive();
      this.state.pageCount = this.provider.pageCount;
      validatePage(this.state.page, this.state.pageCount);
      this.size = await this.provider.size(1, this.lifetime.signal);
      this.checkAlive();
      this.scheduler = new RenderScheduler(
        this.provider,
        (this.options.memoryBudgetMB ?? 96) * 1024 * 1024,
      );
      this.createRenderer();
      this.measure();
      await this.refresh();
      this.checkAlive();
      this.drain();
    } catch (e) {
      if (this.alive()) this.fail(e, true);
      else this.provider?.dispose();
      throw e;
    }
  }
  private createRenderer(forceFlat = false): void {
    this.renderer?.dispose();
    if (
      !forceFlat &&
      this.options.renderer !== 'flat' &&
      !(this.options.renderer !== 'webgl' && this.motion.matches)
    ) {
      try {
        this.renderer = new WebGLBookRenderer(() => this.fallback());
        this.state.renderer = 'webgl';
      } catch {
        this.renderer = new FlatBookRenderer();
        this.state.renderer = 'flat';
      }
    } else {
      this.renderer = new FlatBookRenderer();
      this.state.renderer = 'flat';
    }
    this.ui.stage.append(this.renderer.element);
    this.emit('rendererchange', this.getState());
  }
  private measure(): boolean {
    const w = this.ui.stage.clientWidth,
      h = this.ui.stage.clientHeight;
    const changed = w !== this.width || h !== this.height;
    this.width = w;
    this.height = h;
    this.state.pageMode = resolveMode(this.options.pageMode ?? 'auto', this.ui.root.clientWidth);
    this.renderer?.resize(Math.max(w, 1), Math.max(h, 1));
    return changed;
  }
  private rasterSize(): PageSize {
    const columns = this.state.pageMode === 'double' ? 2 : 1,
      ratio = this.size.height / this.size.width;
    const width = Math.max(
      64,
      Math.min((this.width * 0.94) / columns, (this.height * 0.92) / ratio),
    );
    const multiplier = Math.min(devicePixelRatio || 1, 2) * this.state.zoom;
    return { width: Math.ceil(width * multiplier), height: Math.ceil(width * ratio * multiplier) };
  }
  private snapshot(pages: (number | null)[], surfaces: View['surfaces']): View {
    return {
      pages,
      surfaces: new Map(
        pages.filter((n): n is number => n !== null).map((n) => [n, surfaces.get(n)!]),
      ),
      size: this.size,
    };
  }
  private cancelTurn(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.turn = undefined;
    const gesture = this.gesture;
    this.gesture = undefined;
    this.ui.stage.dataset.dragging = 'false';
    if (gesture && this.ui.stage.hasPointerCapture(gesture.id))
      this.ui.stage.releasePointerCapture(gesture.id);
    this.target = undefined;
  }
  private async refresh(): Promise<void> {
    if (!this.scheduler || !this.renderer || !this.alive()) return;
    const version = ++this.version;
    this.refreshAfterPan = false;
    this.cancelTurn();
    if (this.view) this.renderer.show(this.view);
    this.busy = true;
    this.ui.status('Preparing pages…');
    const mode = this.state.pageMode,
      raster = this.rasterSize();
    const pages = visiblePages(this.state.page, this.state.pageCount, this.state.pageMode);
    try {
      const surfaces = await this.scheduler.prepare(
        pages.filter((n): n is number => n !== null),
        raster,
      );
      if (!this.alive() || version !== this.version) return;
      const currentRaster = this.rasterSize();
      if (
        mode !== this.state.pageMode ||
        raster.width !== currentRaster.width ||
        raster.height !== currentRaster.height
      )
        return this.refresh();
      this.view = this.snapshot(pages, surfaces);
      this.scheduler.retainView(this.view.surfaces.values());
      this.renderer.show(this.view);
      this.renderer.setTransform(this.state.zoom, this.panX, this.panY);
      this.state.visiblePages = pages;
      this.state.status = 'ready';
      this.busy = false;
      this.ui.update(this.state);
      this.ui.status('');
      this.applyPendingZoom();
      this.prefetch();
      this.drain();
    } catch (e) {
      if (this.alive() && version === this.version) this.fail(e, !this.view);
      if (!this.view) throw e;
    }
  }
  private resize(): void {
    if (!this.alive()) return;
    if (this.measure() && this.view) void this.refresh().catch(() => {});
  }
  private fallback(): void {
    if (!this.alive() || this.state.renderer === 'flat') return;
    this.createRenderer(true);
    this.measure();
    if (this.view) {
      // Prepare the settled pages again: an interrupted navigation may already
      // have evicted the old surfaces. refresh also restores zoom and pan.
      void this.refresh().catch(() => {});
    }
    // Before the first view exists, keep its generation alive. The in-flight
    // refresh will present its surfaces using the newly installed flat renderer.
  }
  private motionChanged = () => {
    if (this.options.renderer !== 'webgl' && this.motion.matches) this.fallback();
  };
  private fail(value: unknown, initial = false): void {
    const error = value instanceof Error ? value : new Error(String(value));
    if (error.name === 'AbortError') return;
    this.cancelTurn();
    this.busy = false;
    this.pending = undefined;
    this.pendingZoom = undefined;
    this.state.status = initial ? 'error' : 'ready';
    if (this.view) this.renderer?.show(this.view);
    this.ui.update(this.state);
    this.ui.status(error.message, true);
    this.emit('error', error);
    if (initial) {
      this.scheduler?.dispose();
      this.provider?.dispose();
    }
  }
  next(): void {
    this.step(1);
  }
  previous(): void {
    this.step(-1);
  }
  private step(direction: 1 | -1): void {
    if (!this.alive()) return;
    if (!this.state.pageCount) {
      void this.ready.then(() => this.step(direction)).catch(() => {});
      return;
    }
    this.goToPage(
      adjacentPage(
        this.pending ?? this.target ?? this.state.page,
        this.state.pageCount,
        this.state.pageMode,
        direction,
      ),
    );
  }
  goToPage(page: number): void {
    if (!this.alive()) return;
    if (!Number.isInteger(page) || page < 1)
      throw new RangeError('Page must be a positive integer.');
    if (this.state.pageCount) validatePage(page, this.state.pageCount);
    this.sound.unlock();
    if (this.busy || !this.view || (this.gesture && !this.gesture.pan)) {
      this.pending = page;
      return;
    }
    if (page !== this.state.page) void this.navigate(page).catch((e) => this.fail(e));
  }
  private drain(): void {
    if (this.busy || !this.view || !this.alive() || this.pending === undefined) return;
    const target = this.pending;
    this.pending = undefined;
    try {
      this.goToPage(target);
    } catch (e) {
      this.fail(e);
    }
  }
  private async navigate(target: number, gesture?: Gesture): Promise<void> {
    if (!this.view || !this.scheduler || !this.renderer) return;
    const version = ++this.version,
      fromPages = this.view.pages,
      toPages = visiblePages(target, this.state.pageCount, this.state.pageMode);
    this.busy = true;
    this.target = target;
    this.state.status = 'turning';
    this.resetZoom();
    this.ui.update(this.state);
    this.ui.status('Preparing pages…');
    const surfaces = await this.scheduler.prepare(
      [...new Set([...fromPages, ...toPages].filter((n): n is number => n !== null))],
      this.rasterSize(),
    );
    if (!this.alive() || version !== this.version) return;
    const turn: Turn = {
      from: this.snapshot(fromPages, surfaces),
      to: this.snapshot(toPages, surfaces),
      target,
      direction: target > this.state.page ? 1 : -1,
      progress: gesture?.progress ?? 0,
      gesture,
    };
    this.turn = turn;
    this.ui.status('');
    const adjacent = adjacentPage(
      this.state.page,
      this.state.pageCount,
      this.state.pageMode,
      turn.direction,
    );
    if (
      this.state.renderer === 'flat' ||
      target !== adjacent ||
      JSON.stringify(fromPages) === JSON.stringify(toPages)
    ) {
      if (gesture && !gesture.finished) {
        this.renderer.turn(turn.from, turn.to, turn.direction, turn.progress);
        return;
      }
      this.complete(turn, gesture ? gesture.commit : true);
      return;
    }
    if (gesture && !gesture.finished)
      this.renderer.turn(turn.from, turn.to, turn.direction, turn.progress);
    else this.animate(turn, gesture && !gesture.commit ? 0 : 1);
  }
  private animate(turn: Turn, end: number): void {
    cancelAnimationFrame(this.raf);
    const start = turn.progress,
      started = performance.now();
    const duration =
      this.state.renderer === 'flat' ? 0 : (this.options.duration ?? 600) * Math.abs(end - start);
    const tick = (time: number) => {
      if (!this.alive() || this.turn !== turn) return;
      const t = duration === 0 ? 1 : Math.min(1, (time - started) / duration),
        ease = t * t * (3 - 2 * t);
      turn.progress = start + (end - start) * ease;
      this.renderer!.turn(turn.from, turn.to, turn.direction, turn.progress);
      if (t < 1) this.raf = requestAnimationFrame(tick);
      else {
        this.raf = 0;
        this.complete(turn, end === 1);
      }
    };
    if (duration === 0) tick(started);
    else this.raf = requestAnimationFrame(tick);
  }
  private complete(turn: Turn, commit: boolean): void {
    if (!this.alive() || this.turn !== turn) return;
    this.view = commit ? turn.to : turn.from;
    this.scheduler!.retainView(this.view.surfaces.values());
    if (commit) this.state.page = turn.target;
    this.state.visiblePages = [...this.view.pages];
    this.state.status = 'ready';
    this.renderer!.show(this.view);
    this.cancelTurn();
    this.busy = false;
    this.ui.update(this.state);
    this.ui.status('');
    this.applyPendingZoom();
    if (commit) {
      if (turn.from.pages.join() !== turn.to.pages.join()) this.sound.play();
      this.emit('pagechange', this.getState());
    }
    this.prefetch();
    this.drain();
  }
  private prefetch(): void {
    this.scheduler?.prefetch(
      [
        adjacentPage(this.state.page, this.state.pageCount, this.state.pageMode, -1),
        adjacentPage(this.state.page, this.state.pageCount, this.state.pageMode, 1),
      ],
      this.rasterSize(),
    );
  }
  setZoom(scale: number): void {
    if (!Number.isFinite(scale)) throw new RangeError('Zoom must be finite.');
    if (!this.alive()) return;
    if (this.busy && this.view) {
      this.pendingZoom = Math.max(1, Math.min(3, scale));
      return;
    }
    this.state.zoom = Math.max(1, Math.min(3, scale));
    if (this.state.zoom === 1) this.panX = this.panY = 0;
    this.renderer?.setTransform(this.state.zoom, this.panX, this.panY);
    this.ui.update(this.state);
    this.emit('zoomchange', this.getState());
    clearTimeout(this.zoomTimer);
    if (this.view)
      this.zoomTimer = setTimeout(() => {
        if (!this.alive()) return;
        if (this.gesture?.pan) this.refreshAfterPan = true;
        else void this.refresh().catch(() => {});
      }, 180);
  }
  private applyPendingZoom(): void {
    const zoom = this.pendingZoom;
    this.pendingZoom = undefined;
    if (zoom !== undefined) this.setZoom(zoom);
  }
  resetZoom(): void {
    clearTimeout(this.zoomTimer);
    this.refreshAfterPan = false;
    this.pendingZoom = undefined;
    const changed = this.state.zoom !== 1;
    this.state.zoom = 1;
    this.panX = this.panY = 0;
    this.renderer?.setTransform(1, 0, 0);
    if (changed) this.emit('zoomchange', this.getState());
    this.ui.update(this.state);
  }
  setSound(enabled: boolean): void {
    if (!this.alive()) return;
    this.sound.setEnabled(enabled);
    if (this.state.sound === enabled) return;
    this.state.sound = enabled;
    this.ui.update(this.state);
    this.emit('soundchange', this.getState());
  }
  private action = (action: Action) => {
    this.sound.unlock();
    if (action === 'previous') this.previous();
    else if (action === 'next') this.next();
    else if (action === 'zoomIn') this.setZoom(this.state.zoom * 1.25);
    else if (action === 'zoomOut') this.setZoom(this.state.zoom / 1.25);
    else if (action === 'sound') this.setSound(!this.state.sound);
    else if (action === 'fit') {
      this.resetZoom();
    } else if (action === 'fullscreen') {
      const promise =
        document.fullscreenElement === this.ui.root
          ? document.exitFullscreen()
          : this.ui.root.requestFullscreen?.();
      void promise?.catch((e) => this.fail(e));
    }
  };
  private keydown = (event: KeyboardEvent) => {
    if (
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      (event.target instanceof HTMLElement &&
        event.target.closest('input,textarea,select,[contenteditable="true"]'))
    )
      return;
    const actions: Record<string, () => void> = {
      ArrowRight: () => this.next(),
      ArrowLeft: () => this.previous(),
      Home: () => this.goToPage(1),
      End: () => this.goToPage(this.state.pageCount),
      '+': () => this.action('zoomIn'),
      '-': () => this.action('zoomOut'),
      '0': () => this.action('fit'),
    };
    if (actions[event.key]) {
      this.sound.unlock();
      event.preventDefault();
      actions[event.key]!();
    }
  };
  private pointer = (event: PointerEvent) => {
    if (!this.view || !this.alive()) return;
    if (event.type === 'pointerdown') {
      if (event.button !== 0 || this.gesture || this.busy) return;
      const bounds = this.ui.stage.getBoundingClientRect(),
        x = event.clientX - bounds.left;
      const pan = this.state.zoom > 1;
      const direction: 1 | -1 = x < bounds.width / 2 ? -1 : 1;
      const gesture: Gesture = {
        id: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        x: event.clientX,
        y: event.clientY,
        direction,
        progress: 0,
        finished: false,
        commit: false,
        started: false,
        edgeTap: x <= bounds.width * 0.22 || x >= bounds.width * 0.78,
        pan,
        panX: this.panX,
        panY: this.panY,
      };
      this.gesture = gesture;
      this.ui.stage.dataset.dragging = 'true';
      this.ui.stage.setPointerCapture(event.pointerId);
      this.ui.root.focus({ preventScroll: true });
      this.sound.unlock();
      event.preventDefault();
    } else {
      const gesture = this.gesture;
      if (!gesture || gesture.id !== event.pointerId) return;
      if (event.type === 'pointermove') {
        gesture.x = event.clientX;
        gesture.y = event.clientY;
        if (gesture.pan) {
          const limitX = (this.width * (this.state.zoom - 1)) / 2,
            limitY = (this.height * (this.state.zoom - 1)) / 2;
          this.panX = Math.max(
            -limitX,
            Math.min(limitX, gesture.panX + gesture.x - gesture.startX),
          );
          this.panY = Math.max(
            -limitY,
            Math.min(limitY, gesture.panY + gesture.y - gesture.startY),
          );
          this.renderer!.setTransform(this.state.zoom, this.panX, this.panY);
        } else {
          const dx = gesture.startX - gesture.x;
          if (!gesture.started) {
            if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(gesture.y - gesture.startY)) return;
            if (this.state.pageMode === 'single') gesture.direction = dx > 0 ? 1 : -1;
            const target = adjacentPage(
              this.state.page,
              this.state.pageCount,
              this.state.pageMode,
              gesture.direction,
            );
            if (target === this.state.page) return;
            gesture.started = true;
            void this.navigate(target, gesture).catch((e) => this.fail(e));
          }
          gesture.progress = Math.max(
            0,
            Math.min(1, (dx * gesture.direction) / (this.width * 0.65)),
          );
          if (this.turn) {
            this.turn.progress = gesture.progress;
            this.renderer!.turn(this.turn.from, this.turn.to, gesture.direction, gesture.progress);
          }
        }
      } else {
        gesture.finished = true;
        gesture.commit =
          event.type === 'pointerup' &&
          ((gesture.edgeTap &&
            Math.hypot(gesture.x - gesture.startX, gesture.y - gesture.startY) < 6) ||
            gesture.progress > 0.35);
        this.gesture = undefined;
        this.ui.stage.dataset.dragging = 'false';
        if (this.ui.stage.hasPointerCapture(event.pointerId))
          this.ui.stage.releasePointerCapture(event.pointerId);
        if (!gesture.pan && this.turn?.gesture === gesture)
          this.animate(this.turn, gesture.commit ? 1 : 0);
        else if (!gesture.pan && !gesture.started && gesture.commit) {
          const target = adjacentPage(
            this.state.page,
            this.state.pageCount,
            this.state.pageMode,
            gesture.direction,
          );
          if (target !== this.state.page)
            void this.navigate(target, gesture).catch((e) => this.fail(e));
        }
        if (gesture.pan && this.refreshAfterPan) void this.refresh().catch(() => {});
        if (!this.busy) this.drain();
      }
    }
  };
  destroy(): void {
    if (!this.alive()) return;
    this.state.status = 'destroyed';
    this.version++;
    this.lifetime.abort();
    this.observer.disconnect();
    this.cancelTurn();
    clearTimeout(this.zoomTimer);
    this.scheduler?.dispose();
    this.provider?.dispose();
    this.renderer?.dispose();
    this.sound.dispose();
    this.ui.dispose();
    this.events = new EventTarget();
    this.view = undefined;
    this.pending = undefined;
    this.pendingZoom = undefined;
  }
}
