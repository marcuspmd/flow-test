[**Flow Test Engine v1.0.0**](../README.md)

***

[Flow Test Engine](../globals.md) / ReportingService

# Class: ReportingService

Defined in: [services/reporting.ts:11](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/reporting.ts#L11)

Service for generating reports in multiple formats

## Constructors

### Constructor

> **new ReportingService**(`configManager`): `ReportingService`

Defined in: [services/reporting.ts:15](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/reporting.ts#L15)

#### Parameters

##### configManager

[`ConfigManager`](ConfigManager.md)

#### Returns

`ReportingService`

## Methods

### generateReports()

> **generateReports**(`result`): `Promise`\<`void`\>

Defined in: [services/reporting.ts:22](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/reporting.ts#L22)

Generates all configured reports

#### Parameters

##### result

[`AggregatedResult`](../interfaces/AggregatedResult.md)

#### Returns

`Promise`\<`void`\>

***

### generateReport()

> `private` **generateReport**(`result`, `format`, `outputDir`, `baseName`, `timestamp`): `Promise`\<`void`\>

Defined in: [services/reporting.ts:57](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/reporting.ts#L57)

Generates a specific report

#### Parameters

##### result

[`AggregatedResult`](../interfaces/AggregatedResult.md)

##### format

[`ReportFormat`](../type-aliases/ReportFormat.md)

##### outputDir

`string`

##### baseName

`string`

##### timestamp

`string`

#### Returns

`Promise`\<`void`\>

***

### generateJsonReport()

> `private` **generateJsonReport**(`result`, `outputDir`, `baseName`, `timestamp`): `Promise`\<`void`\>

Defined in: [services/reporting.ts:85](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/reporting.ts#L85)

Generates JSON report

#### Parameters

##### result

[`AggregatedResult`](../interfaces/AggregatedResult.md)

##### outputDir

`string`

##### baseName

`string`

##### timestamp

`string`

#### Returns

`Promise`\<`void`\>

***

### generateJunitReport()

> `private` **generateJunitReport**(`result`, `outputDir`, `baseName`, `timestamp`): `Promise`\<`void`\>

Defined in: [services/reporting.ts:118](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/reporting.ts#L118)

Generates JUnit XML report

#### Parameters

##### result

[`AggregatedResult`](../interfaces/AggregatedResult.md)

##### outputDir

`string`

##### baseName

`string`

##### timestamp

`string`

#### Returns

`Promise`\<`void`\>

***

### generateHtmlReport()

> `private` **generateHtmlReport**(`result`, `outputDir`, `baseName`, `timestamp`): `Promise`\<`void`\>

Defined in: [services/reporting.ts:142](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/reporting.ts#L142)

Generates HTML report using the new HTML generator

#### Parameters

##### result

[`AggregatedResult`](../interfaces/AggregatedResult.md)

##### outputDir

`string`

##### baseName

`string`

##### timestamp

`string`

#### Returns

`Promise`\<`void`\>

***

### generateConsoleReport()

> `private` **generateConsoleReport**(`result`): `void`

Defined in: [services/reporting.ts:180](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/reporting.ts#L180)

Generates console report

#### Parameters

##### result

[`AggregatedResult`](../interfaces/AggregatedResult.md)

#### Returns

`void`

***

### buildJunitXml()

> `private` **buildJunitXml**(`result`): `string`

Defined in: [services/reporting.ts:275](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/reporting.ts#L275)

Builds XML in JUnit format

#### Parameters

##### result

[`AggregatedResult`](../interfaces/AggregatedResult.md)

#### Returns

`string`

***

### buildHtmlReport()

> `private` **buildHtmlReport**(`result`): `string`

Defined in: [services/reporting.ts:317](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/reporting.ts#L317)

Builds HTML report

#### Parameters

##### result

[`AggregatedResult`](../interfaces/AggregatedResult.md)

#### Returns

`string`

***

### buildPerformanceSection()

> `private` **buildPerformanceSection**(`perf`): `string`

Defined in: [services/reporting.ts:586](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/reporting.ts#L586)

Builds performance section for HTML

#### Parameters

##### perf

`any`

#### Returns

`string`

***

### buildStepSection()

> `private` **buildStepSection**(`step`, `index`): `string`

Defined in: [services/reporting.ts:622](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/reporting.ts#L622)

Builds step section for HTML

#### Parameters

##### step

`any`

##### index

`number`

#### Returns

`string`

***

### buildRequestSection()

> `private` **buildRequestSection**(`request`): `string`

Defined in: [services/reporting.ts:690](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/reporting.ts#L690)

Builds request section for HTML

#### Parameters

##### request

`any`

#### Returns

`string`

***

### buildResponseSection()

> `private` **buildResponseSection**(`response`): `string`

Defined in: [services/reporting.ts:723](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/reporting.ts#L723)

Builds response section for HTML

#### Parameters

##### response

`any`

#### Returns

`string`

***

### buildAssertionsSection()

> `private` **buildAssertionsSection**(`assertions`): `string`

Defined in: [services/reporting.ts:747](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/reporting.ts#L747)

Builds assertions section for HTML

#### Parameters

##### assertions

`any`[]

#### Returns

`string`

***

### buildVariablesSection()

> `private` **buildVariablesSection**(`variables`): `string`

Defined in: [services/reporting.ts:776](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/reporting.ts#L776)

Builds variables section for HTML

#### Parameters

##### variables

`Record`\<`string`, `any`\>

#### Returns

`string`

***

### buildAvailableVariablesSection()

> `private` **buildAvailableVariablesSection**(`variables`): `string`

Defined in: [services/reporting.ts:796](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/reporting.ts#L796)

Builds available variables section for HTML

#### Parameters

##### variables

`Record`\<`string`, `any`\>

#### Returns

`string`

***

### buildSuiteSection()

> `private` **buildSuiteSection**(`suite`): `string`

Defined in: [services/reporting.ts:834](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/reporting.ts#L834)

Builds suite section for HTML

#### Parameters

##### suite

`any`

#### Returns

`string`

***

### formatDuration()

> `private` **formatDuration**(`ms`): `string`

Defined in: [services/reporting.ts:895](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/reporting.ts#L895)

Formatting utilities

#### Parameters

##### ms

`number`

#### Returns

`string`

***

### generateTimestamp()

> `private` **generateTimestamp**(): `string`

Defined in: [services/reporting.ts:903](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/reporting.ts#L903)

#### Returns

`string`

***

### sanitizeFileName()

> `private` **sanitizeFileName**(`name`): `string`

Defined in: [services/reporting.ts:911](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/reporting.ts#L911)

#### Parameters

##### name

`string`

#### Returns

`string`

***

### escapeXml()

> `private` **escapeXml**(`text`): `string`

Defined in: [services/reporting.ts:920](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/reporting.ts#L920)

#### Parameters

##### text

`string`

#### Returns

`string`

***

### escapeHtml()

> `private` **escapeHtml**(`text`): `string`

Defined in: [services/reporting.ts:929](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/reporting.ts#L929)

#### Parameters

##### text

`undefined` | `null` | `string`

#### Returns

`string`

## Properties

### configManager

> `private` **configManager**: [`ConfigManager`](ConfigManager.md)

Defined in: [services/reporting.ts:12](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/reporting.ts#L12)

***

### logger

> `private` **logger**: `LoggerService`

Defined in: [services/reporting.ts:13](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/reporting.ts#L13)
