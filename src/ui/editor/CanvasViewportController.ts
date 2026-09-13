import type { Point } from '../../types';

export interface ViewportControllerOptions {
  getTargetDoc: () => Document;
  getGridDimensions: () => { width: number; height: number };
}

export class CanvasViewportController {
  static readonly ZOOM_MIN = 0.45;
  static readonly ZOOM_MAX = 1.6;
  static readonly ZOOM_STEP = 0.1;
  static readonly VIEWPORT_PADDING = 48;
  static readonly MIN_FIT_ZOOM = 0.65;

  private currentZoom = 1;
  private fitZoom = 1;
  private isAutoZoom = true;
  private viewportObserver: ResizeObserver | null = null;
  private pendingLayoutRefresh: number | null = null;
  private gridPixelWidth = 0;
  private gridPixelHeight = 0;

  constructor(private options: ViewportControllerOptions) {}

  getZoom(): number {
    return this.currentZoom;
  }

  isAuto(): boolean {
    return this.isAutoZoom;
  }

  reset(): void {
    this.currentZoom = 1;
    this.fitZoom = 1;
    this.isAutoZoom = true;
    this.gridPixelWidth = 0;
    this.gridPixelHeight = 0;
    this.disposeObserver();
  }

  clampZoom(value: number): number {
    if (Number.isNaN(value) || !Number.isFinite(value)) {
      return 1;
    }
    return Math.min(CanvasViewportController.ZOOM_MAX, Math.max(CanvasViewportController.ZOOM_MIN, value));
  }

  computeFitZoom(viewport: HTMLElement, gridWidth: number, gridHeight: number): number {
    const availableWidth = Math.max(
      viewport.clientWidth - CanvasViewportController.VIEWPORT_PADDING,
      100
    );
    const availableHeight = Math.max(
      viewport.clientHeight - CanvasViewportController.VIEWPORT_PADDING,
      100
    );

    if (gridWidth === 0 || gridHeight === 0) {
      return 1;
    }

    const widthScale = availableWidth / gridWidth;
    const heightScale = availableHeight / gridHeight;

    let scale: number;
    if (widthScale < 1) {
      scale = Math.min(widthScale, heightScale);
    } else {
      scale = Math.min(widthScale, CanvasViewportController.ZOOM_MAX);
    }

    if (scale < CanvasViewportController.MIN_FIT_ZOOM && widthScale >= CanvasViewportController.MIN_FIT_ZOOM) {
      scale = CanvasViewportController.MIN_FIT_ZOOM;
    }

    scale = Math.min(scale, CanvasViewportController.ZOOM_MAX);
    return this.clampZoom(scale);
  }

  applyZoom(zoom: number): void {
    const doc = this.options.getTargetDoc();
    const scaleContainer = doc.getElementById('cb-visual-grid-scale');
    const canvas = doc.getElementById('cb-visual-grid-canvas');
    const headersContainer = doc.getElementById('cb-visual-column-headers');
    if (!scaleContainer || !canvas) return;

    this.currentZoom = this.clampZoom(zoom);
    if (!this.gridPixelWidth || !this.gridPixelHeight) {
      const { width, height } = this.options.getGridDimensions();
      this.gridPixelWidth = width;
      this.gridPixelHeight = height;
    }

    scaleContainer.style.transform = `scale(${this.currentZoom})`;
    scaleContainer.style.transformOrigin = 'top left';
    scaleContainer.dataset.zoom = this.currentZoom.toFixed(3);

    const container = doc.getElementById('cb-visual-grid-container');
    if (container) {
      container.style.width = `${this.gridPixelWidth * this.currentZoom}px`;
      container.style.height = `${this.gridPixelHeight * this.currentZoom}px`;
    }
    if (headersContainer) {
      headersContainer.style.width = `${this.gridPixelWidth}px`;
    }

    this.updateZoomDisplay();
  }

  updateZoomDisplay(): void {
    const doc = this.options.getTargetDoc();
    const zoomValue = doc.getElementById('cb-visual-zoom-value');
    if (zoomValue) {
      zoomValue.textContent = `${Math.round(this.currentZoom * 100)}%`;
    }

    const fitBtn = doc.getElementById('cb-visual-zoom-fit');
    if (fitBtn) {
      fitBtn.classList.toggle('cardbord-btn-active', this.isAutoZoom);
    }

    const zoomOutBtn = doc.getElementById('cb-visual-zoom-out') as HTMLButtonElement | null;
    const zoomInBtn = doc.getElementById('cb-visual-zoom-in') as HTMLButtonElement | null;

    if (zoomOutBtn) {
      zoomOutBtn.disabled = this.currentZoom <= CanvasViewportController.ZOOM_MIN + 0.01;
    }
    if (zoomInBtn) {
      zoomInBtn.disabled = this.currentZoom >= CanvasViewportController.ZOOM_MAX - 0.01;
    }
  }

  refreshWorkspaceLayout(forceFit: boolean = false): void {
    const doc = this.options.getTargetDoc();
    const scaleContainer = doc.getElementById('cb-visual-grid-scale');
    const wrapper = doc.getElementById('cb-visual-grid-wrapper');
    const canvas = doc.getElementById('cb-visual-grid-canvas');
    const headersContainer = doc.getElementById('cb-visual-column-headers');
    const viewport = doc.getElementById('cb-visual-workspace-viewport');
    if (!scaleContainer || !wrapper || !canvas || !viewport) return;

    const { width, height } = this.options.getGridDimensions();
    this.gridPixelWidth = width;
    this.gridPixelHeight = height;
    scaleContainer.style.width = `${width}px`;
    wrapper.style.width = `${width}px`;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    if (headersContainer) {
      headersContainer.style.width = `${width}px`;
    }

    const container = doc.getElementById('cb-visual-grid-container');
    if (container) {
      container.style.width = `${width * this.currentZoom}px`;
      container.style.height = `${height * this.currentZoom}px`;
    }

    this.fitZoom = this.computeFitZoom(viewport, width, height);
    if (forceFit) {
      this.isAutoZoom = true;
    }

    if (this.isAutoZoom) {
      this.applyZoom(this.fitZoom);
    } else {
      this.applyZoom(this.currentZoom);
    }
  }

  scheduleLayoutRefresh(forceFit: boolean = false): void {
    const doc = this.options.getTargetDoc();
    const win = doc.defaultView;
    if (!win) {
      this.refreshWorkspaceLayout(forceFit);
      return;
    }

    if (this.pendingLayoutRefresh !== null) {
      win.cancelAnimationFrame(this.pendingLayoutRefresh);
    }

    this.pendingLayoutRefresh = win.requestAnimationFrame(() => {
      this.pendingLayoutRefresh = null;
      this.refreshWorkspaceLayout(forceFit);
    });
  }

  initObserver(): void {
    const doc = this.options.getTargetDoc();
    const viewport = doc.getElementById('cb-visual-workspace-viewport');
    if (!viewport || typeof ResizeObserver === 'undefined') return;

    this.viewportObserver?.disconnect();
    this.viewportObserver = new ResizeObserver(() => {
      this.scheduleLayoutRefresh(this.isAutoZoom);
    });
    this.viewportObserver.observe(viewport);
  }

  disposeObserver(): void {
    if (this.viewportObserver) {
      this.viewportObserver.disconnect();
      this.viewportObserver = null;
    }

    const doc = this.options.getTargetDoc();
    const win = doc.defaultView;
    if (win && this.pendingLayoutRefresh !== null) {
      win.cancelAnimationFrame(this.pendingLayoutRefresh);
      this.pendingLayoutRefresh = null;
    }
  }

  adjustZoom(delta: number): void {
    this.isAutoZoom = false;
    const nextZoom = this.clampZoom(this.currentZoom + delta);
    this.applyZoom(nextZoom);
  }

  applyFitZoom(): void {
    this.isAutoZoom = true;
    this.scheduleLayoutRefresh(true);
  }

  clientToGridCoordinates(event: MouseEvent): Point {
    const doc = this.options.getTargetDoc();
    const wrapper = doc.getElementById('cb-visual-grid-wrapper');
    if (!wrapper) {
      return { x: event.clientX, y: event.clientY };
    }
    const rect = wrapper.getBoundingClientRect();
    const scale = this.currentZoom || 1;
    return {
      x: (event.clientX - rect.left) / scale,
      y: (event.clientY - rect.top) / scale
    };
  }
}
