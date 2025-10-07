/**
 * Cardbord Plugin Entry Point
 * Simplified entry point that initializes the plugin
 */

/// <reference types="@logseq/libs" />

import { CardbordPlugin } from './plugin';

// Create plugin instance
const plugin = new CardbordPlugin();

/**
 * Main entry point
 */
async function main() {
  console.log('[Cardbord] Starting plugin...');
  
  try {
    await plugin.initialize();
  } catch (error) {
    console.error('[Cardbord] Failed to initialize plugin:', error);
    throw error;
  }
}

// Register cleanup handler
logseq.beforeunload(async () => {
  await plugin.cleanup();
});

// Start the plugin
console.log('[Cardbord] Waiting for Logseq ready...');
logseq.ready(main).catch((err: Error) => {
  console.error('[Cardbord] Plugin failed to load:', err);
});
