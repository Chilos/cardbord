import { describe, it, expect } from 'vitest';
import {
  getAnchorPoint,
  getCardRect,
  distance,
  calculateBezierControlPoint,
  getPointOnQuadraticBezier,
  getNearestSide,
  pointInRect,
} from '../geometry';
import type { Card } from '../../types';

describe('geometry', () => {
  const mockCard: Card = {
    id: '1',
    text: 'Test',
    color: '#ff0000',
    row: 1,
    col: 1,
  };

  describe('getAnchorPoint', () => {
    it('should return top anchor point', () => {
      const point = getAnchorPoint(mockCard, 'top', false);
      expect(point.x).toBeGreaterThan(0);
      expect(point.y).toBeGreaterThan(0);
    });

    it('should return right anchor point', () => {
      const point = getAnchorPoint(mockCard, 'right', false);
      expect(point.x).toBeGreaterThan(0);
      expect(point.y).toBeGreaterThan(0);
    });

    it('should return bottom anchor point', () => {
      const point = getAnchorPoint(mockCard, 'bottom', false);
      expect(point.x).toBeGreaterThan(0);
      expect(point.y).toBeGreaterThan(0);
    });

    it('should return left anchor point', () => {
      const point = getAnchorPoint(mockCard, 'left', false);
      expect(point.x).toBeGreaterThan(0);
      expect(point.y).toBeGreaterThan(0);
    });

    it('should include padding when specified', () => {
      const withPadding = getAnchorPoint(mockCard, 'top', true);
      const withoutPadding = getAnchorPoint(mockCard, 'top', false);

      expect(withPadding.x).toBeGreaterThan(withoutPadding.x);
      expect(withPadding.y).toBeGreaterThan(withoutPadding.y);
    });
  });

  describe('getCardRect', () => {
    it('should return card rectangle', () => {
      const rect = getCardRect(mockCard, false);

      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.y).toBeGreaterThanOrEqual(0);
      expect(rect.w).toBeGreaterThan(0);
      expect(rect.h).toBeGreaterThan(0);
    });

    it('should include padding when specified', () => {
      const withPadding = getCardRect(mockCard, true);
      const withoutPadding = getCardRect(mockCard, false);

      expect(withPadding.x).toBeGreaterThan(withoutPadding.x);
      expect(withPadding.y).toBeGreaterThan(withoutPadding.y);
    });
  });

  describe('distance', () => {
    it('should calculate distance between two points', () => {
      const p1 = { x: 0, y: 0 };
      const p2 = { x: 3, y: 4 };

      expect(distance(p1, p2)).toBe(5);
    });

    it('should return 0 for same points', () => {
      const p = { x: 10, y: 20 };

      expect(distance(p, p)).toBe(0);
    });

    it('should handle negative coordinates', () => {
      const p1 = { x: -3, y: -4 };
      const p2 = { x: 0, y: 0 };

      expect(distance(p1, p2)).toBe(5);
    });
  });

  describe('calculateBezierControlPoint', () => {
    it('should calculate control point for bezier curve', () => {
      const start = { x: 0, y: 0 };
      const end = { x: 100, y: 100 };

      const control = calculateBezierControlPoint(start, end);

      expect(control.x).toBeDefined();
      expect(control.y).toBeDefined();
    });

    it('should return point between start and end', () => {
      const start = { x: 0, y: 0 };
      const end = { x: 100, y: 0 };

      const control = calculateBezierControlPoint(start, end);

      expect(control.x).toBeGreaterThanOrEqual(0);
      expect(control.x).toBeLessThanOrEqual(100);
    });
  });

  describe('getPointOnQuadraticBezier', () => {
    it('should return start point when t=0', () => {
      const start = { x: 0, y: 0 };
      const control = { x: 50, y: 50 };
      const end = { x: 100, y: 0 };

      const point = getPointOnQuadraticBezier(start, control, end, 0);

      expect(point).toEqual(start);
    });

    it('should return end point when t=1', () => {
      const start = { x: 0, y: 0 };
      const control = { x: 50, y: 50 };
      const end = { x: 100, y: 0 };

      const point = getPointOnQuadraticBezier(start, control, end, 1);

      expect(point).toEqual(end);
    });

    it('should return middle point when t=0.5', () => {
      const start = { x: 0, y: 0 };
      const control = { x: 50, y: 100 };
      const end = { x: 100, y: 0 };

      const point = getPointOnQuadraticBezier(start, control, end, 0.5);

      expect(point.x).toBeCloseTo(50, 1);
      expect(point.y).toBeGreaterThan(0);
    });
  });

  describe('getNearestSide', () => {
    it('should return top for point above card', () => {
      const card: Card = { id: '1', text: '', color: '', row: 1, col: 1 };
      const point = { x: 100, y: 50 };

      const side = getNearestSide(point, card);

      expect(side).toBe('top');
    });
  });

  describe('pointInRect', () => {
    const rect = { x: 0, y: 0, w: 100, h: 100 };

    it('should return true for point inside rectangle', () => {
      const point = { x: 50, y: 50 };

      expect(pointInRect(point, rect)).toBe(true);
    });

    it('should return false for point outside rectangle', () => {
      const point = { x: 150, y: 50 };

      expect(pointInRect(point, rect)).toBe(false);
    });

    it('should return true for point on edge', () => {
      const point = { x: 0, y: 0 };

      expect(pointInRect(point, rect)).toBe(true);
    });

    it('should return false for point outside bounds', () => {
      const point = { x: -10, y: 50 };

      expect(pointInRect(point, rect)).toBe(false);
    });
  });
});
