import { describe, it, expect, beforeEach } from 'vitest';
import { CanvasViewportController } from '../CanvasViewportController';

describe('CanvasViewportController', () => {
  let doc: Document;
  let controller: CanvasViewportController;
  const gridDimensions = { width: 400, height: 300 };

  beforeEach(() => {
    doc = document.implementation.createHTMLDocument('test');
    doc.body.innerHTML = `
      <div id="cb-visual-workspace-viewport" style="width: 800px; height: 600px;">
        <div id="cb-visual-grid-container">
          <div id="cb-visual-grid-scale">
            <div id="cb-visual-grid-wrapper">
              <div id="cb-visual-column-headers"></div>
              <div id="cb-visual-grid-canvas"></div>
            </div>
          </div>
        </div>
      </div>
      <span id="cb-visual-zoom-value"></span>
      <button id="cb-visual-zoom-fit"></button>
      <button id="cb-visual-zoom-in"></button>
      <button id="cb-visual-zoom-out"></button>
    `;

    controller = new CanvasViewportController({
      getTargetDoc: () => doc,
      getGridDimensions: () => gridDimensions
    });
  });

  it('should initialize with default zoom = 1 and isAuto = true', () => {
    expect(controller.getZoom()).toBe(1);
    expect(controller.isAuto()).toBe(true);
  });

  it('should clamp zoom within [ZOOM_MIN, ZOOM_MAX]', () => {
    expect(controller.clampZoom(0.1)).toBe(CanvasViewportController.ZOOM_MIN);
    expect(controller.clampZoom(5)).toBe(CanvasViewportController.ZOOM_MAX);
    expect(controller.clampZoom(1)).toBe(1);
    expect(controller.clampZoom(NaN)).toBe(1);
  });

  it('should adjust zoom and switch auto mode off', () => {
    controller.adjustZoom(0.2);
    expect(controller.isAuto()).toBe(false);
    expect(controller.getZoom()).toBeCloseTo(1.2);
  });

  it('should apply fit zoom', () => {
    controller.applyFitZoom();
    expect(controller.isAuto()).toBe(true);
  });

  it('should reset properly', () => {
    controller.adjustZoom(0.3);
    controller.reset();
    expect(controller.getZoom()).toBe(1);
    expect(controller.isAuto()).toBe(true);
  });
});
