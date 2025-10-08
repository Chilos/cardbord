import { describe, it, expect } from 'vitest';
import { GridRenderer } from '../GridRenderer';
import type { GridData } from '../../types';

describe('GridRenderer', () => {
  let renderer: GridRenderer;

  beforeEach(() => {
    renderer = new GridRenderer();
  });

  describe('render', () => {
    it('should render empty grid', () => {
      const data: GridData = {
        rows: 2,
        cols: 2,
        cards: [],
        arrows: [],
      };

      const html = renderer.render(data);

      expect(html).toContain('cardbord-container');
      expect(html).toContain('cardbord-grid');
    });

    it('should render grid with cards', () => {
      const data: GridData = {
        rows: 2,
        cols: 2,
        cards: [
          { id: '1', text: 'Card 1', color: '#ff0000', row: 0, col: 0 },
          { id: '2', text: 'Card 2', color: '#00ff00', row: 1, col: 1 },
        ],
        arrows: [],
      };

      const html = renderer.render(data);

      expect(html).toContain('Card 1');
      expect(html).toContain('Card 2');
      expect(html).toContain('#ff0000');
      expect(html).toContain('#00ff00');
    });

    it('should render grid with column headers', () => {
      const data: GridData = {
        rows: 2,
        cols: 3,
        cards: [],
        arrows: [],
        columnHeaders: ['Col 1', 'Col 2', 'Col 3'],
      };

      const html = renderer.render(data);

      expect(html).toContain('cardbord-column-header');
      expect(html).toContain('Col 1');
      expect(html).toContain('Col 2');
      expect(html).toContain('Col 3');
    });

    it('should not render empty column headers', () => {
      const data: GridData = {
        rows: 2,
        cols: 2,
        cards: [],
        arrows: [],
        columnHeaders: ['', ''],
      };

      const html = renderer.render(data);

      expect(html).not.toContain('cardbord-column-header');
    });

    it('should render edit button in readonly mode', () => {
      const data: GridData = {
        rows: 2,
        cols: 2,
        cards: [],
        arrows: [],
      };

      const html = renderer.render(data, {
        readonly: true,
        slotKey: 'test-slot',
        showEditButton: true,
      });

      expect(html).toContain('cardbord-edit-icon');
      expect(html).toContain('openCardbordEditor');
    });

    it('should not render edit button when disabled', () => {
      const data: GridData = {
        rows: 2,
        cols: 2,
        cards: [],
        arrows: [],
      };

      const html = renderer.render(data, {
        readonly: true,
        slotKey: 'test-slot',
        showEditButton: false,
      });

      expect(html).not.toContain('cardbord-edit-icon');
    });

    it('should render SVG container for arrows', () => {
      const data: GridData = {
        rows: 2,
        cols: 2,
        cards: [],
        arrows: [],
      };

      const html = renderer.render(data);

      expect(html).toContain('cardbord-arrows');
      expect(html).toContain('<svg');
    });

    it('should render empty cells', () => {
      const data: GridData = {
        rows: 2,
        cols: 2,
        cards: [
          { id: '1', text: 'Card 1', color: '#ff0000', row: 0, col: 0 },
        ],
        arrows: [],
      };

      const html = renderer.render(data);

      expect(html).toContain('cardbord-cell-empty');
    });

    it('should render cards with markdown', () => {
      const data: GridData = {
        rows: 1,
        cols: 1,
        cards: [
          { id: '1', text: '**bold** text', color: '#ff0000', row: 0, col: 0 },
        ],
        arrows: [],
      };

      const html = renderer.render(data);

      expect(html).toContain('<strong>bold</strong>');
    });

    it('should escape HTML in headers', () => {
      const data: GridData = {
        rows: 1,
        cols: 1,
        cards: [],
        arrows: [],
        columnHeaders: ['<script>alert("xss")</script>'],
      };

      const html = renderer.render(data);

      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('should handle large grids', () => {
      const data: GridData = {
        rows: 10,
        cols: 10,
        cards: [],
        arrows: [],
      };

      const html = renderer.render(data);

      expect(html).toContain('cardbord-grid');
      const cellCount = (html.match(/cardbord-cell/g) || []).length;
      expect(cellCount).toBeGreaterThan(0);
    });

    it('should calculate correct grid dimensions', () => {
      const data: GridData = {
        rows: 3,
        cols: 4,
        cards: [],
        arrows: [],
      };

      const html = renderer.render(data);

      expect(html).toContain('repeat(4,');
      expect(html).toContain('repeat(3,');
    });

    it('should include slot key in data attribute', () => {
      const data: GridData = {
        rows: 2,
        cols: 2,
        cards: [],
        arrows: [],
      };

      const html = renderer.render(data, {
        slotKey: 'my-slot-123',
      });

      expect(html).toContain('data-slot-id="my-slot-123"');
    });
  });
});
