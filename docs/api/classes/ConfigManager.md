[**Flow Test Engine v1.0.0**](../README.md)

***

[Flow Test Engine](../globals.md) / ConfigManager

# Class: ConfigManager

Defined in: [core/config.ts:25](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/config.ts#L25)

Gerenciador de configuração do Flow Test Engine

Responsável por carregar, validar e gerenciar todas as configurações
do engine, incluindo variáveis globais, configurações de ambiente
e opções de execução. Suporta sobrescrita via parâmetros de runtime.

## Example

```typescript
const configManager = new ConfigManager({
  config_file: './flow-test.config.yml',
  environment: 'staging',
  verbosity: 'verbose'
});

const config = configManager.getConfig();
const globalVars = configManager.getGlobalVariables();
```

## Constructors

### Constructor

> **new ConfigManager**(`options`): `ConfigManager`

Defined in: [core/config.ts:51](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/config.ts#L51)

Construtor do ConfigManager

Carrega configuração de arquivo e aplica sobrescritas das opções de execução.

#### Parameters

##### options

[`EngineExecutionOptions`](../interfaces/EngineExecutionOptions.md) = `{}`

Opções de execução que podem sobrescrever configurações do arquivo

#### Returns

`ConfigManager`

#### Example

```typescript
// Com arquivo específico
const manager = new ConfigManager({ config_file: './custom.yml' });

// Com sobrescritas
const manager = new ConfigManager({
  test_directory: './tests',
  environment: 'production'
});
```

## Methods

### getConfig()

> **getConfig**(): [`EngineConfig`](../interfaces/EngineConfig.md)

Defined in: [core/config.ts:65](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/config.ts#L65)

Obtém a configuração completa processada

Retorna a configuração final após aplicar todas as sobrescritas
e resoluções de variáveis de ambiente.

#### Returns

[`EngineConfig`](../interfaces/EngineConfig.md)

Configuração completa do engine

***

### getGlobalVariables()

> **getGlobalVariables**(): `Record`\<`string`, `any`\>

Defined in: [core/config.ts:85](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/config.ts#L85)

Obtém variáveis globais combinadas de configuração e ambiente

Combina variáveis definidas no arquivo de configuração com
variáveis específicas do ambiente ativo, dando precedência
às variáveis de ambiente.

#### Returns

`Record`\<`string`, `any`\>

Objeto com todas as variáveis globais disponíveis

#### Example

```typescript
// Se config tem: { api_url: 'http://localhost' }
// E ambiente 'prod' tem: { api_url: 'https://api.prod.com' }
// O resultado será: { api_url: 'https://api.prod.com' }
```

***

### resolveConfigFile()

> `private` **resolveConfigFile**(`configFile?`): `string`

Defined in: [core/config.ts:107](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/config.ts#L107)

Resolve o caminho do arquivo de configuração a ser usado

Se um arquivo específico for fornecido, valida sua existência.
Caso contrário, procura por arquivos de configuração padrão
na ordem de precedência.

#### Parameters

##### configFile?

`string`

Caminho opcional para arquivo específico

#### Returns

`string`

Caminho absoluto do arquivo de configuração

#### Throws

Error se arquivo especificado não for encontrado

***

### loadConfig()

> `private` **loadConfig**(): [`EngineConfig`](../interfaces/EngineConfig.md)

Defined in: [core/config.ts:140](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/config.ts#L140)

Carrega e valida a configuração

#### Returns

[`EngineConfig`](../interfaces/EngineConfig.md)

***

### validateAndNormalizeConfig()

> `private` **validateAndNormalizeConfig**(`config`): [`EngineConfig`](../interfaces/EngineConfig.md)

Defined in: [core/config.ts:156](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/config.ts#L156)

Valida e normaliza a configuração com valores padrão

#### Parameters

##### config

`any`

#### Returns

[`EngineConfig`](../interfaces/EngineConfig.md)

***

### applyOptionsOverrides()

> `private` **applyOptionsOverrides**(`options`): `void`

Defined in: [core/config.ts:227](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/config.ts#L227)

Aplica overrides das opções de execução

#### Parameters

##### options

[`EngineExecutionOptions`](../interfaces/EngineExecutionOptions.md)

#### Returns

`void`

***

### getEnvironmentVariables()

> `private` **getEnvironmentVariables**(): `Record`\<`string`, `any`\>

Defined in: [core/config.ts:250](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/config.ts#L250)

Obtém variáveis de ambiente relevantes

#### Returns

`Record`\<`string`, `any`\>

***

### validateConfig()

> `private` **validateConfig**(`config`): `void`

Defined in: [core/config.ts:267](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/config.ts#L267)

Valida a configuração final

#### Parameters

##### config

[`EngineConfig`](../interfaces/EngineConfig.md)

#### Returns

`void`

***

### getRuntimeFilters()

> **getRuntimeFilters**(): `any`

Defined in: [core/config.ts:325](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/config.ts#L325)

Obtém filtros de runtime aplicados

#### Returns

`any`

***

### reload()

> **reload**(): `void`

Defined in: [core/config.ts:332](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/config.ts#L332)

Recarrega a configuração do arquivo

#### Returns

`void`

***

### saveDebugConfig()

> **saveDebugConfig**(`outputPath`): `void`

Defined in: [core/config.ts:339](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/config.ts#L339)

Salva a configuração atual (útil para debugging)

#### Parameters

##### outputPath

`string`

#### Returns

`void`

## Properties

### config

> `private` **config**: [`EngineConfig`](../interfaces/EngineConfig.md)

Defined in: [core/config.ts:27](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/config.ts#L27)

Configuração completa carregada e processada

***

### configFilePath

> `private` **configFilePath**: `string`

Defined in: [core/config.ts:30](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/core/config.ts#L30)

Caminho absoluto do arquivo de configuração utilizado
