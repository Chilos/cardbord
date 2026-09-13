import type { Card } from '../../types';

export interface CardDragCallbacks {
  getTargetDoc: () => Document;
  onCardMoved: (card: Card, targetRow: number, targetCol: number) => void;
}

export class CardDragController {
  private isDraggingCard = false;
  private currentDraggedCard: Card | null = null;

  constructor(private callbacks: CardDragCallbacks) {}

  get isDragging(): boolean {
    return this.isDraggingCard;
  }

  get draggedCard(): Card | null {
    return this.currentDraggedCard;
  }

  setupCardDrag(cell: HTMLElement, card: Card): void {
    cell.addEventListener('dragstart', () => {
      this.isDraggingCard = true;
      this.currentDraggedCard = card;
      cell.style.opacity = '0.4';
    });

    cell.addEventListener('dragend', () => {
      setTimeout(() => {
        this.isDraggingCard = false;
      }, 100);
      cell.style.opacity = '1';
      this.clearDragHighlights();
    });
  }

  setupCellDrop(cell: HTMLElement): void {
    cell.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (this.currentDraggedCard) {
        cell.classList.add('cardbord-editor-cell-dragover');
      }
    });

    cell.addEventListener('dragleave', () => {
      cell.classList.remove('cardbord-editor-cell-dragover');
    });

    cell.addEventListener('drop', (e) => {
      e.preventDefault();
      const targetRow = parseInt(cell.dataset.row ?? '0', 10);
      const targetCol = parseInt(cell.dataset.col ?? '0', 10);

      if (this.currentDraggedCard) {
        const movedCard = this.currentDraggedCard;
        this.currentDraggedCard = null;
        this.callbacks.onCardMoved(movedCard, targetRow, targetCol);
      }
    });
  }

  moveCard(cards: Card[], card: Card, targetRow: number, targetCol: number): void {
    const targetCard = cards.find(c => c.row === targetRow && c.col === targetCol);

    if (targetCard && targetCard.id !== card.id) {
      // Меняем местами
      const draggedIndex = cards.findIndex(c => c.id === card.id);
      const targetIndex = cards.findIndex(c => c.id === targetCard.id);

      const tempRow = targetCard.row;
      const tempCol = targetCard.col;

      cards[targetIndex].row = card.row;
      cards[targetIndex].col = card.col;
      cards[draggedIndex].row = tempRow;
      cards[draggedIndex].col = tempCol;
    } else {
      // Просто перемещаем
      const cardIndex = cards.findIndex(c => c.id === card.id);
      if (cardIndex >= 0) {
        cards[cardIndex].row = targetRow;
        cards[cardIndex].col = targetCol;
      }
    }
  }

  clearDragHighlights(): void {
    const doc = this.callbacks.getTargetDoc();
    doc.querySelectorAll('.cardbord-editor-cell').forEach((el) => {
      el.classList.remove('cardbord-editor-cell-dragover');
    });
  }
}
