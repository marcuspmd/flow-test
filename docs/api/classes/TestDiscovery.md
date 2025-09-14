[**Flow Test Engine v1.0.0**](../README.md)

***

[Flow Test Engine](../globals.md) / TestDiscovery

# Class: TestDiscovery

Defined in: [core/discovery.ts:36](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/discovery.ts#L36)

Test discovery service responsible for finding and loading test files

This service scans directories for YAML test files, validates their structure,
and resolves dependencies between different test suites. It supports filtering
by priority, tags, and file patterns.

## Example

```typescript
const configManager = new ConfigManager();
const discovery = new TestDiscovery(configManager);

// Discover all tests in directory
const tests = await discovery.discoverTests();

// Filter by priority and tags
const filtered = discovery.filterTests(tests, {
  priorities: ['critical', 'high'],
  tags: ['smoke', 'api']
});
```

## Constructors

### Constructor

> **new TestDiscovery**(`configManager`): `TestDiscovery`

Defined in: [core/discovery.ts:39](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/discovery.ts#L39)

#### Parameters

##### configManager

[`ConfigManager`](ConfigManager.md)

#### Returns

`TestDiscovery`

## Methods

### discoverTests()

> **discoverTests**(): `Promise`\<[`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]\>

Defined in: [core/discovery.ts:62](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/discovery.ts#L62)

Discovers all test files in the configured directory

Scans the test directory recursively for YAML files, validates their structure
as valid test suites, and returns an array of discovered tests with metadata.

#### Returns

`Promise`\<[`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]\>

Promise resolving to array of discovered test configurations

#### Throws

Error if test directory doesn't exist or YAML files are invalid

#### Example

```typescript
const tests = await discovery.discoverTests();
console.log(`Found ${tests.length} test suites`);

tests.forEach(test => {
  console.log(`- ${test.suite.suite_name} (${test.filePath})`);
});
```

***

### parseTestFile()

> `private` **parseTestFile**(`filePath`): `Promise`\<`null` \| [`DiscoveredTest`](../interfaces/DiscoveredTest.md)\>

Defined in: [core/discovery.ts:107](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/discovery.ts#L107)

Analisa um arquivo de teste individual

#### Parameters

##### filePath

`string`

#### Returns

`Promise`\<`null` \| [`DiscoveredTest`](../interfaces/DiscoveredTest.md)\>

***

### inferPriorityFromName()

> `private` **inferPriorityFromName**(`suiteName`): `string`

Defined in: [core/discovery.ts:144](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/discovery.ts#L144)

Infere prioridade baseada no nome da suíte

#### Parameters

##### suiteName

`string`

#### Returns

`string`

***

### extractDependencies()

> `private` **extractDependencies**(`suite`): `string`[]

Defined in: [core/discovery.ts:182](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/discovery.ts#L182)

Extrai dependências de uma suíte de testes (FORMATO LEGADO - REMOVIDO)
Agora usa apenas o campo 'depends' com node_id

#### Parameters

##### suite

[`TestSuite`](../interfaces/TestSuite.md)

#### Returns

`string`[]

***

### extractFlowDependencies()

> `private` **extractFlowDependencies**(`suite`): [`FlowDependency`](../interfaces/FlowDependency.md)[]

Defined in: [core/discovery.ts:203](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/discovery.ts#L203)

Extrai dependências de fluxo no novo formato

#### Parameters

##### suite

[`TestSuite`](../interfaces/TestSuite.md)

#### Returns

[`FlowDependency`](../interfaces/FlowDependency.md)[]

***

### extractExports()

> `private` **extractExports**(`suite`): `string`[]

Defined in: [core/discovery.ts:217](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/discovery.ts#L217)

Extrai lista de variáveis exportadas

#### Parameters

##### suite

[`TestSuite`](../interfaces/TestSuite.md)

#### Returns

`string`[]

***

### estimateDuration()

> `private` **estimateDuration**(`suite`): `number`

Defined in: [core/discovery.ts:224](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/discovery.ts#L224)

Estima duração baseada no número de steps

#### Parameters

##### suite

[`TestSuite`](../interfaces/TestSuite.md)

#### Returns

`number`

***

### removeDuplicates()

> `private` **removeDuplicates**(`tests`): [`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]

Defined in: [core/discovery.ts:236](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/discovery.ts#L236)

Remove testes duplicados baseado no caminho do arquivo

#### Parameters

##### tests

[`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]

#### Returns

[`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]

***

### resolveDependencies()

> `private` **resolveDependencies**(`tests`): [`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]

Defined in: [core/discovery.ts:250](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/discovery.ts#L250)

Resolve dependências entre testes

#### Parameters

##### tests

[`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]

#### Returns

[`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]

***

### getDiscoveryStats()

> **getDiscoveryStats**(`tests`): `object`

Defined in: [core/discovery.ts:283](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/discovery.ts#L283)

Obtém estatísticas da descoberta

#### Parameters

##### tests

[`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]

#### Returns

`object`

##### total\_tests

> **total\_tests**: `number` = `tests.length`

##### by\_priority

> **by\_priority**: `Record`\<`string`, `number`\>

##### total\_estimated\_duration

> **total\_estimated\_duration**: `number` = `0`

##### with\_dependencies

> **with\_dependencies**: `number` = `0`

##### files\_scanned

> **files\_scanned**: `number` = `0`

***

### isValidTestFile()

> **isValidTestFile**(`filePath`): `Promise`\<`boolean`\>

Defined in: [core/discovery.ts:312](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/discovery.ts#L312)

Valida se um arquivo é um teste válido sem carregá-lo completamente

#### Parameters

##### filePath

`string`

#### Returns

`Promise`\<`boolean`\>

***

### discoverTestGroups()

> **discoverTestGroups**(): `Promise`\<`Map`\<`string`, [`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]\>\>

Defined in: [core/discovery.ts:327](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/discovery.ts#L327)

Descobre e organiza testes em grupos lógicos

#### Returns

`Promise`\<`Map`\<`string`, [`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]\>\>

***

### findOrphanTests()

> **findOrphanTests**(`tests`): [`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]

Defined in: [core/discovery.ts:348](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/discovery.ts#L348)

Detecta testes órfãos (sem dependências e que ninguém depende)

#### Parameters

##### tests

[`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]

#### Returns

[`DiscoveredTest`](../interfaces/DiscoveredTest.md)[]

## Properties

### configManager

> `private` **configManager**: [`ConfigManager`](ConfigManager.md)

Defined in: [core/discovery.ts:37](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/discovery.ts#L37)
