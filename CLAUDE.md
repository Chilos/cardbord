# CLAUDE.md
Отвечай на русском языке
This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cardbord is a Logseq plugin that creates interactive card grids with visual arrow connections. Users can insert grids into Logseq blocks using a slash command, and the data is stored as base64-encoded JSON within the block content using Logseq's macro renderer system.

## Build Commands

- **Development mode** (watch mode): `npm run dev`
- **Production build**: `npm run build`

Output: `dist/index.js` (bundled with esbuild, IIFE format with global name `CardbordPlugin`)

## Architecture

### Entry Point & Plugin Lifecycle

- **src/index.ts**: Main entry point that instantiates `CardbordPlugin` and calls `logseq.ready()`
- **src/plugin.ts**: `CardbordPlugin` class coordinates all subsystems:
  - Registers styles (CSS loaded as text via esbuild)
  - Registers slash command (`/cardbord`)
  - Registers macro renderer for `{{renderer :cardbord, <data>}}`
  - Sets up event handlers via `logseq.provideModel()`
  - Manages slot-to-UUID mappings for renderer instances
  - Listens to theme changes and regenerates colors

### Data Flow

1. **Insertion**: Slash command → creates default GridData → encodes to base64 → inserts macro into block
2. **Rendering**: Macro renderer triggers → decodes base64 → GridRenderer generates HTML → ArrowRenderer draws SVG connections
3. **Editing**: Edit button clicked → EditorModal opens with JSON textarea → user edits → saves → updates block content with new encoded data
4. **Storage**: All data stored in block content as `{{renderer :cardbord, <base64>}}`; GridDataManager handles encoding/decoding and block updates

### Key Components

- **src/core/GridManager.ts**: Business logic for grid operations (add/move/delete cards and arrows)
- **src/storage/GridDataManager.ts**: Persists GridData to/from Logseq blocks using base64 encoding
- **src/ui/GridRenderer.ts**: Generates HTML for the grid using CSS Grid layout
- **src/ui/ArrowRenderer.ts**: Draws SVG arrows between cards based on anchor points
- **src/ui/VisualEditor.ts**: Full-featured visual editor with drag-and-drop, anchor points for arrows, color pickers (replaces EditorModal)
- **src/ui/EditorModal.ts**: Legacy JSON-based editor (kept for backward compatibility)
- **src/utils/colorSystem.ts**: ColorSystem generates 6-color palette based on Logseq's accent color and theme mode (light/dark)
- **src/utils/encoding.ts**: Base64 encode/decode functions for GridData
- **src/utils/geometry.ts**: Geometric calculations for arrow positioning (includes getNearestSide for arrow creation)
- **src/types/index.ts**: TypeScript type definitions for GridData, Card, Arrow, EditorState, etc.

### Slot and UUID Mapping

The plugin maintains two critical maps in `CardbordPlugin`:
- `slotUuidMap`: Maps slot IDs (renderer instance identifiers) to block UUIDs
- `slotDataMap`: Caches the last rendered GridData for each slot

These are populated during macro rendering and used when the edit button is clicked to locate the correct block and data.

### Color System

ColorSystem reads Logseq CSS variables (`--ls-active-primary-color`, `--ls-primary-background-color`) to:
- Extract the base hue from the accent color
- Generate 6 harmonious colors by rotating hue in 60° increments
- Adjust saturation/lightness based on theme mode (dark: 50% saturation, 40% lightness; light: 70% saturation, 85% lightness)

Colors are regenerated on theme changes via `logseq.App.onThemeModeChanged()`.

### Visual Editor Features

VisualEditor provides a modern, intuitive interface for editing grids:

**Drag-and-Drop**:
- Cards are draggable (cursor changes to 'move')
- Drop on empty cells to move, drop on occupied cells to swap
- Visual feedback with border highlights on dragover

**Arrow Creation**:
- Click a card to show 4 anchor points (top/right/bottom/left)
- Anchor points appear with smooth animation and scale on hover
- Mousedown on anchor point + mouseup on another card's anchor = creates arrow
- Alternative: mousedown on anchor + mouseup anywhere on target card = auto-detects nearest side via `getNearestSide()`
- Temporarily disables card dragging during arrow creation to prevent conflicts

**Card Editing**:
- Click empty cell → opens card editor with textarea and color picker
- Double-click card → opens editor with existing text/color
- Color picker shows all 6 theme colors with visual selection state
- Save/Delete/Cancel buttons

**Arrow Editing**:
- Click on arrow (via ArrowRenderer callback) → opens arrow editor
- Change arrow color via color picker
- Delete arrow

**Grid Resizing**:
- Number inputs for rows/columns
- "Обновить сетку" button applies changes and removes out-of-bounds cards

### Build Configuration

- **esbuild**: Bundles src/index.ts, externalizes `@logseq/libs`, uses IIFE format, loads CSS as text via `--loader:.css=text`
- **TypeScript**: Strict mode enabled with all strict flags, targets ES2020, ESNext modules
- **CSS**: Four CSS files imported as strings (theme.css, animations.css, components.css, editor.css) and injected via `logseq.provideStyle()`

## Important Notes

- The plugin uses Logseq SDK's macro renderer system; the renderer type is `:cardbord`
- All event handlers are registered via `logseq.provideModel()` with model functions like `openCardbordEditor`, `saveCardbordGrid`, etc.
- Arrow rendering happens asynchronously after grid rendering (setTimeout) to ensure DOM is ready
- The plugin accesses the parent document when running in an iframe context: `(parent as any).document || document`
- GridData validation and sanitization happens on decode to ensure cards/arrows stay within grid boundaries
