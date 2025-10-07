/**
 * Geometry Utilities
 * Functions for arrow positioning and intersection calculations
 */

import type { Card, Point, Rect, AnchorSide } from '../types';
import { CELL_WIDTH, CELL_HEIGHT, GAP, PADDING } from './constants';

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

/**
 * Вычисляет контрольную точку для квадратичной кривой Безье
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
 * Определяет ближайшую сторону карточки к точке
 */
export function getNearestSide(point: Point, card: Card): AnchorSide {
  const rect = getCardRect(card);
  
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
