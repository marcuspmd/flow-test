# Propriedades do Flow Test Engine

## Índice

### Estrutura e Configuração
- [1. Estrutura Base do YAML (TestSuite)](#1-estrutura-base-do-yaml-testsuite)
- [2. Propriedades dos Steps (TestStep)](#2-propriedades-dos-steps-teststep)
- [16. Execution Modes](#16-execution-modes)
- [17. Priority Levels](#17-priority-levels)
- [18. Tags](#18-tags)

### Variáveis e Interpolação
- [3. Sistema de Interpolação de Variáveis](#3-sistema-de-interpolação-de-variáveis)
- [14. Escopo de Variáveis](#14-escopo-de-variáveis)

### Validação e Assertions
- [4. Assertions (Validações)](#4-assertions-validações)
- [5. Extração de Dados - Capture (JMESPath)](#5-extração-de-dados---capture-jmespath)

### Input e Interação
- [6. Input Interativo (InputConfig)](#6-input-interativo-inputconfig)

### Controle de Fluxo
- [7. Iteração (IterationConfig)](#7-iteração-iterationconfig)
- [8. Cenários Condicionais](#8-cenários-condicionais-conditionalscenario)
- [9. Step Call Cross-Suite](#9-step-call-cross-suite-stepcallconfig)

### Lifecycle Hooks (NOVO v2.0)
- [9.1. Sistema de Lifecycle Hooks](#91-sistema-de-lifecycle-hooks)
- [9.2. Hook Actions (Ações)](#92-hook-actions-ações)
- [9.3. Hook Points (Pontos de Execução)](#93-hook-points-pontos-de-execução)
- [9.4. Exemplos Práticos de Hooks](#94-exemplos-práticos-de-hooks)

### Configurações Avançadas
- [10. Tipos de Dados e Valores Especiais](#10-tipos-de-dados-e-valores-especiais)
- [11. Configuração de Retry](#11-configuração-de-retry)
- [12. Timeouts](#12-timeouts)
- [13. Resolução de URLs](#13-resolução-de-urls)
- [14. Certificados Digitais (Client Certificates)](#14-certificados-digitais-client-certificates)
- [15. Response Object Structure](#15-response-object-structure)

### Escopo e Variáveis
- [16. Escopo de Variáveis](#16-escopo-de-variáveis)

### Execução
- [17. Execution Modes](#17-execution-modes)
- [18. Priority Levels](#18-priority-levels)
- [19. Tags](#19-tags)

### Exemplos e Troubleshooting
- [20. Exemplos Práticos Completos](#20-exemplos-práticos-completos)
- [21. Guia de Troubleshooting](#21-guia-de-troubleshooting)
- [22. Limitações Conhecidas](#22-limitações-conhecidas)

---

## Descrição
Este documento descreve o processo de documentação abrangente de todas as propriedades técnicas do projeto Flow Test Engine, um motor de testes de API baseado em YAML que executa flows declarativos com recursos avançados de automação, relatórios e integração.

## Objetivo
Criar uma documentação técnica completa que cubra todas as propriedades, tipos de dados, capacidades de interpolação, operadores, e funcionalidades do Flow Test Engine, facilitando o desenvolvimento, manutenção e uso correto do framework.

## Contexto do Projeto
- **Framework**: Flow Test Engine (TypeScript/Node.js)
- **Propósito**: Motor de testes de API com execução declarativa via YAML
- **Arquitetura**: Services modulares com suporte a interpolação avançada, asserções, captura de dados e relatórios
- **Formato Principal**: YAML para definição de suites de teste

## Referência Completa de Propriedades YAML

### 1. Estrutura Base do YAML (TestSuite)

| Propriedade | Tipo | Obrigatório | Descrição | Exemplo |
|-------------|------|-------------|-----------|---------|
| `node_id` | `string` | ✅ Sim | Identificador único da suíte (kebab-case) | `"user-auth-test"` |
| `suite_name` | `string` | ✅ Sim | Nome descritivo da suíte de testes | `"User Authentication Tests"` |
| `description` | `string` | ❌ Não | Descrição detalhada da suíte | `"Complete auth flow testing"` |
| `base_url` | `string` | ❌ Não | URL base para requests relativos | `"{{api_base_url}}"` ou `"https://api.example.com"` |
| `execution_mode` | `"sequential" \| "parallel"` | ❌ Não | Modo de execução (padrão: `sequential`) | `"sequential"` |
| `variables` | `Record<string, any>` | ❌ Não | Variáveis locais da suíte | `{user_id: 123, api_key: "abc"}` |
| `exports` | `string[]` | ❌ Não | Variáveis exportadas globalmente | `["auth_token", "user_id"]` |
| `exports_optional` | `string[]` | ❌ Não | Exports opcionais (sem warnings) | `["optional_var"]` |
| `depends` | `FlowDependency[]` | ❌ Não | Dependências entre suítes | Ver seção de dependências |
| `steps` | `TestStep[]` | ✅ Sim | Array de passos de teste | Ver seção de steps |
| `metadata` | `object` | ❌ Não | Metadados da suíte | Ver seção de metadata |

#### 1.1 Metadata da Suite

| Propriedade | Tipo | Descrição | Valores Aceitos |
|-------------|------|-----------|-----------------|
| `priority` | `string` | Nível de prioridade | `"critical"`, `"high"`, `"medium"`, `"low"` |
| `tags` | `string[]` | Tags para categorização | `["smoke", "regression", "auth"]` |
| `timeout` | `number` | Timeout geral em ms | `30000` (30 segundos) |
| `estimated_duration_ms` | `number` | Duração estimada em ms | `5000` |
| `requires_user_input` | `boolean` | Indica se requer input interativo | `true` ou `false` |

#### 1.2 Flow Dependency (FlowDependency)

| Propriedade | Tipo | Obrigatório | Descrição | Exemplo |
|-------------|------|-------------|-----------|---------|
| `path` | `string` | Condicional* | Caminho para o arquivo de dependência | `"./auth/login.yaml"` ou `"common/setup.yaml"` |
| `path_type` | `"relative" \| "absolute"` | ❌ Não | Tipo de resolução de caminho (padrão: `relative`) | `"relative"` ou `"absolute"` |
| `node_id` | `string` | Condicional* | ID do nó para referência direta | `"auth-setup"` |
| `required` | `boolean` | ❌ Não | Se a dependência é obrigatória | `true` |
| `cache` | `boolean \| number` | ❌ Não | Cache: `true`, `false` ou TTL em segundos | `true` ou `300` (5 min) |
| `condition` | `string` | ❌ Não | Condição JMESPath para execução | `"environment == 'test'"` |
| `variables` | `Record<string, any>` | ❌ Não | Variáveis para sobrescrever | `{test_mode: true}` |
| `retry` | `object` | ❌ Não | Configuração de retry | `{max_attempts: 3, delay_ms: 1000}` |

> **Nota:** Deve fornecer `path` OU `node_id`, não ambos.

---

### 2. Propriedades dos Steps (TestStep)

| Propriedade | Tipo | Obrigatório | Descrição | Exemplo |
|-------------|------|-------------|-----------|---------|
| `name` | `string` | ✅ Sim | Nome descritivo do passo | `"Login user"` |
| `step_id` | `string` | ❌ Não | Identificador único do passo | `"login-step"` |
| `request` | `RequestDetails` | Condicional* | Configuração da requisição HTTP | Ver seção Request |
| `assert` | `Assertions` | ❌ Não | Regras de validação | Ver seção Assertions |
| `capture` | `Record<string, string>` | ❌ Não | Extração de dados (JMESPath) | `{token: "body.access_token"}` |
| `input` | `InputConfig \| InputConfig[]` | ❌ Não | Entrada interativa do usuário | Ver seção Input |
| `call` | `StepCallConfig` | ❌ Não | Chamada cross-suite | Ver seção Call |
| `iterate` | `IterationConfig` | ❌ Não | Execução em loop | Ver seção Iterate |
| `scenarios` | `ConditionalScenario[]` | ❌ Não | Cenários condicionais | Ver seção Scenarios |
| `continue_on_failure` | `boolean` | ❌ Não | Continuar se o passo falhar | `true` ou `false` |
| `metadata` | `TestStepMetadata` | ❌ Não | Metadados do passo | Ver seção Metadata |

> **Nota:** `request` é opcional apenas se o step contém apenas `input` ou `call`.

#### 2.1 Request Details (RequestDetails)

| Propriedade | Tipo | Obrigatório | Descrição | Valores/Exemplo |
|-------------|------|-------------|-----------|-----------------|
| `method` | `string` | ✅ Sim | Método HTTP | `"GET"`, `"POST"`, `"PUT"`, `"DELETE"`, `"PATCH"`, `"HEAD"`, `"OPTIONS"` |
| `url` | `string` | ✅ Sim | URL (absoluta ou relativa) | `"/api/users"` ou `"https://api.example.com/users"` |
| `headers` | `Record<string, string>` | ❌ Não | Cabeçalhos HTTP | `{"Content-Type": "application/json", "Authorization": "Bearer {{token}}"}` |
| `body` | `any` | ❌ Não | Corpo da requisição (POST/PUT/PATCH) | `{name: "John", email: "john@example.com"}` |
| `params` | `Record<string, any>` | ❌ Não | Parâmetros de query string | `{page: 1, limit: 10}` |
| `timeout` | `number` | ❌ Não | Timeout da requisição em ms | `30000` |

#### 2.2 Step Metadata (TestStepMetadata)

| Propriedade | Tipo | Descrição | Exemplo |
|-------------|------|-----------|---------|
| `priority` | `string` | Prioridade do passo | `"critical"`, `"high"`, `"medium"`, `"low"` |
| `tags` | `string[]` | Tags para categorização | `["api", "validation"]` |
| `timeout` | `number` | Timeout do passo em ms | `10000` |
| `retry` | `object` | Configuração de retry | `{max_attempts: 3, delay_ms: 1000}` |
| `depends_on` | `string[]` | IDs de steps que devem executar antes | `["setup-step", "auth-step"]` |
| `description` | `string` | Descrição do que o passo faz | `"Creates user account"` |
| `skip` | `string` | Condição para pular o step | `"{{environment}} !== 'prod'"` |

---

### 3. Sistema de Interpolação de Variáveis

#### 3.1 Sintaxe e Fontes

| Tipo | Sintaxe | Descrição | Exemplo |
|------|---------|-----------|---------|
| **Variável básica** | `{{variable}}` | Variável local ou capturada | `{{user_id}}`, `{{auth_token}}` |
| **Variável aninhada** | `{{object.field}}` | Acesso a campos aninhados | `{{user.profile.name}}` |
| **Variável de array** | `{{array[index]}}` | Acesso por índice | `{{items[0].id}}` |
| **Variável global** | `{{suite-id.variable}}` | Variável exportada de outra suite | `{{auth-login.auth_token}}` |
| **Ambiente** | `{{$env.VAR_NAME}}` | Variável de ambiente (prefixo `FLOW_TEST_`) | `{{$env.API_KEY}}` → lê `FLOW_TEST_API_KEY` |
| **Faker.js** | `{{$faker.category.method}}` | Dados fake dinâmicos | `{{$faker.internet.email}}`, `{{$faker.person.firstName}}` |
| **JavaScript** | `{{$js:expression}}` | Expressão JavaScript | `{{$js:Date.now()}}`, `{{$js:Math.random()}}` |

#### 3.1.1 Variáveis de Ambiente (.env)

O Flow Test Engine suporta **carregamento automático** de arquivos `.env` através do `flow-test.config.yml`:

**Configuração no flow-test.config.yml:**
```yaml
globals:
  env_files:
    - .env              # Carregado primeiro
    - .env.local        # Sobrescreve valores do .env
    - .env.test         # Específico para testes
```

**Regras Importantes:**
- ✅ Variáveis devem começar com `FLOW_TEST_` (ex: `FLOW_TEST_API_KEY`)
- ✅ Arquivos carregados em ordem - últimos sobrescrevem primeiros
- ✅ Caminhos relativos à raiz do projeto
- ✅ Continua execução mesmo se arquivo não existir (com warning)
- ✅ Uso no YAML: `{{$env.API_KEY}}` (sem o prefixo `FLOW_TEST_`)

**Exemplo Completo:**

`.env`:
```bash
FLOW_TEST_API_BASE_URL=https://api.example.com
FLOW_TEST_OAUTH_USERNAME=client_id_123
FLOW_TEST_OAUTH_PASSWORD=client_secret_xyz
FLOW_TEST_PEM_PASSWORD=cert_password
```

`suite.yaml`:
```yaml
base_url: "{{$env.API_BASE_URL}}"
certificate:
  cert_path: "./certs/client.pem"
  passphrase: "{{$env.PEM_PASSWORD}}"  # Lê FLOW_TEST_PEM_PASSWORD

steps:
  - name: "Login"
    request:
      url: "/auth/login"
      headers:
        Authorization: "Basic {{$js:Buffer.from('{{$env.OAUTH_USERNAME}}:{{$env.OAUTH_PASSWORD}}').toString('base64')}}"
```

📖 **Guia Completo:** [guides/10.environment-variables-guide.md](guides/10.environment-variables-guide.md)

#### 3.2 Faker.js - Categorias Principais

| Categoria | Exemplos de Métodos | Resultado |
|-----------|---------------------|-----------|
| `$faker.person` | `firstName`, `lastName`, `fullName` | Nomes de pessoas |
| `$faker.internet` | `email`, `url`, `userName`, `password` | Dados de internet |
| `$faker.phone` | `number`, `imei` | Números de telefone |
| `$faker.location` | `city`, `country`, `streetAddress` | Dados geográficos |
| `$faker.commerce` | `productName`, `price`, `department` | Dados comerciais |
| `$faker.company` | `name`, `catchPhrase`, `bs` | Dados de empresa |
| `$faker.string` | `uuid`, `alphanumeric`, `numeric` | Strings especiais |
| `$faker.number` | `int`, `float`, `binary` | Números |
| `$faker.date` | `past`, `future`, `recent`, `soon` | Datas |
| `$faker.lorem` | `word`, `words`, `sentence`, `paragraph` | Texto lorem ipsum |

#### 3.3 JavaScript Expressions

| Caso de Uso | Expressão | Resultado |
|-------------|-----------|-----------|
| Timestamp atual | `{{$js:Date.now()}}` | `1704110400000` |
| Data ISO | `{{$js:new Date().toISOString()}}` | `"2024-01-01T12:00:00.000Z"` |
| Número aleatório | `{{$js:Math.random()}}` | `0.123456789` |
| Arredondamento | `{{$js:Math.round({{price}} * 1.1)}}` | Valor arredondado |
| Base64 encode | `{{$js:Buffer.from('text').toString('base64')}}` | `"dGV4dA=="` |
| Cálculo | `{{$js:{{quantity}} * {{price}}}}` | Resultado do cálculo |

---

### 4. Assertions (Validações)

#### 4.1 Estrutura de Assertions

| Propriedade | Tipo | Descrição | Exemplo |
|-------------|------|-----------|---------|
| `status_code` | `number \| AssertionChecks` | Validação de código HTTP | `200` ou `{equals: 200}` |
| `body` | `Record<string, AssertionChecks>` | Validações do corpo da resposta | Ver tabela de operadores |
| `headers` | `Record<string, AssertionChecks>` | Validações de headers | `{"content-type": {contains: "json"}}` |
| `response_time_ms` | `object` | Validação de tempo de resposta | `{less_than: 2000, greater_than: 10}` |
| `custom` | `Array<CustomAssertion>` | Asserções customizadas | Ver seção Custom |

#### 4.2 Operadores de Asserção (AssertionChecks)

| Operador | Tipo | Descrição | Exemplo | Uso |
|----------|------|-----------|---------|-----|
| `equals` | `any` | Igualdade exata | `{equals: 200}` | Comparação de valores |
| `not_equals` | `any` | Diferença | `{not_equals: null}` | Verificar que não é igual |
| `contains` | `any` | Contém substring/valor | `{contains: "success"}` | Strings, arrays |
| `not_contains` | `any` | Não contém | `{not_contains: "error"}` | Strings, arrays |
| `greater_than` | `number` | Maior que | `{greater_than: 0}` | Comparação numérica |
| `less_than` | `number` | Menor que | `{less_than: 1000}` | Comparação numérica |
| `greater_than_or_equal` | `number` | Maior ou igual | `{greater_than_or_equal: 1}` | Comparação numérica |
| `less_than_or_equal` | `number` | Menor ou igual | `{less_than_or_equal: 100}` | Comparação numérica |
| `regex` | `string` | Padrão regex | `{regex: "^[a-z]+$"}` | Validação de formato |
| `pattern` | `string` | Alias para regex | `{pattern: "\\d{3}"}` | Validação de formato |
| `exists` | `boolean` | Campo existe | `{exists: true}` | Verificar presença |
| `not_exists` | `boolean` | Campo não existe | `{exists: false}` | Verificar ausência |
| `type` | `string` | Tipo do valor | `{type: "string"}` | Validação de tipo |
| `length` | `object` | Validação de tamanho | `{length: {equals: 5}}` | Arrays, strings |
| `minLength` | `number` | Tamanho mínimo | `{minLength: 3}` | Arrays, strings |
| `notEmpty` | `boolean` | Não vazio | `{notEmpty: true}` | Qualquer tipo |
| `in` | `any[]` | Valor está na lista | `{in: ["active", "pending"]}` | Verificar inclusão |
| `not_in` | `any[]` | Valor não está na lista | `{not_in: ["deleted", "banned"]}` | Verificar exclusão |

#### 4.3 Tipos Suportados

| Tipo | Descrição | Exemplo de Valor |
|------|-----------|------------------|
| `"string"` | Texto | `"Hello World"` |
| `"number"` | Número (int ou float) | `123`, `45.67` |
| `"boolean"` | Booleano | `true`, `false` |
| `"array"` | Lista | `[1, 2, 3]` |
| `"object"` | Objeto | `{key: "value"}` |
| `"null"` | Valor nulo | `null` |

#### 4.4 Validação de Length

```yaml
# Length com operators aninhados
body:
  items:
    length:
      equals: 10              # Exatamente 10 itens
      greater_than: 0         # Mais de 0
      less_than: 100          # Menos de 100
      greater_than_or_equal: 5  # 5 ou mais
      less_than_or_equal: 50    # 50 ou menos
```

#### 4.5 Custom Assertions

| Propriedade | Tipo | Obrigatório | Descrição |
|-------------|------|-------------|-----------|
| `name` | `string` | ✅ Sim | Nome da asserção |
| `condition` | `string` | ✅ Sim | Expressão JMESPath ou JavaScript |
| `message` | `string` | ❌ Não | Mensagem de erro customizada |

```yaml
custom:
  - name: "Valid user ID format"
    condition: "body.user.id && typeof body.user.id === 'number'"
    message: "User ID must be a number"
```

---

### 5. Extração de Dados - Capture (JMESPath)

#### 5.1 Sintaxe Básica

| Padrão | Descrição | Exemplo Expression | Resultado |
|--------|-----------|-------------------|-----------|
| Campo simples | Acesso direto | `body.token` | Valor de `response.body.token` |
| Campo aninhado | Navegação profunda | `body.user.profile.name` | Valor aninhado |
| Array por índice | Acesso posicional | `body.items[0]` | Primeiro item |
| Array - último item | Índice negativo | `body.items[-1]` | Último item |
| Projeção | Mapear array | `body.data[*].id` | Array de todos os IDs |
| Resposta completa | Capturar tudo | `@` | Objeto de resposta inteiro |
| Status code | Código HTTP | `status` ou `status_code` | `200`, `404`, etc. |
| Headers | Cabeçalhos | `headers.Content-Type` | Valor do header |

#### 5.2 Operações Avançadas JMESPath

| Operação | Sintaxe | Descrição | Exemplo |
|----------|---------|-----------|---------|
| **Filtro** | `array[?condition]` | Filtrar elementos | `items[?status=='active']` |
| **Pipe** | `expression \| function` | Aplicar função | `items \| length(@)` |
| **Multi-select** | `{key1: expr1, key2: expr2}` | Criar objeto | `{id: body.id, name: body.name}` |
| **Flatten** | `array[]` | Achatar array aninhado | `categories[].products[]` |
| **Sort** | `sort_by(array, &field)` | Ordenar por campo | `sort_by(items, &price)` |
| **Contains** | `contains(haystack, needle)` | Verificar inclusão | `contains(tags, 'urgent')` |
| **Length** | `length(array)` | Contar elementos | `length(items)` |
| **Max/Min** | `max(array)` / `min(array)` | Valor máximo/mínimo | `max(prices[*].value)` |

#### 5.3 Exemplos Práticos de Capture

```yaml
capture:
  # Simples
  token: "body.access_token"
  user_id: "body.user.id"

  # Arrays
  first_item_name: "body.items[0].name"
  all_ids: "body.data[*].id"

  # Filtros
  active_users: "body.users[?status=='active']"
  premium_products: "body.products[?price > `100`]"

  # Projeções customizadas
  user_list: "body.users[*].{id: id, name: name, email: email}"

  # Funções
  total_items: "length(body.items)"
  max_price: "max(body.products[*].price)"

  # Ordenação
  sorted_by_date: "sort_by(body.events, &timestamp)"

  # Resposta completa para debug
  full_response: "@"
```

---

### 6. Input Interativo (InputConfig)

#### 6.1 Propriedades Base

| Propriedade | Tipo | Obrigatório | Descrição | Exemplo |
|-------------|------|-------------|-----------|---------|
| `prompt` | `string` | ✅ Sim | Mensagem exibida ao usuário | `"Enter your API key:"` |
| `variable` | `string` | ✅ Sim | Nome da variável para armazenar | `"api_key"` |
| `type` | `string` | ✅ Sim | Tipo de input | Ver tabela de tipos |
| `description` | `string` | ❌ Não | Descrição detalhada | `"API key for authentication"` |
| `default` | `any` | ❌ Não | Valor padrão | `"default_value"` |
| `placeholder` | `string` | ❌ Não | Texto placeholder | `"Enter value here..."` |
| `required` | `boolean` | ❌ Não | Se o input é obrigatório | `true` |
| `style` | `string` | ❌ Não | Estilo visual | `"simple"`, `"boxed"`, `"highlighted"` |
| `timeout_seconds` | `number` | ❌ Não | Timeout antes de usar default | `30` |
| `condition` | `string` | ❌ Não | Condição JMESPath para exibir | `"{{status}} == 200"` |
| `ci_default` | `any` | ❌ Não | Valor em ambientes CI/CD | `"ci_value"` |
| `validation` | `InputValidationConfig` | ❌ Não | Regras de validação | Ver seção de validação |
| `dynamic` | `InputDynamicConfig` | ❌ Não | Processamento dinâmico | Ver seção dinâmica |
| `options` | `Array \| string` | Condicional* | Opções para select/multiselect | Ver seção de options |

> **Nota:** `options` é obrigatório para tipos `select` e `multiselect`.

#### 6.2 Tipos de Input

| Tipo | Descrição | Use Case | Exemplo |
|------|-----------|----------|---------|
| `text` | Entrada de texto simples | Nomes, IDs | `"Enter username"` |
| `password` | Texto mascarado | Senhas, tokens | `"Enter API key"` |
| `number` | Apenas números | Quantidades, IDs | `"Enter user ID"` |
| `email` | Email com validação | Endereços de email | `"Enter email address"` |
| `url` | URL com validação | Links, endpoints | `"Enter API endpoint"` |
| `select` | Seleção única | Escolher uma opção | `"Select environment"` |
| `multiselect` | Seleção múltipla | Escolher várias opções | `"Select features"` |
| `confirm` | Confirmação sim/não | Ações destrutivas | `"Delete user?"` |
| `multiline` | Texto multilinha | Descrições, JSON | `"Enter JSON payload"` |

#### 6.3 Options para Select

```yaml
# Array estático
input:
  type: select
  options:
    - {value: "dev", label: "Development"}
    - {value: "prod", label: "Production"}

# De variável capturada
input:
  type: select
  options: "{{users_list}}"  # Deve ser array de objetos
  value_path: "id"           # Campo para o valor
  label_path: "name"         # Campo para o label

# Expressão JMESPath
input:
  type: select
  options: "{{users[*].{value: id, label: name}}}"
```

#### 6.4 Input Validation

| Propriedade | Tipo | Descrição | Exemplo |
|-------------|------|-----------|---------|
| `min_length` | `number` | Tamanho mínimo | `5` |
| `max_length` | `number` | Tamanho máximo | `100` |
| `pattern` | `string` | Regex de validação | `"^[a-zA-Z0-9]+$"` |
| `min` | `number \| string` | Valor mínimo (números) | `0` |
| `max` | `number \| string` | Valor máximo (números) | `100` |
| `options` | `Array \| string` | Valores permitidos | `[{value: "opt1"}]` |
| `custom_validation` | `string` | JavaScript customizado | `"value.length > 3"` |
| `expressions` | `Array` | Validações dinâmicas | Ver seção expressions |

#### 6.5 Input Dynamic Config

| Propriedade | Tipo | Descrição |
|-------------|------|-----------|
| `scope` | `"runtime" \| "suite" \| "global"` | Escopo padrão das variáveis derivadas |
| `capture` | `Record<string, string>` | Capturas JMESPath do contexto |
| `computed` | `Record<string, string>` | Variáveis computadas (JavaScript) |
| `reevaluate` | `DynamicVariableDefinition[]` | Definições para reavaliação |
| `exports` | `string[]` | Variáveis para exportar globalmente |
| `persist_to_global` | `boolean` | Persistir todas derivadas no registry global |

---

### 7. Iteração (IterationConfig)

#### 7.1 Array Iteration

| Propriedade | Tipo | Obrigatório | Descrição | Exemplo |
|-------------|------|-------------|-----------|---------|
| `over` | `string` | ✅ Sim | Expressão para o array | `"{{test_users}}"` |
| `as` | `string` | ✅ Sim | Nome da variável do item | `"user"` |

```yaml
steps:
  - name: "Process user {{user.name}}"
    iterate:
      over: "{{test_users}}"
      as: "user"
    request:
      method: POST
      url: "/users/{{user.id}}"
      body:
        name: "{{user.name}}"
        email: "{{user.email}}"
```

#### 7.2 Range Iteration

| Propriedade | Tipo | Obrigatório | Descrição | Exemplo |
|-------------|------|-------------|-----------|---------|
| `range` | `string` | ✅ Sim | Range no formato `"start..end"` | `"1..10"` |
| `as` | `string` | ✅ Sim | Nome da variável do índice | `"page"` |

```yaml
steps:
  - name: "Test page {{page}}"
    iterate:
      range: "1..5"
      as: "page"
    request:
      method: GET
      url: "/items?page={{page}}"
```

#### 7.3 Iteration Context (disponível durante iteração)

| Variável | Tipo | Descrição |
|----------|------|-----------|
| `{{as_variable}}` | `any` | Valor atual (item ou índice) |
| `_iteration.index` | `number` | Índice atual (0-based) |
| `_iteration.isFirst` | `boolean` | Se é a primeira iteração |
| `_iteration.isLast` | `boolean` | Se é a última iteração |

---

### 8. Cenários Condicionais (ConditionalScenario)

#### 8.1 Estrutura

| Propriedade | Tipo | Obrigatório | Descrição |
|-------------|------|-------------|-----------|
| `name` | `string` | ❌ Não | Nome descritivo do cenário |
| `condition` | `string` | ✅ Sim | Expressão JMESPath |
| `then` | `object` | ❌ Não | Ações se condição verdadeira |
| `else` | `object` | ❌ Não | Ações se condição falsa |

#### 8.2 Ações em Then/Else

| Propriedade | Tipo | Descrição |
|-------------|------|-----------|
| `assert` | `Assertions` | Asserções adicionais |
| `capture` | `Record<string, string>` | Capturas condicionais |
| `variables` | `Record<string, any>` | Variáveis estáticas a definir |
| `steps` | `TestStep[]` | Steps a executar (apenas `then`) |

```yaml
scenarios:
  - name: "Admin vs Regular User"
    condition: "body.user.role == 'admin'"
    then:
      assert:
        body:
          permissions: {contains: "admin_access"}
      capture:
        admin_id: "body.user.id"
      variables:
        is_admin: true
    else:
      assert:
        status_code: 403
      variables:
        is_admin: false

  - name: "Success path with nested steps"
    condition: "status_code == `200`"
    then:
      steps:
        - name: "Verify created resource"
          request:
            method: GET
            url: "/resources/{{body.id}}"
```

#### 8.3 Operadores em Condições JMESPath

| Operador | Descrição | Exemplo |
|----------|-----------|---------|
| `==` | Igualdade | `status_code == \`200\`` |
| `!=` | Diferença | `body.status != 'error'` |
| `<`, `<=`, `>`, `>=` | Comparação | `body.count > \`10\`` |
| `&&` | E lógico | `status_code == \`200\` && body.success` |
| `\|\|` | OU lógico | `status_code == \`200\` \|\| status_code == \`201\`` |
| `!` | Negação | `!body.error` |

> **Nota:** Valores literais em JMESPath devem usar backticks: `` `200` ``, `'string'`

---

### 9. Step Call Cross-Suite (StepCallConfig)

#### 9.1 Propriedades

| Propriedade | Tipo | Obrigatório | Descrição | Exemplo |
|-------------|------|-------------|-----------|---------|
| `test` | `string` | ✅ Sim | Caminho para o arquivo alvo | `"../auth/login.yaml"` ou `"common/setup.yaml"` |
| `path_type` | `"relative" \| "absolute"` | ❌ Não | Tipo de resolução (padrão: `relative`) | `"relative"` |
| `step` | `string` | ✅ Sim | ID ou nome do step a chamar | `"login-step"` |
| `variables` | `Record<string, any>` | ❌ Não | Variáveis para injetar | `{username: "test", password: "pass"}` |
| `isolate_context` | `boolean` | ❌ Não | Isolar contexto (padrão: `true`) | `true` |
| `on_error` | `"fail" \| "continue" \| "warn"` | ❌ Não | Estratégia de erro (padrão: `fail`) | `"fail"` |
| `timeout` | `number` | ❌ Não | Timeout em ms | `30000` |
| `retry` | `object` | ❌ Não | Config de retry | `{max_attempts: 3, delay_ms: 1000}` |

```yaml
steps:
  - name: "Execute login flow"
    call:
      test: "../auth/login.yaml"
      step: "login-step"
      variables:
        username: "{{test_user}}"
        password: "{{test_password}}"
      isolate_context: true
      on_error: fail

  # Com contexto não-isolado (variáveis mesclam no escopo pai)
  - name: "Setup auth"
    call:
      test: "common/auth-setup.yaml"
      path_type: "absolute"
      step: "setup"
      isolate_context: false
```

#### 9.2 Comportamento de Isolamento

| `isolate_context` | Comportamento |
|-------------------|---------------|
| `true` (padrão) | Variáveis capturadas ficam em namespace `{{step-id.variable}}` |
| `false` | Variáveis capturadas mesclam diretamente no escopo do chamador |

---

### 9.1. Sistema de Lifecycle Hooks

**Novidade na versão 2.0!** 🎉

O Flow Test Engine introduz um sistema abrangente de **Lifecycle Hooks** que permite injetar lógica customizada em pontos específicos do ciclo de vida de execução dos testes. Inspirado em padrões de frameworks populares como Express.js, NestJS e Jest.

#### 9.1.1 Visão Geral

Lifecycle Hooks permitem executar ações em momentos estratégicos durante a execução de um step:

- **Computar variáveis** dinamicamente (timestamps, IDs únicos, cálculos)
- **Validar condições** com mensagens customizadas
- **Emitir logs** estruturados para auditoria
- **Coletar métricas** para monitoramento e performance
- **Executar scripts** JavaScript arbitrários
- **Chamar outros steps** ou suites
- **Adicionar delays** estratégicos

#### 9.1.2 Filosofia de Design

- **Não-intrusivo**: Hooks não quebram a execução se falharem (a menos que configurado)
- **Composável**: Múltiplos hooks podem ser executados em sequência
- **Contextual**: Cada hook tem acesso ao contexto completo (variáveis, response, etc.)
- **Declarativo**: Configurados em YAML de forma limpa e legível

---

### 9.2. Hook Actions (Ações)

Cada hook pode executar uma ou mais **ações**. Todas as ações são opcionais dentro de um hook.

| Ação | Descrição | Use Case | Exemplo |
|------|-----------|----------|---------|
| `compute` | Calcula variáveis usando interpolação/JavaScript | Timestamps, IDs, transformações | `{timestamp: "{{$js:Date.now()}}"}` |
| `validate` | Valida condições com severidade configurável | Pré-condições, regras de negócio | Ver seção 9.2.2 |
| `log` | Emite mensagem de log estruturado | Auditoria, debugging | `{level: "info", message: "Starting..."}` |
| `metric` | Emite métrica para telemetria | Monitoramento, dashboards | `{name: "api_call_count", value: 1}` |
| `script` | Executa JavaScript arbitrário | Lógica complexa customizada | `"console.log('Hello')"` |
| `call` | Chama outro step ou suite | Reuso de lógica | `{test: "./setup.yaml", step: "init"}` |
| `wait` | Adiciona delay em milissegundos | Rate limiting, timing | `500` |

#### 9.2.1 Compute Action

```yaml
hooks_pre_request:
  - compute:
      request_id: "{{$js:crypto.randomUUID()}}"
      timestamp: "{{$js:Date.now()}}"
      user_agent: "Flow-Test-Engine/2.0"
      calculated_price: "{{$js:product.price * (1 + tax_rate)}}"
```

**Características:**
- Variáveis são computadas usando interpolação do VariableService
- Suporta `{{$js:...}}`, `{{$faker:...}}`, `{{$env:...}}`
- Variáveis ficam disponíveis imediatamente para steps seguintes

#### 9.2.2 Validate Action

```yaml
hooks_pre_request:
  - validate:
      - expression: "user_id && auth_token"
        message: "Authentication required"
        severity: "error"  # error | warning | info
      - expression: "quantity > 0 && quantity <= 100"
        message: "Quantity must be between 1 and 100"
        severity: "warning"
```

**Severidades:**
- `error`: Falha o hook (mas não quebra o teste por padrão)
- `warning`: Loga warning mas continua
- `info`: Apenas informativo

#### 9.2.3 Log Action

```yaml
hooks_post_request:
  - log:
      level: "info"  # debug | info | warn | error
      message: "API call completed in {{response_time}}ms"
      metadata:
        endpoint: "{{request.url}}"
        status: "{{response.status}}"
```

#### 9.2.4 Metric Action

```yaml
hooks_post_assertion:
  - metric:
      name: "api_response_time_ms"
      value: "{{response_time_ms}}"
      tags:
        endpoint: "/users"
        method: "POST"
        status_code: "{{response.status}}"
```

#### 9.2.5 Script Action

```yaml
hooks_post_capture:
  - script: |
      console.log('='.repeat(60));
      console.log('CAPTURED VARIABLES');
      console.log('='.repeat(60));
      Object.keys(variables).forEach(k => {
        console.log(`${k}: ${JSON.stringify(variables[k])}`);
      });
      return { summary: 'Variables logged' };
```

**Contexto disponível:**
- `variables`: Todas as variáveis do escopo
- `response`: Objeto de resposta (quando aplicável)
- `request`: Objeto de request (quando aplicável)
- `console.log/warn/error`: Para logging

#### 9.2.6 Call Action

```yaml
hooks_pre_request:
  - call:
      test: "./utils/rate-limiter.yaml"
      step: "enforce-limit"
      variables:
        endpoint: "{{request.url}}"
```

#### 9.2.7 Wait Action

```yaml
hooks_post_iteration:
  - wait: 1000  # Espera 1 segundo entre iterações
```

---

### 9.3. Hook Points (Pontos de Execução)

Cada **step** pode ter hooks em 10 pontos diferentes do ciclo de vida:

| Hook Point | Quando Executa | Contexto Disponível | Use Case |
|------------|----------------|---------------------|----------|
| `hooks_pre_input` | **Antes** de solicitar input do usuário | `variables` | Valores default, pré-validações |
| `hooks_post_input` | **Depois** de receber input | `variables`, `inputs`, `captured` | Sanitização, transformação |
| `hooks_pre_iteration` | **Antes** de cada iteração em loop | `variables`, `iteration` | Setup por iteração, contadores |
| `hooks_post_iteration` | **Depois** de cada iteração | `variables`, `iteration`, `result` | Cleanup, agregação, delays |
| `hooks_pre_request` | **Antes** de executar request HTTP | `variables` | Headers dinâmicos, timestamps |
| `hooks_post_request` | **Depois** de request HTTP | `variables`, `response` | Métricas, logs, validações extras |
| `hooks_pre_assertion` | **Antes** de executar assertions | `variables`, `response` | Preparar dados, logs |
| `hooks_post_assertion` | **Depois** de assertions | `variables`, `response`, `assertions` | Métricas de falhas, alertas |
| `hooks_pre_capture` | **Antes** de capturar variáveis | `variables`, `response` | Validações estruturais |
| `hooks_post_capture` | **Depois** de capturar variáveis | `variables`, `captured` | Transformações, exports |

#### 9.3.1 Contextos Adicionais

**Para `iteration` hooks:**
```typescript
iteration: {
  index: 0,          // Índice atual (0-based)
  total: 10,         // Total de iterações
  isFirst: true,     // Se é a primeira iteração
  isLast: false,     // Se é a última iteração
  value: {...}       // Valor atual do item
}
```

**Para `response` context:**
```typescript
response: {
  status: 200,
  status_code: 200,
  headers: {...},
  body: {...},
  data: {...},       // Alias para body
  response_time_ms: 245
}
```

**Para `assertions` context:**
```typescript
assertions: [
  {
    path: "body.success",
    expected: true,
    actual: true,
    passed: true
  },
  ...
]
```

---

### 9.4. Exemplos Práticos de Hooks

#### 9.4.1 Auditoria Completa

```yaml
steps:
  - name: "Create user"
    hooks_pre_request:
      - compute:
          request_id: "{{$js:crypto.randomUUID()}}"
          timestamp: "{{$js:new Date().toISOString()}}"
      - log:
          level: "info"
          message: "REQUEST: {{request_id}} - Creating user at {{timestamp}}"
          metadata:
            endpoint: "/users"
            method: "POST"

    hooks_post_request:
      - compute:
          duration_ms: "{{$js:Date.now() - Date.parse(timestamp)}}"
      - metric:
          name: "user_creation_duration_ms"
          value: "{{duration_ms}}"
          tags:
            success: "{{response.status === 201}}"
      - log:
          level: "info"
          message: "RESPONSE: {{request_id}} - Status {{response.status}} in {{duration_ms}}ms"
          metadata:
            user_id: "{{response.body.id}}"

    request:
      method: POST
      url: "/users"
      body:
        name: "John Doe"
```

#### 9.4.2 Rate Limiting Entre Iterações

```yaml
steps:
  - name: "Process items {{item.id}}"
    iterate:
      over: "{{items}}"
      as: "item"

    hooks_pre_iteration:
      - log:
          level: "info"
          message: "Processing item {{_iteration.index + 1}}/{{_iteration.total}}"

    hooks_post_iteration:
      - wait: 500  # 500ms entre cada request
      - metric:
          name: "items_processed"
          value: 1
          tags:
            item_id: "{{item.id}}"

    request:
      method: GET
      url: "/items/{{item.id}}"
```

#### 9.4.3 Validação de Regras de Negócio

```yaml
steps:
  - name: "Checkout cart"
    hooks_pre_request:
      - validate:
          - expression: "cart_total > 0"
            message: "Cart must have items"
            severity: "error"
          - expression: "cart_total < 10000"
            message: "Cart total exceeds maximum allowed"
            severity: "error"
          - expression: "user.is_verified"
            message: "User must be verified to checkout"
            severity: "warning"
      - compute:
          discount: "{{$js:user.is_premium ? cart_total * 0.10 : 0}}"
          final_total: "{{$js:cart_total - discount}}"

    hooks_post_assertion:
      - validate:
          - expression: "response.body.order_id"
            message: "Order must have an ID"
            severity: "error"
      - log:
          level: "info"
          message: "Order {{response.body.order_id}} created: ${{final_total}}"

    request:
      method: POST
      url: "/checkout"
```

#### 9.4.4 Transformação de Dados Capturados

```yaml
steps:
  - name: "Get users"
    request:
      method: GET
      url: "/users"

    capture:
      raw_users: "body.users"

    hooks_post_capture:
      - compute:
          user_count: "{{$js:raw_users.length}}"
          admin_users: "{{$js:raw_users.filter(u => u.role === 'admin')}}"
          user_ids: "{{$js:raw_users.map(u => u.id)}}"
          users_summary: "{{$js:raw_users.map(u => ({id: u.id, name: u.name}))}}"
      - log:
          level: "info"
          message: "Captured {{user_count}} users ({{admin_users.length}} admins)"
```

#### 9.4.5 Reuso com Call Action

```yaml
# File: utils/auth-check.yaml
steps:
  - name: "Verify auth"
    step_id: "verify-auth"
    hooks_pre_request:
      - validate:
          - expression: "auth_token"
            message: "Missing authentication token"
            severity: "error"

# File: main-test.yaml
steps:
  - name: "Protected operation"
    hooks_pre_request:
      - call:
          test: "./utils/auth-check.yaml"
          step: "verify-auth"
          variables:
            auth_token: "{{auth_token}}"

    request:
      method: POST
      url: "/protected-resource"
      headers:
        Authorization: "Bearer {{auth_token}}"
```

---

### 10. Tipos de Dados e Valores Especiais

#### 10.1 Tipos Primitivos

| Tipo | Descrição | Exemplo YAML | Interpolação |
|------|-----------|--------------|--------------|
| `string` | Texto | `name: "John"` | `"{{user_name}}"` |
| `number` | Inteiro ou float | `age: 30`, `price: 19.99` | `{{user_id}}` |
| `boolean` | Verdadeiro/falso | `active: true` | `{{is_active}}` |
| `null` | Valor nulo | `deleted_at: null` | - |
| `array` | Lista | `tags: ["a", "b"]` | `{{tags}}` |
| `object` | Objeto aninhado | `user: {id: 1, name: "John"}` | `{{user}}` |

#### 10.2 Valores Especiais em Contexto de Resposta

| Caminho | Descrição | Tipo | Exemplo |
|---------|-----------|------|---------|
| `status` ou `status_code` | Código HTTP | `number` | `200`, `404` |
| `headers` | Cabeçalhos HTTP | `object` | `{"content-type": "application/json"}` |
| `body` | Corpo da resposta | `any` | `{success: true, data: [...]}` |
| `@` | Resposta completa | `object` | `{status: 200, headers: {...}, body: {...}}` |

---

### 11. Configuração de Retry

| Propriedade | Tipo | Descrição | Exemplo |
|-------------|------|-----------|---------|
| `max_attempts` | `number` | Número máximo de tentativas | `3` |
| `delay_ms` | `number` | Delay entre tentativas em ms | `1000` |

```yaml
# No nível de metadata do step
metadata:
  retry:
    max_attempts: 3
    delay_ms: 1000

# No nível de dependency
depends:
  - path: "./setup.yaml"
    retry:
      max_attempts: 2
      delay_ms: 500

# No nível de call
call:
  test: "./external.yaml"
  step: "api-call"
  retry:
    max_attempts: 5
    delay_ms: 2000
```

---

### 12. Timeouts

| Nível | Propriedade | Escopo | Padrão |
|-------|-------------|--------|--------|
| **Global** | `flow-test.config.yml: timeout` | Todas requisições | Configurável |
| **Suite** | `metadata.timeout` | Toda a suite | Sem limite |
| **Step** | `metadata.timeout` | Step específico | Herda da suite |
| **Request** | `request.timeout` | Requisição HTTP individual | 30000 ms (30s) |
| **Input** | `input.timeout_seconds` | Input interativo | Sem limite |
| **Call** | `call.timeout` | Chamada cross-suite | Herda do step |

---

### 13. Resolução de URLs

| Tipo de URL | Base URL | Resultado |
|-------------|----------|-----------|
| Relativa (`/api/users`) | `https://api.example.com` | `https://api.example.com/api/users` |
| Relativa sem `/` (`users`) | `https://api.example.com` | `https://api.example.com/users` |
| Absoluta (`https://other.com/api`) | Qualquer | `https://other.com/api` (ignora base_url) |
| Com protocolo (`http://`) | Qualquer | URL absoluta (ignora base_url) |

---

### 14. Certificados Digitais (Client Certificates)

O Flow Test Engine suporta autenticação com certificados digitais para requisições HTTPS (mTLS - mutual TLS), essencial para integração com APIs corporativas e governamentais.

#### 14.1 Formatos Suportados

| Formato | Descrição | Configuração |
|---------|-----------|--------------|
| **PEM** | Certificado e chave em arquivos separados | `cert_path` + `key_path` |
| **PFX/P12** | Certificado e chave em arquivo único | `pfx_path` |

#### 14.2 Configuração por Nível

**Global (flow-test.config.yml):**
```yaml
globals:
  certificates:
    - name: "Corporate API"
      cert_path: "./certs/client.crt"
      key_path: "./certs/client.key"
      passphrase: "{{$env.CERT_PASSWORD}}"
      ca_path: "./certs/ca.crt"
      domains: ["*.company.com", "*.empresa.com.br"]

    - name: "Gov API"
      pfx_path: "./certs/gov-cert.pfx"
      passphrase: "{{$env.GOV_CERT_PASS}}"
      domains: ["*.gov.br"]
```

**Suite Level:**
```yaml
suite_name: "Secure API Tests"
certificate:
  cert_path: "./certs/test-client.crt"
  key_path: "./certs/test-client.key"
  passphrase: "{{$env.CERT_PASSWORD}}"
```

**Step Level:**
```yaml
steps:
  - name: "Admin operation"
    request:
      method: POST
      url: "/admin/action"
      certificate:
        pfx_path: "./certs/admin.pfx"
        passphrase: "{{$env.ADMIN_CERT_PASS}}"
```

#### 14.3 Prioridade de Certificados

1. **Certificado do step** (maior prioridade)
2. **Certificado da suite**
3. **Certificado global por matching de domínio**
4. **Nenhum certificado** (requisição prossegue sem client cert)

#### 14.4 Domain Matching

Certificados globais podem ser filtrados por padrões de domínio:

```yaml
certificates:
  - domains: ["api.example.com"]           # Exact match
  - domains: ["*.example.com"]             # Wildcard subdomain
  - domains: ["*.api.com", "*.service.com"] # Multiple patterns
  - domains: []                             # Aplica a todos os domínios
```

#### 14.5 Propriedades de Certificado

| Propriedade | Tipo | Obrigatório | Descrição |
|-------------|------|-------------|-----------|
| `cert_path` | `string` | Condicional* | Caminho para arquivo de certificado (.crt, .pem) - relativo ao `cwd` ou absoluto |
| `key_path` | `string` | Condicional* | Caminho para chave privada (.key, .pem) - relativo ao `cwd` ou absoluto |
| `pfx_path` | `string` | Condicional* | Caminho para arquivo PFX/P12 - relativo ao `cwd` ou absoluto |
| `passphrase` | `string` | ❌ Não | Senha do certificado (use `{{$env.VAR}}`) |
| `ca_path` | `string` | ❌ Não | Caminho para CA certificate - relativo ao `cwd` ou absoluto |
| `domains` | `string[]` | ❌ Não | Padrões de domínio (apenas global) |
| `name` | `string` | ❌ Não | Nome descritivo (apenas global) |
| `verify` | `boolean` | ❌ Não | Verificar SSL do servidor (padrão: `true`). Use `false` para desabilitar (⚠️ INSEGURO) |
| `min_version` | `"TLSv1" \| "TLSv1.1" \| "TLSv1.2" \| "TLSv1.3"` | ❌ Não | Versão mínima do TLS (padrão: definido pelo Node.js) |
| `max_version` | `"TLSv1" \| "TLSv1.1" \| "TLSv1.2" \| "TLSv1.3"` | ❌ Não | Versão máxima do TLS (padrão: definido pelo Node.js) |

> **Nota:** Use `cert_path` + `key_path` OU `pfx_path`, não ambos.

> **⚠️ IMPORTANTE - Resolução de Caminhos:**
> - **Caminhos relativos** (ex: `./certs/cert.pem`) são resolvidos a partir do **diretório onde você executa o comando** (`process.cwd()`), NÃO do arquivo YAML
> - **Caminhos absolutos** (ex: `/full/path/to/cert.pem`) funcionam de qualquer lugar
> - **Recomendação**: Use variáveis de ambiente com caminhos absolutos para evitar problemas:
>   ```yaml
>   certificate:
>     cert_path: "{{$env.CERT_PATH}}"  # .env: FLOW_TEST_CERT_PATH=/caminho/absoluto/cert.pem
>   ```

#### 14.6 Segurança

**✅ Boas Práticas:**
- SEMPRE use `{{$env.PASSWORD}}` para senhas
- Certificados já estão no `.gitignore`
- Use permissões restritivas: `chmod 600 *.key *.pfx`
- Nunca commite certificados ou chaves privadas
- Configure `ci_default` para ambientes CI/CD
- **⚠️ CUIDADO com `verify: false`**: Desabilita verificação SSL (inseguro). Use APENAS em desenvolvimento/testes!

**Exemplo Seguro:**
```yaml
certificate:
  pfx_path: "./certs/certificate.pfx"
  passphrase: "{{$env.CERT_PASSWORD}}"  # ✅ CORRETO
  verify: false  # ⚠️ Apenas para desenvolvimento - equivalente ao PHP 'verify' => false
  # passphrase: "senha123"              # ❌ NUNCA faça isso!
```

#### 14.7 Casos de Uso

**e-CAC (Receita Federal):**
```yaml
suite_name: "e-CAC API"
base_url: "https://cav.receita.fazenda.gov.br"
certificate:
  pfx_path: "./certs/certificado-ecac.pfx"
  passphrase: "{{$env.ECAC_CERT_PASSWORD}}"
```

**API Bancária (mTLS):**
```yaml
certificate:
  cert_path: "./certs/company-client.crt"
  key_path: "./certs/company-client.key"
  ca_path: "./certs/bank-ca.crt"
  passphrase: "{{$env.BANKING_CERT_PASS}}"
```

📖 **Guia Completo:** Consulte [docs/certificates-guide.md](docs/certificates-guide.md) para:
- Geração de certificados para teste
- Conversão entre formatos (PEM ↔ PFX)
- Troubleshooting detalhado
- Configuração CI/CD
- Exemplos completos

---

### 15. Escopo de Variáveis

| Escopo | Descrição | Acesso | Persistência |
|--------|-----------|--------|--------------|
| **Local (Suite)** | Definidas em `variables` | Apenas na suite atual | Duração da suite |
| **Runtime** | Capturadas durante execução | Steps seguintes na mesma suite | Duração da suite |
| **Global (Exported)** | Listadas em `exports` | Todas as suites (via `{{suite-id.var}}`) | Toda a execução |
| **Environment** | Sistema operacional | Todas as suites (via `{{$env.VAR}}`) | Permanente |
| **Dynamic** | De inputs com `dynamic` config | Conforme `scope` configurado | Conforme `scope` |

#### 15.1 Ordem de Precedência (maior para menor)

1. Variáveis runtime (capturadas no step atual)
2. Variáveis de iteração (`as` variable)
3. Variáveis locais da suite
4. Variáveis exportadas de dependencies
5. Variáveis globais (de `exports`)
6. Variáveis de ambiente

---

### 16. Response Object Structure

Estrutura do objeto de resposta disponível para captures e assertions:

```typescript
{
  status: number,              // 200, 404, etc.
  status_code: number,         // alias para status
  headers: Record<string, string>,  // {"content-type": "application/json"}
  body: any,                   // Corpo parseado (JSON) ou string
  data: any,                   // Alias para body (axios)
  response_time_ms: number     // Tempo de resposta em milissegundos
}
```

---

### 17. Execution Modes

| Mode | Descrição | Use Case | Restrições |
|------|-----------|----------|------------|
| `sequential` | Steps executam em ordem | Fluxos com dependências | Nenhuma |
| `parallel` | Steps executam simultaneamente | Testes independentes | Não suporta `input` interativo |

---

### 18. Priority Levels

| Nível | Descrição | Uso Típico |
|-------|-----------|------------|
| `critical` | Testes críticos | Smoke tests, funcionalidades core |
| `high` | Alta prioridade | Funcionalidades importantes |
| `medium` | Prioridade média | Testes de regression padrão |
| `low` | Baixa prioridade | Testes edge cases, opcionais |

Pode filtrar execução por prioridade via CLI:
```bash
npx flow-test-engine --priority critical,high
```

---

### 19. Tags

Tags são strings arbitrárias para categorização. Exemplos comuns:

| Tag | Propósito |
|-----|-----------|
| `smoke` | Testes de smoke |
| `regression` | Suite de regressão |
| `auth` | Testes de autenticação |
| `api` | Testes de API |
| `e2e` | Testes end-to-end |
| `integration` | Testes de integração |
| `performance` | Testes de performance |
| `security` | Testes de segurança |

Filtrar por tags:
```bash
npx flow-test-engine --tags smoke,auth
```

---

## 20. Exemplos Práticos Completos

### 22.1 Autenticação com Captura e Uso de Token

```yaml
suite_name: "Authentication Flow"
node_id: "auth-flow"
base_url: "{{api_base_url}}"

variables:
  username: "{{$env.TEST_USERNAME}}"
  password: "{{$env.TEST_PASSWORD}}"

exports: ["auth_token", "user_id"]

steps:
  # Login e captura de token
  - name: "User login"
    step_id: "login"
    request:
      method: POST
      url: "/auth/login"
      headers:
        Content-Type: "application/json"
      body:
        username: "{{username}}"
        password: "{{password}}"
    assert:
      status_code: 200
      body:
        token: {exists: true, type: "string"}
        user:
          id: {exists: true, type: "number"}
    capture:
      auth_token: "body.token"
      user_id: "body.user.id"
      token_expiry: "body.expires_at"

  # Usar token capturado
  - name: "Get user profile"
    request:
      method: GET
      url: "/users/{{user_id}}"
      headers:
        Authorization: "Bearer {{auth_token}}"
    assert:
      status_code: 200
      body:
        id: {equals: "{{user_id}}"}
```

### 22.2 Iteração com Dados Dinâmicos

```yaml
suite_name: "Bulk User Creation"
node_id: "bulk-users"
base_url: "{{api_base_url}}"

variables:
  users_to_create:
    - {name: "Alice", role: "admin"}
    - {name: "Bob", role: "user"}
    - {name: "Charlie", role: "moderator"}

exports: ["created_user_ids"]

steps:
  - name: "Create user: {{user.name}}"
    iterate:
      over: "{{users_to_create}}"
      as: "user"
    request:
      method: POST
      url: "/users"
      body:
        name: "{{user.name}}"
        email: "{{$faker.internet.email}}"
        role: "{{user.role}}"
        created_at: "{{$js:new Date().toISOString()}}"
    assert:
      status_code: 201
      body:
        name: {equals: "{{user.name}}"}
        role: {equals: "{{user.role}}"}
    capture:
      "created_user_{{_iteration.index}}": "body.id"
```

### 21.3 Cenários Condicionais Avançados

```yaml
suite_name: "Conditional API Testing"
node_id: "conditional-test"
base_url: "{{api_base_url}}"

steps:
  - name: "Create resource"
    request:
      method: POST
      url: "/resources"
      body:
        name: "Test Resource"
        type: "document"
    capture:
      response_status: "status"
      resource_id: "body.id"
      resource_exists: "body.already_exists"

    scenarios:
      # Recurso criado com sucesso
      - name: "New resource created"
        condition: "response_status == `201` && !resource_exists"
        then:
          assert:
            body:
              id: {exists: true, type: "string"}
              created_at: {exists: true}
          capture:
            new_resource_id: "body.id"
          steps:
            - name: "Verify new resource"
              request:
                method: GET
                url: "/resources/{{new_resource_id}}"

      # Recurso já existe
      - name: "Resource already exists"
        condition: "response_status == `409` || resource_exists"
        then:
          variables:
            use_existing: true
          capture:
            existing_resource_id: "body.existing_id"
          steps:
            - name: "Update existing resource"
              request:
                method: PUT
                url: "/resources/{{existing_resource_id}}"
                body:
                  name: "Updated Resource"

      # Erro genérico
      - name: "Error occurred"
        condition: "response_status >= `400` && response_status != `409`"
        then:
          assert:
            body:
              error: {exists: true}
              message: {exists: true, type: "string"}
          variables:
            creation_failed: true
```

### 20.4 Input Interativo com Validação

```yaml
suite_name: "Interactive API Testing"
node_id: "interactive-test"
base_url: "{{api_base_url}}"
execution_mode: "sequential"

metadata:
  requires_user_input: true

steps:
  # Buscar opções da API
  - name: "Get available environments"
    request:
      method: GET
      url: "/environments"
    capture:
      environments_list: "body.environments"
      default_env: "body.default"

  # Input com opções dinâmicas
  - name: "Select environment"
    input:
      prompt: "Select the target environment:"
      variable: "selected_environment"
      type: "select"
      options: "{{environments_list[*].{value: id, label: name}}}"
      default: "{{default_env}}"
      ci_default: "dev"
      required: true
      style: "boxed"
      validation:
        expressions:
          - name: "Valid environment"
            expression: "contains(environments_list[*].id, selected_environment)"
            message: "Selected environment must be valid"
            severity: "error"

  # Input de texto com validação
  - name: "Enter API key"
    input:
      prompt: "Enter API key for {{selected_environment}}:"
      variable: "api_key"
      type: "password"
      required: true
      validation:
        min_length: 20
        pattern: "^sk-[a-zA-Z0-9_-]+$"
        custom_validation: "value.startsWith('sk-')"
      timeout_seconds: 60
      ci_default: "{{$env.TEST_API_KEY}}"

  # Usar valores do input
  - name: "Test API connection"
    request:
      method: GET
      url: "/test-connection"
      headers:
        X-Environment: "{{selected_environment}}"
        Authorization: "Bearer {{api_key}}"
    assert:
      status_code: 200
      body:
        environment: {equals: "{{selected_environment}}"}
        authenticated: {equals: true}
```

### 20.5 Dependências e Reuso entre Suites

**File: `auth-setup.yaml`**
```yaml
suite_name: "Authentication Setup"
node_id: "auth-setup"
base_url: "{{api_base_url}}"

variables:
  test_user: "test@example.com"
  test_password: "SecurePass123!"

exports: ["auth_token", "user_id", "session_id"]

steps:
  - name: "Setup test user"
    step_id: "setup"
    request:
      method: POST
      url: "/auth/login"
      body:
        email: "{{test_user}}"
        password: "{{test_password}}"
    assert:
      status_code: 200
    capture:
      auth_token: "body.access_token"
      user_id: "body.user.id"
      session_id: "body.session_id"
```

**File: `main-test.yaml`**
```yaml
suite_name: "Main API Tests"
node_id: "main-test"
base_url: "{{api_base_url}}"

# Depende do setup de autenticação
depends:
  - path: "./auth-setup.yaml"
    required: true
    cache: 300  # Cache por 5 minutos
    retry:
      max_attempts: 2
      delay_ms: 1000

steps:
  # Usa token da dependency
  - name: "Create protected resource"
    request:
      method: POST
      url: "/api/resources"
      headers:
        Authorization: "Bearer {{auth-setup.auth_token}}"
      body:
        name: "Protected Resource"
        owner_id: "{{auth-setup.user_id}}"
    assert:
      status_code: 201
```

### 20.6 Testes de Performance com Response Time

```yaml
suite_name: "Performance Tests"
node_id: "performance-test"
base_url: "{{api_base_url}}"

metadata:
  priority: "high"
  tags: ["performance", "sla"]

steps:
  # Teste de endpoint rápido
  - name: "Health check performance"
    request:
      method: GET
      url: "/health"
      timeout: 5000
    assert:
      status_code: 200
      response_time_ms:
        less_than: 100  # SLA: < 100ms
        greater_than: 0
    metadata:
      retry:
        max_attempts: 3
        delay_ms: 500

  # Teste de paginação
  - name: "Pagination performance - Page {{page}}"
    iterate:
      range: "1..10"
      as: "page"
    request:
      method: GET
      url: "/items"
      params:
        page: "{{page}}"
        limit: 50
    assert:
      status_code: 200
      response_time_ms:
        less_than: 2000  # SLA: < 2s
      body:
        items:
          length:
            less_than_or_equal: 50
            greater_than: 0
    capture:
      "page_{{page}}_time": "response_time_ms"
      "page_{{page}}_count": "body.items | length(@)"
```

### 20.7 Validação Complexa com Regex e Tipos

```yaml
suite_name: "Data Validation Tests"
node_id: "validation-test"
base_url: "{{api_base_url}}"

steps:
  - name: "Create user with validation"
    request:
      method: POST
      url: "/users"
      body:
        username: "{{$faker.internet.userName}}"
        email: "{{$faker.internet.email}}"
        phone: "{{$faker.phone.number}}"
        website: "https://{{$faker.internet.domainName}}"
        age: "{{$js:Math.floor(Math.random() * 50) + 18}}"
    assert:
      status_code: 201
      body:
        # Validação de email
        email:
          exists: true
          type: "string"
          regex: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
          notEmpty: true

        # Validação de username
        username:
          exists: true
          type: "string"
          minLength: 3
          regex: "^[a-zA-Z0-9_-]+$"

        # Validação de telefone
        phone:
          exists: true
          regex: "^[\\+]?[1-9]?[0-9]{7,15}$"

        # Validação de URL
        website:
          exists: true
          regex: "^https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b"

        # Validação de idade
        age:
          exists: true
          type: "number"
          greater_than_or_equal: 18
          less_than: 150

        # Validação de ID gerado
        id:
          exists: true
          type: "string"
          regex: "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"  # UUID

        # Validação de array de roles
        roles:
          exists: true
          type: "array"
          length:
            greater_than: 0
            less_than: 10

        # Validação de timestamp
        created_at:
          exists: true
          type: "string"
          regex: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}"  # ISO 8601
```

### 20.8 Error Handling e Retry

```yaml
suite_name: "Error Handling Tests"
node_id: "error-handling"
base_url: "{{api_base_url}}"

steps:
  # Teste com retry automático
  - name: "Flaky endpoint with retry"
    request:
      method: GET
      url: "/flaky-endpoint"
      timeout: 5000
    assert:
      status_code: 200
    metadata:
      retry:
        max_attempts: 5
        delay_ms: 2000
      timeout: 10000
      description: "Endpoint conhecido por ser instável"

  # Continue mesmo em falha
  - name: "Optional validation"
    request:
      method: POST
      url: "/optional-feature"
      body:
        feature: "beta_feature"
    continue_on_failure: true
    assert:
      status_code: 200

  # Cenários de erro esperados
  - name: "Test error responses"
    request:
      method: POST
      url: "/protected-resource"
      headers:
        Authorization: "Bearer invalid_token"
    scenarios:
      - name: "Unauthorized access"
        condition: "status == `401`"
        then:
          assert:
            status_code: 401
            body:
              error: {equals: "unauthorized"}
              message: {exists: true}
          variables:
            auth_failed: true

      - name: "Forbidden access"
        condition: "status == `403`"
        then:
          assert:
            status_code: 403
            body:
              error: {equals: "forbidden"}
          variables:
            access_denied: true
```

---

## 21. Guia de Troubleshooting

### 22.1 Problemas Comuns e Soluções

| Problema | Causa Provável | Solução |
|----------|----------------|---------|
| `Variable {{var}} not found` | Variável não definida ou capturada | Verificar `variables` ou `capture` anterior |
| `JMESPath evaluation failed` | Expressão inválida | Testar em https://jmespath.org/ |
| `URL resolution error` | Base URL incorreto | Verificar `base_url` e se URL é relativa/absoluta |
| `Assertion failed: status_code` | Status inesperado | Adicionar `scenarios` para lidar com múltiplos status |
| `Timeout exceeded` | Requisição muito lenta | Aumentar `timeout` ou otimizar API |
| `Circular dependency detected` | Loop em `depends` | Revisar cadeia de dependências |
| `Input timeout` | Usuário não respondeu | Definir `ci_default` e `timeout_seconds` |
| `Iteration failed` | Array vazio ou inválido | Validar fonte do array antes de iterar |

### 22.2 Debug Tips

```yaml
# Capturar resposta completa para debug
capture:
  debug_full_response: "@"
  debug_status: "status"
  debug_headers: "headers"
  debug_body: "body"

# Usar variáveis para debug
computed:
  debug_timestamp: "{{$js:new Date().toISOString()}}"
  debug_random: "{{$js:Math.random()}}"

# Verbose assertions
assert:
  custom:
    - name: "Debug assertion"
      condition: "body"
      message: "Body received: {{body}}"
```

### 21.3 Validação de YAML

```bash
# Verificar sintaxe YAML
npx flow-test-engine --dry-run tests/my-suite.yaml

# Modo verbose para logs detalhados
npx flow-test-engine --verbose tests/my-suite.yaml

# Verificar apenas descoberta
npx flow-test-engine --list
```

---

## 22. Limitações Conhecidas

### 22.1 Limitações Técnicas

| Limitação | Descrição | Workaround |
|-----------|-----------|------------|
| **Input em parallel** | `input` só funciona em modo `sequential` | Usar `execution_mode: sequential` |
| **Variável de iteração** | `as` variable só disponível no escopo do `iterate` | Capturar antes do fim da iteração |
| **Cross-suite variables** | Requer que suite seja executada antes | Usar `depends` para garantir ordem |
| **JMESPath limitations** | Não suporta todas as features de JavaScript | Usar `{{$js:}}` para lógica complexa |
| **Timeout granular** | Não há timeout por assertion individual | Usar timeout no step ou request |
| **Parallel com dependências** | Dependências entre steps em parallel não são garantidas | Usar `sequential` ou separar em suites |

### 22.2 Boas Práticas

✅ **DO:**
- Usar `node_id` únicos e descritivos
- Definir `ci_default` para todos os inputs
- Capturar variáveis essenciais com nomes claros
- Usar `exports` apenas para variáveis realmente compartilháveis
- Adicionar `metadata.description` para steps complexos
- Validar responses com múltiplas assertions
- Usar `continue_on_failure` com cautela

❌ **DON'T:**
- Usar `execution_mode: parallel` com `input`
- Criar dependências circulares
- Confiar em ordem de execução em parallel
- Capturar dados sensíveis sem necessidade
- Usar timeouts muito curtos em CI/CD
- Ignorar falhas de assertion sem `scenarios`
- Misturar lógica de negócio em testes

---
