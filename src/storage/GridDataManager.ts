import type { GridData } from '../types';
import { encodeGridData, decodeGridData, createDefaultGridData, validateGridData, sanitizeGridData } from '../utils/encoding';
import { RENDERER_TYPE } from '../utils/constants';

export class GridDataManager {
  async save(uuid: string, data: GridData): Promise<void> {
    const encoded = encodeGridData(data);
    const content = `{{renderer ${RENDERER_TYPE}, ${encoded}}}`;
    const block = await logseq.Editor.getBlock(uuid);
    if (!block) throw new Error('Block not found');
    await logseq.Editor.updateBlock(uuid, content);
  }

  async load(uuid: string): Promise<GridData> {
    const block = await logseq.Editor.getBlock(uuid);
    if (!block) throw new Error('Block not found');

    const content: string = block.content ?? '';
    const macroRegex = /\{\{renderer\s+([^,\s]+)\s*,\s*([^}]+)\}\}/i;
    const match = content.match(macroRegex);

    if (!match) return createDefaultGridData();

    const [, type, encoded] = match;
    if (type !== RENDERER_TYPE) return createDefaultGridData();

    try {
      const decoded = decodeGridData(encoded.trim());
      if (!validateGridData(decoded as any)) return createDefaultGridData();
      return sanitizeGridData(decoded);
    } catch {
      return createDefaultGridData();
    }
  }

  async delete(uuid: string): Promise<void> {
    const block = await logseq.Editor.getBlock(uuid);
    if (!block) throw new Error('Block not found');
    await logseq.Editor.updateBlock(uuid, '');
  }
}
