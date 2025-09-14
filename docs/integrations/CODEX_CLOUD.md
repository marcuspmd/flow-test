# Codex Cloud Integration

This guide shows how to run Flow Test Engine in CI and optionally push results to Codex Cloud.

## Prerequisites
- GitHub repository with this project
- GitHub Actions enabled
- Codex Cloud endpoint and token (provided by your Codex Cloud admin)

## What You Get
- CI workflow that:
  - builds the project
  - runs the full engine against the httpbin service (Docker Compose)
  - generates `results/latest.json` and HTML reports
  - uploads artifacts to the GitHub build
  - optionally posts `latest.json` to Codex Cloud

## Setup
1) Add these repository secrets (Settings → Secrets and variables → Actions):
   - `CODEX_CLOUD_ENDPOINT` → e.g. `https://codex-cloud.example.com`
   - `CODEX_CLOUD_TOKEN` → Bearer token for the API

   If you don’t set these, the workflow still runs and uploads artifacts to GitHub only.

2) The workflow file lives at `.github/workflows/codex-cloud.yml` and runs on push, PR, or manually.

## How It Works
- CI runs services via Docker Compose (`httpbin` provides endpoints).
- The engine builds and runs using the compiled CLI and publishes results.
- HTML is generated from `results/latest.json` via `npm run report:generate`.
- Artifacts uploaded:
  - `results/latest.json`
  - `results/latest.html`
  - all timestamped HTML files in `results/`
- If `CODEX_CLOUD_ENDPOINT` and `CODEX_CLOUD_TOKEN` are present, CI performs:

```bash
curl -sSf -X POST "$CODEX_CLOUD_ENDPOINT/api/runs" \
  -H "Authorization: Bearer $CODEX_CLOUD_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @results/latest.json
```

Adapt the endpoint path or payload if your Codex Cloud expects a different shape.

## Local Verification (single source of truth)
```bash
# Run everything via Docker Compose (same as CI)
npm test

# Or run the Compose target directly
docker compose up --build --abort-on-container-exit --exit-code-from flow-test flow-test

# Open the report
open results/latest.html   # or your OS equivalent
```

## Troubleshooting
- Empty artifacts: ensure tests created `results/latest.json`. Run locally to confirm.
- Service health: ensure the `httpbin` container is healthy in Compose.
- Codex Cloud 4xx/5xx: verify `CODEX_CLOUD_ENDPOINT` and `CODEX_CLOUD_TOKEN` values and adjust the API path if needed.
