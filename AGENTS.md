# Repository Guidelines
Общайся на Русском языке
## Project Structure & Module Organization
- `src/index.ts` boots the plugin and wires `CardbordPlugin`.
- Core logic lives in `src/core/` (grid coordination), `src/ui/` (editor state), `src/storage/` (Logseq data bindings), and `src/utils/` (shared helpers).
- Styling sits in `src/styles/`; `.css` imports compile through TypeScript declarations such as `css.d.ts`.
- Tests are colocated under `__tests__` folders (e.g., `src/core/__tests__/`) and run with Vitest.
- Bundled assets land in `dist/index.js`; coverage reports stay under `coverage/` for local inspection.

## Build, Test, and Development Commands
- `npm install` — install or refresh dependencies before running other tasks.
- `npm run dev` — watch-builds `dist/index.js` for hot testing inside Logseq.
- `npm run build` — bumps the version via `scripts/update-version.js` and emits the production bundle.
- `npm test` — executes the Vitest suite in a DOM shim environment.
- `npm run test:ui` — opens the Vitest UI for debugging and re-running targeted specs.
- `npm run test:coverage` — generates coverage output in `coverage/`.

## Coding Style & Naming Conventions
- Write TypeScript with explicit return types on exported APIs; avoid `any` unless interacting with Logseq types.
- Indent with two spaces and keep lines under ~100 characters for console readability.
- Use `PascalCase` for classes/components (`GridManager.ts`), `camelCase` for functions/utilities, and align file names accordingly.
- Keep Logseq identifiers (`manifest.json`, slash commands) lowercase and stable across updates.

## Testing Guidelines
- Add tests beside their sources using the `feature.spec.ts` naming pattern.
- Mock browser APIs with `happy-dom`/`jsdom` helpers; avoid depending on Logseq APIs at runtime.
- Run `npm run test:coverage` before submitting; maintain or improve existing coverage metrics.
- Document complex scenarios (e.g., multi-grid arrow routing) with focused unit cases in `src/core/__tests__/`.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`fix:`, `feat:`, `chore:`) with concise English summaries (e.g., `fix: correct arrow snapping`).
- Reference issues using `Closes #123` and mention affected Logseq versions when relevant.
- PR descriptions should outline context, implementation notes, screenshots for UI changes, and the test commands you executed.
- Ensure `dist/` is rebuilt via `npm run build` when behavior changes ship to users.
