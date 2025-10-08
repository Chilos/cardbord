/**
 * VisualEditor - полнофункциональный визуальный редактор для карточек и стрелок
 * Поддерживает drag-and-drop, создание стрелок через anchor points, редактирование
 */

import type { GridData, Card, Arrow, AnchorSide, EditorState } from '../types';
import { ArrowRenderer } from './ArrowRenderer';
import { CELL_WIDTH, CELL_HEIGHT, GAP, PADDING, ANCHOR_SIZE } from '../utils/constants';
import { encodeGridData } from '../utils/encoding';
import { RENDERER_TYPE } from '../utils/constants';
import { getNearestSide, getAnchorPoint } from '../utils/geometry';
import { renderMarkdown } from '../utils/markdown';
import { applyEditorTextScaling } from '../utils/textScaling';

export class VisualEditor {
  private static MODAL_ID = 'cardbord-visual-editor';
  private currentData: GridData;
  private blockUuid: string;
  private colors: string[];
  private state: EditorState;
  private targetDoc: Document;
  private arrowRenderer: ArrowRenderer | null = null;

  constructor(colors: string[]) {
    this.colors = colors;
    this.currentData = { rows: 2, cols: 2, cards: [], arrows: [] };
    this.blockUuid = '';
    this.targetDoc = ((parent as any).document) || document;
    this.state = {
      selectedCell: null,
      selectedCard: null,
      selectedArrow: null,
      isCreatingArrow: false,
      arrowStartCard: null,
      arrowStartSide: null,
      draggedCard: null,
      isDragging: false
    };
  }

  /**
   * Показывает визуальный редактор
   */
  show(data: GridData, blockUuid: string): void {
    this.currentData = JSON.parse(JSON.stringify(data));
    this.blockUuid = blockUuid;

    // Удаляем существующую модалку если есть
    const existing = this.targetDoc.getElementById(VisualEditor.MODAL_ID);
    if (existing) existing.remove();

    const modalHtml = this.renderModal();
    this.targetDoc.body.insertAdjacentHTML('beforeend', modalHtml);

    this.attachEventListeners();
    this.renderGridEditor();
    this.initializeArrowRenderer();
    this.renderArrows();
    this.renderHeadersInputs(); // Рендерим поля заголовков если они есть
  }

  /**
   * Закрывает редактор
   */
  hide(): void {
    const modal = this.targetDoc.getElementById(VisualEditor.MODAL_ID);
    if (modal) modal.remove();
  }

  /**
   * Генерирует HTML модального окна
   */
  private renderModal(): string {
    return `
      <div id="${VisualEditor.MODAL_ID}" class="cardbord-visual-editor-overlay">
        <div class="cardbord-visual-editor-container">
          <div class="cardbord-editor-header">
            <h2 class="cardbord-editor-title">✏️ Редактор Cardbord</h2>
            <p class="cardbord-editor-subtitle">
              💡 Перетаскивайте карточки • Кликните карточку для создания стрелок • Двойной клик для редактирования
            </p>
          </div>

          <div class="cardbord-editor-controls">
            <div class="cardbord-grid-size-control">
              <label class="cardbord-control-label">
                Строки:
                <input id="cb-visual-rows" type="number" min="1" max="10" value="${this.currentData.rows}" class="cardbord-number-input">
              </label>
              <label class="cardbord-control-label">
                Столбцы:
                <input id="cb-visual-cols" type="number" min="1" max="10" value="${this.currentData.cols}" class="cardbord-number-input">
              </label>
              <button id="cb-visual-update-grid" class="cardbord-btn cardbord-btn-secondary">Обновить сетку</button>
              <button id="cb-visual-toggle-headers" class="cardbord-btn cardbord-btn-secondary">${this.currentData.columnHeaders ? '✓ Заголовки' : '+ Заголовки'}</button>
            </div>
          </div>

          <div id="cb-visual-headers-panel" class="cardbord-panel ${this.currentData.columnHeaders ? '' : 'cardbord-panel-hidden'}">
            <h3 class="cardbord-panel-title">Заголовки колонок</h3>
            <div id="cb-visual-headers-inputs" class="cardbord-headers-inputs"></div>
          </div>

          <div class="cardbord-editor-workspace">
            <div class="cardbord-grid-wrapper">
              <svg id="cb-visual-arrows-svg" class="cardbord-editor-arrows-svg"></svg>
              <div id="cb-visual-grid-editor" class="cardbord-grid-editor"></div>
            </div>
          </div>

          <div id="cb-visual-card-editor" class="cardbord-panel cardbord-panel-hidden">
            <h3 class="cardbord-panel-title">Редактировать карточку</h3>
            <div class="cardbord-textarea-help">
              Поддерживается Logseq форматирование: **bold**, *italic*, ~~strike~~, ^^highlight^^, \`code\`, [[links]], #tags
            </div>
            <textarea
              id="cb-visual-card-text"
              class="cardbord-textarea"
              placeholder="Введите текст карточки...&#10;Поддерживается multiline и Logseq форматирование"
              rows="6"
            ></textarea>
            <div class="cardbord-color-section">
              <label class="cardbord-control-label">Цвет:</label>
              <div id="cb-visual-color-picker" class="cardbord-color-picker"></div>
            </div>
            <div class="cardbord-panel-actions">
              <button id="cb-visual-save-card" class="cardbord-btn cardbord-btn-primary">💾 Сохранить</button>
              <button id="cb-visual-delete-card" class="cardbord-btn cardbord-btn-danger">🗑️ Удалить</button>
              <button id="cb-visual-cancel-card" class="cardbord-btn cardbord-btn-secondary">✖ Отмена</button>
            </div>
          </div>

          <div id="cb-visual-arrow-editor" class="cardbord-panel cardbord-panel-hidden">
            <h3 class="cardbord-panel-title">Редактировать стрелку</h3>
            <div class="cardbord-color-section">
              <label class="cardbord-control-label">Цвет:</label>
              <div id="cb-visual-arrow-color-picker" class="cardbord-color-picker"></div>
            </div>
            <div class="cardbord-panel-actions">
              <button id="cb-visual-delete-arrow" class="cardbord-btn cardbord-btn-danger">🗑️ Удалить стрелку</button>
              <button id="cb-visual-cancel-arrow" class="cardbord-btn cardbord-btn-secondary">✖ Отмена</button>
            </div>
          </div>

          <div class="cardbord-editor-footer">
            <button id="cb-visual-save" class="cardbord-btn cardbord-btn-primary cardbord-btn-large">💾 Сохранить и закрыть</button>
            <button id="cb-visual-cancel" class="cardbord-btn cardbord-btn-secondary cardbord-btn-large">✖ Отмена</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Инициализирует ArrowRenderer
   */
  private initializeArrowRenderer(): void {
    const svg = this.targetDoc.getElementById('cb-visual-arrows-svg') as SVGSVGElement;
    if (!svg) return;

    // Вычисляем размеры на основе данных сетки (как в GridRenderer)
    const gridWidth = this.currentData.cols * CELL_WIDTH + (this.currentData.cols - 1) * GAP;
    const gridHeight = this.currentData.rows * CELL_HEIGHT + (this.currentData.rows - 1) * GAP;

    this.arrowRenderer = new ArrowRenderer(svg, this.colors, false);
    this.arrowRenderer.setSize(gridWidth, gridHeight);
  }

  /**
   * Рендерит стрелки
   */
  private renderArrows(): void {
    if (!this.arrowRenderer) {
      console.warn('[Cardbord][VisualEditor] ArrowRenderer not initialized');
      return;
    }
    console.debug('[Cardbord][VisualEditor] Rendering arrows:', {
      arrows: this.currentData.arrows.length,
      cards: this.currentData.cards.length
    });
    this.arrowRenderer.renderArrows(
      this.currentData.arrows,
      this.currentData.cards,
      (arrow) => this.showArrowEditor(arrow)
    );
  }

  /**
   * Рендерит редактор сетки
   */
  private renderGridEditor(): void {
    const editor = this.targetDoc.getElementById('cb-visual-grid-editor');
    if (!editor) return;

    editor.style.gridTemplateColumns = `repeat(${this.currentData.cols}, ${CELL_WIDTH}px)`;
    editor.style.gridTemplateRows = `repeat(${this.currentData.rows}, ${CELL_HEIGHT}px)`;
    editor.innerHTML = '';

    for (let r = 0; r < this.currentData.rows; r++) {
      for (let c = 0; c < this.currentData.cols; c++) {
        const card = this.currentData.cards.find(card => card.row === r && card.col === c);
        const cell = this.createCell(r, c, card);
        editor.appendChild(cell);
      }
    }

    // Применяем автомасштабирование текста после рендеринга
    setTimeout(() => {
      applyEditorTextScaling(editor);
    }, 50);
  }

  /**
   * Создает ячейку сетки
   */
  private createCell(row: number, col: number, card?: Card): HTMLElement {
    const cell = this.targetDoc.createElement('div');
    cell.className = 'cardbord-editor-cell';
    cell.dataset.row = row.toString();
    cell.dataset.col = col.toString();

    if (card) {
      this.setupCardCell(cell, card);
    } else {
      this.setupEmptyCell(cell, row, col);
    }

    this.attachCellDragEvents(cell, card);
    return cell;
  }

  /**
   * Настраивает ячейку с карточкой
   */
  private setupCardCell(cell: HTMLElement, card: Card): void {
    cell.style.background = card.color;
    cell.draggable = true;
    cell.classList.add('cardbord-editor-cell-card');
    cell.dataset.cardId = card.id;

    // Создаем контейнер для текста с markdown ПЕРЕД anchor points
    const textContainer = this.targetDoc.createElement('div');
    textContainer.className = 'cardbord-card-text';
    textContainer.innerHTML = renderMarkdown(card.text);
    cell.appendChild(textContainer);

    // Создаем anchor points ПОСЛЕ текста
    const anchors: AnchorSide[] = ['top', 'right', 'bottom', 'left'];
    anchors.forEach(side => {
      const anchor = this.createAnchorPoint(side, card);
      cell.appendChild(anchor);
    });

    // Клик для показа anchor points
    cell.addEventListener('click', (e) => {
      if (!this.state.isDragging && !this.state.isCreatingArrow) {
        this.toggleCardSelection(card, cell);
      }
    });

    // Двойной клик для редактирования
    cell.addEventListener('dblclick', (e) => {
      if (!this.state.isDragging) {
        this.state.selectedCell = { row: card.row, col: card.col };
        this.showCardEditor(card);
      }
    });

    // Drag events
    cell.addEventListener('dragstart', (e) => {
      this.state.isDragging = true;
      this.state.draggedCard = card;
      cell.style.opacity = '0.4';
    });

    cell.addEventListener('dragend', (e) => {
      setTimeout(() => { this.state.isDragging = false; }, 100);
      cell.style.opacity = '1';
      this.clearDragHighlights();
    });
  }

  /**
   * Настраивает пустую ячейку
   */
  private setupEmptyCell(cell: HTMLElement, row: number, col: number): void {
    cell.textContent = '+';
    cell.classList.add('cardbord-editor-cell-empty');

    cell.addEventListener('click', () => {
      if (!this.state.isDragging && !this.state.isCreatingArrow) {
        this.state.selectedCell = { row, col };
        this.showCardEditor();
      }
    });
  }

  /**
   * Создает anchor point для стрелок
   */
  private createAnchorPoint(side: AnchorSide, card: Card): HTMLElement {
    const anchor = this.targetDoc.createElement('div');
    anchor.className = `cardbord-anchor-point cardbord-anchor-${side}`;
    anchor.dataset.side = side;

    anchor.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.startArrowCreation(card, side);
    });

    return anchor;
  }

  /**
   * Начинает создание стрелки
   */
  private startArrowCreation(card: Card, side: AnchorSide): void {
    console.log('[Cardbord] Starting arrow creation', { cardId: card.id, side });

    // Отключаем draggable на всех карточках
    this.targetDoc.querySelectorAll('.cardbord-editor-cell-card').forEach((el: any) => {
      el.draggable = false;
    });

    this.state.isCreatingArrow = true;
    this.state.arrowStartCard = card;
    this.state.arrowStartSide = side;

    // Добавляем слушатель mousemove для фантомной стрелки (на document для глобального отслеживания)
    console.log('[Cardbord] Adding mousemove listener to document');
    this.targetDoc.addEventListener('mousemove', this.handleArrowDrag);

    // Добавляем слушатель mouseup для завершения
    console.log('[Cardbord] Adding mouseup listener');
    this.targetDoc.addEventListener('mouseup', this.handleArrowEnd);
  }

  /**
   * Обрабатывает перетаскивание стрелки и рисует фантомную линию
   */
  private handleArrowDrag = (e: MouseEvent): void => {
    if (!this.state.isCreatingArrow || !this.state.arrowStartCard || !this.state.arrowStartSide) {
      console.debug('[Cardbord] Arrow drag skipped - not creating arrow');
      return;
    }

    const svg = this.targetDoc.querySelector('.cardbord-editor-arrows-svg') as SVGSVGElement;
    if (!svg) {
      console.error('[Cardbord] SVG not found for phantom arrow');
      return;
    }

    console.debug('[Cardbord] Drawing phantom arrow', { x: e.clientX, y: e.clientY });

    // Удаляем старую фантомную линию
    const existingPhantom = svg.querySelector('.cardbord-phantom-arrow');
    if (existingPhantom) existingPhantom.remove();

    // Получаем координаты начальной точки
    const startPoint = getAnchorPoint(this.state.arrowStartCard, this.state.arrowStartSide, false);

    // Получаем координаты мыши относительно SVG
    const svgRect = svg.getBoundingClientRect();
    const mouseX = e.clientX - svgRect.left;
    const mouseY = e.clientY - svgRect.top;

    // Убираем класс magnetic со всех anchor points
    this.targetDoc.querySelectorAll('.cardbord-anchor-magnetic').forEach((el) => {
      el.classList.remove('cardbord-anchor-magnetic');
    });

    // Проверяем, находимся ли мы рядом с какой-то карточкой
    let endPoint = { x: mouseX, y: mouseY };
    let snapToAnchor = false;
    let magneticAnchorEl: HTMLElement | null = null;
    let targetCard: Card | null = null;
    let targetSide: AnchorSide | null = null;
    let minDistance = 30; // Начальный порог для магнитного притяжения

    // Ищем ближайший anchor point
    for (const card of this.currentData.cards) {
      if (card.id === this.state.arrowStartCard.id) continue;

      // Проверяем расстояние до каждой грани
      const sides: AnchorSide[] = ['top', 'right', 'bottom', 'left'];
      for (const side of sides) {
        const anchorPoint = getAnchorPoint(card, side, false);
        const dist = Math.sqrt(Math.pow(mouseX - anchorPoint.x, 2) + Math.pow(mouseY - anchorPoint.y, 2));

        // Если курсор близко к anchor point И это ближайшая точка
        if (dist < minDistance) {
          endPoint = anchorPoint;
          snapToAnchor = true;
          targetCard = card;
          targetSide = side;
          minDistance = dist; // Обновляем минимальное расстояние

          // Находим DOM элемент anchor point
          const cell = this.targetDoc.querySelector(`[data-card-id="${card.id}"]`);
          if (cell) {
            magneticAnchorEl = cell.querySelector(`.cardbord-anchor-${side}`) as HTMLElement;
          }
        }
      }
    }

    // Сохраняем информацию о магнитной привязке
    (this.state as any).magneticTargetCard = targetCard;
    (this.state as any).magneticTargetSide = targetSide;

    // Подсвечиваем anchor point при магнитном притяжении
    if (magneticAnchorEl) {
      magneticAnchorEl.classList.add('cardbord-anchor-magnetic');
    }

    // Рисуем фантомную линию
    const phantomLine = this.targetDoc.createElementNS('http://www.w3.org/2000/svg', 'line');
    phantomLine.setAttribute('class', 'cardbord-phantom-arrow');
    phantomLine.setAttribute('x1', startPoint.x.toString());
    phantomLine.setAttribute('y1', startPoint.y.toString());
    phantomLine.setAttribute('x2', endPoint.x.toString());
    phantomLine.setAttribute('y2', endPoint.y.toString());
    phantomLine.setAttribute('stroke', snapToAnchor ? this.colors[0] : '#999');
    phantomLine.setAttribute('stroke-width', '2');
    phantomLine.setAttribute('stroke-dasharray', '5,5');
    phantomLine.setAttribute('opacity', '0.6');
    phantomLine.style.pointerEvents = 'none';

    svg.appendChild(phantomLine);
  };

  /**
   * Обрабатывает завершение создания стрелки при mouseup
   */
  private handleArrowEnd = (e: MouseEvent): void => {
    if (!this.state.isCreatingArrow) return;

    // Проверяем, есть ли магнитная привязка
    const targetCard = (this.state as any).magneticTargetCard;
    const targetSide = (this.state as any).magneticTargetSide;

    if (targetCard && targetSide) {
      this.endArrowCreation(targetCard, targetSide);
    } else {
      // Отменяем создание стрелки если не прицепились к карточке
      this.cancelArrowCreation();
    }
  };

  /**
   * Отменяет создание стрелки
   */
  private cancelArrowCreation(): void {
    // Удаляем слушатели
    this.targetDoc.removeEventListener('mousemove', this.handleArrowDrag);
    this.targetDoc.removeEventListener('mouseup', this.handleArrowEnd);

    // Удаляем фантомную линию
    const svg = this.targetDoc.querySelector('.cardbord-editor-arrows-svg') as SVGSVGElement;
    if (svg) {
      const phantom = svg.querySelector('.cardbord-phantom-arrow');
      if (phantom) phantom.remove();
    }

    // Убираем подсветку anchor points
    this.targetDoc.querySelectorAll('.cardbord-anchor-magnetic').forEach((el) => {
      el.classList.remove('cardbord-anchor-magnetic');
    });

    // Включаем обратно draggable
    this.targetDoc.querySelectorAll('.cardbord-editor-cell-card').forEach((el: any) => {
      el.draggable = true;
    });

    // Сбрасываем состояние
    this.state.isCreatingArrow = false;
    this.state.arrowStartCard = null;
    this.state.arrowStartSide = null;
    (this.state as any).magneticTargetCard = null;
    (this.state as any).magneticTargetSide = null;
  }

  /**
   * Завершает создание стрелки
   */
  private endArrowCreation(targetCard: Card, targetSide: AnchorSide): void {
    // Удаляем слушатели
    this.targetDoc.removeEventListener('mousemove', this.handleArrowDrag);
    this.targetDoc.removeEventListener('mouseup', this.handleArrowEnd);

    // Удаляем фантомную линию
    const svg = this.targetDoc.querySelector('.cardbord-editor-arrows-svg') as SVGSVGElement;
    if (svg) {
      const phantom = svg.querySelector('.cardbord-phantom-arrow');
      if (phantom) phantom.remove();
    }

    // Убираем подсветку anchor points
    this.targetDoc.querySelectorAll('.cardbord-anchor-magnetic').forEach((el) => {
      el.classList.remove('cardbord-anchor-magnetic');
    });

    // Включаем обратно draggable
    this.targetDoc.querySelectorAll('.cardbord-editor-cell-card').forEach((el: any) => {
      el.draggable = true;
    });

    if (
      this.state.isCreatingArrow &&
      this.state.arrowStartCard &&
      this.state.arrowStartSide &&
      this.state.arrowStartCard.id !== targetCard.id
    ) {
      const newArrow: Arrow = {
        id: Date.now().toString(),
        from: this.state.arrowStartCard.id,
        to: targetCard.id,
        fromSide: this.state.arrowStartSide,
        toSide: targetSide,
        color: this.colors[0]
      };
      this.currentData.arrows.push(newArrow);
      this.renderArrows();
    }

    // Сбрасываем состояние
    this.state.isCreatingArrow = false;
    this.state.arrowStartCard = null;
    this.state.arrowStartSide = null;
    (this.state as any).magneticTargetCard = null;
    (this.state as any).magneticTargetSide = null;
  }

  /**
   * Переключает выделение карточки
   */
  private toggleCardSelection(card: Card, cell: HTMLElement): void {
    const wasSelected = this.state.selectedCard?.id === card.id;
    this.state.selectedCard = wasSelected ? null : card;

    // Скрываем все anchor points
    this.targetDoc.querySelectorAll('.cardbord-anchor-point').forEach((el: any) => {
      el.classList.remove('cardbord-anchor-visible');
    });

    // Показываем anchor points выбранной карточки
    if (this.state.selectedCard && !wasSelected) {
      cell.querySelectorAll('.cardbord-anchor-point').forEach((el: any) => {
        el.classList.add('cardbord-anchor-visible');
      });
    }
  }

  /**
   * Прикрепляет события drag-and-drop к ячейке
   */
  private attachCellDragEvents(cell: HTMLElement, card?: Card): void {
    cell.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (this.state.draggedCard) {
        cell.classList.add('cardbord-editor-cell-dragover');
      }
    });

    cell.addEventListener('dragleave', () => {
      cell.classList.remove('cardbord-editor-cell-dragover');
    });

    cell.addEventListener('drop', (e) => {
      e.preventDefault();
      const targetRow = parseInt(cell.dataset.row!);
      const targetCol = parseInt(cell.dataset.col!);

      if (this.state.draggedCard) {
        this.moveCard(this.state.draggedCard, targetRow, targetCol);
        this.state.draggedCard = null;
        this.renderGridEditor();
        this.renderArrows();
      }
    });

    // Mouseup для создания стрелок на карточках
    if (card) {
      cell.addEventListener('mouseup', (e) => {
        if (
          this.state.isCreatingArrow &&
          this.state.arrowStartCard &&
          this.state.arrowStartCard.id !== card.id
        ) {
          const nearestSide = getNearestSide(
            { x: e.clientX, y: e.clientY },
            card
          );
          this.endArrowCreation(card, nearestSide);
        }
      });
    }
  }

  /**
   * Перемещает карточку
   */
  private moveCard(card: Card, targetRow: number, targetCol: number): void {
    const targetCard = this.currentData.cards.find(c => c.row === targetRow && c.col === targetCol);

    if (targetCard && targetCard.id !== card.id) {
      // Меняем местами
      const draggedIndex = this.currentData.cards.findIndex(c => c.id === card.id);
      const targetIndex = this.currentData.cards.findIndex(c => c.id === targetCard.id);

      const tempRow = targetCard.row;
      const tempCol = targetCard.col;

      this.currentData.cards[targetIndex].row = card.row;
      this.currentData.cards[targetIndex].col = card.col;
      this.currentData.cards[draggedIndex].row = tempRow;
      this.currentData.cards[draggedIndex].col = tempCol;
    } else {
      // Просто перемещаем
      const cardIndex = this.currentData.cards.findIndex(c => c.id === card.id);
      this.currentData.cards[cardIndex].row = targetRow;
      this.currentData.cards[cardIndex].col = targetCol;
    }
  }

  /**
   * Убирает подсветку drag-over
   */
  private clearDragHighlights(): void {
    this.targetDoc.querySelectorAll('.cardbord-editor-cell').forEach((el) => {
      el.classList.remove('cardbord-editor-cell-dragover');
    });
  }

  /**
   * Показывает редактор карточки
   */
  private showCardEditor(card?: Card): void {
    const editor = this.targetDoc.getElementById('cb-visual-card-editor');
    const textArea = this.targetDoc.getElementById('cb-visual-card-text') as HTMLTextAreaElement;
    const colorPicker = this.targetDoc.getElementById('cb-visual-color-picker');
    const deleteBtn = this.targetDoc.getElementById('cb-visual-delete-card');

    if (!editor || !textArea || !colorPicker || !deleteBtn) return;

    // Скрываем редактор стрелок
    const arrowEditor = this.targetDoc.getElementById('cb-visual-arrow-editor');
    if (arrowEditor) arrowEditor.classList.add('cardbord-panel-hidden');

    editor.classList.remove('cardbord-panel-hidden');
    textArea.value = card?.text || '';

    colorPicker.innerHTML = this.colors.map(color =>
      `<button
        class="cardbord-color-btn ${card?.color === color ? 'cardbord-color-btn-selected' : ''}"
        style="background: ${color};"
        data-color="${color}"
      ></button>`
    ).join('');

    colorPicker.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        colorPicker.querySelectorAll('button').forEach(b =>
          b.classList.remove('cardbord-color-btn-selected')
        );
        btn.classList.add('cardbord-color-btn-selected');
      });
    });

    deleteBtn.style.display = card ? 'inline-block' : 'none';

    // Разрешаем multiline - предотвращаем срабатывание Enter как submit
    textArea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.stopPropagation(); // Не даем событию всплыть выше
      }
    });

    // Фокус на textarea
    setTimeout(() => textArea.focus(), 100);
  }

  /**
   * Показывает редактор стрелки
   */
  private showArrowEditor(arrow: Arrow): void {
    const editor = this.targetDoc.getElementById('cb-visual-arrow-editor');
    const colorPicker = this.targetDoc.getElementById('cb-visual-arrow-color-picker');

    if (!editor || !colorPicker) return;

    // Скрываем редактор карточек
    const cardEditor = this.targetDoc.getElementById('cb-visual-card-editor');
    if (cardEditor) cardEditor.classList.add('cardbord-panel-hidden');

    this.state.selectedArrow = arrow;
    editor.classList.remove('cardbord-panel-hidden');

    colorPicker.innerHTML = this.colors.map(color =>
      `<button
        class="cardbord-color-btn ${arrow.color === color ? 'cardbord-color-btn-selected' : ''}"
        style="background: ${color};"
        data-color="${color}"
      ></button>`
    ).join('');

    colorPicker.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.state.selectedArrow) {
          this.state.selectedArrow.color = (btn as HTMLElement).dataset.color!;
          this.renderArrows();
          colorPicker.querySelectorAll('button').forEach(b =>
            b.classList.remove('cardbord-color-btn-selected')
          );
          btn.classList.add('cardbord-color-btn-selected');
        }
      });
    });
  }

  /**
   * Прикрепляет обработчики событий
   */
  private attachEventListeners(): void {
    // Обновление размера сетки
    const updateGridBtn = this.targetDoc.getElementById('cb-visual-update-grid');
    updateGridBtn?.addEventListener('click', () => {
      const rowsInput = this.targetDoc.getElementById('cb-visual-rows') as HTMLInputElement;
      const colsInput = this.targetDoc.getElementById('cb-visual-cols') as HTMLInputElement;

      this.currentData.rows = parseInt(rowsInput.value);
      this.currentData.cols = parseInt(colsInput.value);
      this.currentData.cards = this.currentData.cards.filter(
        c => c.row < this.currentData.rows && c.col < this.currentData.cols
      );

      // Обновляем заголовки если они есть
      if (this.currentData.columnHeaders) {
        this.updateHeadersArray();
      }

      this.renderGridEditor();
      this.initializeArrowRenderer();
      this.renderArrows();
      this.renderHeadersInputs();
    });

    // Toggle заголовков колонок
    const toggleHeadersBtn = this.targetDoc.getElementById('cb-visual-toggle-headers');
    toggleHeadersBtn?.addEventListener('click', () => {
      this.toggleHeaders();
    });

    // Сохранение карточки
    const saveCardBtn = this.targetDoc.getElementById('cb-visual-save-card');
    saveCardBtn?.addEventListener('click', () => this.saveCard());

    // Удаление карточки
    const deleteCardBtn = this.targetDoc.getElementById('cb-visual-delete-card');
    deleteCardBtn?.addEventListener('click', () => this.deleteCard());

    // Отмена редактирования карточки
    const cancelCardBtn = this.targetDoc.getElementById('cb-visual-cancel-card');
    cancelCardBtn?.addEventListener('click', () => {
      const editor = this.targetDoc.getElementById('cb-visual-card-editor');
      editor?.classList.add('cardbord-panel-hidden');
    });

    // Удаление стрелки
    const deleteArrowBtn = this.targetDoc.getElementById('cb-visual-delete-arrow');
    deleteArrowBtn?.addEventListener('click', () => this.deleteArrow());

    // Отмена редактирования стрелки
    const cancelArrowBtn = this.targetDoc.getElementById('cb-visual-cancel-arrow');
    cancelArrowBtn?.addEventListener('click', () => {
      const editor = this.targetDoc.getElementById('cb-visual-arrow-editor');
      editor?.classList.add('cardbord-panel-hidden');
      this.state.selectedArrow = null;
    });

    // Сохранение и закрытие
    const saveBtn = this.targetDoc.getElementById('cb-visual-save');
    saveBtn?.addEventListener('click', () => this.saveAndClose());

    // Отмена
    const cancelBtn = this.targetDoc.getElementById('cb-visual-cancel');
    cancelBtn?.addEventListener('click', () => this.hide());
  }

  /**
   * Сохраняет карточку
   */
  private saveCard(): void {
    if (!this.state.selectedCell) return;

    const textArea = this.targetDoc.getElementById('cb-visual-card-text') as HTMLTextAreaElement;
    const selectedColorBtn = this.targetDoc.querySelector(
      '#cb-visual-color-picker .cardbord-color-btn-selected'
    ) as HTMLElement;

    const text = textArea.value.trim();
    const color = selectedColorBtn?.dataset.color || this.colors[0];

    if (!text) return;

    const existingCardIndex = this.currentData.cards.findIndex(
      c => c.row === this.state.selectedCell!.row && c.col === this.state.selectedCell!.col
    );

    const card: Card = {
      id: existingCardIndex >= 0 ? this.currentData.cards[existingCardIndex].id : Date.now().toString(),
      text,
      color,
      row: this.state.selectedCell.row,
      col: this.state.selectedCell.col
    };

    if (existingCardIndex >= 0) {
      this.currentData.cards[existingCardIndex] = card;
    } else {
      this.currentData.cards.push(card);
    }

    const editor = this.targetDoc.getElementById('cb-visual-card-editor');
    editor?.classList.add('cardbord-panel-hidden');

    this.renderGridEditor();
    this.renderArrows();
  }

  /**
   * Удаляет карточку
   */
  private deleteCard(): void {
    if (!this.state.selectedCell) return;

    const cardToDelete = this.currentData.cards.find(
      c => c.row === this.state.selectedCell!.row && c.col === this.state.selectedCell!.col
    );

    if (cardToDelete) {
      this.currentData.arrows = this.currentData.arrows.filter(
        a => a.from !== cardToDelete.id && a.to !== cardToDelete.id
      );
    }

    this.currentData.cards = this.currentData.cards.filter(
      c => !(c.row === this.state.selectedCell!.row && c.col === this.state.selectedCell!.col)
    );

    const editor = this.targetDoc.getElementById('cb-visual-card-editor');
    editor?.classList.add('cardbord-panel-hidden');

    this.renderGridEditor();
    this.renderArrows();
  }

  /**
   * Удаляет стрелку
   */
  private deleteArrow(): void {
    if (!this.state.selectedArrow) return;

    this.currentData.arrows = this.currentData.arrows.filter(
      a => a.id !== this.state.selectedArrow!.id
    );

    const editor = this.targetDoc.getElementById('cb-visual-arrow-editor');
    editor?.classList.add('cardbord-panel-hidden');

    this.state.selectedArrow = null;
    this.renderArrows();
  }

  /**
   * Сохраняет и закрывает редактор
   */
  private async saveAndClose(): Promise<void> {
    try {
      const encoded = encodeGridData(this.currentData);
      await logseq.Editor.updateBlock(
        this.blockUuid,
        `{{renderer ${RENDERER_TYPE}, ${encoded}}}`
      );
      logseq.UI.showMsg('Cardbord сохранен ✅', 'success');
      this.hide();
    } catch (err) {
      console.error('[Cardbord][VisualEditor] Failed to save:', err);
      logseq.UI.showMsg('Ошибка сохранения', 'error');
    }
  }

  /**
   * Обновляет цвета
   */
  updateColors(colors: string[]): void {
    this.colors = colors;
    if (this.arrowRenderer) {
      this.arrowRenderer.updateColors(colors);
    }
  }

  /**
   * Переключает отображение заголовков колонок
   */
  private toggleHeaders(): void {
    if (this.currentData.columnHeaders) {
      // Убираем заголовки
      delete this.currentData.columnHeaders;
    } else {
      // Добавляем пустые заголовки
      this.currentData.columnHeaders = Array(this.currentData.cols).fill('');
    }

    // Обновляем UI
    const panel = this.targetDoc.getElementById('cb-visual-headers-panel');
    const btn = this.targetDoc.getElementById('cb-visual-toggle-headers');

    if (panel) {
      if (this.currentData.columnHeaders) {
        panel.classList.remove('cardbord-panel-hidden');
      } else {
        panel.classList.add('cardbord-panel-hidden');
      }
    }

    if (btn) {
      btn.textContent = this.currentData.columnHeaders ? '✓ Заголовки' : '+ Заголовки';
    }

    this.renderHeadersInputs();
    this.renderGridEditor();
  }

  /**
   * Рендерит поля ввода для заголовков
   */
  private renderHeadersInputs(): void {
    const container = this.targetDoc.getElementById('cb-visual-headers-inputs');
    if (!container || !this.currentData.columnHeaders) return;

    container.innerHTML = '';
    container.style.display = 'grid';
    container.style.gridTemplateColumns = `repeat(${this.currentData.cols}, 1fr)`;
    container.style.gap = '8px';

    for (let i = 0; i < this.currentData.cols; i++) {
      const input = this.targetDoc.createElement('input');
      input.type = 'text';
      input.className = 'cardbord-header-input';
      input.placeholder = `Колонка ${i + 1}`;
      input.value = this.currentData.columnHeaders[i] || '';
      input.dataset.colIndex = i.toString();

      input.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const idx = parseInt(target.dataset.colIndex || '0');
        if (this.currentData.columnHeaders) {
          this.currentData.columnHeaders[idx] = target.value;
        }
      });

      container.appendChild(input);
    }
  }

  /**
   * Обновляет массив заголовков при изменении количества колонок
   */
  private updateHeadersArray(): void {
    if (!this.currentData.columnHeaders) return;

    const newHeaders = Array(this.currentData.cols).fill('');
    for (let i = 0; i < Math.min(this.currentData.cols, this.currentData.columnHeaders.length); i++) {
      newHeaders[i] = this.currentData.columnHeaders[i];
    }
    this.currentData.columnHeaders = newHeaders;
  }
}
