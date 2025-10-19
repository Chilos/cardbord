/**
 * Cardbord Type Definitions
 * All TypeScript interfaces and types for the plugin
 */

// ===== CORE DATA TYPES =====

export type StickerCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface CardSticker {
  corner: StickerCorner;
  text: string;
  color?: string;
}

export interface Card {
  id: string;
  text: string;
  color: string;
  row: number;
  col: number;
  stickers?: CardSticker[];
}

export interface Arrow {
  id: string;
  from: string;          // ID карточки откуда
  to: string;            // ID карточки куда
  fromSide: AnchorSide;  // Сторона начала
  toSide: AnchorSide;    // Сторона конца
  color: string;
}

export interface GridData {
  rows: number;
  cols: number;
  cards: Card[];
  arrows: Arrow[];
  columnHeaders?: string[]; // Опциональные заголовки колонок
}

// ===== GEOMETRY TYPES =====

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type AnchorSide = 'top' | 'right' | 'bottom' | 'left';

// ===== UI TYPES =====

export interface EditorState {
  selectedCell: CellPosition | null;
  selectedCard: Card | null;
  selectedArrow: Arrow | null;
  isCreatingArrow: boolean;
  arrowStartCard: Card | null;
  arrowStartSide: AnchorSide | null;
  draggedCard: Card | null;
  isDragging: boolean;
}

export interface CellPosition {
  row: number;
  col: number;
}

// ===== RENDER OPTIONS =====

export interface RenderOptions {
  readonly?: boolean;
  blockUuid?: string;
  slotKey?: string;
}

export interface GridRenderOptions extends RenderOptions {
  showEditButton?: boolean;
}

// ===== STORAGE TYPES =====

export interface StoredGridData {
  uuid: string;
  data: GridData;
}

// ===== COLOR SYSTEM TYPES =====

export interface HSL {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

export interface RGB {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

export type ThemeMode = 'light' | 'dark';

// ===== EVENT TYPES =====

export interface CardMoveEvent {
  card: Card;
  fromPosition: CellPosition;
  toPosition: CellPosition;
}

export interface ArrowCreateEvent {
  arrow: Arrow;
}

export interface ArrowDeleteEvent {
  arrowId: string;
}

// ===== PLUGIN TYPES =====

export interface PluginConfig {
  name: string;
  version: string;
  debug?: boolean;
}

export interface IGridRepository {
  save(uuid: string, data: GridData): Promise<void>;
  load(uuid: string): Promise<GridData>;
  delete(uuid: string): Promise<void>;
}

// ===== LOGSEQ SDK EVENT TYPES =====

/**
 * Событие клика по кнопке редактора
 */
export interface EditorButtonClickEvent {
  dataset?: {
    slotId?: string;
    [key: string]: any;
  };
  slotId?: string;
  'data-slot-id'?: string;
  [key: string]: any;
}

/**
 * Payload для macro renderer
 */
export interface MacroRendererPayload {
  arguments: string[];
  uuid: string;
  [key: string]: any;
}

/**
 * Событие macro renderer слота
 */
export interface MacroRendererSlotEvent {
  slot: string;
  payload: MacroRendererPayload;
}

/**
 * Событие изменения темы
 */
export interface ThemeModeChangedEvent {
  mode: 'light' | 'dark';
}

// ===== UTILITY TYPES =====

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
