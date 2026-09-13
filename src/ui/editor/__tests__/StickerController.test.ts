import { describe, it, expect, beforeEach } from 'vitest';
import { StickerController } from '../StickerController';
import type { Card } from '../../../types';

describe('StickerController', () => {
  let controller: StickerController;
  let doc: Document;

  beforeEach(() => {
    controller = new StickerController();
    doc = document.implementation.createHTMLDocument('test');
    doc.body.innerHTML = `
      <div class="cardbord-sticker-grid">
        ${controller.renderControlsMarkup()}
      </div>
      <button id="cb-visual-clear-stickers"></button>
    `;
  });

  it('should initialize empty drafts and build empty array', () => {
    expect(controller.getDrafts()).toEqual({});
    expect(controller.buildCardStickers()).toEqual([]);
  });

  it('should set drafts from card with stickers', () => {
    const card: Card = {
      id: 'c1',
      text: 'Test',
      color: '#fff',
      row: 0,
      col: 0,
      stickers: [{ corner: 'top-right', text: 'Important' }]
    };

    controller.setFromCard(card);
    expect(controller.getDrafts()).toEqual({ 'top-right': 'Important' });
  });

  it('should truncate stickers to 16 characters in buildCardStickers', () => {
    const card: Card = {
      id: 'c1',
      text: 'Test',
      color: '#fff',
      row: 0,
      col: 0,
      stickers: [{ corner: 'top-left', text: '12345678901234567890' }]
    };

    controller.setFromCard(card);
    const built = controller.buildCardStickers();
    expect(built).toHaveLength(1);
    expect(built[0].text).toBe('1234567890123456');
  });

  it('should bind inputs in DOM and handle edits and clear buttons', () => {
    const card: Card = {
      id: 'c1',
      text: 'Test',
      color: '#fff',
      row: 0,
      col: 0,
      stickers: [{ corner: 'top-left', text: 'Tag1' }]
    };

    controller.bindEditorInputs(doc, card);

    const input = doc.getElementById('cb-visual-sticker-top-left') as HTMLInputElement;
    expect(input.value).toBe('Tag1');

    // Clear single corner
    const clearBtn = doc.querySelector('.cardbord-sticker-clear[data-corner="top-left"]') as HTMLButtonElement;
    clearBtn.click();
    expect(input.value).toBe('');
    expect(controller.getDrafts()['top-left']).toBeUndefined();
  });

  it('should create sticker element with emoji support', () => {
    const card: Card = { id: 'c1', text: 'Test', color: '#ff0', row: 0, col: 0 };
    const el = controller.createStickerElement(card, { corner: 'bottom-left', text: '🔥' }, doc);
    expect(el.className).toContain('cardbord-card-sticker--bottom-left');
    expect(el.className).toContain('cardbord-card-sticker--emoji');
    expect(el.textContent).toBe('🔥');
  });
});
