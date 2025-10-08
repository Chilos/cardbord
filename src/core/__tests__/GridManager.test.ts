import { describe, it, expect, beforeEach } from 'vitest';
import { GridManager } from '../GridManager';
import type { GridData, Card, Arrow } from '../../types';

describe('GridManager', () => {
  let manager: GridManager;
  let initialData: GridData;

  beforeEach(() => {
    initialData = {
      rows: 3,
      cols: 3,
      cards: [
        { id: '1', text: 'Card 1', color: '#ff0000', row: 0, col: 0 },
        { id: '2', text: 'Card 2', color: '#00ff00', row: 1, col: 1 },
      ],
      arrows: [
        { id: 'a1', from: '1', to: '2', fromSide: 'right', toSide: 'left', color: '#0000ff' },
      ],
    };
    manager = new GridManager(initialData);
  });

  describe('constructor and getData', () => {
    it('should initialize with data', () => {
      const data = manager.getData();
      expect(data.rows).toBe(3);
      expect(data.cols).toBe(3);
      expect(data.cards).toHaveLength(2);
      expect(data.arrows).toHaveLength(1);
    });

    it('should create empty grid when no data provided', () => {
      const emptyManager = new GridManager();
      const data = emptyManager.getData();

      expect(data.rows).toBeGreaterThan(0);
      expect(data.cols).toBeGreaterThan(0);
      expect(data.cards).toHaveLength(0);
      expect(data.arrows).toHaveLength(0);
    });
  });

  describe('upsertCard', () => {
    it('should add new card', () => {
      const newCard: Card = {
        id: '3',
        text: 'Card 3',
        color: '#0000ff',
        row: 2,
        col: 2,
      };

      manager.upsertCard(newCard);
      const card = manager.getCardById('3');

      expect(card).toBeDefined();
      expect(card?.text).toBe('Card 3');
    });

    it('should update existing card', () => {
      const updatedCard: Card = {
        id: '1',
        text: 'Updated Card 1',
        color: '#ffffff',
        row: 0,
        col: 0,
      };

      manager.upsertCard(updatedCard);
      const card = manager.getCardById('1');

      expect(card?.text).toBe('Updated Card 1');
      expect(card?.color).toBe('#ffffff');
    });
  });

  describe('deleteCard', () => {
    it('should remove card by id', () => {
      manager.deleteCard('1');
      const card = manager.getCardById('1');

      expect(card).toBeNull();
    });

    it('should remove arrows connected to deleted card', () => {
      manager.deleteCard('1');
      const data = manager.getData();

      expect(data.arrows).toHaveLength(0);
    });
  });

  describe('moveCard', () => {
    it('should move card to new position', () => {
      manager.moveCard('1', { row: 2, col: 2 });
      const card = manager.getCardById('1');

      expect(card?.row).toBe(2);
      expect(card?.col).toBe(2);
    });
  });

  describe('addArrow', () => {
    it('should add arrow between cards', () => {
      const newArrow: Arrow = {
        id: 'a2',
        from: '2',
        to: '1',
        fromSide: 'left',
        toSide: 'right',
        color: '#ff0000',
      };

      manager.addArrow(newArrow);
      const data = manager.getData();

      expect(data.arrows).toHaveLength(2);
    });
  });

  describe('deleteArrow', () => {
    it('should remove arrow by id', () => {
      manager.deleteArrow('a1');
      const data = manager.getData();

      expect(data.arrows).toHaveLength(0);
    });
  });

  describe('updateArrow', () => {
    it('should update arrow properties', () => {
      manager.updateArrow('a1', { color: '#ff00ff' });
      const data = manager.getData();
      const arrow = data.arrows.find(a => a.id === 'a1');

      expect(arrow?.color).toBe('#ff00ff');
    });
  });

  describe('getCardById', () => {
    it('should return card by id', () => {
      const card = manager.getCardById('1');

      expect(card).toBeDefined();
      expect(card?.id).toBe('1');
    });

    it('should return null for non-existent card', () => {
      const card = manager.getCardById('nonexistent');

      expect(card).toBeNull();
    });
  });

  describe('getCardAt', () => {
    it('should return card at position', () => {
      const card = manager.getCardAt({ row: 0, col: 0 });

      expect(card).toBeDefined();
      expect(card?.id).toBe('1');
    });

    it('should return null for empty cell', () => {
      const card = manager.getCardAt({ row: 2, col: 2 });

      expect(card).toBeNull();
    });
  });

  describe('updateGridSize', () => {
    it('should update grid dimensions', () => {
      manager.updateGridSize(5, 5);
      const data = manager.getData();

      expect(data.rows).toBe(5);
      expect(data.cols).toBe(5);
    });

    it('should preserve cards within new bounds', () => {
      const beforeCount = manager.getCardCount();
      manager.updateGridSize(5, 5);
      const afterCount = manager.getCardCount();

      expect(afterCount).toBe(beforeCount);
    });
  });

  describe('getCardCount and getArrowCount', () => {
    it('should return correct card count', () => {
      expect(manager.getCardCount()).toBe(2);
    });

    it('should return correct arrow count', () => {
      expect(manager.getArrowCount()).toBe(1);
    });
  });

  describe('clear', () => {
    it('should remove all cards and arrows', () => {
      manager.clear();
      const data = manager.getData();

      expect(data.cards).toHaveLength(0);
      expect(data.arrows).toHaveLength(0);
    });
  });

  describe('getArrowsForCard', () => {
    it('should return arrows connected to card', () => {
      const arrows = manager.getArrowsForCard('1');

      expect(arrows).toHaveLength(1);
      expect(arrows[0].from).toBe('1');
    });

    it('should return empty array for card with no arrows', () => {
      manager.deleteCard('2');
      manager.upsertCard({ id: '3', text: 'Card 3', color: '#000', row: 2, col: 2 });

      const arrows = manager.getArrowsForCard('3');

      expect(arrows).toHaveLength(0);
    });
  });
});
