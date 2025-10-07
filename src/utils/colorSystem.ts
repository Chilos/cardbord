/**
 * ColorSystem - Адаптивная цветовая система для Cardbord
 * Генерирует палитру карточек на основе accent color Logseq
 */

interface HSL {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

interface RGB {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

export class ColorSystem {
  private accentColor: string;
  private isDark: boolean;

  constructor() {
    this.accentColor = this.getLogseqAccentColor();
    this.isDark = this.checkDarkMode();
  }

  /**
   * Получает accent color из Logseq CSS переменных
   */
  private getLogseqAccentColor(): string {
    if (typeof window === 'undefined' || !document.documentElement) {
      return '#4ECDC4'; // Fallback
    }

    const style = getComputedStyle(document.documentElement);
    const color = style.getPropertyValue('--ls-active-primary-color').trim();
    
    return color || '#4ECDC4';
  }

  /**
   * Определяет, используется ли dark режим
   */
  private checkDarkMode(): boolean {
    if (typeof window === 'undefined' || !document.documentElement) {
      return false;
    }

    // Проверяем data-theme атрибут
    const theme = document.documentElement.getAttribute('data-theme');
    if (theme === 'dark') return true;
    
    // Проверяем яркость фона
    const style = getComputedStyle(document.documentElement);
    const bgColor = style.getPropertyValue('--ls-primary-background-color').trim();
    
    if (bgColor) {
      return this.isColorDark(bgColor);
    }

    return false;
  }

  /**
   * Генерирует палитру из 6 цветов для карточек
   */
  generateCardColors(): string[] {
    const baseHue = this.hexToHSL(this.accentColor).h;
    
    // Разная насыщенность и яркость для light/dark режимов
    const saturation = this.isDark ? 50 : 70;
    const lightness = this.isDark ? 40 : 85;
    
    // Генерируем 6 цветов с разными оттенками (hue)
    return [
      `hsl(${baseHue}, ${saturation}%, ${lightness}%)`,
      `hsl(${(baseHue + 60) % 360}, ${saturation}%, ${lightness}%)`,
      `hsl(${(baseHue + 120) % 360}, ${saturation}%, ${lightness}%)`,
      `hsl(${(baseHue + 180) % 360}, ${saturation}%, ${lightness}%)`,
      `hsl(${(baseHue + 240) % 360}, ${saturation}%, ${lightness}%)`,
      `hsl(${(baseHue + 300) % 360}, ${saturation}%, ${lightness}%)`
    ];
  }

  /**
   * Конвертирует HEX цвет в HSL
   */
  private hexToHSL(hex: string): HSL {
    // Удаляем # если есть
    hex = hex.replace(/^#/, '');
    
    // Парсим RGB значения
    let r: number, g: number, b: number;
    
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    }
    
    // Нормализуем RGB (0-1)
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h: number = 0;
    let s: number = 0;
    const l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }
    
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  /**
   * Конвертирует HSL в HEX
   */
  hslToHex(h: number, s: number, l: number): string {
    h = h / 360;
    s = s / 100;
    l = l / 100;
    
    let r: number, g: number, b: number;
    
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    
    const toHex = (x: number) => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  /**
   * Определяет, является ли цвет темным
   */
  private isColorDark(color: string): boolean {
    let rgb: RGB;
    
    // Парсим RGB/RGBA
    if (color.startsWith('rgb')) {
      const match = color.match(/\d+/g);
      if (match && match.length >= 3) {
        rgb = {
          r: parseInt(match[0]),
          g: parseInt(match[1]),
          b: parseInt(match[2])
        };
      } else {
        return false;
      }
    }
    // Парсим HEX
    else if (color.startsWith('#')) {
      const hex = color.replace(/^#/, '');
      if (hex.length === 3) {
        rgb = {
          r: parseInt(hex[0] + hex[0], 16),
          g: parseInt(hex[1] + hex[1], 16),
          b: parseInt(hex[2] + hex[2], 16)
        };
      } else {
        rgb = {
          r: parseInt(hex.substring(0, 2), 16),
          g: parseInt(hex.substring(2, 4), 16),
          b: parseInt(hex.substring(4, 6), 16)
        };
      }
    } else {
      return false;
    }
    
    // Вычисляем относительную яркость (luminance)
    // https://www.w3.org/TR/WCAG20/#relativeluminancedef
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    
    return luminance < 0.5;
  }

  /**
   * Получает контрастный цвет (черный или белый) для заданного фона
   */
  getContrastColor(backgroundColor: string): string {
    return this.isColorDark(backgroundColor) ? '#ffffff' : '#000000';
  }

  /**
   * Обновляет цветовую систему (вызывается при смене темы)
   */
  refresh(): void {
    this.accentColor = this.getLogseqAccentColor();
    this.isDark = this.checkDarkMode();
  }

  /**
   * Получает текущий режим
   */
  getThemeMode(): 'light' | 'dark' {
    return this.isDark ? 'dark' : 'light';
  }

  /**
   * Получает accent color
   */
  getAccentColor(): string {
    return this.accentColor;
  }
}
