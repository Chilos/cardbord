import { createElement } from '../utils/helpers';

export interface ModalOptions {
  title: string;
  className?: string;
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
  showCloseButton?: boolean;
}

export class Modal {
  private backdrop: HTMLElement;
  private modalElement: HTMLElement;
  private contentElement: HTMLElement;
  private options: ModalOptions;
  private onCloseCallback: (() => void) | null = null;
  private isOpen: boolean = false;

  constructor(options: ModalOptions) {
    this.options = {
      closeOnEscape: true,
      closeOnBackdrop: true,
      showCloseButton: true,
      ...options
    };

    this.backdrop = this.createBackdrop();
    this.modalElement = this.createModal();
    this.contentElement = this.createContent();
    
    this.setupEventListeners();
  }

  /**
   * Создание backdrop элемента
   */
  private createBackdrop(): HTMLElement {
    const backdrop = createElement('div', 'cardbord-modal-backdrop');
    backdrop.style.display = 'none';
    return backdrop;
  }

  /**
   * Создание основного модального окна
   */
  private createModal(): HTMLElement {
    const modal = createElement('div', `cardbord-modal ${this.options.className || ''}`);
    
    // Заголовок модального окна
    const header = this.createHeader();
    modal.appendChild(header);
    
    return modal;
  }

  /**
   * Создание заголовка модального окна
   */
  private createHeader(): HTMLElement {
    const header = createElement('div', 'cardbord-modal-header');
    
    // Заголовок
    const title = createElement('h3', 'cardbord-modal-title');
    title.textContent = this.options.title;
    header.appendChild(title);
    
    // Кнопка закрытия
    if (this.options.showCloseButton) {
      const closeBtn = createElement('button', 'cardbord-modal-close-btn');
      closeBtn.innerHTML = '×';
      closeBtn.setAttribute('aria-label', 'Закрыть');
      closeBtn.addEventListener('click', () => this.close());
      header.appendChild(closeBtn);
    }
    
    return header;
  }

  /**
   * Создание контентной области
   */
  private createContent(): HTMLElement {
    const content = createElement('div', 'cardbord-modal-content');
    this.modalElement.appendChild(content);
    return content;
  }

  /**
   * Настройка обработчиков событий
   */
  private setupEventListeners(): void {
    // Закрытие по клику на backdrop
    if (this.options.closeOnBackdrop) {
      this.backdrop.addEventListener('click', (e) => {
        if (e.target === this.backdrop) {
          this.close();
        }
      });
    }

    // Закрытие по ESC
    if (this.options.closeOnEscape) {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen) {
          this.close();
        }
      });
    }

    // Предотвращение закрытия при клике внутри модального окна
    this.modalElement.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  /**
   * Открытие модального окна
   */
  open(): void {
    if (this.isOpen) return;

    // Добавление в DOM
    document.body.appendChild(this.backdrop);
    this.backdrop.appendChild(this.modalElement);

    // Показ с анимацией
    this.backdrop.style.display = 'flex';
    
    // Форсирование reflow для анимации
    this.backdrop.offsetHeight;
    
    this.backdrop.classList.add('cardbord-modal-backdrop--open');
    this.modalElement.classList.add('cardbord-modal--open');

    // Блокировка скролла страницы
    document.body.style.overflow = 'hidden';
    
    this.isOpen = true;

    // Фокус на модальном окне для accessibility
    this.modalElement.focus();

    console.log('✅ Modal opened');
  }

  /**
   * Закрытие модального окна
   */
  close(): void {
    if (!this.isOpen) return;

    // Анимация закрытия
    this.backdrop.classList.remove('cardbord-modal-backdrop--open');
    this.modalElement.classList.remove('cardbord-modal--open');

    // Удаление из DOM после анимации
    setTimeout(() => {
      if (this.backdrop.parentNode) {
        this.backdrop.parentNode.removeChild(this.backdrop);
      }
      
      // Восстановление скролла
      document.body.style.overflow = '';
      
      this.isOpen = false;

      // Вызов callback закрытия
      if (this.onCloseCallback) {
        this.onCloseCallback();
      }
    }, 200); // Время анимации

    console.log('✅ Modal closed');
  }

  /**
   * Установка содержимого модального окна
   */
  setContent(content: HTMLElement | string): void {
    if (typeof content === 'string') {
      this.contentElement.innerHTML = content;
    } else {
      this.contentElement.innerHTML = '';
      this.contentElement.appendChild(content);
    }
  }

  /**
   * Добавление содержимого к существующему
   */
  appendContent(content: HTMLElement): void {
    this.contentElement.appendChild(content);
  }

  /**
   * Очистка содержимого
   */
  clearContent(): void {
    this.contentElement.innerHTML = '';
  }

  /**
   * Подписка на закрытие модального окна
   */
  onClose(callback: () => void): void {
    this.onCloseCallback = callback;
  }

  /**
   * Проверка открыт ли модал
   */
  isModalOpen(): boolean {
    return this.isOpen;
  }

  /**
   * Получение элемента контента для прямого манипулирования
   */
  getContentElement(): HTMLElement {
    return this.contentElement;
  }

  /**
   * Получение основного элемента модального окна
   */
  getModalElement(): HTMLElement {
    return this.modalElement;
  }

  /**
   * Обновление заголовка
   */
  setTitle(title: string): void {
    const titleElement = this.modalElement.querySelector('.cardbord-modal-title');
    if (titleElement) {
      titleElement.textContent = title;
    }
  }

  /**
   * Принудительное закрытие и очистка ресурсов
   */
  destroy(): void {
    this.close();
    
    // Удаление всех обработчиков событий
    this.onCloseCallback = null;
    
    // Очистка DOM элементов
    if (this.backdrop.parentNode) {
      this.backdrop.parentNode.removeChild(this.backdrop);
    }
  }
}
