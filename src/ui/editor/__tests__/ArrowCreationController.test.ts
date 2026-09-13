import { describe, it, expect, beforeEach } from 'vitest';
import { ArrowCreationController } from '../ArrowCreationController';
import type { Card, Arrow } from '../../../types';

describe('ArrowCreationController', () => {
  let doc: Document;
  let controller: ArrowCreationController;
  let createdArrow: Arrow | null = null;
  const cards: Card[] = [
    { id: 'c1', text: 'Card 1', color: '#fff', row: 0, col: 0 },
    { id: 'c2', text: 'Card 2', color: '#fff', row: 1, col: 1 }
  ];

  beforeEach(() => {
    doc = document.implementation.createHTMLDocument('test');
    createdArrow = null;

    const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'cardbord-editor-arrows-svg');
    doc.body.appendChild(svg);

    controller = new ArrowCreationController({
      getTargetDoc: () => doc,
      getCurrentCards: () => cards,
      getCurrentZoom: () => 1,
      getColor: () => '#ff0000',
      onArrowCreated: (arrow) => {
        createdArrow = arrow;
      }
    });
  });

  it('should start arrow creation and set state', () => {
    controller.start(cards[0], 'right');
    expect(controller.isCreatingArrow).toBe(true);
    expect(controller.startCard).toBe(cards[0]);
    expect(controller.startSide).toBe('right');
  });

  it('should cancel arrow creation and reset state', () => {
    controller.start(cards[0], 'right');
    controller.cancel();
    expect(controller.isCreatingArrow).toBe(false);
    expect(controller.startCard).toBeNull();
  });

  it('should complete arrow creation when target is valid and distinct', () => {
    controller.start(cards[0], 'right');
    controller.complete(cards[1], 'left');

    expect(createdArrow).not.toBeNull();
    expect(createdArrow?.from).toBe('c1');
    expect(createdArrow?.to).toBe('c2');
    expect(createdArrow?.fromSide).toBe('right');
    expect(createdArrow?.toSide).toBe('left');
    expect(createdArrow?.color).toBe('#ff0000');
    expect(controller.isCreatingArrow).toBe(false);
  });

  it('should not create arrow if target is the same card', () => {
    controller.start(cards[0], 'right');
    controller.complete(cards[0], 'bottom');

    expect(createdArrow).toBeNull();
    expect(controller.isCreatingArrow).toBe(false);
  });
});
