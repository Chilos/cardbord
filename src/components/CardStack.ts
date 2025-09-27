import { Card, CardPosition, StackMode, Dimensions, Point } from '../types';
import { createElement, setElementData } from '../utils/helpers';

export interface StackOptions {
  mode: StackMode;
  maxCards?: number;
  compactThreshold?: number;
  enableScroll?: boolean;
  animationDuration?: number;
}

export interface StackCallbacks {
  onCardClick?: (card: Card, stackIndex: number) => void;
  onCardDoubleClick?: (card: Card, stackIndex: number) => void;
  onStackOrderChanged?: (newOrder: string[]) => void;
}

export class CardStack {
  private container: HTMLElement;
  private cards: Card[] = [];
  private options: StackOptions;
  private callbacks: StackCallbacks;
  private cellDimensions: Dimensions;
  private cardElements: Map<string, HTMLElement> = new Map();

  constructor(
    container: HTMLElement,
    cellDimensions: Dimensions,
    options: StackOptions = { mode: 'spread' },
    callbacks: StackCallbacks = {}
  ) {
    this.container = container;
    this.cellDimensions = cellDimensions;
    this.options = {
      maxCards: 10,
      compactThreshold: 4,
      enableScroll: true,
      animationDuration: 200,
      ...options
    };
    this.callbacks = callbacks;

    this.setupContainer();
  }

  /**
   * Настройка контейнера
   */
  private setupContainer(): void {
    this.container.classList.add('cardbord-card-stack');
    this.container.style.position = 'relative';
    this.container.style.height = '100%';
    this.container.style.overflow = this.options.enableScroll ? 'auto' : 'hidden';
  }

  /**
   * Обновление списка карточек
   */
  setCards(cards: Card[]): void {
    this.cards = [...cards];
    this.render();
  }

  /**
   * Добавление карточки
   */
  addCard(card: Card, index?: number): void {
    if (this.options.maxCards && this.cards.length >= this.options.maxCards) {
      console.warn('Stack limit reached');
      return;
    }

    if (index !== undefined && index >= 0 && index <= this.cards.length) {
      this.cards.splice(index, 0, card);
    } else {
      this.cards.push(card);
    }

    this.render();
  }

  /**
   * Удаление карточки
   */
  removeCard(cardId: string): boolean {
    const index = this.cards.findIndex(card => card.id === cardId);
    if (index === -1) return false;

    this.cards.splice(index, 1);
    this.render();
    return true;
  }

  /**
   * Перемещение карточки внутри стека
   */
  moveCard(cardId: string, newIndex: number): boolean {
    const currentIndex = this.cards.findIndex(card => card.id === cardId);
    if (currentIndex === -1 || newIndex < 0 || newIndex >= this.cards.length) {
      return false;
    }

    const [card] = this.cards.splice(currentIndex, 1);
    if (!card) return false; // Дополнительная проверка типа
    this.cards.splice(newIndex, 0, card);

    // Обновление z-index
    this.updateCardZIndices();
    this.render();

    // Вызов callback
    if (this.callbacks.onStackOrderChanged) {
      this.callbacks.onStackOrderChanged(this.cards.map(card => card.id));
    }

    return true;
  }

  /**
   * Получение карточки по ID
   */
  getCard(cardId: string): Card | undefined {
    return this.cards.find(card => card.id === cardId);
  }

  /**
   * Получение всех карточек
   */
  getCards(): Card[] {
    return [...this.cards];
  }

  /**
   * Обновление режима отображения
   */
  setMode(mode: StackMode): void {
    this.options.mode = mode;
    this.render();
  }

  /**
   * Основной метод рендеринга
   */
  private render(): void {
    // Очистка контейнера
    this.container.innerHTML = '';
    this.cardElements.clear();

    if (this.cards.length === 0) {
      this.renderEmptyState();
      return;
    }

    // Вычисление позиций карточек
    const positions = this.calculateCardPositions();

    // Создание и размещение карточек
    positions.forEach((position, index) => {
      const card = this.cards[index];
      if (!card) return;

      const cardElement = this.createCardElement(card, position);
      this.cardElements.set(card.id, cardElement);
      this.container.appendChild(cardElement);
    });

    // Добавление индикатора переполнения если нужно
    if (this.needsOverflowIndicator()) {
      this.addOverflowIndicator();
    }
  }

  /**
   * Вычисление позиций карточек в зависимости от режима
   */
  private calculateCardPositions(): CardPosition[] {
    const positions: CardPosition[] = [];
    const cardCount = this.cards.length;

    switch (this.options.mode) {
      case 'spread':
        return this.calculateSpreadPositions();
      case 'compact':
        return this.calculateCompactPositions();
      case 'accordion':
        return this.calculateAccordionPositions();
      case 'list':
        return this.calculateListPositions();
      default:
        return this.calculateAutoPositions();
    }
  }

  /**
   * Расчет позиций для режима "spread"
   */
  private calculateSpreadPositions(): CardPosition[] {
    const positions: CardPosition[] = [];
    const cardHeight = Math.max(40, Math.min(80, (this.cellDimensions.height - 16) / this.cards.length));
    const spacing = Math.max(4, Math.min(8, (this.cellDimensions.height - cardHeight * this.cards.length) / (this.cards.length + 1)));

    this.cards.forEach((card, index) => {
      positions.push({
        cardId: card.id,
        x: 8,
        y: spacing + index * (cardHeight + spacing),
        width: this.cellDimensions.width - 16,
        height: cardHeight,
        zIndex: index,
        visible: true
      });
    });

    return positions;
  }

  /**
   * Расчет позиций для режима "compact"
   */
  private calculateCompactPositions(): CardPosition[] {
    const positions: CardPosition[] = [];
    const cardHeight = 60;
    const overlap = Math.max(12, Math.min(24, cardHeight * 0.4));
    const maxVisible = Math.floor(this.cellDimensions.height / overlap) - 1;

    this.cards.forEach((card, index) => {
      const isVisible = index < maxVisible || index === this.cards.length - 1;
      const yOffset = index < maxVisible ? index * overlap : (maxVisible - 1) * overlap;
      
      positions.push({
        cardId: card.id,
        x: 8,
        y: 8 + yOffset,
        width: this.cellDimensions.width - 16,
        height: cardHeight,
        zIndex: index,
        visible: isVisible
      });
    });

    return positions;
  }

  /**
   * Расчет позиций для режима "accordion"
   */
  private calculateAccordionPositions(): CardPosition[] {
    const positions: CardPosition[] = [];
    const headerHeight = 32;
    const expandedHeight = Math.min(120, this.cellDimensions.height - (this.cards.length - 1) * headerHeight);
    
    // Пока что показываем все карточки в collapsed состоянии
    // В будущем можно добавить логику для expanded карточки
    let currentY = 8;

    this.cards.forEach((card, index) => {
      positions.push({
        cardId: card.id,
        x: 8,
        y: currentY,
        width: this.cellDimensions.width - 16,
        height: headerHeight,
        zIndex: index,
        visible: true,
        expanded: false
      });

      currentY += headerHeight + 4;
    });

    return positions;
  }

  /**
   * Расчет позиций для режима "list"
   */
  private calculateListPositions(): CardPosition[] {
    const positions: CardPosition[] = [];
    const cardHeight = 36;
    const spacing = 4;
    
    this.cards.forEach((card, index) => {
      positions.push({
        cardId: card.id,
        x: 8,
        y: 8 + index * (cardHeight + spacing),
        width: this.cellDimensions.width - 16,
        height: cardHeight,
        zIndex: index,
        visible: true
      });
    });

    return positions;
  }

  /**
   * Автоматический выбор режима в зависимости от количества карточек
   */
  private calculateAutoPositions(): CardPosition[] {
    const cardCount = this.cards.length;
    const aspectRatio = this.cellDimensions.width / this.cellDimensions.height;

    if (cardCount <= 2) {
      this.options.mode = 'spread';
      return this.calculateSpreadPositions();
    } else if (cardCount <= 4 && aspectRatio > 1.2) {
      this.options.mode = 'compact';
      return this.calculateCompactPositions();
    } else if (cardCount > 6) {
      this.options.mode = 'list';
      return this.calculateListPositions();
    } else {
      this.options.mode = 'accordion';
      return this.calculateAccordionPositions();
    }
  }

  /**
   * Создание элемента карточки
   */
  private createCardElement(card: Card, position: CardPosition): HTMLElement {
    const cardElement = createElement('div', 'cardbord-card cardbord-card--stacked');
    
    // Установка данных
    setElementData(cardElement, {
      cardId: card.id,
      stackIndex: position.zIndex.toString()
    });

    // Установка позиции и размеров
    cardElement.style.position = 'absolute';
    cardElement.style.left = `${position.x}px`;
    cardElement.style.top = `${position.y}px`;
    cardElement.style.width = `${position.width}px`;
    cardElement.style.height = `${position.height}px`;
    cardElement.style.zIndex = position.zIndex.toString();
    cardElement.style.transition = `all ${this.options.animationDuration}ms ease`;

    // Установка цвета
    cardElement.setAttribute('data-color', card.color.name);

    // Видимость
    if (!position.visible) {
      cardElement.style.opacity = '0.5';
      cardElement.style.pointerEvents = 'none';
    }

    // Создание текстового содержимого
    const textElement = createElement('div', 'cardbord-card-text');
    textElement.textContent = card.text;
    cardElement.appendChild(textElement);

    // Добавление обработчиков событий
    this.setupCardEventListeners(cardElement, card, position.zIndex);

    return cardElement;
  }

  /**
   * Настройка обработчиков событий карточки
   */
  private setupCardEventListeners(cardElement: HTMLElement, card: Card, stackIndex: number): void {
    let clickTimeout: NodeJS.Timeout | null = null;

    cardElement.addEventListener('click', (e) => {
      e.stopPropagation();
      
      if (clickTimeout) {
        // Двойной клик
        clearTimeout(clickTimeout);
        clickTimeout = null;
        
        if (this.callbacks.onCardDoubleClick) {
          this.callbacks.onCardDoubleClick(card, stackIndex);
        }
      } else {
        // Одиночный клик с задержкой
        clickTimeout = setTimeout(() => {
          clickTimeout = null;
          if (this.callbacks.onCardClick) {
            this.callbacks.onCardClick(card, stackIndex);
          }
        }, 200);
      }
    });

    // Предотвращение всплытия для drag & drop
    cardElement.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });
  }

  /**
   * Рендеринг пустого состояния
   */
  private renderEmptyState(): void {
    const placeholder = createElement('div', 'cardbord-stack-placeholder');
    placeholder.innerHTML = '<span>+</span>';
    placeholder.style.display = 'flex';
    placeholder.style.alignItems = 'center';
    placeholder.style.justifyContent = 'center';
    placeholder.style.height = '100%';
    placeholder.style.color = 'var(--cardbord-border-color)';
    placeholder.style.fontSize = '24px';
    placeholder.style.cursor = 'pointer';

    this.container.appendChild(placeholder);
  }

  /**
   * Проверка необходимости индикатора переполнения
   */
  private needsOverflowIndicator(): boolean {
    return this.cards.length > (this.options.compactThreshold || 4) && 
           this.options.mode === 'compact';
  }

  /**
   * Добавление индикатора переполнения
   */
  private addOverflowIndicator(): void {
    const indicator = createElement('div', 'cardbord-stack-overflow');
    indicator.textContent = `+${this.cards.length - (this.options.compactThreshold || 4)}`;
    indicator.style.position = 'absolute';
    indicator.style.top = '4px';
    indicator.style.right = '4px';
    indicator.style.background = 'var(--cardbord-accent-color)';
    indicator.style.color = 'white';
    indicator.style.borderRadius = '12px';
    indicator.style.padding = '2px 6px';
    indicator.style.fontSize = '10px';
    indicator.style.fontWeight = 'bold';
    indicator.style.zIndex = '1000';

    this.container.appendChild(indicator);
  }

  /**
   * Обновление z-index карточек
   */
  private updateCardZIndices(): void {
    this.cards.forEach((card, index) => {
      card.zIndex = index;
    });
  }

  /**
   * Получение позиции для вставки карточки
   */
  getInsertPosition(point: Point): number {
    const cardElements = Array.from(this.cardElements.values());
    
    for (let i = 0; i < cardElements.length; i++) {
      const element = cardElements[i];
      if (!element) continue;
      
      const rect = element.getBoundingClientRect();
      if (point.y < rect.top + rect.height / 2) {
        return i;
      }
    }
    
    return this.cards.length;
  }

  /**
   * Обновление размеров ячейки
   */
  updateDimensions(newDimensions: Dimensions): void {
    this.cellDimensions = newDimensions;
    this.render();
  }

  /**
   * Получение количества карточек
   */
  getCardCount(): number {
    return this.cards.length;
  }

  /**
   * Проверка возможности добавления карточки
   */
  canAddCard(): boolean {
    return !this.options.maxCards || this.cards.length < this.options.maxCards;
  }

  /**
   * Очистка стека
   */
  clear(): void {
    this.cards = [];
    this.cardElements.clear();
    this.container.innerHTML = '';
    this.renderEmptyState();
  }

  /**
   * Очистка ресурсов
   */
  destroy(): void {
    this.cardElements.clear();
    this.cards = [];
    this.container.innerHTML = '';
  }
}
