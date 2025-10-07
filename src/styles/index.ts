/**
 * Cardbord Styles Export
 * Imports and exports all CSS as strings for TypeScript
 */

import themeCSS from './theme.css';
import animationsCSS from './animations.css';
import componentsCSS from './components.css';
import editorCSS from './editor.css';

// Combined styles
export const cardbordStyles = `
${themeCSS}
${animationsCSS}
${componentsCSS}
${editorCSS}
`;

// Individual exports if needed
export { themeCSS, animationsCSS, componentsCSS, editorCSS };
