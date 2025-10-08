/**
 * Text scaling utilities for cards
 * Auto-scales text to fit within card boundaries
 */

/**
 * Применяет автомасштабирование к карточкам
 */
export function applyTextScaling(container: HTMLElement): void {
  const cards = container.querySelectorAll('.cardbord-card');

  cards.forEach((card) => {
    scaleCardText(card as HTMLElement);
  });
}

/**
 * Масштабирует текст в одной карточке
 */
function scaleCardText(card: HTMLElement): void {
  const textContainer = card.querySelector('.cardbord-card-text');
  if (!textContainer) return;

  // Сбрасываем масштаб и размеры
  (textContainer as HTMLElement).style.transform = '';
  (textContainer as HTMLElement).style.width = '';
  (textContainer as HTMLElement).style.height = '';

  // Получаем размеры (учитываем padding карточки)
  const cardHeight = card.clientHeight - 24; // padding: 12px * 2
  const cardWidth = card.clientWidth - 24;
  const textHeight = (textContainer as HTMLElement).scrollHeight;
  const textWidth = (textContainer as HTMLElement).scrollWidth;

  // Вычисляем необходимый масштаб
  let scale = 1;

  // Проверяем переполнение по высоте
  if (textHeight > cardHeight) {
    scale = Math.min(scale, cardHeight / textHeight);
  }

  // Проверяем переполнение по ширине
  if (textWidth > cardWidth) {
    scale = Math.min(scale, cardWidth / textWidth);
  }

  // Применяем масштаб только если текст не помещается
  if (scale < 1) {
    // Добавляем небольшой запас (95% от вычисленного масштаба)
    scale *= 0.95;
    (textContainer as HTMLElement).style.transform = `scale(${scale})`;
    (textContainer as HTMLElement).style.transformOrigin = 'top left';
  }
}

/**
 * Применяет автомасштабирование к карточкам редактора
 */
export function applyEditorTextScaling(container: HTMLElement): void {
  const cells = container.querySelectorAll('.cardbord-editor-cell-card');

  cells.forEach((cell) => {
    scaleEditorCellText(cell as HTMLElement);
  });
}

/**
 * Масштабирует текст в ячейке редактора
 */
function scaleEditorCellText(cell: HTMLElement): void {
  const textContainer = cell.querySelector('.cardbord-card-text');
  if (!textContainer) return;

  // Сбрасываем масштаб и размеры
  (textContainer as HTMLElement).style.transform = '';
  (textContainer as HTMLElement).style.width = '';
  (textContainer as HTMLElement).style.height = '';

  // Получаем размеры (учитываем padding)
  const cellHeight = cell.clientHeight - 24; // padding: 12px * 2
  const cellWidth = cell.clientWidth - 24;
  const textHeight = (textContainer as HTMLElement).scrollHeight;
  const textWidth = (textContainer as HTMLElement).scrollWidth;

  // Вычисляем необходимый масштаб
  let scale = 1;

  if (textHeight > cellHeight) {
    scale = Math.min(scale, cellHeight / textHeight);
  }

  if (textWidth > cellWidth) {
    scale = Math.min(scale, cellWidth / textWidth);
  }

  // Применяем масштаб
  if (scale < 1) {
    scale *= 0.95;
    (textContainer as HTMLElement).style.transform = `scale(${scale})`;
    (textContainer as HTMLElement).style.transformOrigin = 'top left';
  }
}
