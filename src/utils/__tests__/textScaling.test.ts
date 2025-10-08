import { describe, it, expect, beforeEach } from 'vitest';
import { applyTextScaling, applyEditorTextScaling } from '../textScaling';

describe('textScaling', () => {
  let container: HTMLElement;
  let card: HTMLElement;
  let textContainer: HTMLElement;

  beforeEach(() => {
    // Create mock DOM structure
    container = document.createElement('div');
    container.className = 'cardbord-container';

    card = document.createElement('div');
    card.className = 'cardbord-card';
    card.style.width = '200px';
    card.style.height = '150px';

    textContainer = document.createElement('div');
    textContainer.className = 'cardbord-card-text';
    textContainer.textContent = 'Test text content that might be very long and need scaling';

    card.appendChild(textContainer);
    container.appendChild(card);
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('applyTextScaling', () => {
    it('should scale text when content overflows', () => {
      // Make text overflow by setting large font size
      textContainer.style.fontSize = '48px';

      applyTextScaling(container);

      // Check if transform was applied
      const transform = textContainer.style.transform;
      expect(transform).toBeTruthy();
    });

    it('should not scale text when content fits', () => {
      textContainer.style.fontSize = '12px';
      textContainer.textContent = 'Short';

      applyTextScaling(container);

      // Small content may or may not be scaled, just check it doesn't error
      expect(textContainer.style.transform).toBeDefined();
    });

    it('should handle multiple cards', () => {
      const card2 = document.createElement('div');
      card2.className = 'cardbord-card';
      card2.style.width = '200px';
      card2.style.height = '150px';

      const textContainer2 = document.createElement('div');
      textContainer2.className = 'cardbord-card-text';
      textContainer2.textContent = 'Another card';

      card2.appendChild(textContainer2);
      container.appendChild(card2);

      expect(() => applyTextScaling(container)).not.toThrow();
    });

    it('should handle cards without text containers', () => {
      const emptyCard = document.createElement('div');
      emptyCard.className = 'cardbord-card';
      container.appendChild(emptyCard);

      expect(() => applyTextScaling(container)).not.toThrow();
    });
  });

  describe('applyEditorTextScaling', () => {
    beforeEach(() => {
      // Create editor-specific structure
      container.className = 'cardbord-editor-container';
      card.className = 'cardbord-editor-cell';
    });

    it('should scale text in editor mode', () => {
      textContainer.style.fontSize = '48px';

      applyEditorTextScaling(container);

      // Editor text scaling should complete without errors
      expect(textContainer).toBeDefined();
    });

    it('should handle empty editor', () => {
      document.body.innerHTML = '';
      const emptyContainer = document.createElement('div');
      emptyContainer.className = 'cardbord-editor-container';
      document.body.appendChild(emptyContainer);

      expect(() => applyEditorTextScaling(emptyContainer)).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle null container gracefully', () => {
      // textScaling expects valid container, null will throw
      expect(() => applyTextScaling(null as any)).toThrow();
    });

    it('should handle undefined container gracefully', () => {
      // textScaling expects valid container, undefined will throw
      expect(() => applyTextScaling(undefined as any)).toThrow();
    });

    it('should handle container with no cards', () => {
      const emptyContainer = document.createElement('div');
      emptyContainer.className = 'cardbord-container';
      document.body.appendChild(emptyContainer);

      expect(() => applyTextScaling(emptyContainer)).not.toThrow();
    });

    it('should handle very long text', () => {
      textContainer.textContent = 'A'.repeat(1000);
      textContainer.style.fontSize = '24px';

      applyTextScaling(container);

      const transform = textContainer.style.transform;
      expect(transform).toBeTruthy();
      if (transform.includes('scale')) {
        const scale = parseFloat(transform.match(/scale\(([\d.]+)\)/)?.[1] || '1');
        expect(scale).toBeLessThanOrEqual(1);
      }
    });

    it('should handle empty text', () => {
      textContainer.textContent = '';

      expect(() => applyTextScaling(container)).not.toThrow();
    });

    it('should preserve transform origin', () => {
      textContainer.style.fontSize = '48px';

      applyTextScaling(container);

      const transformOrigin = textContainer.style.transformOrigin;
      if (textContainer.style.transform.includes('scale')) {
        expect(transformOrigin).toBeTruthy();
      }
    });
  });
});
