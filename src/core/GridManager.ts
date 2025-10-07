/**
 * GridManager
 * Manages grid data, cards, and arrows operations
 */

import type { GridData, Card, Arrow, CellPosition } from '../types';
import { DEFAULT_ROWS, DEFAULT_COLS } from '../utils/constants';
import { sanitizeGridData } from '../utils/encoding';

export class GridManager {
  private data: GridData;

  constructor(initialData?: GridData) {
    this.data = initialData || this.createEmptyGrid(DEFAULT_ROWS, DEFAULT_COLS);
  }

  /**
   * Создает пустую сетку
   */
  createEmptyGrid(rows: number, cols: number): GridData {
    return {
      rows,
      cols,
      cards: [],
      arrows: []
    };
  }

  /**
   * Получает текущие данные сетки
   */
  getData(): GridData {
    return { ...this.data };
  }

  /**
   * Устанавливает данные сетки
   */
  setData(data: GridData): void {
    this.data = sanitizeGridData(data);
  }

  /**
   * Обновляет размер сетки
   */
  updateGridSize(rows: number, cols: number): void {
    this.data.rows = rows;
    this.data.cols = cols;
    // Удаляем карточки вне новых границ
    this.data = sanitizeGridData(this.data);
  }

  /**
   * Получает карточку в указанной позиции
   */
  getCardAt(position: CellPosition): Card | null {
    return this.data.cards.find(
      card => card.row === position.row && card.col === position.col
    ) || null;
  }

  /**
   * Получает карточку по ID
   */
  getCardById(id: string): Card | null {
    return this.data.cards.find(card => card.id === id) || null;
  }

  /**
   * Добавляет или обновляет карточку
   */
  upsertCard(card: Card): void {
    const existingIndex = this.data.cards.findIndex(
      c => c.row === card.row && c.col === card.col
    );

    if (existingIndex >= 0) {
      this.data.cards[existingIndex] = card;
    } else {
      this.data.cards.push(card);
    }
  }

  /**
   * Удаляет карточку
   */
  deleteCard(cardId: string): void {
    this.data.cards = this.data.cards.filter(c => c.id !== cardId);
    // Удаляем связанные стрелки
    this.data.arrows = this.data.arrows.filter(
      a => a.from !== cardId && a.to !== cardId
    );
  }

  /**
   * Перемещает карточку
   */
  moveCard(cardId: string, toPosition: CellPosition): void {
    const card = this.getCardById(cardId);
    if (!card) return;

    // Проверяем, занята ли целевая позиция
    const targetCard = this.getCardAt(toPosition);

    if (targetCard && targetCard.id !== cardId) {
      // Меняем карточки местами
      const tempRow = targetCard.row;
      const tempCol = targetCard.col;
      targetCard.row = card.row;
      targetCard.col = card.col;
      card.row = tempRow;
      card.col = tempCol;
    } else {
      // Просто перемещаем
      card.row = toPosition.row;
      card.col = toPosition.col;
    }
  }

  /**
   * Добавляет стрелку
   */
  addArrow(arrow: Arrow): void {
    // Проверяем, что карточки существуют
    const fromCard = this.getCardById(arrow.from);
    const toCard = this.getCardById(arrow.to);

    if (fromCard && toCard) {
      this.data.arrows.push(arrow);
    }
  }

  /**
   * Удаляет стрелку
   */
  deleteArrow(arrowId: string): void {
    this.data.arrows = this.data.arrows.filter(a => a.id !== arrowId);
  }

  /**
   * Обновляет стрелку
   */
  updateArrow(arrowId: string, updates: Partial<Arrow>): void {
    const arrow = this.data.arrows.find(a => a.id === arrowId);
    if (arrow) {
      Object.assign(arrow, updates);
    }
  }

  /**
   * Получает все стрелки для карточки
   */
  getArrowsForCard(cardId: string): Arrow[] {
    return this.data.arrows.filter(
      a => a.from === cardId || a.to === cardId
    );
  }

  /**
   * Получает количество карточек
   */
  getCardCount(): number {
    return this.data.cards.length;
  }

  /**
   * Получает количество стрелок
   */
  getArrowCount(): number {
    return this.data.arrows.length;
  }

  /**
   * Очищает всю сетку
   */
  clear(): void {
    this.data.cards = [];
    this.data.arrows = [];
  }
}
