/**
 * Data Encoding Utilities
 * Functions for encoding/decoding grid data to/from base64
 */

import type { GridData } from '../types';
import { DEFAULT_ROWS, DEFAULT_COLS } from './constants';

/**
 * Кодирует GridData в base64 строку для хранения в блоке
 */
export function encodeGridData(data: GridData): string {
  try {
    const jsonString = JSON.stringify(data);
    const utf8String = encodeURIComponent(jsonString);
    return btoa(utf8String);
  } catch (err) {
    console.error('[Cardbord] Failed to encode grid data:', err);
    return '';
  }
}

/**
 * Декодирует base64 строку в GridData
 */
export function decodeGridData(encoded: string): GridData {
  try {
    const utf8String = atob(encoded);
    const jsonString = decodeURIComponent(utf8String);
    return JSON.parse(jsonString);
  } catch (err) {
    console.warn('[Cardbord] Failed to decode grid data, using defaults:', err);
    return createDefaultGridData();
  }
}

/**
 * Создает GridData по умолчанию
 */
export function createDefaultGridData(
  rows: number = DEFAULT_ROWS,
  cols: number = DEFAULT_COLS
): GridData {
  return {
    rows,
    cols,
    cards: [],
    arrows: []
  };
}

/**
 * Валидирует GridData структуру
 */
export function validateGridData(data: any): data is GridData {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.rows === 'number' &&
    typeof data.cols === 'number' &&
    Array.isArray(data.cards) &&
    Array.isArray(data.arrows)
  );
}

/**
 * Очищает GridData от некорректных данных
 */
export function sanitizeGridData(data: GridData): GridData {
  // Удаляем карточки вне границ сетки
  const validCards = data.cards
    .filter(
      card => card.row >= 0 && card.row < data.rows &&
               card.col >= 0 && card.col < data.cols
    )
    .map(card => sanitizeCard(card));
  
  // Удаляем стрелки с несуществующими карточками
  const cardIds = new Set(validCards.map(c => c.id));
  const validArrows = data.arrows.filter(
    arrow => cardIds.has(arrow.from) && cardIds.has(arrow.to)
  );
  
  return {
    ...data,
    cards: validCards,
    arrows: validArrows
  };
}

function sanitizeCard(card: any) {
  const sanitized = { ...card };
  const validCorners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
  const rawStickers: any[] = [];

  if (Array.isArray(sanitized.stickers)) {
    rawStickers.push(...sanitized.stickers);
  }

  if (sanitized.sticker) {
    rawStickers.push(sanitized.sticker);
  }

  const sanitizedStickers: any[] = [];
  const seenCorners = new Set<string>();

  for (const entry of rawStickers) {
    if (!entry) continue;
    const corner = entry.corner;
    let text = typeof entry.text === 'string' ? entry.text.trim() : '';

    if (!text || !validCorners.includes(corner) || seenCorners.has(corner)) {
      console.debug('[Cardbord][Sticker] Dropping invalid or duplicate sticker', { text: entry?.text, corner });
      continue;
    }

    const trimmed = text.slice(0, 16);
    if (trimmed !== text) {
      console.debug('[Cardbord][Sticker] Trimming sticker text', { original: text, trimmed });
    }

    sanitizedStickers.push({
      corner,
      text: trimmed,
      color: typeof entry.color === 'string' ? entry.color : undefined
    });
    seenCorners.add(corner);

    if (sanitizedStickers.length >= 4) {
      break;
    }
  }

  if (sanitizedStickers.length > 0) {
    sanitized.stickers = sanitizedStickers;
  } else {
    delete sanitized.stickers;
  }

  // Удаляем legacy поле
  delete sanitized.sticker;

  return sanitized;
}
