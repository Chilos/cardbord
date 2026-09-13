import type { Card, CardSticker, StickerCorner } from '../../types';

export class StickerController {
  static readonly STICKER_CORNERS: StickerCorner[] = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];
  static readonly STICKER_CONTROL_META: Array<{ corner: StickerCorner; icon: string; label: string }> = [
    { corner: 'top-left', icon: '↖', label: 'Верхний левый' },
    { corner: 'top-right', icon: '↗', label: 'Верхний правый' },
    { corner: 'bottom-right', icon: '↘', label: 'Нижний правый' },
    { corner: 'bottom-left', icon: '↙', label: 'Нижний левый' }
  ];

  private stickerDrafts: Partial<Record<StickerCorner, string>> = {};

  reset(): void {
    this.stickerDrafts = {};
  }

  setFromCard(card?: Card): void {
    this.stickerDrafts = {};
    if (card?.stickers) {
      card.stickers.forEach(({ corner, text }) => {
        this.stickerDrafts[corner] = text;
      });
    }
  }

  getDrafts(): Partial<Record<StickerCorner, string>> {
    return { ...this.stickerDrafts };
  }

  buildCardStickers(): CardSticker[] {
    const stickers = StickerController.STICKER_CORNERS.reduce<CardSticker[]>((acc, corner) => {
      const draft = this.stickerDrafts[corner];
      if (!draft) return acc;
      const trimmed = draft.trim();
      if (!trimmed) {
        delete this.stickerDrafts[corner];
        return acc;
      }
      acc.push({ corner, text: trimmed.slice(0, 16) });
      return acc;
    }, []);

    this.stickerDrafts = stickers.reduce<Partial<Record<StickerCorner, string>>>((acc, sticker) => {
      acc[sticker.corner] = sticker.text;
      return acc;
    }, {});

    return stickers;
  }

  createStickerElement(card: Card, sticker: CardSticker, targetDoc: Document): HTMLElement {
    const element = targetDoc.createElement('div');
    const isEmojiOnly = /^[\p{Emoji}\s]+$/u.test(sticker.text.trim());
    element.className = `cardbord-card-sticker cardbord-card-sticker--${sticker.corner}`;
    if (isEmojiOnly) element.classList.add('cardbord-card-sticker--emoji');
    element.textContent = sticker.text;
    element.setAttribute('data-corner', sticker.corner);
    element.style.setProperty('--cb-sticker-accent', sticker.color ?? card.color);
    return element;
  }

  renderControlsMarkup(): string {
    return StickerController.STICKER_CONTROL_META.map(({ corner, icon, label }) => `
      <div class="cardbord-sticker-control">
        <label class="cardbord-sticker-control-label" for="cb-visual-sticker-${corner}">
          <span class="cardbord-sticker-icon">${icon}</span>
          ${label}
        </label>
        <div class="cardbord-sticker-input-row">
          <input
            id="cb-visual-sticker-${corner}"
            class="cardbord-sticker-input"
            type="text"
            data-corner="${corner}"
            maxlength="16"
            placeholder="Подпись"
          />
          <button type="button" class="cardbord-sticker-clear" data-corner="${corner}" title="Очистить">✕</button>
        </div>
      </div>
    `).join('');
  }

  bindEditorInputs(targetDoc: Document, card?: Card): void {
    this.setFromCard(card);

    const stickerInputs = Array.from(targetDoc.querySelectorAll<HTMLInputElement>('.cardbord-sticker-input'));
    stickerInputs.forEach(input => {
      const corner = input.dataset.corner as StickerCorner | undefined;
      if (!corner) return;
      input.value = this.stickerDrafts[corner] ?? '';
      input.oninput = () => {
        const value = input.value;
        if (value.trim()) {
          this.stickerDrafts[corner] = value;
        } else {
          delete this.stickerDrafts[corner];
        }
      };
    });

    const perCornerClearButtons = Array.from(targetDoc.querySelectorAll<HTMLButtonElement>('.cardbord-sticker-clear'));
    perCornerClearButtons.forEach(btn => {
      const corner = btn.dataset.corner as StickerCorner | undefined;
      if (!corner) return;
      btn.onclick = (event) => {
        event.preventDefault();
        const input = targetDoc.querySelector<HTMLInputElement>(`#cb-visual-sticker-${corner}`);
        if (input) input.value = '';
        delete this.stickerDrafts[corner];
      };
    });

    const clearAllBtn = targetDoc.getElementById('cb-visual-clear-stickers') as HTMLButtonElement | null;
    if (clearAllBtn) {
      clearAllBtn.onclick = (event) => {
        event.preventDefault();
        this.stickerDrafts = {};
        stickerInputs.forEach(input => {
          input.value = '';
        });
      };
    }
  }
}
