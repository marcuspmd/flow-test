# Copilot Instructions — flow-test# Copilot Instructions — flow-test



Objetivo: Capacitar agentes de IA a trabalhar produtivamente neste repositório - um motor de testes de API em TypeScript que executa flows declarativos em YAML com recursos avançados de automação, relatórios e integração.Objetivo: Capacitar agentes de IA a trabalhar de forma produtiva neste repositório (motor de testes de API em TypeScript, dirigido por YAML), com foco na arquitetura, fluxos de desenvolvimento e padrões específicos do projeto.



## Visão geral rápida## Visão geral rápida

- **Runtime**: Node.js + TypeScript (strict mode), execução via ts-node ou CLI compilado- Runtime/linguagem: Node.js + TypeScript (strict). Execução via ts-node.

- **Propósito**: Motor de testes completo com suporte a chains de requests, interpolação de variáveis, asserções avançadas, prioridades, dependências e geração de relatórios- Propósito: Executar “flows” de testes de API declarados em YAML com interpolação de variáveis, encadeamento, asserções e captura de dados.

- **Status**: Sistema maduro e funcional com arquitetura modular baseada em services- Status atual: O carregamento da suíte YAML e o loop de etapas existem; a lógica de execução HTTP/assert/capture ainda não foi implementada (ver comentários “LÓGICA PRINCIPAL VIRÁ AQUI”).



## Arquitetura e componentes-chave## Arquitetura e arquivos-chave

- **CLI**: `src/cli.ts` - Interface completa com flags (`--verbose`, `--dry-run`, `--priority`, `--tag`)

- **Engine**: `src/core/engine.ts` - Orquestrador principal que coordena discovery, execution, reporting

- **Services**: Camada modular em `src/services/` com responsabilidades específicas:

  - `execution.ts` - Orquestrador principal de execução de testes
  - `http.service.ts` - Execução HTTP com axios + tratamento de erros
  - `assertion.service.ts` - Validação avançada (equals, contains, regex, type checks)
  - `variable.service.ts` - Interpolação com suporte a Faker.js e env vars
  - `capture.service.ts` - Extração de dados via JMESPath
  - `global-registry.service.ts` - Variáveis globais entre suites

- **Tipos**: `src/types/common.types.ts` - Contrato entre YAML e código
  - Principais tipos: `TestSuite`, `TestStep`, `RequestDetails`, `Assertions`, `AssertionChecks`

  - `reporting.service.ts` - Geração de relatórios JSON/HTML- Exemplo de suíte: `tests/start-flow.yaml` (usa httpbin.org; demonstra POST com captura e GET com headers interpolados).



## Fluxos de desenvolvimento críticos## Fluxos de desenvolvimento

```bash- Rodar:

# Desenvolvimento rápido  - `npm start` → `ts-node src/main.ts` usa `./tests/start-flow.yaml`.

npm run dev tests/file.yaml  - `npm start <arquivo.yaml>` para rodar outro arquivo.

- Build: `npm run build` → emite JS em `dist/` (CommonJS, target ES6).

# Test completo com mock server- Node recomendado: 18+.

npm test  # import swagger → run tests → cleanup

## Padrões do YAML (contrato)

# Filtros por prioridade/tags- Raiz (`TestSuite`): `suite_name`, `base_url?`, `variables?`, `steps[]`.

npm run test:critical- Passo (`TestStep`): `name`, `request{ method|url|headers?|body? }`, `assert?{ status_code?, body? }`, `capture?{ var: expr }`.

npm run test:verbose- Interpolação: `{{nome_da_variavel}}` em URL/headers/body com origem em `suite.variables` + variáveis capturadas.

- `base_url`: prefixe quando `request.url` for relativo (ex.: começa com `/`).

# Relatórios HTML- `capture`: expressões JMESPath sobre um objeto resposta do tipo `{ status, headers, body }`.

npm run report:html

```## Pontos de integração (bibliotecas)

- HTTP: `axios` (não conectado ainda no código; planeje usar `axios({ method, url, headers, data })`).

## Estrutura YAML (contrato)- YAML: `js-yaml` para carregar suites.

Raiz (`TestSuite`): `node_id`, `suite_name`, `base_url?`, `variables?`, `exports?`, `metadata?`, `steps[]`- Extração: `jmespath.search(obj, expr)` para capturas.



```yaml## Diretrizes para implementar a lógica pendente (em `Runner.run`)

# Metadados avançados1) Interpolar variáveis recursivamente em `request` (URL/headers/body).

metadata:2) Resolver URL com `base_url` quando relativo.

  priority: "critical"  # critical|high|medium|low  3) Executar requisição com `axios` e obter `{ status, headers, data }` (nomeie `data` como `body` para uniformizar).

  tags: ["smoke", "auth"]4) Asserções: se `assert.status_code` existir, comparar com `status`. Em falha: log detalhado e abortar execução (exit code ≠ 0).

  dependencies: ["auth-setup"]5) Captura: para cada `capture[k]`, avaliar JMESPath sobre `{ status, headers, body }` e gravar em `this.variables[k]` (pode sobrescrever).

6) Logar cada etapa: request “efetiva” (método/URL) e resumo da resposta.

# Variáveis locais + exports globais

variables:## Convenções e nuances

  user_id: 123- Logs padronizados existentes: `[INFO]`, `[ERRO]`, `[ETAPA x/y]` — preserve o estilo.

exports: ["auth_token", "user_data"]- Tipagem é estrita; mantenha `RequestDetails.method` no union literal (`"GET"|"POST"|...`).

- Não introduza novas dependências sem necessidade; o trio `axios/js-yaml/jmespath` cobre o escopo atual.

# Steps com recursos avançados

steps:## Exemplos concretos no repo

  - name: "Login and capture token"- `tests/start-flow.yaml`:

    request:  - Captura `captured_username: "body.json.name"` no POST e usa depois em header `X-User-Name: "{{captured_username}}"` no GET.

      method: POST  - Simula token via `auth_token` e o usa em `Authorization`.

      url: "/auth/login"

      body: { email: "{{$faker.internet.email}}" }—

    capture:Dúvidas/validações:

      auth_token: "body.token"  # JMESPath- Confirmar: abortar ao primeiro erro de asserção? (assumido “sim”).

    assert:- Confirmar: regra de prefixo com `base_url` apenas quando `url` é relativo (assumido “sim”).

      status_code: 200- Deseja logs verbose/ocultáveis por flag? (atual não há flags CLI).

      body:
        token: { exists: true, type: "string" }
```

## Padrões de integração específicos
- **Interpolação**: `{{var}}`, `{{$env.API_KEY}}`, `{{$faker.name.firstName}}`
- **Capture/Export**: Dados capturados ficam disponíveis globalmente como `suite-name.var-name`
- **Dependencies**: Suites podem declarar dependências que são executadas primeiro
- **Discovery**: Auto-descoberta em `**/*.yaml` com exclusões configuráveis
- **Prioridades**: Sistema de níveis com fail-fast opcional em `critical/high`

## Bibliotecas e convenções
- **HTTP**: axios configurado em `HttpService` com timeouts e retry logic
- **YAML**: js-yaml com validação de schema
- **JMESPath**: para extrações complexas de resposta
- **Faker.js**: integrado para dados de teste dinâmicos
- **Reporting**: Templates com Tailwind CSS para HTML reports

## Debugging e troubleshooting
- Use `--dry-run` para planejar execução sem executar
- `--verbose` mostra details de request/response
- Logs estruturados com níveis (INFO, ERROR, DEBUG)
- Relatórios em `results/` com artifacts JSON detalhados
- Mock server em `mock-server.js` para testes isolados