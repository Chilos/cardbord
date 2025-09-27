import { GridData, Card, Cell, Connection, Point, Rectangle } from '../types';

// Генерация уникальных ID
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `${prefix}${prefix ? '_' : ''}${timestamp}_${random}`;
}

// Создание пустой сетки
export function createEmptyGrid(rows: number = 2, cols: number = 3): GridData {
  const cells: Cell[] = [];
  const rowHeaders: string[] = [];
  const colHeaders: string[] = [];

  // Создание ячеек
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      cells.push({
        row,
        col,
        cards: []
      });
    }
  }

  // Создание заголовков по умолчанию
  for (let i = 0; i < rows; i++) {
    rowHeaders.push(`Строка ${i + 1}`);
  }
  for (let i = 0; i < cols; i++) {
    colHeaders.push(`Столбец ${i + 1}`);
  }

  const now = Date.now();
  
  return {
    id: generateId('grid'),
    rows,
    cols,
    headers: {
      showRowHeaders: true,
      showColHeaders: true,
      rowHeaders,
      colHeaders
    },
    cells,
    connections: [],
    createdAt: now,
    updatedAt: now
  };
}

// Поиск ячейки по координатам
export function findCell(grid: GridData, row: number, col: number): Cell | undefined {
  return grid.cells.find(cell => cell.row === row && cell.col === col);
}

// Поиск карточки по ID
export function findCard(grid: GridData, cardId: string): { card: Card; cell: Cell } | undefined {
  for (const cell of grid.cells) {
    const card = cell.cards.find(c => c.id === cardId);
    if (card) {
      return { card, cell };
    }
  }
  return undefined;
}

// Добавление карточки в ячейку
export function addCardToCell(grid: GridData, row: number, col: number, card: Card): boolean {
  const cell = findCell(grid, row, col);
  if (!cell) return false;

  cell.cards.push(card);
  grid.updatedAt = Date.now();
  return true;
}

// Перемещение карточки между ячейками
export function moveCard(
  grid: GridData, 
  cardId: string, 
  targetRow: number, 
  targetCol: number, 
  stackIndex?: number
): boolean {
  const source = findCard(grid, cardId);
  if (!source) return false;

  const targetCell = findCell(grid, targetRow, targetCol);
  if (!targetCell) return false;

  // Удаление из исходной ячейки
  const sourceIndex = source.cell.cards.findIndex(c => c.id === cardId);
  source.cell.cards.splice(sourceIndex, 1);

  // Добавление в целевую ячейку
  if (stackIndex !== undefined && stackIndex >= 0 && stackIndex <= targetCell.cards.length) {
    targetCell.cards.splice(stackIndex, 0, source.card);
  } else {
    targetCell.cards.push(source.card);
  }

  grid.updatedAt = Date.now();
  return true;
}

// Удаление карточки
export function removeCard(grid: GridData, cardId: string): boolean {
  const source = findCard(grid, cardId);
  if (!source) return false;

  const index = source.cell.cards.findIndex(c => c.id === cardId);
  source.cell.cards.splice(index, 1);

  // Удаление связанных соединений
  grid.connections = grid.connections.filter(
    conn => conn.from !== cardId && conn.to !== cardId
  );

  grid.updatedAt = Date.now();
  return true;
}

// Добавление строки/столбца
export function addRow(grid: GridData, index?: number): void {
  const insertAt = index ?? grid.rows;
  grid.rows++;

  // Сдвиг существующих ячеек
  grid.cells.forEach(cell => {
    if (cell.row >= insertAt) {
      cell.row++;
    }
  });

  // Добавление новых ячеек
  for (let col = 0; col < grid.cols; col++) {
    grid.cells.push({
      row: insertAt,
      col,
      cards: []
    });
  }

  // Добавление заголовка
  grid.headers.rowHeaders.splice(insertAt, 0, `Строка ${insertAt + 1}`);
  grid.updatedAt = Date.now();
}

export function addColumn(grid: GridData, index?: number): void {
  const insertAt = index ?? grid.cols;
  grid.cols++;

  // Сдвиг существующих ячеек
  grid.cells.forEach(cell => {
    if (cell.col >= insertAt) {
      cell.col++;
    }
  });

  // Добавление новых ячеек
  for (let row = 0; row < grid.rows; row++) {
    grid.cells.push({
      row,
      col: insertAt,
      cards: []
    });
  }

  // Добавление заголовка
  grid.headers.colHeaders.splice(insertAt, 0, `Столбец ${insertAt + 1}`);
  grid.updatedAt = Date.now();
}

// Удаление строки/столбца
export function removeRow(grid: GridData, index: number): boolean {
  if (grid.rows <= 1 || index < 0 || index >= grid.rows) return false;

  grid.rows--;

  // Удаление ячеек строки
  grid.cells = grid.cells.filter(cell => cell.row !== index);

  // Сдвиг оставшихся ячеек
  grid.cells.forEach(cell => {
    if (cell.row > index) {
      cell.row--;
    }
  });

  // Удаление заголовка
  grid.headers.rowHeaders.splice(index, 1);
  grid.updatedAt = Date.now();
  return true;
}

export function removeColumn(grid: GridData, index: number): boolean {
  if (grid.cols <= 1 || index < 0 || index >= grid.cols) return false;

  grid.cols--;

  // Удаление ячеек столбца
  grid.cells = grid.cells.filter(cell => cell.col !== index);

  // Сдвиг оставшихся ячеек
  grid.cells.forEach(cell => {
    if (cell.col > index) {
      cell.col--;
    }
  });

  // Удаление заголовка
  grid.headers.colHeaders.splice(index, 1);
  grid.updatedAt = Date.now();
  return true;
}

// Геометрические вычисления
export function getDistance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function isPointInRectangle(point: Point, rect: Rectangle): boolean {
  return point.x >= rect.x && 
         point.x <= rect.x + rect.width &&
         point.y >= rect.y && 
         point.y <= rect.y + rect.height;
}

export function getRectangleCenter(rect: Rectangle): Point {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2
  };
}

// DOM утилиты
export function createElement<T extends HTMLElement>(
  tag: string, 
  className?: string, 
  attributes?: Record<string, string>
): T {
  const element = document.createElement(tag) as T;
  
  if (className) {
    element.className = className;
  }
  
  if (attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }
  
  return element;
}

export function setElementData(element: HTMLElement, data: Record<string, any>): void {
  Object.entries(data).forEach(([key, value]) => {
    element.dataset[key] = String(value);
  });
}

export function getElementData(element: HTMLElement, key: string): string | undefined {
  return element.dataset[key];
}

// Дебаунс функции
export function debounce<T extends (...args: any[]) => void>(
  func: T, 
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  };
}

// Сериализация/десериализация
export function serializeGridData(grid: GridData): string {
  return JSON.stringify(grid);
}

export function deserializeGridData(data: string): GridData {
  try {
    const parsed = JSON.parse(data);
    // Валидация структуры данных
    if (!parsed.id || !Array.isArray(parsed.cells)) {
      throw new Error('Invalid grid data structure');
    }
    return parsed;
  } catch (error) {
    console.error('Failed to deserialize grid data:', error);
    return createEmptyGrid();
  }
}
