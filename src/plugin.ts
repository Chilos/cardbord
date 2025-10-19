/**
 * CardbordPlugin
 * Main plugin class that coordinates all components
 */

/// <reference types="@logseq/libs" />

import { GridRenderer } from './ui/GridRenderer';
import { ColorSystem } from './utils/colorSystem';
import { encodeGridData, decodeGridData, createDefaultGridData } from './utils/encoding';
import { PLUGIN_NAME, RENDERER_TYPE } from './utils/constants';
import type { GridData, EditorButtonClickEvent, MacroRendererSlotEvent } from './types';
import { GridDataManager } from './storage/GridDataManager';
import { EditorModal } from './ui/EditorModal';
import { VisualEditor } from './ui/VisualEditor';
import { ArrowRenderer } from './ui/ArrowRenderer';
import { applyTextScaling } from './utils/textScaling';

// Import styles
import themeCSS from './styles/theme.css';
import animationsCSS from './styles/animations.css';
import componentsCSS from './styles/components.css';
import editorCSS from './styles/editor.css';

export class CardbordPlugin {
  private colorSystem: ColorSystem;
  private colors: string[] = [];
  private gridRenderer: GridRenderer;
  private slotUuidMap: Map<string, string> = new Map();
  private slotDataMap: Map<string, GridData> = new Map();
  private storage: GridDataManager;
  private editorModal: EditorModal;
  private visualEditor: VisualEditor;

  constructor() {
    this.colorSystem = new ColorSystem();
    this.gridRenderer = new GridRenderer();
    this.storage = new GridDataManager();
    this.editorModal = new EditorModal();
    this.visualEditor = new VisualEditor([]);
  }

  /**
   * Инициализирует плагин
   */
  async initialize(): Promise<void> {
    console.log(`[${PLUGIN_NAME}] Initializing...`);

    // Инициализируем цветовую систему
    this.colors = this.colorSystem.generateCardColors();
    this.visualEditor = new VisualEditor(this.colors);
    console.log(`[${PLUGIN_NAME}] Color system initialized:`, {
      mode: this.colorSystem.getThemeMode(),
      accent: this.colorSystem.getAccentColor(),
      colors: this.colors
    });

    // Регистрируем стили
    this.registerStyles();

    // Регистрируем обработчики событий
    this.registerEventHandlers();

    // Регистрируем slash команду
    this.registerSlashCommand();

    // Регистрируем macro renderer
    this.registerMacroRenderer();

    // Слушаем изменения темы
    this.setupThemeListener();

    console.log(`[${PLUGIN_NAME}] Plugin loaded successfully!`);
  }

  /**
   * Регистрирует CSS стили
   */
  private registerStyles(): void {
    logseq.provideStyle(`
      ${themeCSS}
      ${animationsCSS}
      ${componentsCSS}
      ${editorCSS}
    `);
    console.log(`[${PLUGIN_NAME}] Styles registered`);
  }

  /**
   * Регистрирует обработчики событий UI
   */
  private registerEventHandlers(): void {
    logseq.provideModel({
      openCardbordEditor: (e: EditorButtonClickEvent) => {
        console.log(`[${PLUGIN_NAME}] Editor button clicked`, e);
        
        const slotId = (e as any).slot || e.dataset?.slotId || e.slotId || e['data-slot-id'];
        
        if (!slotId) {
          console.error(`[${PLUGIN_NAME}] No slotId found in event`);
          return;
        }
        const rawUuid = this.slotUuidMap.get(slotId) as unknown;
        const blockUuid = typeof rawUuid === 'string' ? rawUuid : (rawUuid && (rawUuid as any).uuid ? String((rawUuid as any).uuid) : String(rawUuid ?? ''));
        console.debug(`[${PLUGIN_NAME}] Resolved block UUID for slot`, { slotId, rawUuid, blockUuid });
        if (!blockUuid || blockUuid === '[object Object]') {
          console.error(`[${PLUGIN_NAME}] Invalid block uuid for slotId:`, slotId, rawUuid);
          return;
        }
        // Берем последние отрендеренные данные для модалки
        const currentData = this.slotDataMap.get(slotId) || createDefaultGridData();
        console.debug(`[${PLUGIN_NAME}] Opening editor with cached data`, { hasData: !!this.slotDataMap.get(slotId) });
        this.openEditor(blockUuid, currentData);
      },
      saveCardbordGrid: async (e: { slotId: string }) => {
        try {
          const { slotId } = e;
          const blockUuid = this.slotUuidMap.get(slotId);
          if (!blockUuid) {
            logseq.UI.showMsg('Не найден блок для слота', 'error');
            return;
          }
          const data = this.slotDataMap.get(slotId);
          const toSave = data || await this.storage.load(blockUuid);
          await this.storage.save(blockUuid, toSave);
          logseq.UI.showMsg('Cardbord grid saved ✅', 'success');
        } catch (err) {
          console.error(`[${PLUGIN_NAME}] Failed to save grid:`, err);
          logseq.UI.showMsg('Не удалось сохранить сетку', 'error');
        }
      },
      saveCardbordGridByUuid: async (e: { 'block-uuid': string; 'textarea-id': string }) => {
        try {
          const blockUuid = (e as any)['block-uuid'];
          const textareaId = (e as any)['textarea-id'];
          const el = parent?.document?.getElementById(textareaId) || document.getElementById(textareaId);
          if (!el) {
            logseq.UI.showMsg('Textarea not found', 'error');
            return;
          }
          const text = (el as HTMLTextAreaElement).value;
          const data = JSON.parse(text) as GridData;
          await this.storage.save(blockUuid, data);
          logseq.UI.showMsg('Cardbord grid saved ✅', 'success');
          this.editorModal.hide();
        } catch (err) {
          console.error(`[${PLUGIN_NAME}] Failed to save from editor:`, err);
          logseq.UI.showMsg('Ошибка сохранения из редактора', 'error');
        }
      },
      closeCardbordEditor: () => {
        this.editorModal.hide();
      },
      noop: () => {}
    });
  }

  /**
   * Регистрирует slash команду
   */
  private registerSlashCommand(): void {
    logseq.Editor.registerSlashCommand('Cardbord Grid', async () => {
      console.log(`[${PLUGIN_NAME}] Slash command triggered`);
      const defaultData = createDefaultGridData();
      const encoded = encodeGridData(defaultData);
      await logseq.Editor.insertAtEditingCursor(`{{renderer ${RENDERER_TYPE}, ${encoded}}}`);
    });
    console.log(`[${PLUGIN_NAME}] Slash command registered as "Cardbord Grid"`);
  }

  /**
   * Регистрирует macro renderer
   */
  private registerMacroRenderer(): void {
    logseq.App.onMacroRendererSlotted(({ slot, payload }: MacroRendererSlotEvent) => {
      const [type, encodedData] = payload.arguments;
      if (type !== RENDERER_TYPE) return;

      console.log(`[${PLUGIN_NAME}] Rendering grid for slot:`, slot);
      const data = decodeGridData(encodedData || '');
      
      // Сохраняем соответствие slot -> uuid и текущие данные
      this.slotUuidMap.set(slot, String(payload.uuid));
      this.slotDataMap.set(slot, data);
      
      // Рендерим сетку
      const html = this.gridRenderer.render(data, {
        readonly: true,
        blockUuid: payload.uuid,
        slotKey: slot,
        showEditButton: true
      });

      logseq.provideUI({
        key: `${RENDERER_TYPE}-${slot}`,
        slot,
        template: html,
        reset: true
      });

      // Инициализируем отрисовку стрелок
      setTimeout(() => {
        try {
          const root = (parent && (parent as any).document) ? (parent as any).document : document;
          const container = root.querySelector(`.cardbord-container[data-slot-id="${slot}"]`) as HTMLElement | null;
          if (!container) {
            console.warn(`[${PLUGIN_NAME}] Container not found for slot:`, slot);
            return;
          }
          const svg = container.querySelector('svg.cardbord-arrows') as SVGSVGElement | null;
          if (!svg) {
            console.warn(`[${PLUGIN_NAME}] SVG not found in container`);
            return;
          }

          const wrapper = container.querySelector('.cardbord-grid-wrapper') as HTMLElement | null;
          const gridElement = container.querySelector('.cardbord-grid') as HTMLElement | null;

          if (wrapper && gridElement) {
            const wrapperRect = wrapper.getBoundingClientRect();
            const gridRect = gridElement.getBoundingClientRect();

            const topOffset = gridRect.top - wrapperRect.top;
            const leftOffset = gridRect.left - wrapperRect.left;

            svg.style.top = `${topOffset}px`;
            svg.style.left = `${leftOffset}px`;
            svg.setAttribute('width', `${gridRect.width}`);
            svg.setAttribute('height', `${gridRect.height}`);
          }

          console.debug('[Cardbord][Arrow] Rendering arrows for slot:', slot, 'arrows:', data.arrows.length);
          const renderer = new ArrowRenderer(svg, this.colors, false);
          renderer.renderArrows(data.arrows, data.cards);

          // Добавляем обработчики кликов для ссылок и тегов
          this.attachLinkHandlers(container);

          // Применяем автомасштабирование текста
          applyTextScaling(container);
        } catch (err) {
          console.error(`[${PLUGIN_NAME}] Arrow render failed:`, err);
        }
      }, 100); // Увеличил задержку для гарантии рендеринга DOM
    });
  }

  /**
   * Прикрепляет обработчики кликов для ссылок и тегов
   */
  private attachLinkHandlers(container: HTMLElement): void {
    // Обработчики для [[page links]]
    const pageLinks = container.querySelectorAll('.cardbord-page-link');
    pageLinks.forEach((link) => {
      link.addEventListener('click', async (e) => {
        e.stopPropagation();
        const pageName = (link as HTMLElement).dataset.page;
        if (pageName) {
          console.log(`[${PLUGIN_NAME}] Navigating to page:`, pageName);
          await logseq.Editor.scrollToBlockInPage(pageName, pageName);
        }
      });
    });

    // Обработчики для #tags
    const tags = container.querySelectorAll('.cardbord-tag');
    tags.forEach((tag) => {
      tag.addEventListener('click', async (e) => {
        e.stopPropagation();
        const tagName = (tag as HTMLElement).dataset.tag;
        if (tagName) {
          console.log(`[${PLUGIN_NAME}] Navigating to tag:`, tagName);
          await logseq.Editor.scrollToBlockInPage(tagName, tagName);
        }
      });
    });
  }

  /**
   * Открывает редактор для указанного блока
   */
  private openEditor(blockUuid: string, initialData: GridData): void {
    // Используем визуальный редактор вместо простого JSON редактора
    this.visualEditor.show(initialData, blockUuid);
  }

  /**
   * Устанавливает слушатели для изменения темы
   */
  private setupThemeListener(): void {
    logseq.App.onThemeModeChanged(({ mode }: { mode: 'light' | 'dark' }) => {
      console.log(`[${PLUGIN_NAME}] Theme changed to:`, mode);
      this.colorSystem.refresh();
      this.colors = this.colorSystem.generateCardColors();
      this.visualEditor.updateColors(this.colors);
      console.log(`[${PLUGIN_NAME}] Colors updated:`, this.colors);
    });
  }

  /**
   * Очистка ресурсов при выгрузке
   */
  async cleanup(): Promise<void> {
    console.log(`[${PLUGIN_NAME}] Cleaning up...`);
    this.slotUuidMap.clear();
    this.slotDataMap.clear();
  }
}
