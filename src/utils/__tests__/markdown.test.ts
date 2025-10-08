import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '../markdown';

describe('markdown', () => {
  describe('renderMarkdown', () => {
    it('should render bold text', () => {
      const result = renderMarkdown('**bold**');
      expect(result).toContain('<strong>bold</strong>');
    });

    it('should render italic text', () => {
      const result = renderMarkdown('*italic*');
      expect(result).toContain('<em>italic</em>');
    });

    it('should render page links', () => {
      const result = renderMarkdown('[[Page Name]]');
      expect(result).toContain('cardbord-page-link');
      expect(result).toContain('data-page="Page Name"');
      expect(result).toContain('Page Name');
    });

    it('should render tags', () => {
      const result = renderMarkdown('#tag');
      expect(result).toContain('cardbord-tag');
      expect(result).toContain('data-tag="tag"');
      expect(result).toContain('#tag');
    });

    it('should render line breaks', () => {
      const result = renderMarkdown('line1\nline2');
      expect(result).toContain('<br>');
    });

    it('should escape HTML', () => {
      const result = renderMarkdown('<script>alert("xss")</script>');
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });

    it('should handle multiple formatting', () => {
      const result = renderMarkdown('**bold** and *italic* text');
      expect(result).toContain('<strong>bold</strong>');
      expect(result).toContain('<em>italic</em>');
    });

    it('should handle links with tags', () => {
      const result = renderMarkdown('Check [[Page]] with #tag');
      expect(result).toContain('cardbord-page-link');
      expect(result).toContain('cardbord-tag');
    });

    it('should handle empty string', () => {
      const result = renderMarkdown('');
      expect(result).toBe('');
    });

    it('should handle plain text', () => {
      const result = renderMarkdown('plain text');
      expect(result).toBe('plain text');
    });

    it('should handle nested formatting', () => {
      const result = renderMarkdown('**bold *and italic***');
      expect(result).toContain('<strong>');
      expect(result).toContain('<em>');
    });

    it('should handle multiple line breaks', () => {
      const result = renderMarkdown('line1\n\nline3');
      const brCount = (result.match(/<br>/g) || []).length;
      expect(brCount).toBe(2);
    });

    it('should handle tags at start of line', () => {
      const result = renderMarkdown('#important note');
      expect(result).toContain('cardbord-tag');
      expect(result).toContain('data-tag="important"');
    });

    it('should handle multiple tags', () => {
      const result = renderMarkdown('#tag1 #tag2 #tag3');
      const tagCount = (result.match(/cardbord-tag/g) || []).length;
      expect(tagCount).toBe(3);
    });

    it('should handle page links with spaces', () => {
      const result = renderMarkdown('[[Long Page Name With Spaces]]');
      expect(result).toContain('data-page="Long Page Name With Spaces"');
    });

    it('should preserve whitespace in links', () => {
      const result = renderMarkdown('[[  Padded  ]]');
      expect(result).toContain('  Padded  ');
    });
  });
});
