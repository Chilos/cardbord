/**
 * ArrowRenderer
 * Renders SVG arrows between cards
 */

import type { Arrow, Card, Point } from '../types';
import {
  buildCubicBezierPath,
  getCardRect,
  getPointOnCubicBezier,
  pathIntersectsCards,
  buildOrthogonalPath,
  optimiseOrthogonalPath,
  distance,
  lineIntersectsRect
} from '../utils/geometry';
import { ARROW_SAMPLE_POINTS, ARROW_SEGMENTS, ARROW_STROKE_WIDTH } from '../utils/constants';

type ArrowRoute =
  | { kind: 'cubic'; points: Point[]; passThroughCardIds?: string[] }
  | { kind: 'orthogonal'; points: Point[]; passThroughCardIds?: string[] };

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
      marker.setAttribute('markerWidth', '12');
      marker.setAttribute('markerHeight', '12');
      marker.setAttribute('refX', '10');
      marker.setAttribute('refY', '4');
      marker.setAttribute('orient', 'auto');
      marker.setAttribute('markerUnits', 'userSpaceOnUse');
      
      const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      polygon.setAttribute('points', '0 1, 10 4, 0 7');
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

    const route = this.buildRoute(arrow, fromCard, toCard, cards);
    const segments = this.calculateSegments(route.points, arrow, cards);
    console.debug('[Cardbord][Arrow] route(meta)', {
      kind: route.kind,
      segments: segments.length,
      points: route.points.length
    });

    if (segments.length === 0) {
      return;
    }

    // Создаем группу для всех частей стрелки
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.classList.add('cardbord-arrow-group');
    group.addEventListener('mouseenter', () => {
      group.classList.add('cardbord-arrow-group-hover');
    });
    group.addEventListener('mouseleave', () => {
      group.classList.remove('cardbord-arrow-group-hover');
    });

    // Рисуем каждый сегмент
    segments.forEach((segment, idx) => {
      const isLast = idx === segments.length - 1;
      const segmentPoints = route.points.slice(segment.startIndex, segment.endIndex + 1);
      this.renderSegment(group, segmentPoints, arrow, segment.dashed, isLast);
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
   * Строит маршрут стрелки
   */
  private buildRoute(
    arrow: Arrow,
    fromCard: Card,
    toCard: Card,
    cards: Card[]
  ): ArrowRoute {
    const allowPassThrough = fromCard.row === toCard.row || fromCard.col === toCard.col;
    const bezierCandidates: Array<{ points: Point[]; intersections: Card[] }> = [];
    for (let multiplier = 1; multiplier <= 3.2; multiplier += 0.6) {
      const bezier = buildCubicBezierPath(fromCard, toCard, arrow, this.includePadding, multiplier);
      const samples = this.sampleBezier(bezier);
      const intersections = this.getIntersectingCards(samples, arrow, cards);
      bezierCandidates.push({ points: samples, intersections });
      if (intersections.length === 0) {
        return { kind: 'cubic', points: samples, passThroughCardIds: [] };
      }
    }

    if (bezierCandidates.length > 0) {
      const firstCandidate = bezierCandidates[0];
      const verticalFlow =
        arrow.fromSide === 'top' || arrow.fromSide === 'bottom' ||
        arrow.toSide === 'top' || arrow.toSide === 'bottom';
      const horizontalFlow =
        arrow.fromSide === 'left' || arrow.fromSide === 'right' ||
        arrow.toSide === 'left' || arrow.toSide === 'right';

      const allIntersectionsShareFromColumn = firstCandidate.intersections.every(card => card.col === fromCard.col);
      const allIntersectionsShareToColumn = firstCandidate.intersections.every(card => card.col === toCard.col);
      const allIntersectionsShareFromRow = firstCandidate.intersections.every(card => card.row === fromCard.row);
      const allIntersectionsShareToRow = firstCandidate.intersections.every(card => card.row === toCard.row);

      const allowVerticalPassThrough = verticalFlow && (allIntersectionsShareFromColumn || allIntersectionsShareToColumn);
      const allowHorizontalPassThrough = horizontalFlow && (allIntersectionsShareFromRow || allIntersectionsShareToRow);

      if (allowPassThrough || allowVerticalPassThrough || allowHorizontalPassThrough) {
        return {
          kind: 'cubic',
          points: firstCandidate.points,
          passThroughCardIds: firstCandidate.intersections.map(card => card.id)
        };
      }
    }

    // Попробуем ортогональный маршрут как fallback
    const orthogonalPath = buildOrthogonalPath(
      fromCard,
      toCard,
      arrow,
      this.includePadding,
      (path) => optimiseOrthogonalPath(path, cards, arrow, this.includePadding)
    );
    const orthogonalSamples = this.samplePolyline(orthogonalPath);
    if (!pathIntersectsCards(orthogonalSamples, cards, arrow, this.includePadding)) {
      return { kind: 'orthogonal', points: orthogonalSamples, passThroughCardIds: [] };
    }

    // Возвращаем последний из bezьер-кандидатов если других вариантов нет
    const lastCandidate = bezierCandidates[bezierCandidates.length - 1];
    return {
      kind: 'cubic',
      points: lastCandidate ? lastCandidate.points : orthogonalSamples
    };
  }

  /**
   * Рендерит сегмент стрелки
   */
  private renderSegment(
    group: SVGGElement,
    segmentPoints: Point[],
    arrow: Arrow,
    dashed: boolean,
    isLast: boolean
  ): void {
    const hitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    let d = '';
    segmentPoints.forEach((p, i) => {
      d += (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`);
    });
    hitPath.setAttribute('d', d);
    path.setAttribute('d', d);

    hitPath.setAttribute('stroke', 'transparent');
    hitPath.setAttribute('stroke-width', '12');
    hitPath.setAttribute('fill', 'none');
    hitPath.setAttribute('pointer-events', 'stroke');
    hitPath.classList.add('cardbord-arrow-hit');

    path.setAttribute('stroke', arrow.color);
    path.setAttribute('stroke-width', ARROW_STROKE_WIDTH.toString());
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    path.classList.add('cardbord-arrow-path');

    if (dashed) path.setAttribute('stroke-dasharray', '6,6');

    if (isLast) {
      const colorIdx = this.colors.indexOf(arrow.color);
      if (colorIdx >= 0) path.setAttribute('marker-end', `url(#arrowhead-${colorIdx})`);
    }

    group.appendChild(hitPath);
    group.appendChild(path);
  }

  private calculateSegments(
    points: Point[],
    arrow: Arrow,
    cards: Card[]
  ): Array<{ startIndex: number; endIndex: number; dashed: boolean }> {
    if (points.length < 2) {
      return [];
    }

    const segments: Array<{ startIndex: number; endIndex: number; dashed: boolean }> = [];
    let segmentStart = 0;
    let currentDashed = false;

    for (let i = 1; i < points.length; i++) {
      const p1 = points[i - 1];
      const p2 = points[i];
      const intersects = this.segmentIntersectsCards(p1, p2, arrow, cards);
      const isLast = i === points.length - 1;

      if (intersects !== currentDashed) {
        segments.push({ startIndex: segmentStart, endIndex: i - 1, dashed: currentDashed });
        segmentStart = i - 1;
        currentDashed = intersects;
      }

      if (isLast) {
        segments.push({ startIndex: segmentStart, endIndex: i, dashed: currentDashed });
      }
    }

    return segments;
  }

  private segmentIntersectsCards(
    p1: Point,
    p2: Point,
    arrow: Arrow,
    cards: Card[]
  ): boolean {
    for (const card of cards) {
      if (card.id === arrow.from || card.id === arrow.to) continue;
      const rect = getCardRect(card, this.includePadding);
      if (lineIntersectsRect(p1, p2, rect)) {
        return true;
      }
    }
    return false;
  }

  private getIntersectingCards(points: Point[], arrow: Arrow, cards: Card[]): Card[] {
    const hits: Card[] = [];
    const seen = new Set<string>();

    for (let i = 1; i < points.length; i++) {
      const p1 = points[i - 1];
      const p2 = points[i];

      for (const card of cards) {
        if (card.id === arrow.from || card.id === arrow.to) continue;
        if (seen.has(card.id)) continue;
        const rect = getCardRect(card, this.includePadding);
        if (lineIntersectsRect(p1, p2, rect)) {
          seen.add(card.id);
          hits.push(card);
        }
      }
    }

    return hits;
  }

  private sampleBezier(bezier: { start: Point; control1: Point; control2: Point; end: Point }): Point[] {
    const points: Point[] = [];
    for (let i = 0; i <= ARROW_SAMPLE_POINTS; i++) {
      const t = i / ARROW_SAMPLE_POINTS;
      points.push(getPointOnCubicBezier(bezier.start, bezier.control1, bezier.control2, bezier.end, t));
    }
    return points;
  }

  private samplePolyline(points: Point[]): Point[] {
    if (points.length === 0) return points;
    const sampled: Point[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i];
      const end = points[i + 1];
      const segLength = Math.max(distance(start, end), 1);
      const steps = Math.max(2, Math.ceil(segLength / (ARROW_SEGMENTS / 2)));
      for (let step = 0; step < steps; step++) {
        const t = step / steps;
        sampled.push({
          x: start.x + (end.x - start.x) * t,
          y: start.y + (end.y - start.y) * t
        });
      }
    }
    sampled.push(points[points.length - 1]);
    return sampled;
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
