/**
 * Geometry Utilities
 * Functions for arrow positioning and intersection calculations
 */

import type { Arrow, Card, Point, Rect, AnchorSide } from '../types';
import {
  CELL_WIDTH,
  CELL_HEIGHT,
  GAP,
  PADDING,
  ARROW_CURVATURE_FACTOR,
  ARROW_CURVATURE_MIN,
  ARROW_CURVATURE_MAX,
  ARROW_EXIT_OFFSET,
  ARROW_SIDE_MULTIPLIER,
  ARROW_ORTHOGONAL_MAX_OFFSET,
  ARROW_ORTHOGONAL_STEP
} from './constants';

const SIDE_VECTORS: Record<AnchorSide, Point> = {
  top: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 }
};

/**
 * Возвращает направление для стороны карточки (ориентировано наружу)
 */
export function getSideVector(side: AnchorSide): Point {
  return SIDE_VECTORS[side];
}

export function addPoints(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function scalePoint(p: Point, scale: number): Point {
  return { x: p.x * scale, y: p.y * scale };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function isHorizontalSide(side: AnchorSide): boolean {
  return side === 'left' || side === 'right';
}

export function isVerticalSide(side: AnchorSide): boolean {
  return side === 'top' || side === 'bottom';
}

/**
 * Вычисляет координаты точки привязки стрелки на карточке (центр грани)
 */
export function getAnchorPoint(card: Card, side: AnchorSide, includePadding: boolean = true): Point {
  const offset = includePadding ? PADDING : 0;
  const x = offset + card.col * (CELL_WIDTH + GAP);
  const y = offset + card.row * (CELL_HEIGHT + GAP);
  const w = CELL_WIDTH;
  const h = CELL_HEIGHT;

  switch(side) {
    case 'top':
      return { x: x + w / 2, y: y };
    case 'bottom':
      return { x: x + w / 2, y: y + h };
    case 'left':
      return { x: x, y: y + h / 2 };
    case 'right':
      return { x: x + w, y: y + h / 2 };
  }
}

/**
 * Получает прямоугольник карточки
 */
export function getCardRect(card: Card, includePadding: boolean = true): Rect {
  const offset = includePadding ? PADDING : 0;
  const x = offset + card.col * (CELL_WIDTH + GAP);
  const y = offset + card.row * (CELL_HEIGHT + GAP);

  return {
    x,
    y,
    w: CELL_WIDTH,
    h: CELL_HEIGHT
  };
}

/**
 * Проверяет, пересекает ли линия прямоугольник (алгоритм Liang-Barsky)
 */
export function lineIntersectsRect(p1: Point, p2: Point, rect: Rect): boolean {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  
  let t0 = 0, t1 = 1;
  const p = [-dx, dx, -dy, dy];
  const q = [
    p1.x - rect.x,
    rect.x + rect.w - p1.x,
    p1.y - rect.y,
    rect.y + rect.h - p1.y
  ];
  
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) {
        if (t > t1) return false;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return false;
        if (t < t1) t1 = t;
      }
    }
  }
  
  return t0 <= t1;
}

/**
 * Проверяет, находится ли точка внутри прямоугольника
 */
export function pointInRect(point: Point, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.w &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.h
  );
}

/**
 * Вычисляет расстояние между двумя точками
 */
export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export interface CubicBezier {
  start: Point;
  control1: Point;
  control2: Point;
  end: Point;
}

/**
 * Строит кривую Безье третьего порядка с учетом сторон карточек
 */
export function buildCubicBezierPath(
  fromCard: Card,
  toCard: Card,
  arrow: Arrow,
  includePadding: boolean,
  curvatureBoost: number = 1
): CubicBezier {
  const start = getAnchorPoint(fromCard, arrow.fromSide, includePadding);
  const end = getAnchorPoint(toCard, arrow.toSide, includePadding);

  const curveDistance = distance(start, end);
  const baseCurvature = clamp(
    curveDistance * ARROW_CURVATURE_FACTOR * curvatureBoost,
    ARROW_CURVATURE_MIN,
    ARROW_CURVATURE_MAX
  );

  const startVector = getSideVector(arrow.fromSide);
  const endVector = getSideVector(arrow.toSide);

  const startMultiplier = ARROW_SIDE_MULTIPLIER[arrow.fromSide] ?? 1;
  const endMultiplier = ARROW_SIDE_MULTIPLIER[arrow.toSide] ?? 1;

  const control1 = addPoints(
    start,
    scalePoint(startVector, baseCurvature * startMultiplier + ARROW_EXIT_OFFSET)
  );
  const control2 = addPoints(
    end,
    scalePoint(endVector, baseCurvature * endMultiplier + ARROW_EXIT_OFFSET)
  );

  return {
    start,
    control1,
    control2,
    end
  };
}

/**
 * Вычисляет контрольную точку для квадратичной кривой Безье
 * @deprecated использовать buildCubicBezierPath
 */
export function calculateBezierControlPoint(
  start: Point,
  end: Point,
  curvatureFactor: number = 0.2,
  maxCurvature: number = 50
): Point {
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const curvature = Math.min(dist * curvatureFactor, maxCurvature);
  
  // Перпендикулярный вектор
  const perpX = -dy / dist;
  const perpY = dx / dist;
  
  return {
    x: midX + perpX * curvature,
    y: midY + perpY * curvature
  };
}

/**
 * Вычисляет точку на квадратичной кривой Безье
 * @deprecated использовать getPointOnCubicBezier
 */
export function getPointOnQuadraticBezier(
  start: Point,
  control: Point,
  end: Point,
  t: number
): Point {
  const oneMinusT = 1 - t;
  return {
    x: oneMinusT * oneMinusT * start.x + 2 * oneMinusT * t * control.x + t * t * end.x,
    y: oneMinusT * oneMinusT * start.y + 2 * oneMinusT * t * control.y + t * t * end.y
  };
}

/**
 * Вычисляет точку на кубической кривой Безье
 */
export function getPointOnCubicBezier(
  start: Point,
  control1: Point,
  control2: Point,
  end: Point,
  t: number
): Point {
  const oneMinusT = 1 - t;
  const oneMinusTSquared = oneMinusT * oneMinusT;
  const tSquared = t * t;

  return {
    x:
      oneMinusT * oneMinusTSquared * start.x +
      3 * oneMinusTSquared * t * control1.x +
      3 * oneMinusT * tSquared * control2.x +
      tSquared * t * end.x,
    y:
      oneMinusT * oneMinusTSquared * start.y +
      3 * oneMinusTSquared * t * control1.y +
      3 * oneMinusT * tSquared * control2.y +
      tSquared * t * end.y
  };
}

/**
 * Возвращает ближайшую точку выхода из карточки вдоль указанной стороны
 */
export function getAnchorExitPoint(
  card: Card,
  side: AnchorSide,
  includePadding: boolean,
  offset: number
): Point {
  return addPoints(
    getAnchorPoint(card, side, includePadding),
    scalePoint(getSideVector(side), offset)
  );
}

/**
 * Перебирает кривизну до тех пор, пока путь не перестанет пересекать карточки (либо достигнет лимита)
 */
/**
 * Генерирует прямоугольный (ортогональный) маршрут между двумя карточками
 */
export function buildOrthogonalPath(
  fromCard: Card,
  toCard: Card,
  arrow: Arrow,
  includePadding: boolean,
  adjust: (path: Point[]) => Point[]
): Point[] {
  const start = getAnchorPoint(fromCard, arrow.fromSide, includePadding);
  const end = getAnchorPoint(toCard, arrow.toSide, includePadding);

  const startOffset = getAnchorExitPoint(fromCard, arrow.fromSide, includePadding, ARROW_EXIT_OFFSET);
  const endOffset = getAnchorExitPoint(toCard, arrow.toSide, includePadding, ARROW_EXIT_OFFSET);

  const path: Point[] = [start, startOffset];

  const startHorizontal = isHorizontalSide(arrow.fromSide);
  const endHorizontal = isHorizontalSide(arrow.toSide);

  if (startHorizontal === endHorizontal) {
    const axisShift = (startHorizontal ? { x: 0, y: 1 } : { x: 1, y: 0 });
    const direction = startHorizontal ? Math.sign(endOffset.y - startOffset.y) || 1 : Math.sign(endOffset.x - startOffset.x) || 1;
    const offset = ARROW_EXIT_OFFSET + ARROW_ORTHOGONAL_STEP;

    const elbow1 = startHorizontal
      ? { x: startOffset.x + axisShift.y * direction * offset, y: startOffset.y }
      : { x: startOffset.x, y: startOffset.y + axisShift.x * direction * offset };
    const elbow2 = startHorizontal
      ? { x: elbow1.x, y: endOffset.y }
      : { x: endOffset.x, y: elbow1.y };

    path.push(elbow1, elbow2);
  } else {
    const elbow = {
      x: startHorizontal ? startOffset.x : endOffset.x,
      y: startHorizontal ? endOffset.y : startOffset.y
    };
    path.push(elbow);
  }

  path.push(endOffset, end);

  return adjust(path);
}

export function shiftOrthogonalPath(
  path: Point[],
  axis: 'x' | 'y',
  delta: number
): Point[] {
  return path.map((point, index) => {
    // Никогда не смещаем реальные точки привязки (первая и последняя)
    if (index === 0 || index === path.length - 1) return point;
    return axis === 'x'
      ? { x: point.x + delta, y: point.y }
      : { x: point.x, y: point.y + delta };
  });
}

/**
 * Проверяет пересечения сегментов пути с карточками
 */
export function pathIntersectsCards(
  points: Point[],
  cards: Card[],
  arrow: Arrow,
  includePadding: boolean
): boolean {
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    for (const card of cards) {
      if (card.id === arrow.from || card.id === arrow.to) continue;
      const rect = getCardRect(card, includePadding);
      if (lineIntersectsRect(p1, p2, rect)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Настраивает путь для обхода карточек вдоль ортогонального маршрута
 */
export function optimiseOrthogonalPath(
  basePath: Point[],
  cards: Card[],
  arrow: Arrow,
  includePadding: boolean
): Point[] {
  if (!pathIntersectsCards(basePath, cards, arrow, includePadding)) {
    return basePath;
  }

  let adjustedPath = basePath.slice();
  let offset = ARROW_ORTHOGONAL_STEP;
  let attempts = 0;

  while (offset <= ARROW_ORTHOGONAL_MAX_OFFSET && attempts < 8) {
    const axis: 'x' | 'y' = attempts % 2 === 0 ? 'x' : 'y';
    const direction = attempts % 4 < 2 ? 1 : -1;

    const candidate = shiftOrthogonalPath(adjustedPath, axis, offset * direction);
    if (!pathIntersectsCards(candidate, cards, arrow, includePadding)) {
      return candidate;
    }

    attempts += 1;
    offset += ARROW_ORTHOGONAL_STEP;
  }

  return adjustedPath;
}

/**
 * Определяет ближайшую сторону карточки к точке
 */
export function getNearestSide(point: Point, card: Card, includePadding: boolean = true): AnchorSide {
  const rect = getCardRect(card, includePadding);
  
  const distances = {
    top: point.y - rect.y,
    bottom: (rect.y + rect.h) - point.y,
    left: point.x - rect.x,
    right: (rect.x + rect.w) - point.x
  };
  
  let minDist = Infinity;
  let nearestSide: AnchorSide = 'top';
  
  for (const [side, dist] of Object.entries(distances)) {
    if (dist < minDist) {
      minDist = dist;
      nearestSide = side as AnchorSide;
    }
  }
  
  return nearestSide;
}
