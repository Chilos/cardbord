import { describe, it, expect } from 'vitest';
import { encodeGridData, decodeGridData, sanitizeGridData } from '../encoding';
import type { GridData } from '../../types';

describe('encoding', () => {
  describe('encodeGridData', () => {
    it('should encode grid data to base64', () => {
      const gridData: GridData = {
        rows: 2,
        cols: 2,
        cards: [
          { id: '1', text: 'Card 1', color: '#ff0000', row: 0, col: 0 },
        ],
        arrows: [],
      };

      const encoded = encodeGridData(gridData);
      expect(encoded).toBeTruthy();
      expect(typeof encoded).toBe('string');
    });

    it('should encode grid data with arrows', () => {
      const gridData: GridData = {
        rows: 2,
        cols: 2,
        cards: [
          { id: '1', text: 'Card 1', color: '#ff0000', row: 0, col: 0, stickers: [{ text: 'Srv', corner: 'top-left' }] },
          { id: '2', text: 'Card 2', color: '#00ff00', row: 0, col: 1 },
        ],
        arrows: [
          { id: 'a1', from: '1', to: '2', fromSide: 'right', toSide: 'left', color: '#0000ff' },
        ],
      };

      const encoded = encodeGridData(gridData);
      expect(encoded).toBeTruthy();
    });

    it('should encode grid data with column headers', () => {
      const gridData: GridData = {
        rows: 2,
        cols: 3,
        cards: [],
        arrows: [],
        columnHeaders: ['Col 1', 'Col 2', 'Col 3'],
      };

      const encoded = encodeGridData(gridData);
      expect(encoded).toBeTruthy();
    });
  });

  describe('decodeGridData', () => {
    it('should decode base64 to grid data', () => {
      const originalData: GridData = {
        rows: 2,
        cols: 2,
        cards: [
          { id: '1', text: 'Card 1', color: '#ff0000', row: 0, col: 0 },
        ],
        arrows: [],
      };

      const encoded = encodeGridData(originalData);
      const decoded = decodeGridData(encoded);

      expect(decoded).toEqual(originalData);
    });

    it('should decode grid data with arrows', () => {
      const originalData: GridData = {
        rows: 2,
        cols: 2,
        cards: [
          { id: '1', text: 'Card 1', color: '#ff0000', row: 0, col: 0, stickers: [{ text: 'Srv', corner: 'top-left' }] },
          { id: '2', text: 'Card 2', color: '#00ff00', row: 0, col: 1 },
        ],
        arrows: [
          { id: 'a1', from: '1', to: '2', fromSide: 'right', toSide: 'left', color: '#0000ff' },
        ],
      };

      const encoded = encodeGridData(originalData);
      const decoded = decodeGridData(encoded);

      expect(decoded).toEqual(originalData);
    });

    it('should decode grid data with column headers', () => {
      const originalData: GridData = {
        rows: 2,
        cols: 3,
        cards: [],
        arrows: [],
        columnHeaders: ['Col 1', 'Col 2', 'Col 3'],
      };

      const encoded = encodeGridData(originalData);
      const decoded = decodeGridData(encoded);

      expect(decoded).toEqual(originalData);
    });

    it('should return default grid for invalid base64', () => {
      const result = decodeGridData('invalid-base64');
      expect(result).toBeDefined();
      expect(result.rows).toBeGreaterThan(0);
      expect(result.cols).toBeGreaterThan(0);
      expect(result.cards).toBeDefined();
      expect(result.arrows).toBeDefined();
    });

    it('should return default grid for empty string', () => {
      const result = decodeGridData('');
      expect(result).toBeDefined();
      expect(result.rows).toBeGreaterThan(0);
      expect(result.cols).toBeGreaterThan(0);
      expect(result.cards).toBeDefined();
      expect(result.arrows).toBeDefined();
    });
  });

  describe('sanitizeGridData', () => {
    it('should normalize stickers and drop invalid entries', () => {
      const data: GridData = {
        rows: 1,
        cols: 1,
        cards: [
          {
            id: '1',
            text: 'Card',
            color: '#ffffff',
            row: 0,
            col: 0,
            stickers: [
              { corner: 'top-left', text: '   ' },
              { corner: 'top-left', text: 'Srv' },
              { corner: 'bottom-left', text: 'Ver' },
              { corner: 'bottom-left', text: 'Ignored duplicate' }
            ] as any,
            // legacy single sticker property
            sticker: { corner: 'bottom-right', text: 'BR ' }
          } as any
        ],
        arrows: []
      };

      const sanitized = sanitizeGridData(data);
      const stickers = sanitized.cards[0].stickers ?? [];
      expect(stickers).toEqual([
        { corner: 'top-left', text: 'Srv' },
        { corner: 'bottom-left', text: 'Ver' },
        { corner: 'bottom-right', text: 'BR' }
      ]);
    });
  });

  describe('round-trip encoding', () => {
    it('should preserve data through encode/decode cycle', () => {
      const data: GridData = {
        rows: 3,
        cols: 4,
        cards: [
          { id: '1', text: 'Test **bold** text', color: '#ff0000', row: 0, col: 0, stickers: [{ text: 'Srv', corner: 'top-left' }] },
          { id: '2', text: 'With [[links]]', color: '#00ff00', row: 1, col: 2, stickers: [
            { text: 'v2', corner: 'bottom-right' },
            { text: 'QA', corner: 'top-right' }
          ] },
          { id: '3', text: 'And #tags', color: '#0000ff', row: 2, col: 3 },
        ],
        arrows: [
          { id: 'a1', from: '1', to: '2', fromSide: 'bottom', toSide: 'top', color: '#ff00ff' },
          { id: 'a2', from: '2', to: '3', fromSide: 'right', toSide: 'left', color: '#00ffff' },
        ],
        columnHeaders: ['Header 1', 'Header 2', 'Header 3', 'Header 4'],
      };

      const encoded = encodeGridData(data);
      const decoded = decodeGridData(encoded);

      expect(decoded).toEqual(data);
    });
  });
});
