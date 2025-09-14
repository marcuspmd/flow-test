[**Flow Test Engine v1.0.0**](../README.md)

***

[Flow Test Engine](../globals.md) / FlowTestEngine

# Class: FlowTestEngine

Defined in: [core/engine.ts:52](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/engine.ts#L52)

Main Flow Test Engine orchestrator

This class is responsible for orchestrating the entire test execution process,
from discovery to report generation. It coordinates all the necessary services
to execute test suites defined in YAML files.

## Example

```typescript
const engine = new FlowTestEngine('./config.yaml');

// Configure hooks for monitoring
const hooks = {
  onSuiteStart: (suite) => console.log(`▶️ Starting ${suite.suite_name}`),
  onSuiteEnd: (suite, result) => console.log(`✅ Completed ${suite.suite_name}`)
};

// Execute tests with filters
const result = await engine.run({
  filters: {
    tags: ["smoke", "regression"],
    priority: "high"
  },
  hooks,
  parallel: true
});

console.log(`Executed ${result.total_suites} test suites`);
console.log(`Success rate: ${result.success_rate}%`);
```

## Since

1.0.0

## Constructors

### Constructor

> **new FlowTestEngine**(`configFileOrOptions?`, `hooks?`): `FlowTestEngine`

Defined in: [core/engine.ts:122](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/engine.ts#L122)

Flow Test Engine constructor

Initializes all necessary services for test execution in the correct
dependency order. Services are initialized according to their interdependencies.

#### Parameters

##### configFileOrOptions?

Path to config file or direct options object

`string` | [`EngineExecutionOptions`](../interfaces/EngineExecutionOptions.md)

##### hooks?

[`EngineHooks`](../interfaces/EngineHooks.md) = `{}`

Optional lifecycle event hooks for monitoring and extending functionality

#### Returns

`FlowTestEngine`

#### Example

```typescript
// With configuration file
const engine = new FlowTestEngine('./flow-test.config.yml');

// With direct options
const engine = new FlowTestEngine({
  test_directory: './tests',
  verbosity: 'verbose',
  parallel_execution: true,
  max_workers: 4
});

// With lifecycle hooks for monitoring
const engine = new FlowTestEngine('./config.yml', {
  onExecutionStart: (stats) => {
    console.log(`🚀 Starting execution of ${stats.tests_discovered} test suites`);
    startTimer();
  },
  onSuiteStart: (suite) => {
    logger.info(`▶️ Executing: ${suite.suite_name}`);
  },
  onExecutionEnd: (result) => {
    const duration = stopTimer();
    console.log(`✨ Execution completed in ${duration}ms`);
    console.log(`Success rate: ${result.success_rate.toFixed(1)}%`);
  }
});
```

## Methods

### run()

> **run**(): `Promise`\<[`AggregatedResult`](../interfaces/AggregatedResult.md)\>

Defined in: [core/engine.ts:188](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/engine.ts#L188)

Executes all discovered tests in the configured directory

This method is the main entry point for test execution. It performs the complete
lifecycle: discovery, filtering, sorting, execution, and report generation.
The execution follows these phases:
1. Test Discovery - Scans for YAML test files
2. Filtering - Applies configured filters (tags, priority, etc.)
3. Dependency Resolution - Resolves inter-test dependencies
4. Execution - Runs tests with configured parallelism
5. Reporting - Generates HTML and JSON reports

#### Returns

`Promise`\<[`AggregatedResult`](../interfaces/AggregatedResult.md)\>

Promise that resolves to aggregated results of all executed tests

#### Throws

Error if there's a critical failure during execution

#### Example

```typescript
// Basic execution
const result = await engine.run();
if (result.overall_status === 'success') {
  console.log('All tests passed!');
  console.log(`Success rate: ${result.success_rate}%`);
}

// Check detailed results
console.log(`Total suites: ${result.total_suites}`);
console.log(`Passed: ${result.passed_suites}`);
console.log(`Failed: ${result.failed_suites}`);
console.log(`Skipped: ${result.skipped_suites}`);
console.log(`Execution time: ${result.total_execution_time}ms`);
```

***

### discoverTests()

> `private` **discoverTests**(): `Promise`\<[`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]\>

Defined in: [core/engine.ts:276](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/engine.ts#L276)

Performs test discovery in the configured directory

Recursively searches for YAML files containing test suites and registers
each discovered test through configured hooks. Supports multiple file
patterns and excludes configured directories.

#### Returns

`Promise`\<[`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]\>

Promise that resolves to array of discovered test metadata

#### Example

```typescript
// Example discovered test structure
const discoveredTest = {
  file_path: "./flows/auth/login-flow.yaml",
  suite_name: "User Authentication Tests",
  priority: "high",
  tags: ["auth", "smoke"],
  estimated_duration: 5000,
  dependencies: ["setup-flow.yaml"]
};
```

***

### applyFilters()

> `private` **applyFilters**(`tests`): [`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]

Defined in: [core/engine.ts:310](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/engine.ts#L310)

Applies configured filters to discovered tests

Filters tests based on criteria defined in configuration such as priority,
suite names, tags, file patterns, and custom conditions. Supports complex
filtering logic with AND/OR operations.

#### Parameters

##### tests

[`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]

Array of discovered tests to filter

#### Returns

[`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]

Filtered array of tests that meet the configured criteria

#### Example

```typescript
// Filtering by priority and tags
const filters = {
  priority: ["high", "critical"],
  tags: ["smoke"],
  exclude_tags: ["slow"]
};
const filteredTests = this.applyFilters(discoveredTests);
```

***

### getTestTags()

> `private` **getTestTags**(`filePath`): `string`[]

Defined in: [core/engine.ts:354](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/engine.ts#L354)

Obtém as tags de um teste a partir de seu arquivo YAML

#### Parameters

##### filePath

`string`

#### Returns

`string`[]

***

### updateStats()

> `private` **updateStats**(`newStats`): `void`

Defined in: [core/engine.ts:375](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/engine.ts#L375)

Atualiza estatísticas de execução em tempo real

Recebe atualizações das estatísticas durante a execução dos testes
e mantém o estado consolidado das métricas de performance.

#### Parameters

##### newStats

`Partial`\<[`ExecutionStats`](../interfaces/ExecutionStats.md)\>

Objeto parcial com novas estatísticas para merge

#### Returns

`void`

***

### buildAggregatedResult()

> `private` **buildAggregatedResult**(`startTime`, `endTime`, `totalDiscovered`, `suiteResults`): [`AggregatedResult`](../interfaces/AggregatedResult.md)

Defined in: [core/engine.ts:392](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/engine.ts#L392)

Constrói resultado agregado final com todas as métricas e estatísticas

Consolida os resultados de todas as suítes executadas e calcula
métricas agregadas como taxa de sucesso, duração total, etc.

#### Parameters

##### startTime

`Date`

Timestamp de início da execução

##### endTime

`Date`

Timestamp de fim da execução

##### totalDiscovered

`number`

Número total de testes descobertos

##### suiteResults

`any`[]

Array com resultados de cada suíte executada

#### Returns

[`AggregatedResult`](../interfaces/AggregatedResult.md)

Resultado agregado final

***

### buildEmptyResult()

> `private` **buildEmptyResult**(`startTime`, `endTime`): [`AggregatedResult`](../interfaces/AggregatedResult.md)

Defined in: [core/engine.ts:433](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/engine.ts#L433)

Constrói resultado vazio quando nenhum teste é encontrado

Retorna um resultado padrão com métricas zeradas para casos
onde não há testes para executar no diretório especificado.

#### Parameters

##### startTime

`Date`

Timestamp de início da tentativa de execução

##### endTime

`Date`

Timestamp de fim da tentativa de execução

#### Returns

[`AggregatedResult`](../interfaces/AggregatedResult.md)

Resultado agregado com métricas zeradas

***

### printExecutionSummary()

> `private` **printExecutionSummary**(`result`): `void`

Defined in: [core/engine.ts:452](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/engine.ts#L452)

Imprime resumo da execução

#### Parameters

##### result

[`AggregatedResult`](../interfaces/AggregatedResult.md)

#### Returns

`void`

***

### initializeStats()

> `private` **initializeStats**(): [`ExecutionStats`](../interfaces/ExecutionStats.md)

Defined in: [core/engine.ts:494](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/engine.ts#L494)

Inicializa estatísticas de execução

#### Returns

[`ExecutionStats`](../interfaces/ExecutionStats.md)

***

### getConfig()

> **getConfig**(): [`EngineConfig`](../interfaces/EngineConfig.md)

Defined in: [core/engine.ts:509](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/engine.ts#L509)

Obtém configuração atual

#### Returns

[`EngineConfig`](../interfaces/EngineConfig.md)

***

### getStats()

> **getStats**(): [`ExecutionStats`](../interfaces/ExecutionStats.md)

Defined in: [core/engine.ts:516](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/engine.ts#L516)

Obtém estatísticas atuais

#### Returns

[`ExecutionStats`](../interfaces/ExecutionStats.md)

***

### dryRun()

> **dryRun**(): `Promise`\<[`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]\>

Defined in: [core/engine.ts:523](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/engine.ts#L523)

Execução em modo dry-run (apenas descoberta e ordenação)

#### Returns

`Promise`\<[`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]\>

## Properties

### configManager

> `private` **configManager**: [`ConfigManager`](ConfigManager.md)

Defined in: [core/engine.ts:54](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/engine.ts#L54)

Configuration manager responsible for loading and validating configurations

***

### testDiscovery

> `private` **testDiscovery**: [`TestDiscovery`](TestDiscovery.md)

Defined in: [core/engine.ts:57](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/engine.ts#L57)

Discovery service responsible for locating test files

***

### globalVariables

> `private` **globalVariables**: [`GlobalVariablesService`](GlobalVariablesService.md)

Defined in: [core/engine.ts:60](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/engine.ts#L60)

Global variables management service for inter-suite communication

***

### priorityService

> `private` **priorityService**: [`PriorityService`](PriorityService.md)

Defined in: [core/engine.ts:63](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/engine.ts#L63)

Priority-based sorting and execution service

***

### dependencyService

> `private` **dependencyService**: `DependencyService`

Defined in: [core/engine.ts:66](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/engine.ts#L66)

Dependency management service for test interdependencies

***

### globalRegistry

> `private` **globalRegistry**: `GlobalRegistryService`

Defined in: [core/engine.ts:69](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/engine.ts#L69)

Global registry for exported variables between flows

***

### reportingService

> `private` **reportingService**: [`ReportingService`](ReportingService.md)

Defined in: [core/engine.ts:72](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/engine.ts#L72)

Report generation service

***

### executionService

> `private` **executionService**: [`ExecutionService`](ExecutionService.md)

Defined in: [core/engine.ts:75](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/engine.ts#L75)

Main test execution service

***

### hooks

> `private` **hooks**: [`EngineHooks`](../interfaces/EngineHooks.md)

Defined in: [core/engine.ts:78](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/engine.ts#L78)

Custom hooks for lifecycle events

***

### stats

> `private` **stats**: [`ExecutionStats`](../interfaces/ExecutionStats.md)

Defined in: [core/engine.ts:81](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/engine.ts#L81)

Real-time execution statistics
