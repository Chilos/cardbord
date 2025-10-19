/**
 * GridRenderer
 * Renders the grid with cards using CSS classes
 */

import type { GridData, GridRenderOptions } from '../types';
import { CELL_WIDTH, CELL_HEIGHT, GAP, PADDING } from '../utils/constants';
import { renderMarkdown } from '../utils/markdown';

export class GridRenderer {
  /**
   * Рендерит сетку в HTML с CSS классами
   */
  render(data: GridData, options: GridRenderOptions = {}): string {
    const { readonly = true, slotKey, showEditButton = true } = options;

    const gridStyle = `
      grid-template-columns: repeat(${data.cols}, ${CELL_WIDTH}px);
      grid-template-rows: repeat(${data.rows}, ${CELL_HEIGHT}px);
      gap: ${GAP}px;
    `;

    // Рендерим заголовки колонок если есть
    let headersHtml = '';
    if (data.columnHeaders && data.columnHeaders.some(h => h)) {
      headersHtml = `<div class="cardbord-column-headers" style="grid-template-columns: repeat(${data.cols}, ${CELL_WIDTH}px);">`;
      for (let c = 0; c < data.cols; c++) {
        const headerText = data.columnHeaders[c] || '';
        headersHtml += `<div class="cardbord-column-header">${this.escapeHtml(headerText)}</div>`;
      }
      headersHtml += '</div>';
    }

    // Рендерим ячейки
    let cellsHtml = '';
    for (let r = 0; r < data.rows; r++) {
      for (let c = 0; c < data.cols; c++) {
        const card = data.cards.find(card => card.row === r && card.col === c);

        if (card) {
          const stickers = Array.isArray(card.stickers) ? card.stickers : [];
          if (stickers.length) {
            console.debug('[Cardbord][Sticker] Rendering read-only card with stickers', {
              cardId: card.id,
              stickers
            });
          }
          const cellClasses = ['cardbord-cell'];
          if (stickers.length) cellClasses.push('cardbord-cell--with-sticker');
          const stickersHtml = stickers
            .map(sticker => {
              const isEmojiOnly = /^[\p{Emoji}\s]+$/u.test(sticker.text.trim());
              const classes = ['cardbord-card-sticker', `cardbord-card-sticker--${sticker.corner}`];
              if (isEmojiOnly) classes.push('cardbord-card-sticker--emoji');
              return `<span class="${classes.join(' ')}" data-corner="${sticker.corner}" style="--cb-sticker-accent: ${sticker.color ?? card.color};">${this.escapeHtml(sticker.text)}</span>`;
            })
            .join('');
          const cardStyle = `background: ${card.color};`;

          // Ячейка с карточкой (рендерим markdown с контейнером для текста)
          cellsHtml += `<div class="${cellClasses.join(' ')}" data-row="${r}" data-col="${c}"><div class="cardbord-card" style="${cardStyle}">${stickersHtml}<div class="cardbord-card-text">${renderMarkdown(card.text)}</div></div></div>`;
        } else {
          // Пустая ячейка
          cellsHtml += `<div class="cardbord-cell" data-row="${r}" data-col="${c}"><span class="cardbord-cell-empty"></span></div>`;
        }
      }
    }
    
    // Иконка редактирования (появляется при hover)
    const editBtn = readonly && showEditButton && slotKey
      ? `<button data-on-click="openCardbordEditor" data-slot-id="${slotKey}" class="cardbord-edit-icon" title="Редактировать">✏️</button>`
      : '';
    
    // Вычисляем размеры для SVG
    const gridWidth = data.cols * CELL_WIDTH + (data.cols - 1) * GAP;
    const gridHeight = data.rows * CELL_HEIGHT + (data.rows - 1) * GAP;

    // Вычисляем offset для SVG с учетом заголовков
    const headerOffset = (data.columnHeaders && data.columnHeaders.some(h => h)) ? 71 : 21;

    return `<div class="cardbord-container" data-slot-id="${slotKey ?? ''}"><div class="cardbord-grid-wrapper" style="position: relative; padding: ${PADDING}px;">${editBtn}${headersHtml}<svg class="cardbord-arrows" style="position:absolute; top:${headerOffset}px; left:21; width:${gridWidth}px; height:${gridHeight}px; pointer-events:none; z-index: var(--cb-z-floating, 20);"></svg><div class="cardbord-grid" style="${gridStyle}">${cellsHtml}</div></div></div>`;
  }
  
  /**
   * Экранирует HTML для предотвращения XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
