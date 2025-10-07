/**
 * GridRenderer
 * Renders the grid with cards using CSS classes
 */

import type { GridData, GridRenderOptions } from '../types';
import { CELL_WIDTH, CELL_HEIGHT, GAP, PADDING } from '../utils/constants';

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
    
    // Рендерим ячейки
    let cellsHtml = '';
    for (let r = 0; r < data.rows; r++) {
      for (let c = 0; c < data.cols; c++) {
        const card = data.cards.find(card => card.row === r && card.col === c);
        
        if (card) {
          // Ячейка с карточкой
          cellsHtml += `<div class="cardbord-cell" data-row="${r}" data-col="${c}"><div class="cardbord-card" style="background: ${card.color};">${this.escapeHtml(card.text)}</div></div>`;
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
    const totalWidth = gridWidth + PADDING * 2;
    const totalHeight = gridHeight + PADDING * 2;

    return `<div class="cardbord-container" data-slot-id="${slotKey ?? ''}"><div class="cardbord-grid-wrapper" style="position: relative; padding: ${PADDING}px;">${editBtn}<svg class="cardbord-arrows" style="position:absolute; top:${PADDING+20}px; left:${PADDING+20}px; width:${gridWidth}px; height:${gridHeight}px; pointer-events:none; z-index:1;"></svg><div class="cardbord-grid" style="${gridStyle}">${cellsHtml}</div></div></div>`;
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
