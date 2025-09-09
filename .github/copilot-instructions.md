# Copilot Instructions — flow-test

Objetivo: Capacitar agentes de IA a trabalhar de forma produtiva neste repositório (motor de testes de API em TypeScript, dirigido por YAML), com foco na arquitetura, fluxos de desenvolvimento e padrões específicos do projeto.

## Visão geral rápida
- Runtime/linguagem: Node.js + TypeScript (strict). Execução via ts-node.
- Propósito: Executar “flows” de testes de API declarados em YAML com interpolação de variáveis, encadeamento, asserções e captura de dados.
- Status atual: O carregamento da suíte YAML e o loop de etapas existem; a lógica de execução HTTP/assert/capture ainda não foi implementada (ver comentários “LÓGICA PRINCIPAL VIRÁ AQUI”).

## Arquitetura e arquivos-chave
- `src/main.ts`: ponto de entrada CLI.
  - Usa `process.argv[2]` como caminho do YAML; default `./tests/start-flow.yaml`.
  - Verifica existência do arquivo, instancia `Runner` e chama `run()`.
- `src/core/runner.core.ts`: orquestrador de execução.
  - Carrega YAML com `js-yaml`, popula `this.suite` e `this.variables` (variáveis iniciais de `suite.variables`).
  - `run()` itera `suite.steps` e registra logs; TO‑DO: interpolar variáveis, chamar HTTP, validar, capturar.
- `src/types/common.types.ts`: contrato entre YAML e código.
  - Principais tipos: `TestSuite`, `TestStep`, `RequestDetails`, `Assertions`, `AssertionChecks`.
- Exemplo de suíte: `tests/start-flow.yaml` (usa httpbin.org; demonstra POST com captura e GET com headers interpolados).

## Fluxos de desenvolvimento
- Rodar:
  - `npm start` → `ts-node src/main.ts` usa `./tests/start-flow.yaml`.
  - `npm start <arquivo.yaml>` para rodar outro arquivo.
- Build: `npm run build` → emite JS em `dist/` (CommonJS, target ES6).
- Node recomendado: 18+.

## Padrões do YAML (contrato)
- Raiz (`TestSuite`): `suite_name`, `base_url?`, `variables?`, `steps[]`.
- Passo (`TestStep`): `name`, `request{ method|url|headers?|body? }`, `assert?{ status_code?, body? }`, `capture?{ var: expr }`.
- Interpolação: `{{nome_da_variavel}}` em URL/headers/body com origem em `suite.variables` + variáveis capturadas.
- `base_url`: prefixe quando `request.url` for relativo (ex.: começa com `/`).
- `capture`: expressões JMESPath sobre um objeto resposta do tipo `{ status, headers, body }`.

## Pontos de integração (bibliotecas)
- HTTP: `axios` (não conectado ainda no código; planeje usar `axios({ method, url, headers, data })`).
- YAML: `js-yaml` para carregar suites.
- Extração: `jmespath.search(obj, expr)` para capturas.

## Diretrizes para implementar a lógica pendente (em `Runner.run`)
1) Interpolar variáveis recursivamente em `request` (URL/headers/body).
2) Resolver URL com `base_url` quando relativo.
3) Executar requisição com `axios` e obter `{ status, headers, data }` (nomeie `data` como `body` para uniformizar).
4) Asserções: se `assert.status_code` existir, comparar com `status`. Em falha: log detalhado e abortar execução (exit code ≠ 0).
5) Captura: para cada `capture[k]`, avaliar JMESPath sobre `{ status, headers, body }` e gravar em `this.variables[k]` (pode sobrescrever).
6) Logar cada etapa: request “efetiva” (método/URL) e resumo da resposta.

## Convenções e nuances
- Logs padronizados existentes: `[INFO]`, `[ERRO]`, `[ETAPA x/y]` — preserve o estilo.
- Tipagem é estrita; mantenha `RequestDetails.method` no union literal (`"GET"|"POST"|...`).
- Não introduza novas dependências sem necessidade; o trio `axios/js-yaml/jmespath` cobre o escopo atual.

## Exemplos concretos no repo
- `tests/start-flow.yaml`:
  - Captura `captured_username: "body.json.name"` no POST e usa depois em header `X-User-Name: "{{captured_username}}"` no GET.
  - Simula token via `auth_token` e o usa em `Authorization`.

—
Dúvidas/validações:
- Confirmar: abortar ao primeiro erro de asserção? (assumido “sim”).
- Confirmar: regra de prefixo com `base_url` apenas quando `url` é relativo (assumido “sim”).
- Deseja logs verbose/ocultáveis por flag? (atual não há flags CLI).
