import { Card, Cell, GridData, DropZone, Point, Rectangle } from '../types';
import { createElement, setElementData, getElementData } from '../utils/helpers';

export interface DragDropOptions {
  enableStacking: boolean;
  stackLimit?: number;
  animationDuration?: number;
  ghostOpacity?: number;
}

export interface DragDropCallbacks {
  onDragStart?: (card: Card, sourceCell: { row: number; col: number }) => void;
  onDragEnd?: (success: boolean) => void;
  onCardMoved?: (cardId: string, from: { row: number; col: number }, to: { row: number; col: number; stackIndex?: number }) => void;
  onStackReordered?: (cellCoords: { row: number; col: number }, newOrder: string[]) => void;
}

export class DragDropManager {
  private gridContainer: HTMLElement;
  private options: DragDropOptions;
  private callbacks: DragDropCallbacks;
  private isDragging: boolean = false;
  private draggedCard: HTMLElement | null = null;
  private draggedCardData: Card | null = null;
  private sourceCell: { row: number; col: number } | null = null;
  private ghostElement: HTMLElement | null = null;
  private dropZones: DropZone[] = [];
  private currentDropZone: DropZone | null = null;
  private dragOffset: Point = { x: 0, y: 0 };

  constructor(
    gridContainer: HTMLElement,
    options: DragDropOptions = { enableStacking: true },
    callbacks: DragDropCallbacks = {}
  ) {
    this.gridContainer = gridContainer;
    this.options = {
      stackLimit: 10,
      animationDuration: 200,
      ghostOpacity: 0.7,
      ...options
    };
    this.callbacks = callbacks;

    this.setupEventListeners();
  }

  /**
   * Настройка обработчиков событий
   */
  private setupEventListeners(): void {
    // Предотвращение стандартного drag & drop
    this.gridContainer.addEventListener('dragstart', (e) => e.preventDefault());
    this.gridContainer.addEventListener('dragover', (e) => e.preventDefault());
    this.gridContainer.addEventListener('drop', (e) => e.preventDefault());

    // Обработчики мыши
    this.gridContainer.addEventListener('mousedown', this.handleMouseDown.bind(this));
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));

    // Обработчики касаний для мобильных устройств
    this.gridContainer.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this));
  }

  /**
   * Обработка начала перетаскивания мышью
   */
  private handleMouseDown(e: MouseEvent): void {
    const cardElement = this.findCardElement(e.target as HTMLElement);
    if (!cardElement) return;

    e.preventDefault();
    this.startDrag(cardElement, { x: e.clientX, y: e.clientY });
  }

  /**
   * Обработка движения мыши
   */
  private handleMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;
    e.preventDefault();
    this.updateDrag({ x: e.clientX, y: e.clientY });
  }

  /**
   * Обработка окончания перетаскивания мышью
   */
  private handleMouseUp(e: MouseEvent): void {
    if (!this.isDragging) return;
    this.endDrag({ x: e.clientX, y: e.clientY });
  }

  /**
   * Обработка начала касания
   */
  private handleTouchStart(e: TouchEvent): void {
    if (e.touches.length !== 1) return;
    
    const touch = e.touches[0]!;
    const cardElement = this.findCardElement(e.target as HTMLElement);
    if (!cardElement) return;

    e.preventDefault();
    this.startDrag(cardElement, { x: touch.clientX, y: touch.clientY });
  }

  /**
   * Обработка движения касания
   */
  private handleTouchMove(e: TouchEvent): void {
    if (!this.isDragging || e.touches.length !== 1) return;
    
    e.preventDefault();
    const touch = e.touches[0]!;
    this.updateDrag({ x: touch.clientX, y: touch.clientY });
  }

  /**
   * Обработка окончания касания
   */
  private handleTouchEnd(e: TouchEvent): void {
    if (!this.isDragging) return;
    
    const touch = e.changedTouches[0];
    if (touch) {
      this.endDrag({ x: touch.clientX, y: touch.clientY });
    }
  }

  /**
   * Поиск элемента карточки
   */
  private findCardElement(target: HTMLElement): HTMLElement | null {
    let current = target;
    while (current && current !== this.gridContainer) {
      if (current.classList.contains('cardbord-card')) {
        return current;
      }
      current = current.parentElement!;
    }
    return null;
  }

  /**
   * Начало перетаскивания
   */
  private startDrag(cardElement: HTMLElement, startPoint: Point): void {
    const cardId = getElementData(cardElement, 'cardId');
    if (!cardId) return;

    // Получение данных о карточке и исходной ячейке
    const cellElement = cardElement.closest('.cardbord-cell') as HTMLElement;
    if (!cellElement) return;

    const row = parseInt(getElementData(cellElement, 'row') || '0');
    const col = parseInt(getElementData(cellElement, 'col') || '0');

    this.isDragging = true;
    this.draggedCard = cardElement;
    this.sourceCell = { row, col };

    // Получение данных карточки из DOM
    this.draggedCardData = this.extractCardData(cardElement);

    // Вычисление смещения
    const cardRect = cardElement.getBoundingClientRect();
    this.dragOffset = {
      x: startPoint.x - cardRect.left,
      y: startPoint.y - cardRect.top
    };

    // Создание ghost элемента
    this.createGhostElement(cardElement, startPoint);

    // Добавление визуальных эффектов
    cardElement.classList.add('cardbord-card--dragging');
    cardElement.style.opacity = '0.3';

    // Создание зон сброса
    this.createDropZones();

    // Вызов callback
    if (this.callbacks.onDragStart && this.draggedCardData) {
      this.callbacks.onDragStart(this.draggedCardData, this.sourceCell);
    }

    console.log('🎯 Drag started:', cardId);
  }

  /**
   * Обновление позиции во время перетаскивания
   */
  private updateDrag(currentPoint: Point): void {
    if (!this.ghostElement) return;

    // Обновление позиции ghost элемента
    this.ghostElement.style.left = `${currentPoint.x - this.dragOffset.x}px`;
    this.ghostElement.style.top = `${currentPoint.y - this.dragOffset.y}px`;

    // Определение текущей зоны сброса
    const newDropZone = this.findDropZoneAt(currentPoint);
    
    if (newDropZone !== this.currentDropZone) {
      // Очистка предыдущей зоны
      if (this.currentDropZone) {
        this.highlightDropZone(this.currentDropZone, false);
      }

      // Подсветка новой зоны
      if (newDropZone) {
        this.highlightDropZone(newDropZone, true);
      }

      this.currentDropZone = newDropZone;
    }
  }

  /**
   * Завершение перетаскивания
   */
  private endDrag(endPoint: Point): void {
    if (!this.isDragging || !this.draggedCard) return;

    let success = false;

    // Определение финальной зоны сброса
    const dropZone = this.findDropZoneAt(endPoint);
    
    if (dropZone && this.canDropInZone(dropZone)) {
      success = this.performDrop(dropZone);
    }

    // Очистка UI
    this.cleanup();

    // Вызов callback
    if (this.callbacks.onDragEnd) {
      this.callbacks.onDragEnd(success);
    }

    console.log('🎯 Drag ended:', success ? 'success' : 'cancelled');
  }

  /**
   * Создание ghost элемента для визуализации перетаскивания
   */
  private createGhostElement(originalCard: HTMLElement, position: Point): void {
    this.ghostElement = originalCard.cloneNode(true) as HTMLElement;
    this.ghostElement.classList.add('cardbord-card--ghost');
    this.ghostElement.style.position = 'fixed';
    this.ghostElement.style.pointerEvents = 'none';
    this.ghostElement.style.zIndex = '10000';
    this.ghostElement.style.opacity = this.options.ghostOpacity!.toString();
    this.ghostElement.style.transform = 'rotate(5deg) scale(1.05)';
    this.ghostElement.style.transition = 'none';
    this.ghostElement.style.left = `${position.x - this.dragOffset.x}px`;
    this.ghostElement.style.top = `${position.y - this.dragOffset.y}px`;

    document.body.appendChild(this.ghostElement);
  }

  /**
   * Создание зон сброса
   */
  private createDropZones(): void {
    this.dropZones = [];
    
    const cells = this.gridContainer.querySelectorAll('.cardbord-cell');
    cells.forEach((cellElement, index) => {
      const htmlCell = cellElement as HTMLElement;
      const row = parseInt(getElementData(htmlCell, 'row') || '0');
      const col = parseInt(getElementData(htmlCell, 'col') || '0');
      
      const rect = htmlCell.getBoundingClientRect();
      const bounds: Rectangle = {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height
      };

      // Основная зона ячейки
      this.dropZones.push({
        id: `cell-${row}-${col}`,
        type: 'cell',
        bounds,
        cellCoords: { row, col }
      });

      // Дополнительные зоны для стекирования (если включено)
      if (this.options.enableStacking) {
        const cards = htmlCell.querySelectorAll('.cardbord-card');
        cards.forEach((cardElement, cardIndex) => {
          const cardRect = cardElement.getBoundingClientRect();
          const cardBounds: Rectangle = {
            x: cardRect.left,
            y: cardRect.top,
            width: cardRect.width,
            height: cardRect.height
          };

          this.dropZones.push({
            id: `stack-${row}-${col}-${cardIndex}`,
            type: 'stack-position',
            bounds: cardBounds,
            cellCoords: { row, col },
            stackIndex: cardIndex
          });
        });
      }
    });
  }

  /**
   * Поиск зоны сброса по координатам
   */
  private findDropZoneAt(point: Point): DropZone | null {
    // Сначала ищем зоны стека (более приоритетные)
    const stackZones = this.dropZones.filter(zone => zone.type === 'stack-position');
    for (const zone of stackZones) {
      if (this.isPointInBounds(point, zone.bounds)) {
        return zone;
      }
    }

    // Затем ищем зоны ячеек
    const cellZones = this.dropZones.filter(zone => zone.type === 'cell');
    for (const zone of cellZones) {
      if (this.isPointInBounds(point, zone.bounds)) {
        return zone;
      }
    }

    return null;
  }

  /**
   * Проверка точки в границах
   */
  private isPointInBounds(point: Point, bounds: Rectangle): boolean {
    return point.x >= bounds.x && 
           point.x <= bounds.x + bounds.width &&
           point.y >= bounds.y && 
           point.y <= bounds.y + bounds.height;
  }

  /**
   * Проверка возможности сброса в зону
   */
  private canDropInZone(zone: DropZone): boolean {
    if (!zone.cellCoords) return false;

    // Проверка лимита стека
    if (this.options.stackLimit) {
      const targetCell = this.findCellElement(zone.cellCoords.row, zone.cellCoords.col);
      if (targetCell) {
        const currentCards = targetCell.querySelectorAll('.cardbord-card').length;
        // Учитываем, что перетаскиваемая карточка может уже быть в этой ячейке
        const isMovingWithinSameCell = this.sourceCell &&
          this.sourceCell.row === zone.cellCoords.row && 
          this.sourceCell.col === zone.cellCoords.col;
        
        const effectiveCardCount = isMovingWithinSameCell ? currentCards - 1 : currentCards;
        
        if (effectiveCardCount >= this.options.stackLimit) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Выполнение сброса
   */
  private performDrop(zone: DropZone): boolean {
    if (!zone.cellCoords || !this.draggedCardData || !this.sourceCell) return false;

    const targetRow = zone.cellCoords.row;
    const targetCol = zone.cellCoords.col;
    const stackIndex = zone.stackIndex;

    // Проверка на перемещение в ту же позицию
    if (this.sourceCell.row === targetRow && 
        this.sourceCell.col === targetCol && 
        stackIndex === undefined) {
      return false;
    }

    // Вызов callback для перемещения карточки
    if (this.callbacks.onCardMoved) {
      const moveTarget: { row: number; col: number; stackIndex?: number } = {
        row: targetRow,
        col: targetCol
      };
      
      if (stackIndex !== undefined) {
        moveTarget.stackIndex = stackIndex;
      }
      
      this.callbacks.onCardMoved(
        this.draggedCardData.id,
        this.sourceCell,
        moveTarget
      );
    }

    return true;
  }

  /**
   * Подсветка зоны сброса
   */
  private highlightDropZone(zone: DropZone, highlight: boolean): void {
    if (!zone.cellCoords) return;

    const cellElement = this.findCellElement(zone.cellCoords.row, zone.cellCoords.col);
    if (!cellElement) return;

    if (highlight) {
      cellElement.classList.add('cardbord-cell--drop-target');
    } else {
      cellElement.classList.remove('cardbord-cell--drop-target');
    }
  }

  /**
   * Поиск элемента ячейки по координатам
   */
  private findCellElement(row: number, col: number): HTMLElement | null {
    const cells = this.gridContainer.querySelectorAll('.cardbord-cell');
    for (const cell of cells) {
      const htmlCell = cell as HTMLElement;
      const cellRow = parseInt(getElementData(htmlCell, 'row') || '-1');
      const cellCol = parseInt(getElementData(htmlCell, 'col') || '-1');
      
      if (cellRow === row && cellCol === col) {
        return htmlCell;
      }
    }
    return null;
  }

  /**
   * Извлечение данных карточки из DOM
   */
  private extractCardData(cardElement: HTMLElement): Card | null {
    const cardId = getElementData(cardElement, 'cardId');
    const colorName = cardElement.getAttribute('data-color') || 'default';
    const textElement = cardElement.querySelector('.cardbord-card-text');
    const text = textElement?.textContent || '';
    const stackIndex = parseInt(getElementData(cardElement, 'stackIndex') || '0');

    if (!cardId) return null;

    return {
      id: cardId,
      text,
      color: { name: colorName, value: '', textColor: '' }, // Упрощенная версия
      zIndex: stackIndex
    };
  }

  /**
   * Очистка после завершения перетаскивания
   */
  private cleanup(): void {
    // Удаление ghost элемента
    if (this.ghostElement && this.ghostElement.parentNode) {
      this.ghostElement.parentNode.removeChild(this.ghostElement);
      this.ghostElement = null;
    }

    // Восстановление исходной карточки
    if (this.draggedCard) {
      this.draggedCard.classList.remove('cardbord-card--dragging');
      this.draggedCard.style.opacity = '';
      this.draggedCard = null;
    }

    // Очистка подсветки зон сброса
    this.gridContainer.querySelectorAll('.cardbord-cell--drop-target')
      .forEach(cell => cell.classList.remove('cardbord-cell--drop-target'));

    // Сброс состояния
    this.isDragging = false;
    this.draggedCardData = null;
    this.sourceCell = null;
    this.currentDropZone = null;
    this.dropZones = [];
  }

  /**
   * Обновление опций
   */
  updateOptions(newOptions: Partial<DragDropOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * Включение/выключение drag & drop
   */
  setEnabled(enabled: boolean): void {
    this.gridContainer.style.pointerEvents = enabled ? '' : 'none';
  }

  /**
   * Очистка ресурсов
   */
  destroy(): void {
    this.cleanup();
    // Обработчики событий будут автоматически удалены при удалении элементов
  }
}
