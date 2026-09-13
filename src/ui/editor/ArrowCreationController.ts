import type { Card, Arrow, AnchorSide } from '../../types';
import { getAnchorPoint } from '../../utils/geometry';

export interface ArrowCreationCallbacks {
  getTargetDoc: () => Document;
  getCurrentCards: () => Card[];
  getCurrentZoom: () => number;
  getColor: () => string;
  onArrowCreated: (arrow: Arrow) => void;
}

export class ArrowCreationController {
  private isCreating = false;
  private arrowStartCard: Card | null = null;
  private arrowStartSide: AnchorSide | null = null;
  private magneticTargetCard: Card | null = null;
  private magneticTargetSide: AnchorSide | null = null;

  constructor(private callbacks: ArrowCreationCallbacks) {}

  get isCreatingArrow(): boolean {
    return this.isCreating;
  }

  get startCard(): Card | null {
    return this.arrowStartCard;
  }

  get startSide(): AnchorSide | null {
    return this.arrowStartSide;
  }

  start(card: Card, side: AnchorSide): void {
    const doc = this.callbacks.getTargetDoc();

    // Отключаем draggable на всех карточках
    doc.querySelectorAll('.cardbord-editor-cell-card').forEach((el: any) => {
      el.draggable = false;
    });

    this.isCreating = true;
    this.arrowStartCard = card;
    this.arrowStartSide = side;

    doc.addEventListener('mousemove', this.handleArrowDrag);
    doc.addEventListener('mouseup', this.handleArrowEnd);
  }

  private handleArrowDrag = (e: MouseEvent): void => {
    if (!this.isCreating || !this.arrowStartCard || !this.arrowStartSide) {
      return;
    }

    const doc = this.callbacks.getTargetDoc();
    const svg = doc.querySelector('.cardbord-editor-arrows-svg') as SVGSVGElement | null;
    if (!svg) return;

    // Удаляем старую фантомную линию
    const existingPhantom = svg.querySelector('.cardbord-phantom-arrow');
    if (existingPhantom) existingPhantom.remove();

    // Получаем координаты начальной точки
    const startPoint = getAnchorPoint(this.arrowStartCard, this.arrowStartSide, false);

    // Получаем координаты мыши относительно SVG с учетом зума
    const svgRect = svg.getBoundingClientRect();
    const scale = this.callbacks.getCurrentZoom() || 1;
    const mouseX = (e.clientX - svgRect.left) / scale;
    const mouseY = (e.clientY - svgRect.top) / scale;

    // Убираем класс magnetic со всех anchor points
    doc.querySelectorAll('.cardbord-anchor-magnetic').forEach((el) => {
      el.classList.remove('cardbord-anchor-magnetic');
    });

    let endPoint = { x: mouseX, y: mouseY };
    let snapToAnchor = false;
    let magneticAnchorEl: HTMLElement | null = null;
    let targetCard: Card | null = null;
    let targetSide: AnchorSide | null = null;
    let minDistance = 30; // Начальный порог для магнитного притяжения

    const cards = this.callbacks.getCurrentCards();
    const sides: AnchorSide[] = ['top', 'right', 'bottom', 'left'];

    for (const card of cards) {
      if (card.id === this.arrowStartCard.id) continue;

      for (const side of sides) {
        const anchorPoint = getAnchorPoint(card, side, false);
        const dist = Math.sqrt(Math.pow(mouseX - anchorPoint.x, 2) + Math.pow(mouseY - anchorPoint.y, 2));

        if (dist < minDistance) {
          endPoint = anchorPoint;
          snapToAnchor = true;
          targetCard = card;
          targetSide = side;
          minDistance = dist;

          const cell = doc.querySelector(`[data-card-id="${card.id}"]`);
          if (cell) {
            magneticAnchorEl = cell.querySelector(`.cardbord-anchor-${side}`) as HTMLElement;
          }
        }
      }
    }

    this.magneticTargetCard = targetCard;
    this.magneticTargetSide = targetSide;

    if (magneticAnchorEl) {
      magneticAnchorEl.classList.add('cardbord-anchor-magnetic');
    }

    const phantomLine = doc.createElementNS('http://www.w3.org/2000/svg', 'line');
    phantomLine.setAttribute('class', 'cardbord-phantom-arrow');
    phantomLine.setAttribute('x1', startPoint.x.toString());
    phantomLine.setAttribute('y1', startPoint.y.toString());
    phantomLine.setAttribute('x2', endPoint.x.toString());
    phantomLine.setAttribute('y2', endPoint.y.toString());
    phantomLine.setAttribute('stroke', snapToAnchor ? this.callbacks.getColor() : '#999');
    phantomLine.setAttribute('stroke-width', '2');
    phantomLine.setAttribute('stroke-dasharray', '5,5');
    phantomLine.setAttribute('opacity', '0.6');
    phantomLine.style.pointerEvents = 'none';

    svg.appendChild(phantomLine);
  };

  private handleArrowEnd = (): void => {
    if (!this.isCreating) return;

    if (this.magneticTargetCard && this.magneticTargetSide) {
      this.complete(this.magneticTargetCard, this.magneticTargetSide);
    } else {
      this.cancel();
    }
  };

  cancel(): void {
    this.cleanupListenersAndElements();
    this.resetState();
  }

  complete(targetCard: Card, targetSide: AnchorSide): void {
    const fromCard = this.arrowStartCard;
    const fromSide = this.arrowStartSide;

    this.cleanupListenersAndElements();

    if (fromCard && fromSide && fromCard.id !== targetCard.id) {
      const newArrow: Arrow = {
        id: Date.now().toString(),
        from: fromCard.id,
        to: targetCard.id,
        fromSide,
        toSide: targetSide,
        color: this.callbacks.getColor()
      };
      this.callbacks.onArrowCreated(newArrow);
    }

    this.resetState();
  }

  private cleanupListenersAndElements(): void {
    const doc = this.callbacks.getTargetDoc();
    doc.removeEventListener('mousemove', this.handleArrowDrag);
    doc.removeEventListener('mouseup', this.handleArrowEnd);

    const svg = doc.querySelector('.cardbord-editor-arrows-svg') as SVGSVGElement | null;
    if (svg) {
      const phantom = svg.querySelector('.cardbord-phantom-arrow');
      if (phantom) phantom.remove();
    }

    doc.querySelectorAll('.cardbord-anchor-magnetic').forEach((el) => {
      el.classList.remove('cardbord-anchor-magnetic');
    });

    doc.querySelectorAll('.cardbord-editor-cell-card').forEach((el: any) => {
      el.draggable = true;
    });
  }

  private resetState(): void {
    this.isCreating = false;
    this.arrowStartCard = null;
    this.arrowStartSide = null;
    this.magneticTargetCard = null;
    this.magneticTargetSide = null;
  }
}
