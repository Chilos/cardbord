import { GridData, Card, CARD_COLORS, CardColor } from '../types';
import { createElement, setElementData, generateId, addRow, addColumn, removeRow, removeColumn } from '../utils/helpers';
import { Modal } from './Modal';

export class GridEditor {
  private modal: Modal;
  private gridData: GridData;
  private onSaveCallback: ((data: GridData) => void) | null = null;
  private onCancelCallback: (() => void) | null = null;
  private hasChanges: boolean = false;
  private originalData: GridData;

  constructor(initialData: GridData) {
    this.gridData = { ...initialData };
    this.originalData = JSON.parse(JSON.stringify(initialData)); // Deep copy
    
    this.modal = new Modal({
      title: 'Редактирование сетки карточек',
      className: 'cardbord-grid-editor-modal',
      closeOnEscape: true,
      closeOnBackdrop: false // Предотвращаем случайное закрытие
    });

    this.setupModal();
  }

  /**
   * Настройка модального окна
   */
  private setupModal(): void {
    // Создание контента модального окна
    const content = this.createEditorContent();
    this.modal.setContent(content);

    // Обработка закрытия модального окна
    this.modal.onClose(() => {
      if (this.hasChanges) {
        this.handleUnsavedChanges();
      } else {
        this.handleCancel();
      }
    });
  }

  /**
   * Создание контента редактора
   */
  private createEditorContent(): HTMLElement {
    const container = createElement('div', 'cardbord-editor-container');

    // Панель инструментов
    const toolbar = this.createToolbar();
    container.appendChild(toolbar);

    // Область предварительного просмотра
    const previewArea = this.createPreviewArea();
    container.appendChild(previewArea);

    // Панель свойств
    const propertiesPanel = this.createPropertiesPanel();
    container.appendChild(propertiesPanel);

    // Кнопки действий
    const actions = this.createActionButtons();
    container.appendChild(actions);

    return container;
  }

  /**
   * Создание панели инструментов
   */
  private createToolbar(): HTMLElement {
    const toolbar = createElement('div', 'cardbord-editor-toolbar');

    // Группа управления размером грида
    const gridSizeGroup = createElement('div', 'cardbord-toolbar-group');
    const gridSizeLabel = createElement('label', 'cardbord-toolbar-label');
    gridSizeLabel.textContent = 'Размер сетки:';
    gridSizeGroup.appendChild(gridSizeLabel);

    // Управление строками
    const rowControls = createElement('div', 'cardbord-size-controls');
    const rowLabel = createElement('span');
    rowLabel.textContent = `Строки: ${this.gridData.rows}`;
    
    const rowMinus = createElement('button', 'cardbord-btn cardbord-btn--small');
    rowMinus.textContent = '−';
    rowMinus.onclick = () => this.removeGridRow();
    
    const rowPlus = createElement('button', 'cardbord-btn cardbord-btn--small');
    rowPlus.textContent = '+';
    rowPlus.onclick = () => this.addGridRow();

    rowControls.appendChild(rowMinus);
    rowControls.appendChild(rowLabel);
    rowControls.appendChild(rowPlus);
    gridSizeGroup.appendChild(rowControls);

    // Управление столбцами
    const colControls = createElement('div', 'cardbord-size-controls');
    const colLabel = createElement('span');
    colLabel.textContent = `Столбцы: ${this.gridData.cols}`;
    
    const colMinus = createElement('button', 'cardbord-btn cardbord-btn--small');
    colMinus.textContent = '−';
    colMinus.onclick = () => this.removeGridColumn();
    
    const colPlus = createElement('button', 'cardbord-btn cardbord-btn--small');
    colPlus.textContent = '+';
    colPlus.onclick = () => this.addGridColumn();

    colControls.appendChild(colMinus);
    colControls.appendChild(colLabel);
    colControls.appendChild(colPlus);
    gridSizeGroup.appendChild(colControls);

    toolbar.appendChild(gridSizeGroup);

    return toolbar;
  }

  /**
   * Создание области предварительного просмотра
   */
  private createPreviewArea(): HTMLElement {
    const previewArea = createElement('div', 'cardbord-editor-preview');
    const previewLabel = createElement('h4', 'cardbord-preview-label');
    previewLabel.textContent = 'Предварительный просмотр:';
    previewArea.appendChild(previewLabel);

    const previewGrid = this.createPreviewGrid();
    previewArea.appendChild(previewGrid);

    return previewArea;
  }

  /**
   * Создание превью грида
   */
  private createPreviewGrid(): HTMLElement {
    const gridContainer = createElement('div', 'cardbord-preview-grid');
    gridContainer.style.setProperty('--grid-cols', this.gridData.cols.toString());
    gridContainer.style.setProperty('--grid-rows', this.gridData.rows.toString());

    // Заголовки столбцов
    if (this.gridData.headers.showColHeaders) {
      const colHeaders = createElement('div', 'cardbord-preview-col-headers');
      
      // Угловая ячейка
      const corner = createElement('div', 'cardbord-preview-corner');
      colHeaders.appendChild(corner);

      this.gridData.headers.colHeaders.forEach((header, index) => {
        const headerEl = createElement('div', 'cardbord-preview-header');
        headerEl.textContent = header;
        headerEl.onclick = () => this.editColumnHeader(index);
        colHeaders.appendChild(headerEl);
      });

      gridContainer.appendChild(colHeaders);
    }

    // Строки с ячейками
    for (let row = 0; row < this.gridData.rows; row++) {
      const rowEl = createElement('div', 'cardbord-preview-row');

      // Заголовок строки
      if (this.gridData.headers.showRowHeaders) {
        const rowHeader = createElement('div', 'cardbord-preview-header');
        rowHeader.textContent = this.gridData.headers.rowHeaders[row] || `Строка ${row + 1}`;
        rowHeader.onclick = () => this.editRowHeader(row);
        rowEl.appendChild(rowHeader);
      }

      // Ячейки
      for (let col = 0; col < this.gridData.cols; col++) {
        const cell = this.findCell(row, col);
        const cellEl = this.createPreviewCell(row, col, cell);
        rowEl.appendChild(cellEl);
      }

      gridContainer.appendChild(rowEl);
    }

    return gridContainer;
  }

  /**
   * Создание превью ячейки
   */
  private createPreviewCell(row: number, col: number, cell?: any): HTMLElement {
    const cellEl = createElement('div', 'cardbord-preview-cell');
    setElementData(cellEl, { row: row.toString(), col: col.toString() });

    // Добавление карточек или placeholder
    if (cell && cell.cards && cell.cards.length > 0) {
      cell.cards.forEach((card: Card, index: number) => {
        const cardEl = this.createPreviewCard(card);
        cellEl.appendChild(cardEl);
      });
    } else {
      const placeholder = createElement('div', 'cardbord-preview-placeholder');
      placeholder.innerHTML = '+';
      placeholder.onclick = () => this.addCardToCell(row, col);
      cellEl.appendChild(placeholder);
    }

    return cellEl;
  }

  /**
   * Создание превью карточки
   */
  private createPreviewCard(card: Card): HTMLElement {
    const cardEl = createElement('div', 'cardbord-preview-card');
    cardEl.setAttribute('data-color', card.color.name);
    setElementData(cardEl, { cardId: card.id });

    const cardText = createElement('div', 'cardbord-preview-card-text');
    cardText.textContent = card.text;
    cardEl.appendChild(cardText);

    // Кнопка удаления карточки
    const deleteBtn = createElement('button', 'cardbord-preview-card-delete');
    deleteBtn.innerHTML = '×';
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      this.removeCard(card.id);
    };
    cardEl.appendChild(deleteBtn);

    // Редактирование карточки по клику
    cardEl.onclick = () => this.editCard(card);

    return cardEl;
  }

  /**
   * Создание панели свойств
   */
  private createPropertiesPanel(): HTMLElement {
    const panel = createElement('div', 'cardbord-editor-properties');

    // Заголовки
    const headersGroup = createElement('div', 'cardbord-properties-group');
    const headersLabel = createElement('h4');
    headersLabel.textContent = 'Заголовки:';
    headersGroup.appendChild(headersLabel);

    // Переключатели заголовков
    const showRowHeaders = createElement('label', 'cardbord-checkbox-label');
    const rowHeadersCheckbox = createElement('input') as HTMLInputElement;
    rowHeadersCheckbox.type = 'checkbox';
    rowHeadersCheckbox.checked = this.gridData.headers.showRowHeaders;
    rowHeadersCheckbox.onchange = () => this.toggleRowHeaders();
    showRowHeaders.appendChild(rowHeadersCheckbox);
    showRowHeaders.appendChild(document.createTextNode('Показать заголовки строк'));
    headersGroup.appendChild(showRowHeaders);

    const showColHeaders = createElement('label', 'cardbord-checkbox-label');
    const colHeadersCheckbox = createElement('input') as HTMLInputElement;
    colHeadersCheckbox.type = 'checkbox';
    colHeadersCheckbox.checked = this.gridData.headers.showColHeaders;
    colHeadersCheckbox.onchange = () => this.toggleColumnHeaders();
    showColHeaders.appendChild(colHeadersCheckbox);
    showColHeaders.appendChild(document.createTextNode('Показать заголовки столбцов'));
    headersGroup.appendChild(showColHeaders);

    panel.appendChild(headersGroup);

    return panel;
  }

  /**
   * Создание кнопок действий
   */
  private createActionButtons(): HTMLElement {
    const actions = createElement('div', 'cardbord-editor-actions');

    const cancelBtn = createElement('button', 'cardbord-btn cardbord-btn--secondary');
    cancelBtn.textContent = 'Отмена';
    cancelBtn.onclick = () => this.handleCancel();

    const saveBtn = createElement('button', 'cardbord-btn cardbord-btn--primary');
    saveBtn.textContent = 'Сохранить';
    saveBtn.onclick = () => this.handleSave();

    actions.appendChild(cancelBtn);
    actions.appendChild(saveBtn);

    return actions;
  }

  /**
   * Поиск ячейки по координатам
   */
  private findCell(row: number, col: number): any {
    return this.gridData.cells.find(cell => cell.row === row && cell.col === col);
  }

  /**
   * Добавление строки в грид
   */
  private addGridRow(): void {
    addRow(this.gridData);
    this.markAsChanged();
    this.refreshPreview();
  }

  /**
   * Удаление строки из грида
   */
  private removeGridRow(): void {
    if (this.gridData.rows > 1) {
      removeRow(this.gridData, this.gridData.rows - 1);
      this.markAsChanged();
      this.refreshPreview();
    }
  }

  /**
   * Добавление столбца в грид
   */
  private addGridColumn(): void {
    addColumn(this.gridData);
    this.markAsChanged();
    this.refreshPreview();
  }

  /**
   * Удаление столбца из грида
   */
  private removeGridColumn(): void {
    if (this.gridData.cols > 1) {
      removeColumn(this.gridData, this.gridData.cols - 1);
      this.markAsChanged();
      this.refreshPreview();
    }
  }

  /**
   * Добавление карточки в ячейку
   */
  private addCardToCell(row: number, col: number): void {
    const newCard: Card = {
      id: generateId('card'),
      text: `Новая карточка`,
      color: CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)]!,
      zIndex: 0
    };

    let cell = this.findCell(row, col);
    if (!cell) {
      cell = { row, col, cards: [] };
      this.gridData.cells.push(cell);
    }

    cell.cards.push(newCard);
    this.markAsChanged();
    this.refreshPreview();
  }

  /**
   * Удаление карточки
   */
  private removeCard(cardId: string): void {
    for (const cell of this.gridData.cells) {
      const cardIndex = cell.cards.findIndex((card: Card) => card.id === cardId);
      if (cardIndex !== -1) {
        cell.cards.splice(cardIndex, 1);
        this.markAsChanged();
        this.refreshPreview();
        break;
      }
    }
  }

  /**
   * Редактирование карточки
   */
  private editCard(card: Card): void {
    const newText = prompt('Введите текст карточки:', card.text);
    if (newText !== null) {
      card.text = newText;
      this.markAsChanged();
      this.refreshPreview();
    }
  }

  /**
   * Редактирование заголовка столбца
   */
  private editColumnHeader(index: number): void {
    const newText = prompt('Введите заголовок столбца:', this.gridData.headers.colHeaders[index]);
    if (newText !== null) {
      this.gridData.headers.colHeaders[index] = newText;
      this.markAsChanged();
      this.refreshPreview();
    }
  }

  /**
   * Редактирование заголовка строки
   */
  private editRowHeader(index: number): void {
    const newText = prompt('Введите заголовок строки:', this.gridData.headers.rowHeaders[index]);
    if (newText !== null) {
      this.gridData.headers.rowHeaders[index] = newText;
      this.markAsChanged();
      this.refreshPreview();
    }
  }

  /**
   * Переключение заголовков строк
   */
  private toggleRowHeaders(): void {
    this.gridData.headers.showRowHeaders = !this.gridData.headers.showRowHeaders;
    this.markAsChanged();
    this.refreshPreview();
  }

  /**
   * Переключение заголовков столбцов
   */
  private toggleColumnHeaders(): void {
    this.gridData.headers.showColHeaders = !this.gridData.headers.showColHeaders;
    this.markAsChanged();
    this.refreshPreview();
  }

  /**
   * Обновление превью
   */
  private refreshPreview(): void {
    const previewArea = this.modal.getContentElement().querySelector('.cardbord-editor-preview');
    if (previewArea) {
      const newPreview = this.createPreviewArea();
      previewArea.parentNode?.replaceChild(newPreview, previewArea);
    }

    // Обновление тулбара
    const toolbar = this.modal.getContentElement().querySelector('.cardbord-editor-toolbar');
    if (toolbar) {
      const newToolbar = this.createToolbar();
      toolbar.parentNode?.replaceChild(newToolbar, toolbar);
    }
  }

  /**
   * Отметка об изменениях
   */
  private markAsChanged(): void {
    this.hasChanges = true;
    this.modal.setTitle('Редактирование сетки карточек *');
  }

  /**
   * Обработка сохранения
   */
  private handleSave(): void {
    if (this.onSaveCallback) {
      this.onSaveCallback(this.gridData);
    }
    this.modal.close();
  }

  /**
   * Обработка отмены
   */
  private handleCancel(): void {
    this.gridData = this.originalData;
    if (this.onCancelCallback) {
      this.onCancelCallback();
    }
    this.modal.close();
  }

  /**
   * Обработка несохраненных изменений
   */
  private handleUnsavedChanges(): void {
    const shouldSave = confirm('У вас есть несохраненные изменения. Сохранить их?');
    if (shouldSave) {
      this.handleSave();
    } else {
      this.handleCancel();
    }
  }

  /**
   * Открытие редактора
   */
  open(): void {
    this.modal.open();
  }

  /**
   * Закрытие редактора
   */
  close(): void {
    this.modal.close();
  }

  /**
   * Подписка на сохранение
   */
  onSave(callback: (data: GridData) => void): void {
    this.onSaveCallback = callback;
  }

  /**
   * Подписка на отмену
   */
  onCancel(callback: () => void): void {
    this.onCancelCallback = callback;
  }

  /**
   * Очистка ресурсов
   */
  destroy(): void {
    this.modal.destroy();
    this.onSaveCallback = null;
    this.onCancelCallback = null;
  }
}
