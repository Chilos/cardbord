import { GridData, GridMode, Card, Cell, CARD_COLORS } from '../types';
import { createElement, setElementData, generateId, moveCard } from '../utils/helpers';
import { GridEditor } from './GridEditor';
import { DragDropManager, DragDropOptions, DragDropCallbacks } from '../managers/DragDropManager';
import { CardStack, StackOptions } from './CardStack';

export class CardGrid {
  private container: HTMLElement;
  private gridData: GridData;
  private mode: GridMode = 'view';
  private dataChangeCallback: ((data: GridData) => void) | null = null;
  private gridElement: HTMLElement | null = null;
  private gridEditor: GridEditor | null = null;
  private dragDropManager: DragDropManager | null = null;
  private cardStacks: Map<string, CardStack> = new Map();
  private stackingEnabled: boolean = true;

  constructor(container: HTMLElement, initialData: GridData) {
    this.container = container;
    this.gridData = { ...initialData };
  }

  /**
   * Инициализация компонента
   */
  initialize(): void {
    console.log('🎯 Initializing CardGrid:', this.gridData.id);
    this.render();
    this.bindEvents();
    this.initializeDragDrop();
  }

  /**
   * Основной метод рендеринга
   */
  private render(): void {
    // Очистка контейнера
    const wrapper = this.container.querySelector('.cardbord-grid-wrapper');
    if (wrapper) {
      wrapper.innerHTML = '';
    }

    // Создание структуры грида
    this.gridElement = this.createGridElement();
    
    // Рендеринг заголовков если включены
    if (this.gridData.headers.showColHeaders || this.gridData.headers.showRowHeaders) {
      this.renderHeaders();
    }

    // Рендеринг ячеек и карточек
    this.renderCells();

    // Добавление в контейнер
    if (wrapper) {
      wrapper.appendChild(this.gridElement);
    }

    console.log('✅ Grid rendered');
  }

  /**
   * Создание основного элемента грида
   */
  private createGridElement(): HTMLElement {
    const grid = createElement('div', 'cardbord-grid cardbord-grid--view-mode');
    
    // Установка CSS переменных для размеров грида
    grid.style.setProperty('--grid-cols', this.gridData.cols.toString());
    grid.style.setProperty('--grid-rows', this.gridData.rows.toString());
    
    setElementData(grid, {
      gridId: this.gridData.id,
      mode: this.mode
    });

    return grid;
  }

  /**
   * Рендеринг заголовков
   */
  private renderHeaders(): void {
    if (!this.gridElement) return;

    // Контейнер заголовков
    const headersContainer = createElement('div', 'cardbord-headers-container');

    // Заголовки столбцов
    if (this.gridData.headers.showColHeaders) {
      const colHeaders = createElement('div', 'cardbord-col-headers');
      
      // Угловая ячейка
      const cornerCell = createElement('div', 'cardbord-corner-cell');
      colHeaders.appendChild(cornerCell);

      // Заголовки столбцов
      this.gridData.headers.colHeaders.forEach((headerText, index) => {
        const header = this.createHeaderElement(headerText, 'column', index);
        colHeaders.appendChild(header);
      });

      headersContainer.appendChild(colHeaders);
    }

    this.gridElement.appendChild(headersContainer);
  }

  /**
   * Создание элемента заголовка
   */
  private createHeaderElement(text: string, type: 'row' | 'column', index: number): HTMLElement {
    const header = createElement('div', 'cardbord-header');
    header.textContent = text;
    setElementData(header, {
      type,
      index: index.toString()
    });

    return header;
  }

  /**
   * Рендеринг ячеек грида
   */
  private renderCells(): void {
    if (!this.gridElement) return;

    // Контейнер для содержимого
    const contentArea = createElement('div', 'cardbord-content-area');

    // Создание строк
    for (let row = 0; row < this.gridData.rows; row++) {
      const rowElement = this.createRowElement(row);
      contentArea.appendChild(rowElement);
    }

    this.gridElement.appendChild(contentArea);
  }

  /**
   * Создание элемента строки
   */
  private createRowElement(rowIndex: number): HTMLElement {
    const rowElement = createElement('div', 'cardbord-row');
    setElementData(rowElement, { row: rowIndex.toString() });

    // Заголовок строки
    if (this.gridData.headers.showRowHeaders) {
      const rowHeader = this.createHeaderElement(
        this.gridData.headers.rowHeaders[rowIndex] || `Строка ${rowIndex + 1}`,
        'row',
        rowIndex
      );
      rowHeader.className = 'cardbord-row-header';
      rowElement.appendChild(rowHeader);
    }

    // Ячейки строки
    for (let col = 0; col < this.gridData.cols; col++) {
      const cellElement = this.createCellElement(rowIndex, col);
      rowElement.appendChild(cellElement);
    }

    return rowElement;
  }

  /**
   * Создание элемента ячейки
   */
  private createCellElement(row: number, col: number): HTMLElement {
    const cell = this.findCell(row, col);
    const cellElement = createElement('div', 'cardbord-cell');
    
    setElementData(cellElement, {
      row: row.toString(),
      col: col.toString()
    });

    // Создание стека карточек для ячейки
    if (this.stackingEnabled && cell && cell.cards.length > 0) {
      this.createCardStack(cellElement, row, col, cell.cards);
      cellElement.classList.add('cardbord-cell--has-cards');
    } else if (cell && cell.cards.length > 0) {
      // Простое отображение без стекирования
      cellElement.classList.add('cardbord-cell--has-cards');
      cell.cards.forEach((card, index) => {
        const cardElement = this.createCardElement(card, index);
        cellElement.appendChild(cardElement);
      });
    } else {
      // Заглушка для пустой ячейки
      const placeholder = createElement('div', 'cardbord-cell-placeholder');
      placeholder.innerHTML = '<span>+</span>';
      cellElement.appendChild(placeholder);
    }

    return cellElement;
  }

  /**
   * Создание элемента карточки
   */
  private createCardElement(card: Card, stackIndex: number): HTMLElement {
    const cardElement = createElement('div', 'cardbord-card');
    
    setElementData(cardElement, {
      cardId: card.id,
      stackIndex: stackIndex.toString()
    });

    // Установка цвета карточки
    cardElement.setAttribute('data-color', card.color.name);

    // Текст карточки
    const cardText = createElement('div', 'cardbord-card-text');
    cardText.textContent = card.text;
    cardElement.appendChild(cardText);

    // Z-index для стекирования
    cardElement.style.zIndex = card.zIndex.toString();

    return cardElement;
  }

  /**
   * Поиск ячейки по координатам
   */
  private findCell(row: number, col: number): Cell | undefined {
    return this.gridData.cells.find(cell => cell.row === row && cell.col === col);
  }

  /**
   * Привязка событий
   */
  private bindEvents(): void {
    // Обработка клика по кнопке редактирования
    const editBtn = this.container.querySelector('.cardbord-edit-btn');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        this.openEditor();
      });
    }

    // Обработка кликов по ячейкам в режиме просмотра
    this.container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      
      // Клик по placeholder для добавления карточки
      if (target.closest('.cardbord-cell-placeholder') && this.mode === 'view') {
        const cell = target.closest('.cardbord-cell') as HTMLElement;
        if (cell && cell.dataset.row && cell.dataset.col) {
          const row = parseInt(cell.dataset.row);
          const col = parseInt(cell.dataset.col);
          this.addSampleCard(row, col);
        }
      }
    });
  }

  /**
   * Открытие редактора грида
   */
  private openEditor(): void {
    // Создание редактора если не существует
    if (!this.gridEditor) {
      this.gridEditor = new GridEditor(this.gridData);
      
      // Подписка на сохранение
      this.gridEditor.onSave((updatedData) => {
        console.log('💾 Saving grid data from editor');
        this.updateData(updatedData);
        this.notifyDataChange();
      });

      // Подписка на отмену
      this.gridEditor.onCancel(() => {
        console.log('❌ Editor cancelled');
      });
    } else {
      // Обновление данных в существующем редакторе
      this.gridEditor.destroy();
      this.gridEditor = new GridEditor(this.gridData);
      
      this.gridEditor.onSave((updatedData) => {
        this.updateData(updatedData);
        this.notifyDataChange();
      });

      this.gridEditor.onCancel(() => {
        console.log('❌ Editor cancelled');
      });
    }

    // Открытие редактора
    this.gridEditor.open();
  }

  /**
   * Обновление данных грида
   */
  private updateData(newData: GridData): void {
    this.gridData = { ...newData };
    this.gridData.updatedAt = Date.now();
    this.render();
  }

  /**
   * Переключение режима просмотр/редактирование (устаревшая функция)
   */
  private toggleMode(): void {
    // Теперь всегда открываем модальный редактор
    this.openEditor();
  }

  /**
   * Добавление тестовой карточки (временная функция)
   */
  private addSampleCard(row: number, col: number): void {
    const newCard: Card = {
      id: generateId('card'),
      text: `Карточка ${Date.now().toString().slice(-4)}`,
      color: CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)]!,
      zIndex: 0
    };

    let cell = this.findCell(row, col);
    if (!cell) {
      // Создание новой ячейки если не существует
      cell = { row, col, cards: [] };
      this.gridData.cells.push(cell);
    }

    cell.cards.push(newCard);
    this.gridData.updatedAt = Date.now();

    // Перерендеринг
    this.render();

    // Уведомление об изменении данных
    this.notifyDataChange();

    console.log('✅ Card added:', newCard.id);
  }

  /**
   * Уведомление об изменении данных
   */
  private notifyDataChange(): void {
    if (this.dataChangeCallback) {
      this.dataChangeCallback(this.gridData);
    }
  }

  /**
   * Подписка на изменения данных
   */
  onDataChange(callback: (data: GridData) => void): void {
    this.dataChangeCallback = callback;
  }

  /**
   * Получение текущих данных
   */
  getData(): GridData {
    return { ...this.gridData };
  }

  /**
   * Обновление данных
   */
  setData(newData: GridData): void {
    this.gridData = { ...newData };
    this.render();
  }

  /**
   * Инициализация Drag & Drop
   */
  private initializeDragDrop(): void {
    if (!this.gridElement) return;

    const dragDropOptions: DragDropOptions = {
      enableStacking: this.stackingEnabled,
      stackLimit: 10,
      animationDuration: 200,
      ghostOpacity: 0.7
    };

    const dragDropCallbacks: DragDropCallbacks = {
      onDragStart: (card, sourceCell) => {
        console.log('🎯 Drag started:', card.id, sourceCell);
      },
      onDragEnd: (success) => {
        console.log('🎯 Drag ended:', success);
      },
      onCardMoved: (cardId, from, to) => {
        this.handleCardMoved(cardId, from, to);
      }
    };

    this.dragDropManager = new DragDropManager(
      this.gridElement,
      dragDropOptions,
      dragDropCallbacks
    );
  }

  /**
   * Создание стека карточек
   */
  private createCardStack(cellElement: HTMLElement, row: number, col: number, cards: Card[]): void {
    const stackKey = `${row}-${col}`;
    
    // Получение размеров ячейки
    const cellRect = cellElement.getBoundingClientRect();
    const cellDimensions = {
      width: cellRect.width || 200,
      height: cellRect.height || 100
    };

    const stackOptions: StackOptions = {
      mode: 'spread',
      maxCards: 10,
      compactThreshold: 4,
      enableScroll: true,
      animationDuration: 200
    };

    const stackCallbacks = {
      onCardClick: (card: Card, stackIndex: number) => {
        console.log('Card clicked:', card.id, stackIndex);
        // Можно добавить редактирование карточки
      },
      onCardDoubleClick: (card: Card, stackIndex: number) => {
        this.editCardText(card);
      },
      onStackOrderChanged: (newOrder: string[]) => {
        this.updateStackOrder(row, col, newOrder);
      }
    };

    const cardStack = new CardStack(
      cellElement,
      cellDimensions,
      stackOptions,
      stackCallbacks
    );

    cardStack.setCards(cards);
    this.cardStacks.set(stackKey, cardStack);
  }

  /**
   * Обработка перемещения карточки
   */
  private handleCardMoved(cardId: string, from: { row: number; col: number }, to: { row: number; col: number; stackIndex?: number }): void {
    const success = moveCard(this.gridData, cardId, to.row, to.col, to.stackIndex);
    
    if (success) {
      console.log('✅ Card moved:', cardId, from, '→', to);
      this.gridData.updatedAt = Date.now();
      this.render();
      this.notifyDataChange();
    } else {
      console.error('❌ Failed to move card:', cardId);
    }
  }

  /**
   * Редактирование текста карточки
   */
  private editCardText(card: Card): void {
    const newText = prompt('Введите новый текст карточки:', card.text);
    if (newText !== null && newText !== card.text) {
      card.text = newText;
      this.gridData.updatedAt = Date.now();
      this.render();
      this.notifyDataChange();
    }
  }

  /**
   * Обновление порядка карточек в стеке
   */
  private updateStackOrder(row: number, col: number, newOrder: string[]): void {
    const cell = this.findCell(row, col);
    if (!cell) return;

    // Переупорядочивание карточек согласно новому порядку
    const orderedCards: Card[] = [];
    newOrder.forEach(cardId => {
      const card = cell.cards.find(c => c.id === cardId);
      if (card) {
        orderedCards.push(card);
      }
    });

    cell.cards = orderedCards;
    this.gridData.updatedAt = Date.now();
    this.notifyDataChange();
  }

  /**
   * Включение/выключение стекирования
   */
  setStackingEnabled(enabled: boolean): void {
    this.stackingEnabled = enabled;
    this.render();
    
    if (this.dragDropManager) {
      this.dragDropManager.updateOptions({ enableStacking: enabled });
    }
  }

  /**
   * Получение стека карточек для ячейки
   */
  getCardStack(row: number, col: number): CardStack | undefined {
    const stackKey = `${row}-${col}`;
    return this.cardStacks.get(stackKey);
  }

  /**
   * Очистка ресурсов
   */
  destroy(): void {
    // Очистка редактора
    if (this.gridEditor) {
      this.gridEditor.destroy();
      this.gridEditor = null;
    }

    // Очистка drag & drop
    if (this.dragDropManager) {
      this.dragDropManager.destroy();
      this.dragDropManager = null;
    }

    // Очистка стеков карточек
    this.cardStacks.forEach(stack => stack.destroy());
    this.cardStacks.clear();

    // Удаление event listeners будет происходить автоматически при удалении элементов
    if (this.gridElement && this.gridElement.parentNode) {
      this.gridElement.parentNode.removeChild(this.gridElement);
    }
    
    this.dataChangeCallback = null;
    console.log('✅ CardGrid destroyed:', this.gridData.id);
  }
}
