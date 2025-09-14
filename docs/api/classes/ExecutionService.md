[**Flow Test Engine v1.0.0**](../README.md)

***

[Flow Test Engine](../globals.md) / ExecutionService

# Class: ExecutionService

Defined in: [services/execution.ts:29](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/execution.ts#L29)

Test execution service

## Constructors

### Constructor

> **new ExecutionService**(`configManager`, `globalVariables`, `priorityService`, `dependencyService`, `globalRegistry`, `hooks`): `ExecutionService`

Defined in: [services/execution.ts:56](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/execution.ts#L56)

#### Parameters

##### configManager

[`ConfigManager`](ConfigManager.md)

##### globalVariables

[`GlobalVariablesService`](GlobalVariablesService.md)

##### priorityService

[`PriorityService`](PriorityService.md)

##### dependencyService

`DependencyService`

##### globalRegistry

`GlobalRegistryService`

##### hooks

[`EngineHooks`](../interfaces/EngineHooks.md) = `{}`

#### Returns

`ExecutionService`

## Methods

### executeTests()

> **executeTests**(`tests`, `onStatsUpdate?`): `Promise`\<[`SuiteExecutionResult`](../interfaces/SuiteExecutionResult.md)[]\>

Defined in: [services/execution.ts:92](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/execution.ts#L92)

Executes list of discovered tests with dependency-aware execution

#### Parameters

##### tests

[`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]

##### onStatsUpdate?

(`stats`) => `void`

#### Returns

`Promise`\<[`SuiteExecutionResult`](../interfaces/SuiteExecutionResult.md)[]\>

***

### registerSuitesWithExports()

> `private` **registerSuitesWithExports**(`tests`): `void`

Defined in: [services/execution.ts:139](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/execution.ts#L139)

Registers suites that have exports in the Global Registry

#### Parameters

##### tests

[`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]

#### Returns

`void`

***

### executeTestsWithDependencies()

> `private` **executeTestsWithDependencies**(`tests`, `stats`, `onStatsUpdate?`): `Promise`\<[`SuiteExecutionResult`](../interfaces/SuiteExecutionResult.md)[]\>

Defined in: [services/execution.ts:155](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/execution.ts#L155)

Executes tests respecting dependencies

#### Parameters

##### tests

[`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]

##### stats

[`ExecutionStats`](../interfaces/ExecutionStats.md)

##### onStatsUpdate?

(`stats`) => `void`

#### Returns

`Promise`\<[`SuiteExecutionResult`](../interfaces/SuiteExecutionResult.md)[]\>

***

### executeTestsSequentially()

> `private` **executeTestsSequentially**(`tests`, `stats`, `onStatsUpdate?`): `Promise`\<[`SuiteExecutionResult`](../interfaces/SuiteExecutionResult.md)[]\>

Defined in: [services/execution.ts:255](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/execution.ts#L255)

Executes tests sequentially

#### Parameters

##### tests

[`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]

##### stats

[`ExecutionStats`](../interfaces/ExecutionStats.md)

##### onStatsUpdate?

(`stats`) => `void`

#### Returns

`Promise`\<[`SuiteExecutionResult`](../interfaces/SuiteExecutionResult.md)[]\>

***

### executeTestsInParallel()

> `private` **executeTestsInParallel**(`tests`, `stats`, `onStatsUpdate?`): `Promise`\<[`SuiteExecutionResult`](../interfaces/SuiteExecutionResult.md)[]\>

Defined in: [services/execution.ts:332](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/execution.ts#L332)

Executes tests in parallel (simplified implementation)

#### Parameters

##### tests

[`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]

##### stats

[`ExecutionStats`](../interfaces/ExecutionStats.md)

##### onStatsUpdate?

(`stats`) => `void`

#### Returns

`Promise`\<[`SuiteExecutionResult`](../interfaces/SuiteExecutionResult.md)[]\>

***

### executeSingleTest()

> `private` **executeSingleTest**(`discoveredTest`): `Promise`\<[`SuiteExecutionResult`](../interfaces/SuiteExecutionResult.md)\>

Defined in: [services/execution.ts:405](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/execution.ts#L405)

Executes a single test

#### Parameters

##### discoveredTest

[`DiscoveredTest`](../interfaces/DiscoveredTest.md)

#### Returns

`Promise`\<[`SuiteExecutionResult`](../interfaces/SuiteExecutionResult.md)\>

***

### filterAvailableVariables()

> `private` **filterAvailableVariables**(`variables`): `Record`\<`string`, `any`\>

Defined in: [services/execution.ts:571](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/execution.ts#L571)

Filters out environment variables and shows only relevant variables

#### Parameters

##### variables

`Record`\<`string`, `any`\>

#### Returns

`Record`\<`string`, `any`\>

***

### getEnvironmentVariablesToExclude()

> `private` **getEnvironmentVariablesToExclude**(): `Set`\<`string`\>

Defined in: [services/execution.ts:635](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/execution.ts#L635)

Gets all environment variables that should be excluded from available variables

#### Returns

`Set`\<`string`\>

***

### executeScenarioStep()

> `private` **executeScenarioStep**(`step`, `suite`, `stepIndex`, `stepStartTime`, `context`): `Promise`\<[`StepExecutionResult`](../interfaces/StepExecutionResult.md)\>

Defined in: [services/execution.ts:675](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/execution.ts#L675)

Executes a step that has scenarios (conditional execution)

#### Parameters

##### step

`any`

##### suite

[`TestSuite`](../interfaces/TestSuite.md)

##### stepIndex

`number`

##### stepStartTime

`number`

##### context

`any`

#### Returns

`Promise`\<[`StepExecutionResult`](../interfaces/StepExecutionResult.md)\>

***

### evaluateScenarioCondition()

> `private` **evaluateScenarioCondition**(`condition`): `boolean`

Defined in: [services/execution.ts:850](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/execution.ts#L850)

Evaluates a scenario condition using current variables

#### Parameters

##### condition

`string`

#### Returns

`boolean`

***

### executeStep()

> `private` **executeStep**(`step`, `suite`, `stepIndex`): `Promise`\<[`StepExecutionResult`](../interfaces/StepExecutionResult.md)\>

Defined in: [services/execution.ts:898](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/execution.ts#L898)

Executes an individual step

#### Parameters

##### step

`any`

##### suite

[`TestSuite`](../interfaces/TestSuite.md)

##### stepIndex

`number`

#### Returns

`Promise`\<[`StepExecutionResult`](../interfaces/StepExecutionResult.md)\>

***

### loadTestSuite()

> `private` **loadTestSuite**(`filePath`): `Promise`\<[`TestSuite`](../interfaces/TestSuite.md)\>

Defined in: [services/execution.ts:1062](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/execution.ts#L1062)

Loads a test suite from file

#### Parameters

##### filePath

`string`

#### Returns

`Promise`\<[`TestSuite`](../interfaces/TestSuite.md)\>

***

### captureAndRegisterExports()

> `private` **captureAndRegisterExports**(`test`, `result`): `void`

Defined in: [services/execution.ts:1080](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/execution.ts#L1080)

Captures and registers exported variables in Global Registry

#### Parameters

##### test

[`DiscoveredTest`](../interfaces/DiscoveredTest.md)

##### result

[`SuiteExecutionResult`](../interfaces/SuiteExecutionResult.md)

#### Returns

`void`

***

### getExportedVariables()

> `private` **getExportedVariables**(`test`): `Record`\<`string`, `any`\>

Defined in: [services/execution.ts:1109](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/execution.ts#L1109)

Gets only the variables that should be exported for a test

#### Parameters

##### test

[`DiscoveredTest`](../interfaces/DiscoveredTest.md)

#### Returns

`Record`\<`string`, `any`\>

***

### processCapturedVariables()

> `private` **processCapturedVariables**(`capturedVariables`, `suite`, `applyNamespace`): `Record`\<`string`, `any`\>

Defined in: [services/execution.ts:1132](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/execution.ts#L1132)

Processes captured variables, optionally applying namespace for exported variables

#### Parameters

##### capturedVariables

`Record`\<`string`, `any`\>

##### suite

[`TestSuite`](../interfaces/TestSuite.md)

##### applyNamespace

`boolean` = `false`

#### Returns

`Record`\<`string`, `any`\>

***

### restoreExportedVariables()

> `private` **restoreExportedVariables**(`cachedResult`): `void`

Defined in: [services/execution.ts:1153](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/execution.ts#L1153)

Restores exported variables from cache

#### Parameters

##### cachedResult

[`DependencyResult`](../interfaces/DependencyResult.md)

#### Returns

`void`

***

### buildCachedSuiteResult()

> `private` **buildCachedSuiteResult**(`test`, `cachedResult`): [`SuiteExecutionResult`](../interfaces/SuiteExecutionResult.md)

Defined in: [services/execution.ts:1168](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/execution.ts#L1168)

Builds suite result based on cache

#### Parameters

##### test

[`DiscoveredTest`](../interfaces/DiscoveredTest.md)

##### cachedResult

[`DependencyResult`](../interfaces/DependencyResult.md)

#### Returns

[`SuiteExecutionResult`](../interfaces/SuiteExecutionResult.md)

***

### buildErrorSuiteResult()

> `private` **buildErrorSuiteResult**(`test`, `error`): [`SuiteExecutionResult`](../interfaces/SuiteExecutionResult.md)

Defined in: [services/execution.ts:1194](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/execution.ts#L1194)

Builds error result for a suite

#### Parameters

##### test

[`DiscoveredTest`](../interfaces/DiscoveredTest.md)

##### error

`Error`

#### Returns

[`SuiteExecutionResult`](../interfaces/SuiteExecutionResult.md)

***

### recordPerformanceData()

> `private` **recordPerformanceData**(`request`, `result`): `void`

Defined in: [services/execution.ts:1221](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/execution.ts#L1221)

Records performance data

#### Parameters

##### request

`any`

##### result

`any`

#### Returns

`void`

***

### getPerformanceSummary()

> **getPerformanceSummary**(): `undefined` \| [`PerformanceSummary`](../interfaces/PerformanceSummary.md)

Defined in: [services/execution.ts:1235](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/execution.ts#L1235)

Generates performance summary

#### Returns

`undefined` \| [`PerformanceSummary`](../interfaces/PerformanceSummary.md)

***

### executeIteratedStep()

> `private` **executeIteratedStep**(`step`, `suite`, `stepIndex`, `stepStartTime`, `context`): `Promise`\<[`StepExecutionResult`](../interfaces/StepExecutionResult.md)\>

Defined in: [services/execution.ts:1282](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/execution.ts#L1282)

Executes a step with iteration configuration multiple times

#### Parameters

##### step

`any`

##### suite

[`TestSuite`](../interfaces/TestSuite.md)

##### stepIndex

`number`

##### stepStartTime

`number`

##### context

`any`

#### Returns

`Promise`\<[`StepExecutionResult`](../interfaces/StepExecutionResult.md)\>

## Properties

### configManager

> `private` **configManager**: [`ConfigManager`](ConfigManager.md)

Defined in: [services/execution.ts:30](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/execution.ts#L30)

***

### globalVariables

> `private` **globalVariables**: [`GlobalVariablesService`](GlobalVariablesService.md)

Defined in: [services/execution.ts:31](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/execution.ts#L31)

***

### priorityService

> `private` **priorityService**: [`PriorityService`](PriorityService.md)

Defined in: [services/execution.ts:32](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/execution.ts#L32)

***

### dependencyService

> `private` **dependencyService**: `DependencyService`

Defined in: [services/execution.ts:33](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/execution.ts#L33)

***

### globalRegistry

> `private` **globalRegistry**: `GlobalRegistryService`

Defined in: [services/execution.ts:34](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/execution.ts#L34)

***

### hooks

> `private` **hooks**: [`EngineHooks`](../interfaces/EngineHooks.md)

Defined in: [services/execution.ts:35](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/execution.ts#L35)

***

### logger

> `private` **logger**: `LoggerService`

Defined in: [services/execution.ts:36](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/execution.ts#L36)

***

### httpService

> `private` **httpService**: [`HttpService`](HttpService.md)

Defined in: [services/execution.ts:39](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/execution.ts#L39)

***

### assertionService

> `private` **assertionService**: [`AssertionService`](AssertionService.md)

Defined in: [services/execution.ts:40](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/execution.ts#L40)

***

### captureService

> `private` **captureService**: [`CaptureService`](CaptureService.md)

Defined in: [services/execution.ts:41](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/execution.ts#L41)

***

### scenarioService

> `private` **scenarioService**: `ScenarioService`

Defined in: [services/execution.ts:42](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/execution.ts#L42)

***

### iterationService

> `private` **iterationService**: `IterationService`

Defined in: [services/execution.ts:43](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/execution.ts#L43)

***

### performanceData

> `private` **performanceData**: `object`

Defined in: [services/execution.ts:46](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/execution.ts#L46)

#### requests

> **requests**: `object`[]

#### start\_time

> **start\_time**: `number`
