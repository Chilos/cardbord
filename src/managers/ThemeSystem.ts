import { ThemeData } from '../types';

interface LogseqThemeVars {
  [key: string]: string;
}

export class ThemeSystem {
  private currentTheme: ThemeData | null = null;
  private observers: Array<(theme: ThemeData) => void> = [];
  private styleElement: HTMLStyleElement | null = null;
  private themeObserver: MutationObserver | null = null;

  /**
   * Инициализация системы тем
   */
  async initialize(): Promise<void> {
    // Создание элемента стилей
    this.createStyleElement();
    
    // Извлечение и применение текущей темы
    await this.extractAndApplyTheme();
    
    // Настройка наблюдения за изменениями темы
    this.setupThemeWatching();
    
    console.log('✅ Theme system initialized');
  }

  /**
   * Создание элемента стилей для плагина
   */
  private createStyleElement(): void {
    this.styleElement = document.createElement('style');
    this.styleElement.id = 'cardbord-dynamic-theme';
    document.head.appendChild(this.styleElement);
  }

  /**
   * Извлечение темы из Logseq и применение
   */
  private async extractAndApplyTheme(): Promise<void> {
    try {
      const logseqVars = this.extractLogseqVariables();
      const processedTheme = this.processLogseqTheme(logseqVars);
      
      this.currentTheme = processedTheme;
      this.applyTheme(processedTheme);
      this.notifyObservers(processedTheme);
      
      console.log('✅ Theme extracted and applied:', processedTheme);
    } catch (error) {
      console.error('❌ Failed to extract theme:', error);
      // Применение fallback темы
      this.applyFallbackTheme();
    }
  }

  /**
   * Извлечение CSS переменных Logseq
   */
  private extractLogseqVariables(): LogseqThemeVars {
    const rootStyles = getComputedStyle(document.documentElement);
    const logseqVars: LogseqThemeVars = {};
    
    // Список CSS переменных Logseq для извлечения
    const variableNames = [
      '--ls-primary-background-color',
      '--ls-secondary-background-color',
      '--ls-tertiary-background-color',
      '--ls-primary-text-color',
      '--ls-secondary-text-color',
      '--ls-border-color',
      '--ls-accent-color',
      '--ls-font-family',
      '--ls-font-size',
      '--ls-line-height',
      '--ls-border-radius-medium',
      '--ls-shadow-1',
      '--ls-shadow-2'
    ];

    variableNames.forEach(varName => {
      const value = rootStyles.getPropertyValue(varName)?.trim();
      if (value && value !== '') {
        logseqVars[varName] = value;
      }
    });

    return logseqVars;
  }

  /**
   * Обработка переменных Logseq в тему Cardbord
   */
  private processLogseqTheme(logseqVars: LogseqThemeVars): ThemeData {
    // Определение темного режима
    const isDarkMode = this.detectDarkMode(logseqVars);
    
    return {
      colors: {
        primary: logseqVars['--ls-primary-background-color'] || (isDarkMode ? '#1a1a1a' : '#ffffff'),
        secondary: logseqVars['--ls-secondary-background-color'] || (isDarkMode ? '#2a2a2a' : '#f8f9fa'),
        text: logseqVars['--ls-primary-text-color'] || (isDarkMode ? '#e1e4e8' : '#333333'),
        border: logseqVars['--ls-border-color'] || (isDarkMode ? '#444444' : '#e1e4e8'),
        accent: logseqVars['--ls-accent-color'] || '#0066cc'
      },
      typography: {
        fontFamily: logseqVars['--ls-font-family'] || 'system-ui, -apple-system, sans-serif',
        fontSize: logseqVars['--ls-font-size'] || '14px',
        lineHeight: logseqVars['--ls-line-height'] || '1.5'
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px'
      },
      isDarkMode
    };
  }

  /**
   * Определение темного режима
   */
  private detectDarkMode(logseqVars: LogseqThemeVars): boolean {
    const bgColor = logseqVars['--ls-primary-background-color'];
    if (!bgColor) {
      // Fallback на системную настройку
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    // Простая эвристика на основе яркости фона
    const rgb = this.parseColor(bgColor);
    if (!rgb) return false;
    
    const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
    return brightness < 128;
  }

  /**
   * Парсинг цвета в RGB
   */
  private parseColor(color: string): { r: number; g: number; b: number } | null {
    // Создание временного элемента для парсинга цвета
    const div = document.createElement('div');
    div.style.color = color;
    document.body.appendChild(div);
    
    const computedColor = getComputedStyle(div).color;
    document.body.removeChild(div);
    
    const match = computedColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      return {
        r: parseInt(match[1]!, 10),
        g: parseInt(match[2]!, 10),
        b: parseInt(match[3]!, 10)
      };
    }
    
    return null;
  }

  /**
   * Применение темы через CSS переменные
   */
  private applyTheme(theme: ThemeData): void {
    if (!this.styleElement) return;

    const cssVariables = this.generateCSSVariables(theme);
    
    const cssText = `
:root {
${cssVariables}
}

/* Dark mode specific adjustments */
${theme.isDarkMode ? this.getDarkModeCSS() : ''}
    `;

    this.styleElement.textContent = cssText;
  }

  /**
   * Генерация CSS переменных из темы
   */
  private generateCSSVariables(theme: ThemeData): string {
    const vars = [
      `--cardbord-bg-primary: ${theme.colors.primary};`,
      `--cardbord-bg-secondary: ${theme.colors.secondary};`,
      `--cardbord-text-primary: ${theme.colors.text};`,
      `--cardbord-border-color: ${theme.colors.border};`,
      `--cardbord-accent-color: ${theme.colors.accent};`,
      `--cardbord-font-family: ${theme.typography.fontFamily};`,
      `--cardbord-font-size: ${theme.typography.fontSize};`,
      `--cardbord-line-height: ${theme.typography.lineHeight};`,
      
      // Вычисляемые значения
      `--cardbord-card-bg: ${this.lighten(theme.colors.secondary, theme.isDarkMode ? 0.1 : -0.05)};`,
      `--cardbord-card-border: ${theme.colors.border};`,
      `--cardbord-grid-bg: ${theme.colors.primary};`,
      `--cardbord-grid-border: ${theme.colors.border};`,
      `--cardbord-modal-bg: ${theme.colors.primary};`,
      `--cardbord-modal-backdrop: ${theme.isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.8)'};`,
      
      // Тени
      `--cardbord-card-shadow: ${theme.isDarkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)'};`,
      `--cardbord-card-shadow-hover: ${theme.isDarkMode ? '0 4px 16px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.15)'};`,
      `--cardbord-modal-shadow: ${theme.isDarkMode ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.2)'};`
    ];

    return vars.map(v => `  ${v}`).join('\n');
  }

  /**
   * CSS для темного режима
   */
  private getDarkModeCSS(): string {
    return `
.cardbord-card:hover {
  box-shadow: var(--cardbord-card-shadow-hover);
}

.cardbord-card[data-color="yellow"] {
  color: var(--cardbord-text-primary);
}
    `;
  }

  /**
   * Осветление/затемнение цвета
   */
  private lighten(color: string, amount: number): string {
    // Простая реализация для базовых цветов
    // В реальном проекте лучше использовать color manipulation библиотеку
    if (amount === 0) return color;
    
    // Попытка использовать CSS color-mix если доступно
    if (CSS.supports('color', `color-mix(in srgb, ${color} 50%, white 50%)`)) {
      if (amount > 0) {
        return `color-mix(in srgb, ${color} ${100 - amount * 100}%, white ${amount * 100}%)`;
      } else {
        return `color-mix(in srgb, ${color} ${100 + amount * 100}%, black ${-amount * 100}%)`;
      }
    }
    
    return color; // Fallback к исходному цвету
  }

  /**
   * Настройка наблюдения за изменениями темы
   */
  private setupThemeWatching(): void {
    // Наблюдение за изменениями атрибутов документа
    this.themeObserver = new MutationObserver((mutations) => {
      let themeChanged = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes') {
          const target = mutation.target as HTMLElement;
          if (target === document.documentElement && 
              (mutation.attributeName === 'class' || 
               mutation.attributeName === 'data-theme' ||
               mutation.attributeName === 'style')) {
            themeChanged = true;
          }
        }
      });

      if (themeChanged) {
        // Небольшая задержка для завершения применения темы Logseq
        setTimeout(() => {
          this.extractAndApplyTheme();
        }, 100);
      }
    });

    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'style']
    });

    // Слушание системных изменений цветовой схемы
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      setTimeout(() => {
        this.extractAndApplyTheme();
      }, 100);
    });
  }

  /**
   * Применение fallback темы
   */
  private applyFallbackTheme(): void {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const fallbackTheme: ThemeData = {
      colors: {
        primary: isDark ? '#1a1a1a' : '#ffffff',
        secondary: isDark ? '#2a2a2a' : '#f8f9fa',
        text: isDark ? '#e1e4e8' : '#333333',
        border: isDark ? '#444444' : '#e1e4e8',
        accent: '#0066cc'
      },
      typography: {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '14px',
        lineHeight: '1.5'
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px'
      },
      isDarkMode: isDark
    };

    this.currentTheme = fallbackTheme;
    this.applyTheme(fallbackTheme);
    this.notifyObservers(fallbackTheme);
  }

  /**
   * Подписка на изменения темы
   */
  onThemeChange(callback: (theme: ThemeData) => void): void {
    this.observers.push(callback);
    
    // Немедленно уведомить о текущей теме
    if (this.currentTheme) {
      callback(this.currentTheme);
    }
  }

  /**
   * Уведомление наблюдателей об изменении темы
   */
  private notifyObservers(theme: ThemeData): void {
    this.observers.forEach(callback => {
      try {
        callback(theme);
      } catch (error) {
        console.error('Error in theme observer:', error);
      }
    });
  }

  /**
   * Получение текущей темы
   */
  getCurrentTheme(): ThemeData | null {
    return this.currentTheme;
  }

  /**
   * Очистка ресурсов
   */
  cleanup(): void {
    if (this.themeObserver) {
      this.themeObserver.disconnect();
    }
    
    if (this.styleElement && this.styleElement.parentNode) {
      this.styleElement.parentNode.removeChild(this.styleElement);
    }
    
    this.observers = [];
    this.currentTheme = null;
  }
}
