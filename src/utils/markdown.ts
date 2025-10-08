/**
 * Markdown renderer for Logseq formatting
 * Supports bold, italic, highlights, links, etc.
 */

/**
 * Рендерит Logseq markdown в HTML
 */
export function renderMarkdown(text: string): string {
  if (!text) return '';

  let html = escapeHtml(text);

  // Strikethrough: ~~text~~ (ПЕРЕД bold/italic чтобы не конфликтовать)
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

  // Bold: **text** или __text__ (ПЕРЕД italic)
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

  // Italic: *text* или _text_ (ПОСЛЕ bold)
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
  html = html.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, '<em>$1</em>');

  // Highlight: ^^text^^
  html = html.replace(/\^\^(.+?)\^\^/g, '<mark>$1</mark>');

  // Code: `code`
  html = html.replace(/`(.+?)`/g, '<code>$1</code>');

  // Page links: [[page]]
  html = html.replace(/\[\[(.+?)\]\]/g, '<span class="cardbord-page-link" data-page="$1">$1</span>');

  // Block references: ((block-uuid))
  html = html.replace(/\(\((.+?)\)\)/g, '<span class="cardbord-block-ref">((...))</span>');

  // Tags: #tag
  html = html.replace(/#([a-zA-Z0-9_-]+)/g, '<span class="cardbord-tag" data-tag="$1">#$1</span>');

  // Line breaks
  html = html.replace(/\n/g, '<br>');

  return html;
}

/**
 * Экранирует HTML для предотвращения XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Извлекает plain text из markdown (для редактирования)
 */
export function extractPlainText(html: string): string {
  // Эта функция не нужна, так как мы храним оригинальный text в Card
  return html;
}
