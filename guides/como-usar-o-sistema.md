# Como usar o Flow Test Engine

Este guia mostra a forma mais rápida de instalar, configurar e executar testes, além de gerar relatórios.

## Instalação

Requisitos:

- Node.js 16+
- Docker (opcional para rodar suíte completa com httpbin)

Instale dependências:

```bash
npm install
```

## Executando testes

Rodar um arquivo YAML específico em modo desenvolvimento:

```bash
npm run dev tests/exemplos.yaml
```

Rodar via Docker (com httpbin):

```bash
npm test              # suíte completa
npm run test:verbose  # logs detalhados
npm run test:silent   # execução silenciosa
```

Opções úteis do CLI:

```bash
# Descobrir e planejar sem executar
flow-test --dry-run --detailed

# Filtrar por prioridade, suite, node ou tags
flow-test --priority critical,high
flow-test --suite "login,checkout"
flow-test --node auth-tests
flow-test --tag smoke,regression

# Usar outro arquivo de configuração
flow-test --config ./flow-test.config.yml
```

## Estrutura de testes (YAML)

Crie arquivos em `tests/`. Exemplo simples:

```yaml
suite: exemplo-basico
priority: medium
variables:
  base_url: https://httpbin.local

tests:
  - name: GET status
    request:
      method: GET
      url: "{{base_url}}/status/200"
    expect:
      status: 200
```

Variáveis suportam:

- `{{$env.VAR}}` para variáveis de ambiente
- `{{faker.person.firstName}}` com Faker.js
- `{{js:Date.now()}}` para expressões JavaScript

## Relatórios HTML

Após um run (artefato em `results/latest.json`), gere HTML:

```bash
npm run report:html
```

O relatório é salvo em `dist/report-generator/output/index.html`.

## Dicas

- Use `npm run server:docker` para subir apenas o httpbin local.
- Ajuste prioridades para rodar partes críticas rapidamente: `--priority critical,high`.
- Registre variáveis globais no `flow-test.config.yml` e importe no YAML via placeholders.

