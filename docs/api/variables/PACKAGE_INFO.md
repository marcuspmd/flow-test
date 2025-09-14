[**Flow Test Engine v1.0.0**](../README.md)

***

[Flow Test Engine](../globals.md) / PACKAGE\_INFO

# Variable: PACKAGE\_INFO

> `const` **PACKAGE\_INFO**: `object`

Defined in: [index.ts:136](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/index.ts#L136)

Informações do package

Metadados sobre o Flow Test Engine incluindo nome, versão e descrição.
Útil para integração em ferramentas que precisam identificar a versão.

## Type Declaration

### name

> `readonly` **name**: `"flow-test-engine"` = `"flow-test-engine"`

### version

> `readonly` **version**: `"1.0.0"` = `VERSION`

### description

> `readonly` **description**: `"A comprehensive API testing engine with directory-based execution, global variables, and priority-driven test management."` = `"A comprehensive API testing engine with directory-based execution, global variables, and priority-driven test management."`

## Example

```typescript
console.log(`Using ${PACKAGE_INFO.name} v${PACKAGE_INFO.version}`);
```
