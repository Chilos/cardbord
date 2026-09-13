import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GridDataManager } from '../GridDataManager';
import { encodeGridData, createDefaultGridData } from '../../utils/encoding';
import type { GridData } from '../../types';

// Mock logseq global
global.logseq = {
  Editor: {
    getBlock: vi.fn(),
    updateBlock: vi.fn(),
  },
} as any;

describe('GridDataManager', () => {
  let manager: GridDataManager;
  let mockGridData: GridData;

  beforeEach(() => {
    manager = new GridDataManager();
    mockGridData = createDefaultGridData();
    vi.clearAllMocks();
  });

  describe('save', () => {
    it('should save data and replace existing cardbord renderer macro preserving prefix', async () => {
      const uuid = 'test-uuid';
      const mockBlock = { content: '# My Header\n{{renderer cardbord, old_data}}\nSome notes', uuid };

      vi.mocked(logseq.Editor.getBlock).mockResolvedValue(mockBlock as any);
      vi.mocked(logseq.Editor.updateBlock).mockResolvedValue(undefined as any);

      await manager.save(uuid, mockGridData);

      expect(logseq.Editor.updateBlock).toHaveBeenCalledWith(
        uuid,
        expect.stringMatching(/^# My Header\n\{\{renderer cardbord, [^}]+\}\}\nSome notes$/)
      );
    });

    it('should append macro if block has content without cardbord macro', async () => {
      const uuid = 'test-uuid';
      const mockBlock = { content: '# My Header', uuid };

      vi.mocked(logseq.Editor.getBlock).mockResolvedValue(mockBlock as any);
      vi.mocked(logseq.Editor.updateBlock).mockResolvedValue(undefined as any);

      await manager.save(uuid, mockGridData);

      expect(logseq.Editor.updateBlock).toHaveBeenCalledWith(
        uuid,
        expect.stringMatching(/^# My Header\n\{\{renderer cardbord, [^}]+\}\}$/)
      );
    });

    it('should throw error if block not found', async () => {
      vi.mocked(logseq.Editor.getBlock).mockResolvedValue(null as any);
      await expect(manager.save('missing', mockGridData)).rejects.toThrow('Block not found');
    });
  });

  describe('load', () => {
    it('should load and decode data from block content', async () => {
      const uuid = 'test-uuid';
      const encoded = encodeGridData(mockGridData);
      const mockBlock = { content: `{{renderer cardbord, ${encoded}}}`, uuid };

      vi.mocked(logseq.Editor.getBlock).mockResolvedValue(mockBlock as any);

      const loaded = await manager.load(uuid);
      expect(loaded.rows).toBe(mockGridData.rows);
      expect(loaded.cols).toBe(mockGridData.cols);
    });

    it('should return default grid data if block has no cardbord macro', async () => {
      const uuid = 'test-uuid';
      const mockBlock = { content: 'Just some text', uuid };

      vi.mocked(logseq.Editor.getBlock).mockResolvedValue(mockBlock as any);

      const loaded = await manager.load(uuid);
      expect(loaded).toEqual(createDefaultGridData());
    });

    it('should return default grid data for corrupted macro payload', async () => {
      const uuid = 'test-uuid';
      const mockBlock = { content: '{{renderer cardbord, !!!not-base64-or-json!!!}}', uuid };

      vi.mocked(logseq.Editor.getBlock).mockResolvedValue(mockBlock as any);

      const loaded = await manager.load(uuid);
      expect(loaded).toEqual(createDefaultGridData());
    });
  });

  describe('delete', () => {
    it('should clear block content', async () => {
      const uuid = 'test-uuid';
      const mockBlock = { content: 'content', uuid };

      vi.mocked(logseq.Editor.getBlock).mockResolvedValue(mockBlock as any);
      vi.mocked(logseq.Editor.updateBlock).mockResolvedValue(undefined as any);

      await manager.delete(uuid);
      expect(logseq.Editor.updateBlock).toHaveBeenCalledWith(uuid, '');
    });
  });
});
