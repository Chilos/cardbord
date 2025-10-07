/**
 * ArrowRenderer
 * Renders SVG arrows between cards
 */

import type { Arrow, Card, Point } from '../types';
import { getAnchorPoint, calculateBezierControlPoint, getPointOnQuadraticBezier, getCardRect } from '../utils/geometry';
import { ARROW_SEGMENTS } from '../utils/constants';

export class ArrowRenderer {
  private svg: SVGSVGElement;
  private colors: string[];
  private includePadding: boolean;

  constructor(svg: SVGSVGElement, colors: string[], includePadding: boolean = false) {
    this.svg = svg;
    this.colors = colors;
    this.includePadding = includePadding;
    this.initializeArrowheads();
  }

  /**
   * Инициализирует arrowhead маркеры для каждого цвета
   */
  private initializeArrowheads(): void {
    // Создаем defs если нет
    let defs = this.svg.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      this.svg.appendChild(defs);
    }

    // Создаем маркер для каждого цвета
    this.colors.forEach((color, idx) => {
      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
      marker.setAttribute('id', `arrowhead-${idx}`);
      marker.setAttribute('markerWidth', '10');
      marker.setAttribute('markerHeight', '10');
      marker.setAttribute('refX', '9');
      marker.setAttribute('refY', '3');
      marker.setAttribute('orient', 'auto');
      marker.setAttribute('markerUnits', 'userSpaceOnUse');
      
      const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      polygon.setAttribute('points', '0 0, 10 3, 0 6');
      polygon.setAttribute('fill', color);
      
      marker.appendChild(polygon);
      defs.appendChild(marker);
    });
  }

  /**
   * Устанавливает размер SVG
   */
  setSize(width: number, height: number): void {
    this.svg.setAttribute('width', width.toString());
    this.svg.setAttribute('height', height.toString());
  }

  /**
   * Очищает все стрелки
   */
  clear(): void {
    // Удаляем все группы стрелок (но оставляем defs)
    const groups = this.svg.querySelectorAll('g');
    groups.forEach(g => g.remove());
  }

  /**
   * Рендерит все стрелки
   */
  renderArrows(arrows: Arrow[], cards: Card[], onArrowClick?: (arrow: Arrow) => void): void {
    this.clear();

    arrows.forEach(arrow => {
      this.renderArrow(arrow, cards, onArrowClick);
    });
  }

  /**
   * Рендерит одну стрелку
   */
  private renderArrow(arrow: Arrow, cards: Card[], onArrowClick?: (arrow: Arrow) => void): void {
    const fromCard = cards.find(c => c.id === arrow.from);
    const toCard = cards.find(c => c.id === arrow.to);
    
    if (!fromCard || !toCard) return;

    // Логи координат карточек
    const fromRect = getCardRect(fromCard, this.includePadding);
    const toRect = getCardRect(toCard, this.includePadding);
    console.debug('[Cardbord][Arrow] card rects', { fromCard: arrow.from, fromRect, toCard: arrow.to, toRect });

    // Получаем точки начала и конца
    const start = getAnchorPoint(fromCard, arrow.fromSide, this.includePadding);
    const end = getAnchorPoint(toCard, arrow.toSide, this.includePadding);
    console.debug('[Cardbord][Arrow] anchors', { start, end, fromSide: arrow.fromSide, toSide: arrow.toSide });

    // Вычисляем контрольную точку для кривой Безье
    const control = calculateBezierControlPoint(start, end);
    console.debug('[Cardbord][Arrow] control', { control });

    // Делим кривую на сегменты и проверяем пересечения с карточками
    const segments = this.calculateSegments(start, control, end, arrow, cards);
    console.debug('[Cardbord][Arrow] segments(meta)', { count: segments.length, first: segments[0], last: segments[segments.length - 1] });

    // Создаем группу для всех частей стрелки
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.classList.add('cardbord-arrow-group');

    // Рисуем каждый сегмент
    segments.forEach((segment, idx) => {
      const isLast = idx === segments.length - 1;
      this.renderSegment(group, segment, arrow, isLast, start, control, end);
    });

    // Добавляем обработчик клика
    if (onArrowClick) {
      group.style.cursor = 'pointer';
      group.addEventListener('click', (e) => {
        e.stopPropagation();
        onArrowClick(arrow);
      });
    }

    this.svg.appendChild(group);
  }

  /**
   * Вычисляет сегменты стрелки (сплошные и пунктирные)
   */
  private calculateSegments(
    start: Point,
    control: Point,
    end: Point,
    arrow: Arrow,
    cards: Card[]
  ): Array<{ start: number; end: number; dashed: boolean }> {
    const points: Array<{ t: number; intersects: boolean }> = [];

    // Создаем точки вдоль кривой
    for (let i = 0; i <= ARROW_SEGMENTS; i++) {
      const t = i / ARROW_SEGMENTS;
      const point = getPointOnQuadraticBezier(start, control, end, t);
      
      // Проверяем пересечение с карточками (кроме начальной и конечной)
      let intersects = false;
      for (const card of cards) {
        if (card.id === arrow.from || card.id === arrow.to) continue;
        const rect = getCardRect(card, this.includePadding);
        if (point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h) {
          intersects = true;
          break;
        }
      }
      points.push({ t, intersects });
    }

    // Группируем точки в сегменты
    const segments: Array<{ start: number; end: number; dashed: boolean }> = [];
    let segmentStart = 0;
    let currentType = points[0].intersects;

    for (let i = 1; i <= points.length; i++) {
      const isLast = i === points.length;
      const typeChanged = !isLast && points[i].intersects !== currentType;
      if (typeChanged || isLast) {
        segments.push({ start: segmentStart, end: i - 1, dashed: currentType });
        segmentStart = i;
        if (!isLast) currentType = points[i].intersects;
      }
    }

    return segments;
  }

  /**
   * Рендерит сегмент стрелки
   */
  private renderSegment(
    group: SVGGElement,
    segment: { start: number; end: number; dashed: boolean },
    arrow: Arrow,
    isLast: boolean,
    startPoint: Point,
    controlPoint: Point,
    endPoint: Point
  ): void {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    const startT = segment.start / ARROW_SEGMENTS;
    const endT = segment.end / ARROW_SEGMENTS;

    // Сэмплируем реальные координаты по кривой Безье
    const steps = Math.max(2, segment.end - segment.start);
    const coords: Array<Point> = [];
    for (let i = 0; i <= steps; i++) {
      const t = startT + (i / steps) * (endT - startT);
      coords.push(getPointOnQuadraticBezier(startPoint, controlPoint, endPoint, t));
    }

    // Строим path по наборам точек
    let d = '';
    coords.forEach((p, i) => {
      d += (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`);
    });
    path.setAttribute('d', d);

    // Логируем итоговый путь для диагностики
    if (segment.start === 0) {
      console.debug('[Cardbord][Arrow] path(first segment)', { arrowId: arrow.id, d, startT, endT });
    }

    path.setAttribute('stroke', arrow.color);
    path.setAttribute('stroke-width', '2');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    path.classList.add('cardbord-arrow-path');

    if (segment.dashed) path.setAttribute('stroke-dasharray', '5,5');

    if (isLast) {
      const colorIdx = this.colors.indexOf(arrow.color);
      if (colorIdx >= 0) path.setAttribute('marker-end', `url(#arrowhead-${colorIdx})`);
    }

    group.appendChild(path);
  }

  /**
   * Обновляет цвета
   */
  updateColors(colors: string[]): void {
    this.colors = colors;
    // Пересоздаем arrowheads с новыми цветами
    const defs = this.svg.querySelector('defs');
    if (defs) {
      const markers = defs.querySelectorAll('marker');
      markers.forEach(m => m.remove());
    }
    this.initializeArrowheads();
  }
}
