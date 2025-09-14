# Repository Guidelines

## Project Structure & Module Organization
- `src/` — TypeScript source (CLI, core, services, types, report-generator). Example: `src/services/http.service.ts`.
- `tests/` — YAML suites consumed by the engine. Prefer `*-test.yaml` or `*-examples.yaml`.
- `dist/` — Compiled output from `npm run build` (do not edit).
- `docs/` — Documentation and API reference.
- `results/` — JSON run artifacts; latest at `results/latest.json`.
- Default config: `flow-test.config.yml` (override with `--config`).

## Build, Test, and Development Commands
- `npm run build` — Compile TypeScript (strict) to `dist/`.
- `npm run dev tests/<file>.yaml` — Run CLI via ts-node against a suite.
- `npm test` — Start mock server and run default tests.
- `npm run test:verbose|test:silent|test:all` — Control logging/scope.
- `npm run server` — Run local mock server (`mock-server.js`).
- `npm run docs` / `npm run docs:serve` — Build and serve API docs.
- `npm run report:html` — Generate HTML report from `results/latest.json`.

## Coding Style & Naming Conventions
- Language: TypeScript (`strict: true`), Node >= 16.
- Indentation: 2 spaces; use semicolons and double quotes.
- Files/folders: kebab-case (e.g., `assertion.service.ts`).
- Exports: prefer named exports; avoid default unless necessary.
- Types/Interfaces: PascalCase in `src/types/`.
- Organization: services in `src/services/`; pure logic in `src/core/`.

## Testing Guidelines
- Author suites in `tests/` (YAML). Name with clear intent: `auth-flows-test.yaml`, `performance-test.yaml`.
- Run targeted: `npm run dev tests/<file>.yaml`; full: `npm test`.
- Inspect artifacts in `results/latest.json`; create reports with `npm run report:html`.
- Aim to cover new branches/paths introduced by your change; keep suites minimal and focused.

## Commit & Pull Request Guidelines
- Follow SemVer and Keep a Changelog (`CHANGELOG.md`).
- Commit style: concise imperative subject; optional scope. Example: `feat(engine): add dry-run planner`.
- PRs include: summary, rationale, reproduction steps, linked issues, and screenshots or a report snippet when applicable.
- When behavior changes, update `docs/` and add/adjust tests in `tests/`; note changes in `CHANGELOG.md`.

## Security & Configuration Tips
- Do not commit secrets. Use env vars in YAML via `{{$env.VAR}}`.
- Test against the mock server (`npm run server`) to avoid leaking real data.

## Agent-Specific Instructions
- Do not modify `dist/`. Keep patches minimal and scoped.
- Respect naming, structure, and export rules above.
- Update docs/tests alongside code changes; avoid unrelated edits.
