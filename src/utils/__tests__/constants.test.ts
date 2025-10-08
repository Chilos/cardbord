import { describe, it, expect } from 'vitest';
import {
  CELL_WIDTH,
  CELL_HEIGHT,
  GAP,
  PADDING,
  ANCHOR_SIZE,
  ARROW_SEGMENTS,
  RENDERER_TYPE,
} from '../constants';

describe('constants', () => {
  describe('grid dimensions', () => {
    it('should have positive cell width', () => {
      expect(CELL_WIDTH).toBeGreaterThan(0);
    });

    it('should have positive cell height', () => {
      expect(CELL_HEIGHT).toBeGreaterThan(0);
    });

    it('should have non-negative gap', () => {
      expect(GAP).toBeGreaterThanOrEqual(0);
    });

    it('should have non-negative padding', () => {
      expect(PADDING).toBeGreaterThanOrEqual(0);
    });
  });

  describe('anchor settings', () => {
    it('should have positive anchor size', () => {
      expect(ANCHOR_SIZE).toBeGreaterThan(0);
    });
  });

  describe('arrow settings', () => {
    it('should have positive arrow segments', () => {
      expect(ARROW_SEGMENTS).toBeGreaterThan(0);
    });

    it('should have reasonable segment count', () => {
      expect(ARROW_SEGMENTS).toBeGreaterThanOrEqual(10);
      expect(ARROW_SEGMENTS).toBeLessThanOrEqual(200);
    });
  });

  describe('renderer type', () => {
    it('should have defined renderer type', () => {
      expect(RENDERER_TYPE).toBeDefined();
      expect(typeof RENDERER_TYPE).toBe('string');
    });
  });

  describe('value relationships', () => {
    it('should have reasonable aspect ratio for cells', () => {
      const aspectRatio = CELL_WIDTH / CELL_HEIGHT;
      expect(aspectRatio).toBeGreaterThan(0.5);
      expect(aspectRatio).toBeLessThan(3);
    });

    it('should have gap smaller than cell dimensions', () => {
      expect(GAP).toBeLessThan(CELL_WIDTH);
      expect(GAP).toBeLessThan(CELL_HEIGHT);
    });

    it('should have anchor size smaller than cell dimensions', () => {
      expect(ANCHOR_SIZE).toBeLessThan(CELL_WIDTH);
      expect(ANCHOR_SIZE).toBeLessThan(CELL_HEIGHT);
    });
  });
});
