import { describe, it, expect, beforeEach } from 'vitest';
import { CardDragController } from '../CardDragController';
import type { Card } from '../../../types';

describe('CardDragController', () => {
  let doc: Document;
  let controller: CardDragController;
  let movedCard: Card | null = null;
  let movedTo: { row: number; col: number } | null = null;

  beforeEach(() => {
    doc = document.implementation.createHTMLDocument('test');
    movedCard = null;
    movedTo = null;

    controller = new CardDragController({
      getTargetDoc: () => doc,
      onCardMoved: (card, row, col) => {
        movedCard = card;
        movedTo = { row, col };
      }
    });
  });

  it('should initialize with not dragging state', () => {
    expect(controller.isDragging).toBe(false);
    expect(controller.draggedCard).toBeNull();
  });

  it('should move card to empty cell', () => {
    const cards: Card[] = [
      { id: '1', text: 'Card 1', color: '#fff', row: 0, col: 0 }
    ];

    controller.moveCard(cards, cards[0], 1, 1);
    expect(cards[0].row).toBe(1);
    expect(cards[0].col).toBe(1);
  });

  it('should swap positions when moving onto an existing card', () => {
    const cards: Card[] = [
      { id: '1', text: 'Card 1', color: '#fff', row: 0, col: 0 },
      { id: '2', text: 'Card 2', color: '#fff', row: 1, col: 1 }
    ];

    controller.moveCard(cards, cards[0], 1, 1);
    expect(cards[0].row).toBe(1);
    expect(cards[0].col).toBe(1);
    expect(cards[1].row).toBe(0);
    expect(cards[1].col).toBe(0);
  });

  it('should clear dragover highlights', () => {
    const cell = doc.createElement('div');
    cell.className = 'cardbord-editor-cell cardbord-editor-cell-dragover';
    doc.body.appendChild(cell);

    controller.clearDragHighlights();
    expect(cell.classList.contains('cardbord-editor-cell-dragover')).toBe(false);
  });

  it('should setup cell drop and trigger onCardMoved callback', () => {
    const cell = doc.createElement('div');
    cell.dataset.row = '2';
    cell.dataset.col = '3';
    doc.body.appendChild(cell);

    controller.setupCellDrop(cell);

    const card: Card = { id: 'test', text: 'Test', color: '#fff', row: 0, col: 0 };
    (controller as any).currentDraggedCard = card;

    const dropEvent = new Event('drop', { bubbles: true, cancelable: true });
    cell.dispatchEvent(dropEvent);

    expect(movedCard).toBe(card);
    expect(movedTo).toEqual({ row: 2, col: 3 });
  });
});
