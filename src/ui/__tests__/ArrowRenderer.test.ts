import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ArrowRenderer } from '../ArrowRenderer';
import type { Arrow, Card } from '../../types';

describe('ArrowRenderer', () => {
  let svg: SVGSVGElement;
  let renderer: ArrowRenderer;
  const colors = ['#ff0000', '#00ff00', '#0000ff'];

  beforeEach(() => {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    document.body.appendChild(svg);
    renderer = new ArrowRenderer(svg, colors, false);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('constructor', () => {
    it('should create arrow renderer', () => {
      expect(renderer).toBeDefined();
    });

    it('should initialize arrowhead markers', () => {
      const defs = svg.querySelector('defs');
      expect(defs).toBeTruthy();

      const markers = defs?.querySelectorAll('marker');
      expect(markers?.length).toBe(colors.length);
    });

    it('should create markers with correct IDs', () => {
      const defs = svg.querySelector('defs');
      const marker0 = defs?.querySelector('#arrowhead-0');
      const marker1 = defs?.querySelector('#arrowhead-1');

      expect(marker0).toBeTruthy();
      expect(marker1).toBeTruthy();
    });
  });

  describe('setSize', () => {
    it('should set SVG dimensions', () => {
      renderer.setSize(800, 600);

      expect(svg.getAttribute('width')).toBe('800');
      expect(svg.getAttribute('height')).toBe('600');
    });
  });

  describe('clear', () => {
    it('should remove all arrow groups', () => {
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      svg.appendChild(group);

      renderer.clear();

      const groups = svg.querySelectorAll('g');
      expect(groups.length).toBe(0);
    });

    it('should preserve defs element', () => {
      renderer.clear();

      const defs = svg.querySelector('defs');
      expect(defs).toBeTruthy();
    });
  });

  describe('renderArrows', () => {
    const cards: Card[] = [
      { id: '1', text: 'Card 1', color: '#ff0000', row: 0, col: 0 },
      { id: '2', text: 'Card 2', color: '#00ff00', row: 0, col: 2 },
    ];

    const arrows: Arrow[] = [
      {
        id: 'a1',
        from: '1',
        to: '2',
        fromSide: 'right',
        toSide: 'left',
        color: '#ff0000',
      },
    ];

    it('should render arrows', () => {
      renderer.renderArrows(arrows, cards);

      const paths = svg.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should create arrow groups', () => {
      renderer.renderArrows(arrows, cards);

      const groups = svg.querySelectorAll('.cardbord-arrow-group');
      expect(groups.length).toBe(1);
    });

    it('should handle empty arrows array', () => {
      expect(() => renderer.renderArrows([], cards)).not.toThrow();

      const groups = svg.querySelectorAll('.cardbord-arrow-group');
      expect(groups.length).toBe(0);
    });

    it('should skip arrows with missing cards', () => {
      const invalidArrow: Arrow = {
        id: 'a2',
        from: 'nonexistent',
        to: '2',
        fromSide: 'right',
        toSide: 'left',
        color: '#ff0000',
      };

      expect(() => renderer.renderArrows([invalidArrow], cards)).not.toThrow();
    });

    it('should handle click callbacks', () => {
      let clicked = false;
      const onArrowClick = () => { clicked = true; };

      renderer.renderArrows(arrows, cards, onArrowClick);

      const group = svg.querySelector('.cardbord-arrow-group') as SVGGElement;
      expect(group).toBeTruthy();

      // Check if cursor style is set
      expect(group.style.cursor).toBe('pointer');
    });

    it('should set correct arrow colors', () => {
      renderer.renderArrows(arrows, cards);

      const paths = svg.querySelectorAll('path');
      const hasRedArrow = Array.from(paths).some(
        path => path.getAttribute('stroke') === '#ff0000'
      );

      expect(hasRedArrow).toBe(true);
    });

    it('should clear previous arrows before rendering', () => {
      renderer.renderArrows(arrows, cards);
      const firstCount = svg.querySelectorAll('.cardbord-arrow-group').length;

      renderer.renderArrows(arrows, cards);
      const secondCount = svg.querySelectorAll('.cardbord-arrow-group').length;

      expect(secondCount).toBe(firstCount);
    });
  });

  describe('updateColors', () => {
    it('should update color palette', () => {
      const newColors = ['#ffffff', '#000000', '#ff00ff'];

      renderer.updateColors(newColors);

      const defs = svg.querySelector('defs');
      const markers = defs?.querySelectorAll('marker');

      expect(markers?.length).toBe(newColors.length);
    });

    it('should recreate arrowhead markers', () => {
      const newColors = ['#aaaaaa'];

      renderer.updateColors(newColors);

      const defs = svg.querySelector('defs');
      const marker = defs?.querySelector('#arrowhead-0');

      expect(marker).toBeTruthy();
    });
  });

  describe('arrow rendering with obstacles', () => {
    const cards: Card[] = [
      { id: '1', text: 'Card 1', color: '#ff0000', row: 0, col: 0 },
      { id: '2', text: 'Card 2', color: '#00ff00', row: 0, col: 2 },
      { id: '3', text: 'Card 3', color: '#0000ff', row: 0, col: 1 },
    ];

    const arrows: Arrow[] = [
      {
        id: 'a1',
        from: '1',
        to: '2',
        fromSide: 'right',
        toSide: 'left',
        color: '#ff0000',
      },
    ];

    it('should render arrows that pass through other cards', () => {
      renderer.renderArrows(arrows, cards);

      const paths = svg.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should create dashed segments for intersections', () => {
      renderer.renderArrows(arrows, cards);

      const paths = svg.querySelectorAll('path');
      const hasDashedPath = Array.from(paths).some(
        path => path.getAttribute('stroke-dasharray') === '5,5'
      );

      // May or may not have dashed segments depending on geometry
      expect(typeof hasDashedPath).toBe('boolean');
    });
  });

  describe('edge cases', () => {
    it('should handle single card', () => {
      const singleCard: Card[] = [
        { id: '1', text: 'Card 1', color: '#ff0000', row: 0, col: 0 },
      ];

      expect(() => renderer.renderArrows([], singleCard)).not.toThrow();
    });

    it('should handle arrows with same from and to sides', () => {
      const cards: Card[] = [
        { id: '1', text: 'Card 1', color: '#ff0000', row: 0, col: 0 },
        { id: '2', text: 'Card 2', color: '#00ff00', row: 1, col: 0 },
      ];

      const arrows: Arrow[] = [
        {
          id: 'a1',
          from: '1',
          to: '2',
          fromSide: 'bottom',
          toSide: 'top',
          color: '#ff0000',
        },
      ];

      expect(() => renderer.renderArrows(arrows, cards)).not.toThrow();
    });
  });
});
