# Repository Guidelines

## Project Structure & Modules
- `src/` — TypeScript source (CLI, core, services, types, report-generator). Example: `src/services/http.service.ts`.
- `tests/` — YAML suites (engine input). Prefer `*-test.yaml` or `*-examples.yaml`.
- `dist/` — Compiled output (do not edit).
- `docs/` — Documentation and API reference.
- `results/` — JSON run artifacts (latest at `results/latest.json`).

## Build, Test, and Dev
- `npm run build` — Compile TypeScript with strict settings to `dist/`.
- `npm run dev tests/start-flow.yaml` — Run the CLI via ts-node against a test file/dir.
- `npm test` — Start mock server and execute the default test run.
- `npm run test:verbose|test:silent|test:all` — Control logging and scope.
- `npm run server` — Run the local mock server (`mock-server.js`).
- `npm run docs` / `npm run docs:serve` — Build API docs and serve locally.
- `npm run report:html` — Generate an HTML report from the latest results.

## Coding Style & Naming
- Language: TypeScript (`strict: true`). Node >= 16.
- Indentation: 2 spaces; use semicolons and double quotes.
- Files/folders: kebab-case (e.g., `assertion.service.ts`).
- Exports: prefer named exports; avoid default unless necessary.
- Types/Interfaces: PascalCase in `src/types/`.
- Services live in `src/services/`; pure logic in `src/core/`.

## Testing Guidelines
- Test suites are YAML files in `tests/`. Name with clear intent: `auth-flows-test.yaml`, `performance-test.yaml`.
- Run: `npm test` (full) or `npm run dev tests/<file>.yaml` (targeted).
- Artifacts: inspect `results/latest.json`; generate HTML via `npm run report:html`.
- Aim to cover new branches/paths introduced by your change; include minimal, focused suites.

## Commit & PR Guidelines
- Follow Keep a Changelog categories and SemVer (see `CHANGELOG.md`).
- Commit style: concise imperative subject; scope optional. Example: `feat(engine): add dry-run planner`.
- PRs must include: summary, rationale, screenshots or report snippet (if applicable), reproduction steps, and linked issues.
- Update docs under `docs/` and add/change tests under `tests/` when behavior changes. Note changes in `CHANGELOG.md`.

## Security & Configuration
- Do not commit secrets. Prefer env vars in YAML via `{{$env.VAR}}`.
- Default config: `flow-test.config.yml` (override with `--config`).
- Test against the mock server (`npm run server`) to avoid leaking real data.
