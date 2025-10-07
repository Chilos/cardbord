import type { GridData } from '../types';
import { encodeGridData, createDefaultGridData } from '../utils/encoding';
import { RENDERER_TYPE } from '../utils/constants';

export class EditorModal {
  private static MODAL_ID = 'cardbord-modal';

  show(data: GridData | unknown, blockUuid: string): void {
    const targetDoc = (parent && (parent as any).document) ? (parent as any).document : document;

    // Если уже открыто — сначала закрываем
    const existing = targetDoc.getElementById(EditorModal.MODAL_ID);
    if (existing) existing.remove();

    // Нормализация входных данных к GridData
    let normalized: GridData;
    try {
      if (typeof data === 'string') {
        console.debug('[Cardbord][EditorModal] data is string, falling back to default grid');
        normalized = createDefaultGridData();
      } else if (data && typeof data === 'object' && 'rows' in (data as any) && 'cols' in (data as any)) {
        normalized = data as GridData;
      } else {
        console.debug('[Cardbord][EditorModal] data is not GridData, using default');
        normalized = createDefaultGridData();
      }
    } catch {
      normalized = createDefaultGridData();
    }

    const textareaContent = this.escapeHtml(JSON.stringify(normalized, null, 2));

    const modalHtml = `
      <div id="${EditorModal.MODAL_ID}" style="position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 9999; display: flex; align-items: center; justify-content: center;">
        <div style="background: var(--ls-primary-background-color, #fff); color: var(--ls-primary-text-color, #111); padding: 24px; border-radius: 8px; width: min(800px, 90vw); max-height: 90vh; overflow: auto; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
          <h3 style="margin: 0 0 12px 0;">Редактор сетки (JSON)</h3>
          <p style="margin: 0 0 12px 0; opacity: .7;">Временная версия редактора. Вставьте/измените JSON и сохраните.</p>
          <textarea id="cb-json" style="width: 100%; height: 300px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; padding: 8px; box-sizing: border-box; border: 1px solid var(--ls-border-color, #ddd); border-radius: 6px;">${textareaContent}</textarea>
          <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px;">
            <button id="cb-save" style="padding: 6px 12px; border: none; border-radius: 6px; background: var(--ls-active-primary-color, #4ECDC4); color: #fff; cursor: pointer;">💾 Сохранить</button>
            <button id="cb-cancel" style="padding: 6px 12px; border: 1px solid var(--ls-border-color, #ddd); border-radius: 6px; background: transparent; cursor: pointer;">✖ Закрыть</button>
          </div>
        </div>
      </div>
    `;

    targetDoc.body.insertAdjacentHTML('beforeend', modalHtml);

    const saveBtn = targetDoc.getElementById('cb-save') as HTMLButtonElement | null;
    const cancelBtn = targetDoc.getElementById('cb-cancel') as HTMLButtonElement | null;
    const textarea = targetDoc.getElementById('cb-json') as HTMLTextAreaElement | null;

    if (saveBtn && textarea) {
      saveBtn.onclick = async () => {
        try {
          const uuid = String(blockUuid);
          console.debug('[Cardbord][EditorModal] saving to uuid', uuid);
          const parsed = JSON.parse(textarea.value) as GridData;
          const encoded = encodeGridData(parsed);
          await logseq.Editor.updateBlock(uuid, `{{renderer ${RENDERER_TYPE}, ${encoded}}}`);
          this.hide();
          logseq.UI.showMsg('Cardbord grid saved ✅', 'success');
        } catch (err) {
          console.error('[Cardbord] Failed to save from modal:', err);
          logseq.UI.showMsg('Ошибка сохранения', 'error');
        }
      };
    }

    if (cancelBtn) {
      cancelBtn.onclick = () => this.hide();
    }
  }

  hide(): void {
    const targetDoc = (parent && (parent as any).document) ? (parent as any).document : document;
    const el = targetDoc.getElementById(EditorModal.MODAL_ID);
    if (el) el.remove();
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
