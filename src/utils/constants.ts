/**
 * Cardbord Constants
 * Centralized constants for the plugin
 */

// Grid sizing
export const CELL_WIDTH = 160;
export const CELL_HEIGHT = 160;
export const GAP = 10;
export const PADDING = 20;

// Anchor point size
export const ANCHOR_SIZE = 12;

// Default grid size
export const DEFAULT_ROWS = 2;
export const DEFAULT_COLS = 2;

// Arrow rendering
export const ARROW_STROKE_WIDTH = 2;
export const ARROW_CURVATURE_FACTOR = 0.24;
export const ARROW_CURVATURE_MIN = 24;
export const ARROW_CURVATURE_MAX = 80;
export const ARROW_CURVATURE_STEP = 12;
export const ARROW_SIDE_MULTIPLIER: Record<string, number> = {
  top: 1.1,
  right: 1.0,
  bottom: 1.1,
  left: 1.0
};
export const ARROW_EXIT_OFFSET = 28;
export const ARROW_ORTHOGONAL_THRESHOLD = 0.4;
export const ARROW_ORTHOGONAL_MAX_OFFSET = 64;
export const ARROW_ORTHOGONAL_STEP = 16;
export const ARROW_SEGMENTS = 70;
export const ARROW_SAMPLE_POINTS = 120;

// Plugin metadata
export const PLUGIN_NAME = 'Cardbord';
export const PLUGIN_VERSION = '1.0.0';
export const RENDERER_TYPE = 'cardbord';

// CSS class prefixes
export const CSS_PREFIX = 'cardbord';

// Z-index values
export const Z_INDEX = {
  BASE: 1,
  DROPDOWN: 10,
  OVERLAY: 9999,
  MODAL: 10000
} as const;
