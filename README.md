# Flow Test Engine

A TypeScript-based API testing engine for writing rich, declarative flows in YAML. It supports request chaining, variable interpolation, flexible assertions, conditional scenarios, and clean reports in JSON and HTML.

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/marcuspmd/flow-test) [![Documentation](https://img.shields.io/badge/docs-GitHub%20Pages-blue.svg)](https://marcuspmd.github.io/flow-test/) [![npm version](https://img.shields.io/npm/v/flow-test-engine.svg)](https://www.npmjs.com/package/flow-test-engine) [![npm downloads](https://img.shields.io/npm/dm/flow-test-engine.svg)](https://www.npmjs.com/package/flow-test-engine) [![CI](https://github.com/marcuspmd/flow-test/workflows/API%20Tests/badge.svg)](https://github.com/marcuspmd/flow-test/actions) [![CodeQL](https://github.com/marcuspmd/flow-test/workflows/CodeQL/badge.svg)](https://github.com/marcuspmd/flow-test/actions?query=workflow%3ACodeQL) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![TypeScript](https://img.shields.io/badge/TypeScript-4.9+-blue.svg)](https://www.typescriptlang.org/) [![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)


Flow Test Engine is a language-agnostic runner for API suites written in YAML. You can bolt it onto any repository—regardless of the tech stack—to manage HTTP flows, capture variables, and publish reports.

## 📚 Quick Links

- **[5-Minute Quick Start](./QUICKSTART.md)** - Get running fast
- **[Cheat Sheet](./CHEATSHEET.md)** - Quick syntax reference
- **[Examples](./examples/)** - Ready-to-use templates
- **[Development Workflow](./guides/DEVELOPMENT-WORKFLOW.md)** - Best practices
- **[Full Documentation](./guides/)** - Complete guides

## ✨ Features at a Glance

- ✅ **Simple YAML syntax** - Write tests in plain YAML, no code needed
- ✅ **Dynamic data generation** - Built-in Faker.js for realistic test data
- ✅ **Variable interpolation** - Capture and reuse data across steps
- ✅ **Comprehensive assertions** - Validate status, headers, body with rich operators
- ✅ **Conditional logic** - Scenarios, branching, and dynamic flows
- ✅ **Retry strategies** - Configurable retries for resilient testing
- ✅ **CI/CD ready** - Works with GitHub Actions, GitLab CI, Jenkins, etc.
- ✅ **HTML reports** - Beautiful, detailed test reports
- ✅ **Language agnostic** - Works with any tech stack (Node, PHP, Python, Java, etc.)

## 1. Requirements

- Node.js 16 or newer (runtime used by Flow Test Engine)
- npm 8 or newer (ships with Node.js)
- Docker Desktop (optional, only if you want the bundled httpbin mock server)

📌 Install Node.js even if your application is written in another language—Flow Test Engine runs beside your project and never touches your runtime code.

## 2. Quick Start with `npx` (no install required)

Use `npx` to try the engine without adding dependencies:

```bash
# Initialise configuration and sample suites in the current directory
npx --yes flow-test-engine init
# or using the short form:
npx --yes fest init

# Execute all discovered suites using the generated config
npx --yes flow-test-engine --config flow-test.config.yml
# or using the short form:
npx --yes fest --config flow-test.config.yml
```

The wizard creates:
- `flow-test.config.yml` with discovery rules, retries, and reporting options.
- `tests/` containing starter YAML suites you can edit or replace.
- `results/` where execution artifacts are stored (`results/latest.json`).

## 3. Make Flow Test Part of Your Repository

For long-term use, keep Flow Test assets in their own workspace so teammates and CI can run them consistently.

```bash
mkdir flow-tests
cd flow-tests
npm init -y
npm install --save-dev flow-test-engine
npx flow-test-engine init
# or using the short form:
npx fest init
```

This produces a `flow-tests/package.json` similar to:

```json
{
  "name": "flow-tests",
  "private": true,
  "scripts": {
    "flow-test": "fest --config flow-test.config.yml",
    "flow-test:verbose": "fest --config flow-test.config.yml --verbose"
  },
  "devDependencies": {
    "flow-test-engine": "^1.0.2"
  }
}
```

A minimal suite (`flow-tests/tests/my-first-test.yaml`) might look like:

```yaml
suite_name: "Payment API Smoke"
base_url: "https://sandbox.my-api.com"

auth:
  type: "bearer"
  token: "{{$env.API_TOKEN}}"

steps:
  - name: "Get payment"
    request:
      method: "GET"
      url: "/payments/{{payment_id}}"
    assert:
      status_code: 200
      body:
        id: { equals: "{{payment_id}}" }
        status: { in: ["CREATED", "CONFIRMED"] }
```

Run it from anywhere in your repo:

```bash
npm --prefix flow-tests run flow-test
# or, with npx
npx --yes --package flow-test-engine flow-test-engine --config flow-tests/flow-test.config.yml
# or using the short form:
npx --yes --package flow-test-engine fest --config flow-tests/flow-test.config.yml
```

### Cross-suite step calls (`call`)

Need to reuse an existing step that already lives in another YAML suite? Add a `call` block to the step instead of duplicating the HTTP definition:

```yaml
steps:
  - name: "Seed reusable user"
    call:
      test: "../shared/setup-user.yaml"   # always relative to the current file
      step: "create-user"                 # matches step_id or name from the target suite
      variables:
        role: "admin"                     # optional values injected into the called step
      isolate_context: true                # default; restore local variables after the call
      on_error: "warn"                    # fail | warn | continue (continue marks the step as skipped)
```

- Paths are sandboxed to the configured `test_directory`; absolute paths or `..` escapes are rejected.
- `isolate_context` defaults to `true`. When enabled, captured variables from the remote suite are returned with the `node_id.variable` namespace so you can safely consume them without leaking the called suite's runtime state.
- Set `isolate_context: false` if you want the called step to mutate the current variable scope in place.
- `call` steps cannot define `request`, `iterate`, `input` or `scenarios`—they delegate entirely to the target step.
- Recursive chains are blocked (max depth `10`) so you get a friendly error instead of an infinite loop.

## 4. Everyday CLI Patterns

```bash
fest --dry-run --detailed              # Discover tests and show plan
fest --suite auth,checkout             # Run specific suites
fest --priority critical,high          # Focus on high-impact scenarios
fest --tag smoke                       # Filter by YAML tags
fest --config ./flow-tests/staging.yml # Point to another config file
fest --report json,csv                 # Produce multiple report formats
fest graph mermaid --output discovery.mmd # Generate Mermaid discovery graph file
fest graph --direction LR --no-orphans    # Print graph left-to-right skipping orphans
fest schema --format json              # Export engine schema for IDE extensions
```

### Schema Export for IDE Extensions

The Flow Test Engine exposes a complete **schema catalog** that IDE extensions can use to provide rich autocomplete, validation, and documentation:

```bash
# Export schema to file
fest schema --format json > flow-test-engine.schema.json

# Inspect specific structures
fest schema --format json | jq '.structures.TestSuite'

# View available examples
fest schema --format json | jq '.examples[].name'
```

The schema includes:
- ✅ Complete structure definitions (TestSuite, TestStep, Assertions, etc.)
- ✅ All supported properties with types, descriptions, and examples
- ✅ Interpolation patterns (Faker, JavaScript, environment variables)
- ✅ Complete YAML examples categorized by complexity
- ✅ CLI documentation (commands, flags, usage)

**For extension developers:** See [guides/12.schema-catalog-guide.md](guides/12.schema-catalog-guide.md) for detailed integration examples.

## 5. Integration Recipes by Ecosystem

The commands below assume you created the dedicated `flow-tests/` workspace.

### Node.js / TypeScript projects

1. Install the engine next to your source:
   ```bash
   npm install --save-dev flow-test-engine
   npx flow-test-engine init
   # or using the short form:
   npx fest init
   ```
2. Add scripts to `package.json`:
   ```json
   {
     "scripts": {
       "flow-test": "fest --config flow-test.config.yml",
       "flow-test:ci": "fest --config flow-test.config.yml --report json"
     }
   }
   ```
3. Run locally or in CI:
   ```bash
   npm run flow-test
   npm run flow-test:ci
   ```

### PHP / Laravel (Composer)

1. Keep Flow Test files under `flow-tests/` as described earlier.
2. Reference that workspace from `composer.json`:
   ```json
   {
     "scripts": {
       "flow-test": "npm --prefix flow-tests run flow-test",
       "flow-test:ci": "npm --prefix flow-tests run flow-test -- --report=json"
     }
   }
   ```
3. Execute with Composer:
   ```bash
   composer run flow-test
   composer run flow-test:ci
   ```
4. In CI (GitHub Actions example):
   ```yaml
   - uses: actions/setup-node@v4
     with:
       node-version: '18'
   - run: npm ci --prefix flow-tests
   - run: composer run flow-test:ci
   ```

### Java / Spring (Maven)

1. Ensure Node.js is available on the build agent.
2. Add a Maven execution in `pom.xml`:
   ```xml
   <plugin>
     <groupId>org.codehaus.mojo</groupId>
     <artifactId>exec-maven-plugin</artifactId>
     <version>3.1.0</version>
     <executions>
       <execution>
         <id>flow-tests</id>
         <phase>verify</phase>
         <goals><goal>exec</goal></goals>
         <configuration>
           <workingDirectory>${project.basedir}/flow-tests</workingDirectory>
           <executable>npx</executable>
           <arguments>
             <argument>fest</argument>
             <argument>--config</argument>
             <argument>flow-test.config.yml</argument>
           </arguments>
         </configuration>
       </execution>
     </executions>
   </plugin>
   ```
3. Run with Maven:
   ```bash
   mvn verify
   ```

### Python / Django

Add a `Makefile` (or extend an existing one) so everyone runs the same command:

```makefile
# Makefile
flow-test:
	@npm --prefix flow-tests run flow-test

flow-test-ci:
	@npm --prefix flow-tests run flow-test -- --report=json
```

Usage:

```bash
make flow-test
make flow-test-ci
```

In a `tox.ini` you can also add:

```ini
[testenv:flow-tests]
commands = npm --prefix {toxinidir}/flow-tests run flow-test
```

### Dart / Flutter

Create `tool/flow_test.dart` to bridge into Node.js:

```dart
import 'dart:io';

Future<void> main() async {
  final result = await Process.start(
    'npx',
    ['--yes', 'fest', '--config', 'flow-tests/flow-test.config.yml'],
    mode: ProcessStartMode.inheritStdio,
  );
  final exitCode = await result.exitCode;
  if (exitCode != 0) {
    exit(exitCode);
  }
}
```

Add a script to `pubspec.yaml` (if you use `melos` or simple make targets):

```yaml
# pubspec.yaml
scripts:
  flow-test: dart run tool/flow_test.dart
```

Run:

```bash
dart run tool/flow_test.dart
# or with the scripts plugin
dart run flow-test
```

### Pure Terminal / CI Pipelines

If your project has no build tool, keep it simple:

```bash
npm ci --prefix flow-tests             # install once in CI
npm --prefix flow-tests run flow-test  # execute suites
```

Or run ad hoc:

```bash
npx --yes flow-test-engine --config flow-tests/flow-test.config.yml
# or using the short form:
npx --yes fest --config flow-tests/flow-test.config.yml
```

If you rely on Docker for dependent services, start them before running Flow Test. The sample `docker-compose.yml` in the Flow Test repository spins up httpbin:

```bash
docker compose up -d httpbin
npm --prefix flow-tests run flow-test
docker compose down -v
```

## 6. Reporting and Dashboards

Every execution writes a JSON artifact at `flow-tests/results/latest.json`. When you need a shareable visualization, enable HTML output with the `--html-output` flag (optionally pass a subdirectory name) or by adding `html` to `reporting.formats` in `flow-test.config.yml`. The engine now emits a Postman-inspired HTML experience alongside the JSON, and the Astro dashboard packaged with this repository reads the same data, so keep it in sync before starting the UI.

1. Copy (or symlink) the latest results into the dashboard data folder:
   ```bash
   mkdir -p report-dashboard/src/data
   cp flow-tests/results/latest.json report-dashboard/src/data/latest.json
   # or keep it synced:
   ln -sf ../flow-tests/results/latest.json report-dashboard/src/data/latest.json
   ```
   The dashboard looks for the browser-facing file at `report-dashboard/src/data/latest.json`, while server-side rendering also checks `../results/latest.json`. If neither is present it automatically reads `reporting.output_dir` from your `flow-test.config.*` file to locate the latest report. Either path can be kept fresh in CI.
2. Launch the dashboard:
   ```bash
   npm install --prefix report-dashboard        # first run only
   npm run --prefix report-dashboard dev
   ```
   Open `http://localhost:4321/flow-test/` (Astro’s default port). The UI reloads automatically when `src/data/latest.json` changes.
   - Prefer to serve it at the root path during local development? Run the command with `PUBLIC_BASE_URL=/ npm run --prefix report-dashboard dev` and open `http://localhost:4321/` instead.
3. Generate a static bundle when you need to publish the report:
   ```bash
   npm run --prefix report-dashboard build
   ```
   The build lands in `report-dashboard/dist/`. Deploy that folder and ship the matching `src/data/latest.json` (or automate a copy step) so the hosted dashboard can load the latest results.

Example CI step (GitHub Actions):

```yaml
- run: npm ci --prefix flow-tests
- run: npm --prefix flow-tests run flow-test
- run: npm ci --prefix report-dashboard
- run: cp flow-tests/results/latest.json report-dashboard/src/data/latest.json
- run: npm run --prefix report-dashboard build
```

## License

MIT – see `package.json` for details.
