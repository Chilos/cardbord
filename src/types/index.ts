// Основные типы данных для Cardbord Plugin

export interface Point {
  x: number;
  y: number;
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface Rectangle extends Point, Dimensions {}

export interface Card {
  id: string;
  text: string;
  color: CardColor;
  zIndex: number;
  position?: Point;
}

export interface Cell {
  row: number;
  col: number;
  cards: Card[];
}

export interface Connection {
  id: string;
  from: string; // Card ID
  to: string;   // Card ID
  color: string;
  segments?: LineSegment[];
}

export interface LineSegment {
  start: Point;
  end: Point;
  type: 'solid' | 'dashed';
  path: string;
}

export interface GridHeaders {
  showRowHeaders: boolean;
  showColHeaders: boolean;
  rowHeaders: string[];
  colHeaders: string[];
}

export interface GridData {
  id: string;
  rows: number;
  cols: number;
  headers: GridHeaders;
  cells: Cell[];
  connections: Connection[];
  createdAt: number;
  updatedAt: number;
}

export interface CardColor {
  name: string;
  value: string;
  textColor: string;
}

export const CARD_COLORS: CardColor[] = [
  { name: 'default', value: '#f8f9fa', textColor: '#343a40' },
  { name: 'red', value: '#ff6b6b', textColor: '#ffffff' },
  { name: 'blue', value: '#4ecdc4', textColor: '#ffffff' },
  { name: 'green', value: '#51cf66', textColor: '#ffffff' },
  { name: 'yellow', value: '#ffd93d', textColor: '#343a40' },
  { name: 'purple', value: '#9775fa', textColor: '#ffffff' }
];

export interface CardbordConfig {
  defaultGridSize: { rows: number; cols: number };
  enableHeaders: boolean;
  enableConnections: boolean;
  maxCardsPerCell: number;
  theme: 'auto' | 'light' | 'dark';
}

export interface ThemeData {
  colors: {
    primary: string;
    secondary: string;
    text: string;
    border: string;
    accent: string;
  };
  typography: {
    fontFamily: string;
    fontSize: string;
    lineHeight: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  isDarkMode: boolean;
}

export type GridMode = 'view' | 'edit';
export type HeaderDisplayMode = 'mobile' | 'tablet' | 'desktop';
export type StackMode = 'compact' | 'spread' | 'accordion' | 'list';

export interface CardPosition {
  cardId: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  zIndex: number;
  visible?: boolean;
  expanded?: boolean;
}

export interface DropZone {
  id: string;
  type: 'cell' | 'stack-position';
  bounds: Rectangle;
  cellCoords?: { row: number; col: number };
  stackIndex?: number;
}

// События
export interface CardEvent {
  type: 'card-created' | 'card-updated' | 'card-deleted' | 'card-moved';
  cardId: string;
  data?: any;
}

export interface GridEvent {
  type: 'grid-resized' | 'mode-changed' | 'headers-toggled';
  data?: any;
}

export interface ConnectionEvent {
  type: 'connection-created' | 'connection-deleted' | 'connection-updated';
  connectionId: string;
  data?: any;
}
