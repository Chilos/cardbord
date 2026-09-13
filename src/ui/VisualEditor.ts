/**
 * VisualEditor - полнофункциональный визуальный редактор для карточек и стрелок
 * Поддерживает drag-and-drop, создание стрелок через anchor points, редактирование
 */

import type { GridData, Card, Arrow, AnchorSide, EditorState } from '../types';
import { ArrowRenderer } from './ArrowRenderer';
import { CELL_WIDTH, CELL_HEIGHT, GAP } from '../utils/constants';
import { getNearestSide } from '../utils/geometry';
import { renderMarkdown } from '../utils/markdown';
import { applyEditorTextScaling } from '../utils/textScaling';
import { GridDataManager } from '../storage/GridDataManager';
import { CanvasViewportController } from './editor/CanvasViewportController';
import { StickerController } from './editor/StickerController';
import { CardDragController } from './editor/CardDragController';
import { ArrowCreationController } from './editor/ArrowCreationController';

export class VisualEditor {
  private static readonly MODAL_ID = 'cardbord-visual-editor';
  private currentData: GridData;
  private blockUuid: string;
  private colors: string[];
  private state: EditorState;
  private targetDoc: Document;
  private arrowRenderer: ArrowRenderer | null = null;

  private viewportController: CanvasViewportController;
  private stickerController: StickerController;
  private dragController: CardDragController;
  private arrowCreationController: ArrowCreationController;
  private gridDataManager: GridDataManager;

  constructor(colors: string[]) {
    this.colors = colors;
    this.currentData = { rows: 2, cols: 2, cards: [], arrows: [] };
    this.blockUuid = '';
    this.targetDoc = ((parent as any).document) || document;
    this.gridDataManager = new GridDataManager();

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

    this.viewportController = new CanvasViewportController({
      getTargetDoc: () => this.targetDoc,
      getGridDimensions: () => this.getGridDimensions()
    });

    this.stickerController = new StickerController();

    this.dragController = new CardDragController({
      getTargetDoc: () => this.targetDoc,
      onCardMoved: (card, targetRow, targetCol) => {
        this.dragController.moveCard(this.currentData.cards, card, targetRow, targetCol);
        this.renderGridEditor();
        this.renderArrows();
      }
    });

    this.arrowCreationController = new ArrowCreationController({
      getTargetDoc: () => this.targetDoc,
      getCurrentCards: () => this.currentData.cards,
      getCurrentZoom: () => this.viewportController.getZoom(),
      getColor: () => this.colors[0] ?? '#6366f1',
      onArrowCreated: (arrow) => {
        this.currentData.arrows.push(arrow);
        this.renderArrows();
      }
    });
  }

  /**
   * Показывает визуальный редактор
   */
  show(data: GridData, blockUuid: string): void {
    this.currentData = JSON.parse(JSON.stringify(data));
    this.blockUuid = blockUuid;
    this.viewportController.reset();
    this.stickerController.reset();

    // Удаляем существующую модалку если есть
    const existing = this.targetDoc.getElementById(VisualEditor.MODAL_ID);
    if (existing) existing.remove();

    const modalHtml = this.renderModal();
    this.targetDoc.body.insertAdjacentHTML('beforeend', modalHtml);

    this.attachEventListeners();
    this.renderGridEditor();
    this.initializeArrowRenderer();
    this.renderArrows();
    this.renderHeadersInputs();
    this.viewportController.refreshWorkspaceLayout(true);
    this.viewportController.initObserver();
  }

  /**
   * Закрывает редактор
   */
  hide(): void {
    const modal = this.targetDoc.getElementById(VisualEditor.MODAL_ID);
    if (modal) modal.remove();
    this.viewportController.disposeObserver();
    this.stickerController.reset();
  }

  /**
   * Генерирует HTML модального окна
   */
  private renderModal(): string {
    const stickerControlsMarkup = this.stickerController.renderControlsMarkup();

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
            <div class="cardbord-zoom-controls">
              <button id="cb-visual-zoom-fit" class="cardbord-btn cardbord-btn-secondary cardbord-zoom-btn">Подогнать</button>
              <div class="cardbord-zoom-controls-group">
                <button id="cb-visual-zoom-out" class="cardbord-btn cardbord-btn-secondary cardbord-zoom-btn">-</button>
                <span id="cb-visual-zoom-value" class="cardbord-zoom-value">100%</span>
                <button id="cb-visual-zoom-in" class="cardbord-btn cardbord-btn-secondary cardbord-zoom-btn">+</button>
              </div>
            </div>
            <div id="cb-visual-workspace-viewport" class="cardbord-workspace-viewport">
              <div id="cb-visual-grid-container" class="cardbord-grid-container">
                <div id="cb-visual-grid-scale" class="cardbord-grid-scale">
                  <div id="cb-visual-grid-wrapper" class="cardbord-grid-wrapper">
                    <div id="cb-visual-column-headers" class="cardbord-grid-floating-headers"></div>
                    <div id="cb-visual-grid-canvas" class="cardbord-grid-canvas">
                      <svg id="cb-visual-arrows-svg" class="cardbord-editor-arrows-svg"></svg>
                      <div id="cb-visual-grid-editor" class="cardbord-grid-editor"></div>
                    </div>
                  </div>
                </div>
              </div>
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
            <div class="cardbord-sticker-section">
              <div class="cardbord-sticker-header">
                <label class="cardbord-control-label">Стикеры по углам</label>
                <button id="cb-visual-clear-stickers" class="cardbord-link-btn" type="button">Очистить все</button>
              </div>
              <div class="cardbord-sticker-grid">
                ${stickerControlsMarkup}
              </div>
              <p class="cardbord-sticker-hint">До четырёх коротких заметок (по одному на каждый угол), максимум 16 символов.</p>
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

  private getGridDimensions(): { width: number; height: number } {
    const width = this.currentData.cols * CELL_WIDTH + (this.currentData.cols - 1) * GAP;
    const height = this.currentData.rows * CELL_HEIGHT + (this.currentData.rows - 1) * GAP;
    return { width, height };
  }

  /**
   * Инициализирует ArrowRenderer
   */
  private initializeArrowRenderer(): void {
    const svg = this.targetDoc.getElementById('cb-visual-arrows-svg');
    if (!svg) {
      console.error('[Cardbord] SVG element not found');
      return;
    }

    const { width: gridWidth, height: gridHeight } = this.getGridDimensions();
    this.arrowRenderer = new ArrowRenderer(svg as unknown as SVGSVGElement, this.colors, false);
    this.arrowRenderer.setSize(gridWidth, gridHeight);
  }

  private focusHeaderInput(colIndex: number): void {
    if (!this.currentData.columnHeaders) return;

    const panel = this.targetDoc.getElementById('cb-visual-headers-panel');
    if (panel) {
      panel.classList.remove('cardbord-panel-hidden');
    }

    const toggleBtn = this.targetDoc.getElementById('cb-visual-toggle-headers');
    if (toggleBtn) {
      toggleBtn.textContent = '✓ Заголовки';
    }

    this.renderHeadersInputs();

    const inputsContainer = this.targetDoc.getElementById('cb-visual-headers-inputs');
    const input = inputsContainer?.querySelector<HTMLInputElement>(`input[data-col-index="${colIndex}"]`);
    if (input) {
      input.focus();
      input.select();
    }

    if (panel) {
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  /**
   * Рендерит стрелки
   */
  private renderArrows(): void {
    if (!this.arrowRenderer) {
      console.warn('[Cardbord][VisualEditor] ArrowRenderer not initialized');
      return;
    }

    this.arrowRenderer.renderArrows(
      this.currentData.arrows,
      this.currentData.cards,
      (arrow) => this.showArrowEditor(arrow)
    );
    this.viewportController.scheduleLayoutRefresh(this.viewportController.isAuto());
  }

  /**
   * Рендерит редактор сетки
   */
  private renderGridEditor(): void {
    const editor = this.targetDoc.getElementById('cb-visual-grid-editor');
    if (!editor) return;

    const { width: baseGridWidth } = this.getGridDimensions();

    editor.style.gridTemplateColumns = `repeat(${this.currentData.cols}, ${CELL_WIDTH}px)`;
    editor.style.gridTemplateRows = `repeat(${this.currentData.rows}, ${CELL_HEIGHT}px)`;
    editor.innerHTML = '';

    const floatingHeaders = this.targetDoc.getElementById('cb-visual-column-headers') as HTMLElement | null;
    if (floatingHeaders) {
      if (this.currentData.columnHeaders) {
        floatingHeaders.classList.remove('cardbord-grid-floating-headers-hidden');
        floatingHeaders.classList.add('cardbord-grid-floating-headers-active');

        floatingHeaders.innerHTML = '';
        floatingHeaders.style.gridTemplateColumns = `repeat(${this.currentData.cols}, ${CELL_WIDTH}px)`;
        floatingHeaders.style.columnGap = `${GAP}px`;
        floatingHeaders.style.width = `${baseGridWidth}px`;

        for (let c = 0; c < this.currentData.cols; c++) {
          const headerValue = this.currentData.columnHeaders[c] ?? '';
          const headerCell = this.targetDoc.createElement('div');
          headerCell.className = 'cardbord-editor-column-header';
          headerCell.title = headerValue || `Колонка ${c + 1}`;
          headerCell.textContent = headerValue.trim() || `Колонка ${c + 1}`;
          headerCell.dataset.colIndex = c.toString();
          headerCell.addEventListener('click', () => this.focusHeaderInput(c));
          floatingHeaders.appendChild(headerCell);
        }
      } else {
        floatingHeaders.innerHTML = '';
        floatingHeaders.classList.add('cardbord-grid-floating-headers-hidden');
        floatingHeaders.classList.remove('cardbord-grid-floating-headers-active');
      }
    }

    for (let r = 0; r < this.currentData.rows; r++) {
      for (let c = 0; c < this.currentData.cols; c++) {
        const card = this.currentData.cards.find(cardItem => cardItem.row === r && cardItem.col === c);
        const cell = this.createCell(r, c, card);
        editor.appendChild(cell);
      }
    }

    setTimeout(() => {
      applyEditorTextScaling(editor);
    }, 50);

    this.viewportController.scheduleLayoutRefresh(this.viewportController.isAuto());
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

    this.dragController.setupCellDrop(cell);

    if (card) {
      cell.addEventListener('mouseup', (e) => {
        if (
          this.arrowCreationController.isCreatingArrow &&
          this.arrowCreationController.startCard &&
          this.arrowCreationController.startCard.id !== card.id
        ) {
          const point = this.viewportController.clientToGridCoordinates(e);
          const nearestSide = getNearestSide(point, card, false);
          this.arrowCreationController.complete(card, nearestSide);
        }
      });
    }

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

    const textContainer = this.targetDoc.createElement('div');
    textContainer.className = 'cardbord-card-text';
    textContainer.innerHTML = renderMarkdown(card.text);
    cell.appendChild(textContainer);

    if (Array.isArray(card.stickers) && card.stickers.length) {
      cell.classList.add('cardbord-editor-cell--with-sticker');
      card.stickers.forEach(sticker => {
        cell.appendChild(this.stickerController.createStickerElement(card, sticker, this.targetDoc));
      });
    }

    const anchors: AnchorSide[] = ['top', 'right', 'bottom', 'left'];
    anchors.forEach(side => {
      const anchor = this.createAnchorPoint(side, card);
      cell.appendChild(anchor);
    });

    cell.addEventListener('click', () => {
      if (!this.dragController.isDragging && !this.arrowCreationController.isCreatingArrow) {
        this.toggleCardSelection(card, cell);
      }
    });

    cell.addEventListener('dblclick', () => {
      if (!this.dragController.isDragging) {
        this.state.selectedCell = { row: card.row, col: card.col };
        this.showCardEditor(card);
      }
    });

    this.dragController.setupCardDrag(cell, card);
  }

  /**
   * Настраивает пустую ячейку
   */
  private setupEmptyCell(cell: HTMLElement, row: number, col: number): void {
    cell.textContent = '+';
    cell.classList.add('cardbord-editor-cell-empty');

    cell.addEventListener('click', () => {
      if (!this.dragController.isDragging && !this.arrowCreationController.isCreatingArrow) {
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
      this.arrowCreationController.start(card, side);
    });

    return anchor;
  }

  /**
   * Переключает выделение карточки
   */
  private toggleCardSelection(card: Card, cell: HTMLElement): void {
    const wasSelected = this.state.selectedCard?.id === card.id;
    this.state.selectedCard = wasSelected ? null : card;

    this.targetDoc.querySelectorAll('.cardbord-anchor-point').forEach((el: any) => {
      el.classList.remove('cardbord-anchor-visible');
    });

    if (this.state.selectedCard && !wasSelected) {
      cell.querySelectorAll('.cardbord-anchor-point').forEach((el: any) => {
        el.classList.add('cardbord-anchor-visible');
      });
    }
  }

  /**
   * Показывает редактор карточки
   */
  private showCardEditor(card?: Card): void {
    const editor = this.targetDoc.getElementById('cb-visual-card-editor');
    const textArea = this.targetDoc.getElementById('cb-visual-card-text') as HTMLTextAreaElement | null;
    const colorPicker = this.targetDoc.getElementById('cb-visual-color-picker');
    const deleteBtn = this.targetDoc.getElementById('cb-visual-delete-card');

    if (!editor || !textArea || !colorPicker || !deleteBtn) return;

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

    this.stickerController.bindEditorInputs(this.targetDoc, card);

    deleteBtn.style.display = card ? 'inline-block' : 'none';

    textArea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.stopPropagation();
      }
    });

    setTimeout(() => textArea.focus(), 100);
  }

  /**
   * Показывает редактор стрелки
   */
  private showArrowEditor(arrow: Arrow): void {
    const editor = this.targetDoc.getElementById('cb-visual-arrow-editor');
    const colorPicker = this.targetDoc.getElementById('cb-visual-arrow-color-picker');

    if (!editor || !colorPicker) return;

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
    const updateGridBtn = this.targetDoc.getElementById('cb-visual-update-grid');
    updateGridBtn?.addEventListener('click', () => {
      const rowsInput = this.targetDoc.getElementById('cb-visual-rows') as HTMLInputElement;
      const colsInput = this.targetDoc.getElementById('cb-visual-cols') as HTMLInputElement;

      this.currentData.rows = parseInt(rowsInput.value, 10);
      this.currentData.cols = parseInt(colsInput.value, 10);
      this.currentData.cards = this.currentData.cards.filter(
        c => c.row < this.currentData.rows && c.col < this.currentData.cols
      );

      if (this.currentData.columnHeaders) {
        this.updateHeadersArray();
      }

      this.renderGridEditor();
      this.initializeArrowRenderer();
      this.renderArrows();
      this.renderHeadersInputs();
      this.viewportController.refreshWorkspaceLayout(true);
    });

    const toggleHeadersBtn = this.targetDoc.getElementById('cb-visual-toggle-headers');
    toggleHeadersBtn?.addEventListener('click', () => {
      this.toggleHeaders();
    });

    const saveCardBtn = this.targetDoc.getElementById('cb-visual-save-card');
    saveCardBtn?.addEventListener('click', () => this.saveCard());

    const deleteCardBtn = this.targetDoc.getElementById('cb-visual-delete-card');
    deleteCardBtn?.addEventListener('click', () => this.deleteCard());

    const cancelCardBtn = this.targetDoc.getElementById('cb-visual-cancel-card');
    cancelCardBtn?.addEventListener('click', () => {
      const editor = this.targetDoc.getElementById('cb-visual-card-editor');
      editor?.classList.add('cardbord-panel-hidden');
    });

    const deleteArrowBtn = this.targetDoc.getElementById('cb-visual-delete-arrow');
    deleteArrowBtn?.addEventListener('click', () => this.deleteArrow());

    const cancelArrowBtn = this.targetDoc.getElementById('cb-visual-cancel-arrow');
    cancelArrowBtn?.addEventListener('click', () => {
      const editor = this.targetDoc.getElementById('cb-visual-arrow-editor');
      editor?.classList.add('cardbord-panel-hidden');
      this.state.selectedArrow = null;
    });

    const saveBtn = this.targetDoc.getElementById('cb-visual-save');
    saveBtn?.addEventListener('click', () => this.saveAndClose());

    const cancelBtn = this.targetDoc.getElementById('cb-visual-cancel');
    cancelBtn?.addEventListener('click', () => this.hide());

    const zoomInBtn = this.targetDoc.getElementById('cb-visual-zoom-in');
    zoomInBtn?.addEventListener('click', () => this.viewportController.adjustZoom(CanvasViewportController.ZOOM_STEP));

    const zoomOutBtn = this.targetDoc.getElementById('cb-visual-zoom-out');
    zoomOutBtn?.addEventListener('click', () => this.viewportController.adjustZoom(-CanvasViewportController.ZOOM_STEP));

    const fitBtn = this.targetDoc.getElementById('cb-visual-zoom-fit');
    fitBtn?.addEventListener('click', () => this.viewportController.applyFitZoom());
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

    const stickers = this.stickerController.buildCardStickers();

    const card: Card = {
      id: existingCardIndex >= 0 ? this.currentData.cards[existingCardIndex].id : Date.now().toString(),
      text,
      color,
      row: this.state.selectedCell.row,
      col: this.state.selectedCell.col,
      stickers: stickers.length ? stickers : undefined
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
      await this.gridDataManager.save(this.blockUuid, this.currentData);
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
      delete this.currentData.columnHeaders;
    } else {
      this.currentData.columnHeaders = Array(this.currentData.cols).fill('');
    }

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
    this.viewportController.scheduleLayoutRefresh(this.viewportController.isAuto());
  }

  /**
   * Рендерит поля ввода для заголовков
   */
  private renderHeadersInputs(): void {
    const container = this.targetDoc.getElementById('cb-visual-headers-inputs');
    if (!container) return;

    container.innerHTML = '';
    if (!this.currentData.columnHeaders) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'grid';
    container.style.gridTemplateColumns = `repeat(auto-fit, minmax(160px, 1fr))`;
    container.style.gap = '12px';
    container.style.alignItems = 'stretch';

    for (let i = 0; i < this.currentData.cols; i++) {
      const input = this.targetDoc.createElement('input');
      input.type = 'text';
      input.className = 'cardbord-header-input';
      input.placeholder = `Колонка ${i + 1}`;
      input.value = this.currentData.columnHeaders[i] || '';
      input.dataset.colIndex = i.toString();

      input.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const idx = parseInt(target.dataset.colIndex || '0', 10);
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
