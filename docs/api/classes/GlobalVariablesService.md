[**Flow Test Engine v1.0.0**](../README.md)

***

[Flow Test Engine](../globals.md) / GlobalVariablesService

# Class: GlobalVariablesService

Defined in: [services/global-variables.ts:13](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/global-variables.ts#L13)

Service for managing global variables with hierarchy and cache

## Constructors

### Constructor

> **new GlobalVariablesService**(`configManager`, `globalRegistry?`): `GlobalVariablesService`

Defined in: [services/global-variables.ts:22](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/global-variables.ts#L22)

#### Parameters

##### configManager

[`ConfigManager`](ConfigManager.md)

##### globalRegistry?

`GlobalRegistryService`

#### Returns

`GlobalVariablesService`

## Methods

### setGlobalRegistry()

> **setGlobalRegistry**(`globalRegistry`): `void`

Defined in: [services/global-variables.ts:34](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/global-variables.ts#L34)

Sets the Global Registry for resolution of exported variables

#### Parameters

##### globalRegistry

`GlobalRegistryService`

#### Returns

`void`

***

### setDependencies()

> **setDependencies**(`dependencies`): `void`

Defined in: [services/global-variables.ts:42](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/global-variables.ts#L42)

Sets the dependencies for this flow (node_ids of dependent flows)

#### Parameters

##### dependencies

`string`[]

#### Returns

`void`

***

### setExecutionContext()

> **setExecutionContext**(`context`): `void`

Defined in: [services/global-variables.ts:50](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/global-variables.ts#L50)

Updates the current execution context for JavaScript expressions

#### Parameters

##### context

`Partial`\<`JavaScriptExecutionContext`\>

#### Returns

`void`

***

### initializeContext()

> `private` **initializeContext**(): [`GlobalVariableContext`](../interfaces/GlobalVariableContext.md)

Defined in: [services/global-variables.ts:63](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/global-variables.ts#L63)

Initializes the variable context

#### Returns

[`GlobalVariableContext`](../interfaces/GlobalVariableContext.md)

***

### loadEnvironmentVariables()

> `private` **loadEnvironmentVariables**(): `Record`\<`string`, `any`\>

Defined in: [services/global-variables.ts:76](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/global-variables.ts#L76)

Loads relevant environment variables

#### Returns

`Record`\<`string`, `any`\>

***

### setRuntimeVariables()

> **setRuntimeVariables**(`variables`): `void`

Defined in: [services/global-variables.ts:90](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/global-variables.ts#L90)

Sets variables in runtime scope

#### Parameters

##### variables

`Record`\<`string`, `any`\>

#### Returns

`void`

***

### setRuntimeVariable()

> **setRuntimeVariable**(`name`, `value`): `void`

Defined in: [services/global-variables.ts:98](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/global-variables.ts#L98)

Sets a single variable in runtime scope

#### Parameters

##### name

`string`

##### value

`any`

#### Returns

`void`

***

### setSuiteVariables()

> **setSuiteVariables**(`variables`): `void`

Defined in: [services/global-variables.ts:106](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/global-variables.ts#L106)

Sets variables in suite scope

#### Parameters

##### variables

`Record`\<`string`, `any`\>

#### Returns

`void`

***

### clearRuntimeVariables()

> **clearRuntimeVariables**(): `void`

Defined in: [services/global-variables.ts:115](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/global-variables.ts#L115)

Clears runtime variables (used when switching between nodes)
Preserves environment, global, and suite variables

#### Returns

`void`

***

### clearSuiteVariables()

> **clearSuiteVariables**(): `void`

Defined in: [services/global-variables.ts:124](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/global-variables.ts#L124)

Clears suite-specific variables (used when switching between test suites)
Preserves environment and global variables, clears runtime variables

#### Returns

`void`

***

### clearAllNonGlobalVariables()

> **clearAllNonGlobalVariables**(): `void`

Defined in: [services/global-variables.ts:134](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/global-variables.ts#L134)

Clears all non-global variables (used when starting a new test suite)
Preserves only environment and global variables

#### Returns

`void`

***

### setVariable()

> **setVariable**(`name`, `value`, `scope`): `void`

Defined in: [services/global-variables.ts:144](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/global-variables.ts#L144)

Sets a specific variable in runtime

#### Parameters

##### name

`string`

##### value

`any`

##### scope

keyof [`GlobalVariableContext`](../interfaces/GlobalVariableContext.md) = `"runtime"`

#### Returns

`void`

***

### getVariable()

> **getVariable**(`name`): `any`

Defined in: [services/global-variables.ts:158](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/global-variables.ts#L158)

Gets a specific variable following the hierarchy

#### Parameters

##### name

`string`

#### Returns

`any`

***

### getAllVariables()

> **getAllVariables**(): `Record`\<`string`, `any`\>

Defined in: [services/global-variables.ts:182](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/global-variables.ts#L182)

Gets all variables merged by hierarchy

#### Returns

`Record`\<`string`, `any`\>

***

### interpolateString()

> **interpolateString**(`template`): `string`

Defined in: [services/global-variables.ts:205](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/global-variables.ts#L205)

Interpolates a string replacing {{variable}} with values

#### Parameters

##### template

`string`

#### Returns

`string`

***

### interpolate()

> **interpolate**\<`T`\>(`obj`): `T`

Defined in: [services/global-variables.ts:251](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/global-variables.ts#L251)

Interpolates any object (strings, objects, arrays)

#### Type Parameters

##### T

`T`

#### Parameters

##### obj

`T`

#### Returns

`T`

***

### resolveVariableExpression()

> `private` **resolveVariableExpression**(`expression`): `any`

Defined in: [services/global-variables.ts:278](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/global-variables.ts#L278)

Resolves variable expressions with support for paths and exported variables

#### Parameters

##### expression

`string`

#### Returns

`any`

***

### convertValueToString()

> `private` **convertValueToString**(`value`): `string`

Defined in: [services/global-variables.ts:401](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/global-variables.ts#L401)

Converts any value to string for interpolation

#### Parameters

##### value

`any`

#### Returns

`string`

***

### getContext()

> **getContext**(): [`GlobalVariableContext`](../interfaces/GlobalVariableContext.md)

Defined in: [services/global-variables.ts:424](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/global-variables.ts#L424)

Gets complete variable context

#### Returns

[`GlobalVariableContext`](../interfaces/GlobalVariableContext.md)

***

### getVariablesByScope()

> **getVariablesByScope**(`scope`): `Record`\<`string`, `any`\>

Defined in: [services/global-variables.ts:431](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/global-variables.ts#L431)

Gets variables from a specific scope

#### Parameters

##### scope

keyof [`GlobalVariableContext`](../interfaces/GlobalVariableContext.md)

#### Returns

`Record`\<`string`, `any`\>

***

### hasVariable()

> **hasVariable**(`name`): `boolean`

Defined in: [services/global-variables.ts:438](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/global-variables.ts#L438)

Checks if a variable exists

#### Parameters

##### name

`string`

#### Returns

`boolean`

***

### getAvailableVariableNames()

> **getAvailableVariableNames**(): `string`[]

Defined in: [services/global-variables.ts:445](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/global-variables.ts#L445)

Lists names of all available variables

#### Returns

`string`[]

***

### getStats()

> **getStats**(): `object`

Defined in: [services/global-variables.ts:453](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/global-variables.ts#L453)

Gets statistics of the variable system

#### Returns

`object`

##### environment\_vars

> **environment\_vars**: `number`

##### global\_vars

> **global\_vars**: `number`

##### suite\_vars

> **suite\_vars**: `number`

##### runtime\_vars

> **runtime\_vars**: `number`

##### cache\_size

> **cache\_size**: `number`

##### cache\_enabled

> **cache\_enabled**: `boolean`

***

### clearCache()

> **clearCache**(): `void`

Defined in: [services/global-variables.ts:467](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/global-variables.ts#L467)

Clears the interpolation cache

#### Returns

`void`

***

### invalidateCacheForVariable()

> `private` **invalidateCacheForVariable**(`variableName`): `void`

Defined in: [services/global-variables.ts:474](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/global-variables.ts#L474)

Invalidates cache entries that use a specific variable

#### Parameters

##### variableName

`string`

#### Returns

`void`

***

### setCacheEnabled()

> **setCacheEnabled**(`enabled`): `void`

Defined in: [services/global-variables.ts:487](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/global-variables.ts#L487)

Enables/disables interpolation cache

#### Parameters

##### enabled

`boolean`

#### Returns

`void`

***

### exportState()

> **exportState**(): `string`

Defined in: [services/global-variables.ts:497](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/global-variables.ts#L497)

Exports current variable state for debug

#### Returns

`string`

***

### importState()

> **importState**(`state`): `void`

Defined in: [services/global-variables.ts:515](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/global-variables.ts#L515)

Restores context from an exported state

#### Parameters

##### state

`string`

#### Returns

`void`

***

### createSnapshot()

> **createSnapshot**(): () => `void`

Defined in: [services/global-variables.ts:530](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/global-variables.ts#L530)

Creates a snapshot of the current variable state

#### Returns

> (): `void`

##### Returns

`void`

***

### mergeContext()

> **mergeContext**(`otherContext`): `void`

Defined in: [services/global-variables.ts:542](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/global-variables.ts#L542)

Merges variables from another context

#### Parameters

##### otherContext

`Partial`\<[`GlobalVariableContext`](../interfaces/GlobalVariableContext.md)\>

#### Returns

`void`

***

### isLikelyRuntimeVariable()

> `private` **isLikelyRuntimeVariable**(`variableName`): `boolean`

Defined in: [services/global-variables.ts:569](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/global-variables.ts#L569)

Determines if a variable name is likely a runtime variable that gets cleaned between nodes
Used to reduce warning noise for expected cleanup behavior

#### Parameters

##### variableName

`string`

#### Returns

`boolean`

## Properties

### context

> `private` **context**: [`GlobalVariableContext`](../interfaces/GlobalVariableContext.md)

Defined in: [services/global-variables.ts:14](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/global-variables.ts#L14)

***

### configManager

> `private` **configManager**: [`ConfigManager`](ConfigManager.md)

Defined in: [services/global-variables.ts:15](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/global-variables.ts#L15)

***

### globalRegistry

> `private` **globalRegistry**: `null` \| `GlobalRegistryService` = `null`

Defined in: [services/global-variables.ts:16](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/global-variables.ts#L16)

***

### interpolationCache

> `private` **interpolationCache**: `Map`\<`string`, `string`\>

Defined in: [services/global-variables.ts:17](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/global-variables.ts#L17)

***

### cacheEnabled

> `private` **cacheEnabled**: `boolean` = `true`

Defined in: [services/global-variables.ts:18](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/global-variables.ts#L18)

***

### dependencies

> `private` **dependencies**: `string`[] = `[]`

Defined in: [services/global-variables.ts:19](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/global-variables.ts#L19)

***

### currentExecutionContext

> `private` **currentExecutionContext**: `JavaScriptExecutionContext` = `{}`

Defined in: [services/global-variables.ts:20](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/services/global-variables.ts#L20)
