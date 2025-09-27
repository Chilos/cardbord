import { GridData, ThemeData } from '../types';
import { createEmptyGrid, generateId, serializeGridData, deserializeGridData } from '../utils/helpers';
import { ThemeSystem } from '../managers/ThemeSystem';

export class CardbordPlugin {
  private themeSystem: ThemeSystem;
  private activeGrids: Map<string, any> = new Map();
  private gridStorage: Map<string, GridData> = new Map();

  constructor() {
    this.themeSystem = new ThemeSystem();
  }

  /**
   * Инициализация системы тем
   */
  async initializeThemeSystem(): Promise<void> {
    try {
      await this.themeSystem.initialize();
      console.log('✅ Theme system initialized');
    } catch (error) {
      console.error('❌ Failed to initialize theme system:', error);
    }
  }

  /**
   * Вставка нового грида через slash-команду
   */
  async insertCardbordGrid(): Promise<string> {
    const currentBlock = await logseq.Editor.getCurrentBlock();
    if (!currentBlock) {
      throw new Error('No current block found');
    }

    // Создание пустого грида
    const gridData = createEmptyGrid(2, 3);
    
    // Сохраняем данные грида в хранилище
    this.gridStorage.set(gridData.id, gridData);
    
    // Создание макроса только с ID
    const macroContent = `{{renderer cardbord, ${gridData.id}}}`;
    
    // Вставка в текущий блок
    await logseq.Editor.updateBlock(currentBlock.uuid, macroContent);
    
    console.log('✅ Grid inserted with ID:', gridData.id);
    return gridData.id;
  }

  /**
   * Рендеринг грида по ID
   */
  async renderGrid(slot: string, gridId: string): Promise<void> {
    console.log('🎯 Rendering grid with ID:', gridId, 'to slot:', slot);
    
    // Получаем данные грида из хранилища
    const gridData = this.gridStorage.get(gridId);
    
    if (!gridData) {
      throw new Error(`Grid with ID ${gridId} not found in storage`);
    }

    // Регистрируем команду для редактирования конкретного грида
    const editCommandKey = `edit-grid-${gridId}`;
    console.log('📝 Registering edit command:', editCommandKey);
    
    logseq.App.registerCommand('plugin', {
      key: editCommandKey,
      label: `✏️ Edit Grid ${gridId}`,
      desc: `Edit Cardbord grid ${gridId} (${gridData.rows}×${gridData.cols})`,
      palette: true
    }, () => {
      console.log('🔧 Edit command triggered for grid:', gridId);
      this.openEditor(gridId);
    });

    // Создаем красивый HTML для грида БЕЗ кнопки Edit
    const template = `
      <div class="cardbord-grid-container" style="
        background: var(--ls-primary-background-color, #ffffff);
        border: 2px solid var(--ls-border-color, #e5e5e5);
        border-radius: 8px;
        padding: 16px;
        font-family: var(--ls-font-family, system-ui);
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <h3 style="margin: 0; color: var(--ls-primary-text-color, #333);">🎯 Cardbord Grid</h3>
            <small style="color: var(--ls-secondary-text-color, #666);">ID: ${gridId} • Size: ${gridData.rows}×${gridData.cols}</small>
          </div>
          <div style="
            background: var(--ls-secondary-background-color, #f3f4f6);
            color: var(--ls-primary-text-color, #333);
            border: 1px solid var(--ls-border-color, #ccc);
            border-radius: 6px;
            padding: 8px 16px;
            font-size: 12px;
            font-weight: 500;
          ">
            Press <kbd>Ctrl+Shift+P</kbd> → <strong>Edit Grid ${gridId}</strong>
          </div>
        </div>
        
        <div style="
          display: grid; 
          grid-template-columns: repeat(${gridData.cols}, 1fr); 
          gap: 8px;
          border: 1px solid var(--ls-border-color, #e5e5e5);
          border-radius: 4px;
          padding: 8px;
          background: var(--ls-secondary-background-color, #f8f9fa);
        ">
          ${gridData.cells.map((cell) => 
            `<div style="
              border: 1px dashed var(--ls-border-color, #ccc);
              border-radius: 4px;
              padding: 12px;
              text-align: center;
              min-height: 80px;
              background: var(--ls-primary-background-color, white);
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              position: relative;
            ">
              <div style="
                position: absolute;
                top: 4px;
                left: 4px;
                font-size: 10px;
                color: var(--ls-secondary-text-color, #999);
                font-weight: 500;
              ">
                ${cell.row + 1},${cell.col + 1}
              </div>
              ${cell.cards.length > 0 ? 
                `<div style="
                  background: var(--ls-active-primary-color, #0ea5e9);
                  color: white;
                  border-radius: 12px;
                  padding: 4px 8px;
                  font-size: 12px;
                  font-weight: 500;
                ">
                  ${cell.cards.length} card${cell.cards.length !== 1 ? 's' : ''}
                </div>` : 
                `<div style="color: var(--ls-secondary-text-color, #999); font-size: 12px;">Empty</div>`
              }
            </div>`
          ).join('')}
        </div>
        
        <div style="
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--ls-border-color, #e5e5e5);
          font-size: 12px;
          color: var(--ls-secondary-text-color, #666);
          text-align: center;
        ">
          Created: ${new Date(gridData.createdAt).toLocaleDateString()} • 
          Updated: ${new Date(gridData.updatedAt).toLocaleDateString()}
        </div>
      </div>
    `;

    // Устанавливаем глобальную функцию для редактирования
    (window as any).openCardbordEditor = (id: string) => {
      console.log('🔧 BUTTON CLICKED! Opening editor for grid:', id);
      this.openEditor(id);
    };

    // Отображаем UI
    logseq.provideUI({
      key: `cardbord-${gridId}-${Date.now()}`,
      slot,
      template,
      reset: true
    });

    console.log(`✅ Grid UI rendered. To edit, use Command Palette: "Edit Grid ${gridId}"`);
    logseq.UI.showMsg(`✅ Grid created! To edit: Ctrl+Shift+P → "Edit Grid ${gridId}"`, 'info');
  }



  /**
   * Открытие редактора для грида
   */
  openEditor(gridId: string): void {
    console.log('🔧 openEditor called for grid:', gridId);
    console.log('🔍 Storage contains grids:', Array.from(this.gridStorage.keys()));
    
    const gridData = this.gridStorage.get(gridId);
    if (!gridData) {
      console.error('❌ Grid not found in storage:', gridId);
      logseq.UI.showMsg(`❌ Grid ${gridId} not found`, 'error');
      return;
    }

    console.log('✅ Grid data found:', gridData);
    
    // Создаем модальное окно редактирования
    this.createEditorModal(gridId, gridData);
  }

  /**
   * Создание модального окна редактора
   */
  private createEditorModal(gridId: string, gridData: GridData): void {
    console.log('🎨 Creating editor modal for grid:', gridId);

    const modalHtml = `
      <div id="cardbord-modal-${gridId}" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        font-family: var(--ls-font-family, system-ui);
      ">
        <div style="
          background: var(--ls-primary-background-color, white);
          border-radius: 12px;
          padding: 24px;
          max-width: 800px;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
          border: 1px solid var(--ls-border-color, #e5e5e5);
        ">
          <div style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            border-bottom: 1px solid var(--ls-border-color, #e5e5e5);
            padding-bottom: 16px;
          ">
            <h2 style="
              margin: 0;
              color: var(--ls-primary-text-color, #333);
              font-size: 20px;
              font-weight: 600;
            ">
              ✏️ Edit Cardbord Grid
            </h2>
            <button 
              onclick="document.getElementById('cardbord-modal-${gridId}').remove()"
              style="
                background: transparent;
                border: 1px solid var(--ls-border-color, #ccc);
                border-radius: 6px;
                padding: 8px 12px;
                cursor: pointer;
                color: var(--ls-secondary-text-color, #666);
                font-size: 16px;
              "
            >
              ✕
            </button>
          </div>

          <div style="margin-bottom: 20px;">
            <p style="
              margin: 0 0 12px 0;
              color: var(--ls-secondary-text-color, #666);
              font-size: 14px;
            ">
              <strong>Grid ID:</strong> ${gridId} • 
              <strong>Size:</strong> ${gridData.rows}×${gridData.cols} • 
              <strong>Cells:</strong> ${gridData.cells.length}
            </p>
          </div>

          <div style="
            display: grid;
            gap: 16px;
            margin-bottom: 24px;
          ">
            <div>
              <h3 style="
                margin: 0 0 12px 0;
                color: var(--ls-primary-text-color, #333);
                font-size: 16px;
                font-weight: 500;
              ">
                📐 Grid Structure
              </h3>
              <div style="display: flex; gap: 12px; align-items: center;">
                <label style="
                  display: flex;
                  align-items: center;
                  gap: 8px;
                  color: var(--ls-primary-text-color, #333);
                  font-size: 14px;
                ">
                  Rows:
                  <input 
                    type="number" 
                    value="${gridData.rows}" 
                    min="1" 
                    max="10"
                    id="rows-${gridId}"
                    style="
                      width: 60px;
                      padding: 4px 8px;
                      border: 1px solid var(--ls-border-color, #ccc);
                      border-radius: 4px;
                      background: var(--ls-primary-background-color, white);
                      color: var(--ls-primary-text-color, #333);
                    "
                  >
                </label>
                <label style="
                  display: flex;
                  align-items: center;
                  gap: 8px;
                  color: var(--ls-primary-text-color, #333);
                  font-size: 14px;
                ">
                  Cols:
                  <input 
                    type="number" 
                    value="${gridData.cols}" 
                    min="1" 
                    max="10"
                    id="cols-${gridId}"
                    style="
                      width: 60px;
                      padding: 4px 8px;
                      border: 1px solid var(--ls-border-color, #ccc);
                      border-radius: 4px;
                      background: var(--ls-primary-background-color, white);
                      color: var(--ls-primary-text-color, #333);
                    "
                  >
                </label>
                <button 
                  onclick="window.updateGridStructure && window.updateGridStructure('${gridId}')"
                  style="
                    background: var(--ls-active-primary-color, #0ea5e9);
                    color: white;
                    border: none;
                    border-radius: 4px;
                    padding: 6px 12px;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 500;
                  "
                >
                  Update
                </button>
              </div>
            </div>

            <div>
              <h3 style="
                margin: 0 0 12px 0;
                color: var(--ls-primary-text-color, #333);
                font-size: 16px;
                font-weight: 500;
              ">
                🗂️ Grid Preview
              </h3>
              <div id="grid-preview-${gridId}" style="
                display: grid;
                grid-template-columns: repeat(${gridData.cols}, 1fr);
                gap: 4px;
                border: 1px solid var(--ls-border-color, #e5e5e5);
                border-radius: 4px;
                padding: 8px;
                background: var(--ls-secondary-background-color, #f8f9fa);
              ">
                ${gridData.cells.map((cell) => 
                  `<div style="
                    border: 1px dashed var(--ls-border-color, #ccc);
                    border-radius: 2px;
                    padding: 8px;
                    text-align: center;
                    min-height: 40px;
                    background: var(--ls-primary-background-color, white);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    font-size: 10px;
                    color: var(--ls-secondary-text-color, #999);
                  ">
                    ${cell.row + 1},${cell.col + 1}
                  </div>`
                ).join('')}
              </div>
            </div>
          </div>

          <div style="
            display: flex;
            justify-content: space-between;
            gap: 12px;
            padding-top: 16px;
            border-top: 1px solid var(--ls-border-color, #e5e5e5);
          ">
            <button 
              onclick="document.getElementById('cardbord-modal-${gridId}').remove()"
              style="
                background: var(--ls-secondary-background-color, #f3f4f6);
                color: var(--ls-primary-text-color, #333);
                border: 1px solid var(--ls-border-color, #ccc);
                border-radius: 6px;
                padding: 8px 16px;
                cursor: pointer;
                font-weight: 500;
              "
            >
              Cancel
            </button>
            <button 
              onclick="window.saveGridChanges && window.saveGridChanges('${gridId}')"
              style="
                background: var(--ls-active-primary-color, #0ea5e9);
                color: white;
                border: none;
                border-radius: 6px;
                padding: 8px 16px;
                cursor: pointer;
                font-weight: 500;
              "
            >
              💾 Save Changes
            </button>
          </div>
        </div>
      </div>
    `;

    // Добавляем модальное окно в DOM
    const modalElement = document.createElement('div');
    modalElement.innerHTML = modalHtml;
    document.body.appendChild(modalElement);

    // Устанавливаем глобальные функции для работы с модальным окном
    (window as any).updateGridStructure = (id: string) => {
      this.updateGridStructure(id);
    };

    (window as any).saveGridChanges = (id: string) => {
      this.saveGridChanges(id);
    };

    console.log('✅ Editor modal created successfully');
  }

  /**
   * Обновление структуры грида
   */
  private updateGridStructure(gridId: string): void {
    console.log('🔄 Updating grid structure for:', gridId);
    
    const rowsInput = document.getElementById(`rows-${gridId}`) as HTMLInputElement;
    const colsInput = document.getElementById(`cols-${gridId}`) as HTMLInputElement;
    
    if (!rowsInput || !colsInput) {
      console.error('❌ Input elements not found');
      return;
    }

    const newRows = parseInt(rowsInput.value);
    const newCols = parseInt(colsInput.value);

    console.log('📝 New dimensions:', { rows: newRows, cols: newCols });
    
    // TODO: Обновить данные грида и превью
    logseq.UI.showMsg(`🔄 Updating grid to ${newRows}×${newCols}`, 'info');
  }

  /**
   * Сохранение изменений грида
   */
  private saveGridChanges(gridId: string): void {
    console.log('💾 Saving grid changes for:', gridId);
    
    // TODO: Сохранить изменения и обновить отображение
    
    // Закрываем модальное окно
    const modal = document.getElementById(`cardbord-modal-${gridId}`);
    if (modal) {
      modal.remove();
    }

    logseq.UI.showMsg('💾 Grid changes saved!', 'success');
    console.log('✅ Grid changes saved successfully');
  }

  /**
   * Рендеринг грида в макросе (СТАРЫЙ МЕТОД - ОТКЛЮЧЕН)
   */
  /* СТАРЫЙ МЕТОД ОТКЛЮЧЕН
  async renderCardbordGrid_OLD(slot: string, serializedData: string): Promise<void> {
    // ... старый код отключен для упрощения
  }
  */

  /**
   * Создание HTML контейнера для грида
   */
  private createGridContainer(gridId: string): HTMLElement {
    const container = document.createElement('div');
    container.className = 'cardbord-container';
    container.setAttribute('data-grid-id', gridId);
    
    // Добавление кнопки редактирования
    const editButton = document.createElement('button');
    editButton.className = 'cardbord-edit-btn';
    editButton.innerHTML = '✏️';
    editButton.title = 'Редактировать сетку';
    editButton.setAttribute('data-action', 'edit-grid');
    
    container.appendChild(editButton);
    
    // Контейнер для самого грида
    const gridContainer = document.createElement('div');
    gridContainer.className = 'cardbord-grid-wrapper';
    container.appendChild(gridContainer);
    
    return container;
  }

  /**
   * Рендеринг заглушки при ошибке
   */
  private renderErrorPlaceholder(slot: string, message: string): void {
    const errorHtml = `
      <div class="cardbord-container cardbord-error">
        <div class="cardbord-error-message">
          <span>⚠️ ${message}</span>
          <button onclick="location.reload()" class="cardbord-retry-btn">
            Попробовать снова
          </button>
        </div>
      </div>
    `;
    
    logseq.provideUI({
      key: `cardbord-error-${Date.now()}`,
      slot,
      template: errorHtml,
      reset: true
    });
  }

  /**
   * Сохранение данных грида обратно в блок
   */
  private async saveGridData(slot: string, gridData: GridData): Promise<void> {
    try {
      // Получение блока по слоту
      const blockInfo = await this.getBlockBySlot(slot);
      if (!blockInfo) {
        console.warn('Block not found for slot:', slot);
        return;
      }

      // Обновление данных в макросе
      const serializedData = serializeGridData(gridData);
      const newContent = `{{renderer cardbord, ${serializedData}}}`;
      
      await logseq.Editor.updateBlock(blockInfo.uuid, newContent);
      
      console.log('✅ Grid data saved:', gridData.id);
      
    } catch (error) {
      console.error('❌ Failed to save grid data:', error);
    }
  }

  /**
   * Получение блока по слоту (вспомогательная функция)
   */
  private async getBlockBySlot(slot: string): Promise<{ uuid: string } | null> {
    try {
      // Извлечение UUID из слота
      const slotParts = slot.split('_');
      if (slotParts.length >= 2) {
        const blockUuid = slotParts[1];
        if (blockUuid) {
          const block = await logseq.Editor.getBlock(blockUuid);
          return block;
        }
      }
      return null;
    } catch (error) {
      console.error('Failed to get block by slot:', error);
      return null;
    }
  }

  /**
   * Очистка ресурсов при выгрузке плагина
   */
  cleanup(): void {
    // Очистка всех активных гридов
    this.activeGrids.forEach(grid => {
      grid.destroy();
    });
    this.activeGrids.clear();
    
    // Очистка системы тем
    this.themeSystem.cleanup();
    
    console.log('✅ Cardbord plugin cleaned up');
  }

  /**
   * Получение активного грида по ID
   */
  getGrid(gridId: string): any | undefined {
    return this.activeGrids.get(gridId);
  }

  /**
   * Получение всех активных гридов
   */
  getAllGrids(): any[] {
    return Array.from(this.activeGrids.values());
  }

  /**
   * Получение системы тем
   */
  getThemeSystem(): ThemeSystem {
    return this.themeSystem;
  }
}
