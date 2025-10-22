# Flow Test Generator Skill

Esta skill ajuda você a desenvolver novos fluxos de teste de API em YAML para o Flow Test Engine, identificando oportunidades de reutilização de fluxos existentes e seguindo as melhores práticas do projeto.

## Objetivo

Auxiliar na criação de testes de API declarativos em YAML que:
- Reutilizam steps e variáveis de fluxos existentes através de dependencies
- Seguem as melhores práticas e padrões estabelecidos
- Aproveitam todos os recursos avançados do Flow Test Engine
- Mantêm consistência com a base de testes existente

## Processo de Trabalho

### 1. Descoberta de Fluxos Existentes

Primeiro, leia o arquivo de configuração para identificar onde os testes estão localizados:

```bash
# Ler configuração do projeto
cat flow-test.config.yml
```

A configuração contém:
- `test_directory`: diretório raiz onde os testes são buscados
- `discovery.patterns`: padrões glob para descobrir arquivos YAML de teste
- `discovery.exclude`: padrões para excluir da descoberta

### 2. Análise de Fluxos Reutilizáveis

Liste todos os arquivos YAML de teste existentes:

```bash
# Listar todos os testes YAML
find . -name "*.yaml" -not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/results/*"
```

Para cada fluxo relevante, identifique:
- **node_id**: identificador único do fluxo (usado para dependencies)
- **exports**: variáveis que o fluxo exporta para reutilização
- **exports_optional**: variáveis opcionais exportadas
- **steps**: passos que podem ser referenciados
- **base_url**: URL base configurada
- **variables**: variáveis locais definidas

### 3. Identificação de Oportunidades de Reutilização

Ao criar um novo fluxo, procure por:

1. **Fluxos de Autenticação**: Se seu teste precisa de autenticação, procure por fluxos como:
   - `auth-flows-test.yaml`, `auth-setup`, etc.
   - Variáveis exportadas: `auth_token`, `jwt_token`, `user_id`, etc.

2. **Fluxos de Setup**: Configurações iniciais que podem ser reutilizadas:
   - Criação de dados de teste
   - Configuração de ambiente
   - Variáveis compartilhadas: `common_headers`, `tenant_id`, `correlation_id`

3. **Fluxos de Dados**: Operações CRUD que podem ser dependências:
   - Criação de usuários, produtos, entidades
   - Exportam IDs e dados necessários para testes subsequentes

### 4. Estrutura Recomendada para Novos Fluxos

Use este template ao criar um novo fluxo:

```yaml
---
node_id: "seu_flow_id"
suite_name: "Nome descritivo do seu fluxo"
description: "Descrição clara do propósito do fluxo"

metadata:
  priority: "high"  # critical, high, medium, low
  tags: ["categoria", "subcategoria", "feature"]
  description: "Contexto adicional sobre o que este fluxo testa"

# Dependências de outros fluxos (opcional)
depends:
  - node_id: "auth-setup"
    required: true
    cache: true

base_url: "{{httpbin_url}}"  # ou "{{api_base_url}}"

# Variáveis locais
variables:
  # Use variáveis de ambiente quando necessário
  tenant_id: "{{$env.TENANT_ID}}"

  # Use Faker.js para dados dinâmicos
  user_name: "{{$faker.person.fullName}}"
  user_email: "{{$faker.internet.email}}"

  # Use JavaScript para lógica complexa
  correlation_id: "{{$js.return `corr-${Math.random().toString(16).slice(2,10)}`}}"

  # Defina anchors YAML para reutilização interna
  common_headers: &common_headers
    Accept: "application/json"
    Content-Type: "application/json"
    X-Correlation-ID: "{{correlation_id}}"

# Variáveis que serão exportadas para outros fluxos
exports: ["user_id", "auth_token"]
exports_optional: ["extra_data"]

steps:
  - name: "Passo 1: Descrição clara"
    metadata:
      description: "Detalhes sobre o que este passo faz"
      tags: ["step-tag"]

    request:
      method: POST
      url: "/api/endpoint"
      headers:
        <<: *common_headers  # Reutiliza anchor
        Authorization: "Bearer {{auth-setup.auth_token}}"  # Usa variável de dependência
      body:
        name: "{{user_name}}"
        email: "{{user_email}}"

    assert:
      status_code: 201
      body:
        id: { exists: true }
        name: { equals: "{{user_name}}" }

    capture:
      user_id: "body.id"
      created_at: "body.created_at"

    continue_on_failure: false

  - name: "Passo 2: Validação"
    request:
      method: GET
      url: "/api/endpoint/{{user_id}}"
      headers:
        <<: *common_headers

    assert:
      status_code: 200
      body:
        id: { equals: "{{user_id}}" }
```

## Recursos Avançados do Flow Test Engine

### Dependencies (Reutilização de Fluxos)

Para reutilizar variáveis de outro fluxo:

```yaml
# No fluxo de dependência (ex: auth-setup.yaml)
node_id: "auth-setup"
exports: ["auth_token", "user_id"]

steps:
  - name: "Login"
    request:
      method: POST
      url: "/auth/login"
    capture:
      auth_token: "body.token"
      user_id: "body.user.id"

---
# No seu novo fluxo
node_id: "meu-novo-flow"
depends:
  - node_id: "auth-setup"
    required: true  # Falha se a dependência falhar
    cache: true     # Cacheia resultados para múltiplos dependentes

steps:
  - name: "Usar token de autenticação"
    request:
      method: GET
      url: "/api/profile"
      headers:
        Authorization: "Bearer {{auth-setup.auth_token}}"  # Formato: {node_id}.{variável}
```

### Iterações

Execute o mesmo step múltiplas vezes com dados diferentes:

```yaml
# Iteração sobre array
variables:
  test_users:
    - { name: "Alice", email: "alice@test.com" }
    - { name: "Bob", email: "bob@test.com" }

steps:
  - name: "Criar usuário {{item.name}}"
    iterate:
      over: "{{test_users}}"
      as: "item"
    request:
      method: POST
      url: "/api/users"
      body:
        name: "{{item.name}}"
        email: "{{item.email}}"

# Iteração por range
steps:
  - name: "Testar página {{page}}"
    iterate:
      range:
        start: 1
        end: 5
        step: 1
      as: "page"
    request:
      method: GET
      url: "/api/items?page={{page}}"
```

### Scenarios (Execução Condicional)

Execute diferentes ações baseadas em condições:

```yaml
steps:
  - name: "Processar resposta condicional"
    request:
      method: GET
      url: "/api/status"

    scenarios:
      # Cenário A: Sucesso
      - condition: "status_code == `200`"
        then:
          assert:
            body:
              status: { equals: "active" }
          capture:
            is_active: true

      # Cenário B: Recurso não encontrado
      - condition: "status_code == `404`"
        then:
          capture:
            is_active: false
            not_found: true
```

### Input Interativo

Solicite entrada do usuário durante a execução:

```yaml
steps:
  - name: "Selecionar ambiente"
    input:
      - prompt: "Qual ambiente deseja testar?"
        variable: "environment"
        type: "select"
        options:
          - { value: "dev", label: "Desenvolvimento" }
          - { value: "staging", label: "Staging" }
          - { value: "prod", label: "Produção" }
        required: true
        ci_default: "dev"  # Valor padrão em CI/CD

      - prompt: "Confirmar execução em {{environment}}?"
        variable: "confirm"
        type: "confirm"
        default: true

  - name: "Executar teste"
    request:
      method: GET
      url: "{{base_urls[environment]}}/api/health"
```

### Computed Variables

Derive variáveis de outras variáveis ou expressões:

```yaml
variables:
  base_price: 100
  tax_rate: 0.15

computed:
  total_price: "{{$js.return variables.base_price * (1 + variables.tax_rate)}}"
  formatted_price: "{{$js.return `R$ ${variables.total_price.toFixed(2)}`}}"
```

### Capture com JMESPath

Extraia dados complexos das respostas:

```yaml
steps:
  - name: "Buscar dados complexos"
    request:
      method: GET
      url: "/api/data"

    capture:
      # Simples
      first_item_id: "body.items[0].id"

      # Filtragem
      active_items: "body.items[?status == 'active']"

      # Projeção
      item_ids: "body.items[*].id"

      # Transformação
      user_names: "body.users[*].{name: name, email: email}"

      # Contagem
      total_items: "length(body.items)"

      # Snapshot completo para uso posterior
      full_response: "body"
```

## Variáveis e Interpolação

### Prioridade de Resolução

1. Step-level variables (variáveis inline do step)
2. Suite-level variables (variáveis do YAML)
3. Global variables (de `flow-test.config.yml`)
4. Environment variables (com prefixo `FLOW_TEST_` ou via `$env`)
5. Faker.js expressions (`{{$faker.*}}`)
6. JavaScript expressions (`{{$js:*}}`)

### Faker.js - Dados Dinâmicos

```yaml
variables:
  # Pessoas
  full_name: "{{$faker.person.fullName}}"
  first_name: "{{$faker.person.firstName}}"
  last_name: "{{$faker.person.lastName}}"
  job_title: "{{$faker.person.jobTitle}}"

  # Internet
  email: "{{$faker.internet.email}}"
  username: "{{$faker.internet.userName}}"
  password: "{{$faker.internet.password}}"
  url: "{{$faker.internet.url}}"

  # Strings
  uuid: "{{$faker.string.uuid}}"
  alphanumeric: "{{$faker.string.alphanumeric(10)}}"

  # Números
  random_int: "{{$faker.number.int}}"
  price: "{{$faker.commerce.price}}"

  # Datas
  recent_date: "{{$faker.date.recent}}"
  future_date: "{{$faker.date.future}}"

  # Comércio
  product_name: "{{$faker.commerce.productName}}"
  department: "{{$faker.commerce.department}}"
```

### JavaScript Expressions

```yaml
variables:
  # Expressão simples
  timestamp: "{{$js.return Date.now()}}"

  # Expressão complexa
  computed_value: "{{$js.return variables.price * 1.15}}"

  # Multi-linha
  filtered_data: |-
    {{js: (() => {
      const items = variables.raw_items || [];
      return items.filter(item => item.status === 'active');
    })() }}
```

## Checklist de Boas Práticas

Antes de finalizar um novo fluxo, verifique:

- [ ] `node_id` é único e descritivo
- [ ] `suite_name` e `description` são claros
- [ ] `metadata.priority` está definida corretamente
- [ ] `metadata.tags` ajudam na organização e filtragem
- [ ] Dependencies estão declaradas se necessário
- [ ] Variáveis exportadas (`exports`) estão documentadas
- [ ] Todos os steps têm `name` descritivo
- [ ] Requests têm `assert` para validar resposta
- [ ] `capture` é usado para extrair dados necessários
- [ ] `continue_on_failure` está configurado apropriadamente
- [ ] Headers comuns usam anchors YAML (`&`, `<<:`)
- [ ] Dados sensíveis vêm de variáveis de ambiente
- [ ] Dados dinâmicos usam Faker.js quando apropriado
- [ ] Comentários explicam decisões não óbvias

## Comandos Úteis

### Descobrir Fluxos Existentes

```bash
# Listar todos os testes
ls tests/*.yaml

# Ver node_ids e exports
grep -A 1 "node_id:" tests/*.yaml
grep -A 3 "exports:" tests/*.yaml

# Buscar fluxos que exportam uma variável específica
grep -l "auth_token" tests/*.yaml
```

### Executar Testes

```bash
# Executar um fluxo específico
fest tests/meu-novo-flow.yaml

# Executar com verbose para debugging
fest tests/meu-novo-flow.yaml --verbose

# Dry-run para ver o plano de execução
fest tests/meu-novo-flow.yaml --dry-run

# Filtrar por prioridade
fest --priority critical,high

# Filtrar por tags
fest --tag auth,api
```

### Visualizar Dependencies

```bash
# Gerar grafo de dependências em Mermaid
fest graph mermaid

# Salvar em arquivo
fest graph mermaid --output dependency-graph.mmd

# Layout horizontal
fest graph mermaid --direction LR
```

## Workflow Recomendado

1. **Entender o Requisito**
   - Qual API será testada?
   - Quais cenários precisam ser cobertos?
   - Há dependências de outros fluxos?

2. **Pesquisar Fluxos Existentes**
   - Listar todos os YAMLs em `tests/`
   - Identificar fluxos que podem ser reutilizados
   - Verificar variáveis exportadas disponíveis

3. **Planejar o Novo Fluxo**
   - Definir steps necessários
   - Identificar dependencies
   - Planejar variáveis a exportar
   - Escolher dados dinâmicos (Faker, env, etc.)

4. **Implementar**
   - Criar arquivo YAML seguindo o template
   - Usar anchors para DRY
   - Implementar assertions robustas
   - Capturar dados necessários

5. **Testar**
   - Executar com `--dry-run` primeiro
   - Executar com `--verbose` para debugging
   - Validar exports funcionam corretamente
   - Testar dependencies

6. **Documentar**
   - Adicionar descrições claras
   - Comentar decisões complexas
   - Atualizar documentação se necessário

## Referências

- **Guia de Features Avançadas**: `guides/5.advanced-features.md`
- **Guia de Criação com IA**: `guides/8.AI-flow-authoring-recipe.md`
- **Referência YAML**: `guides/4.yaml-syntax-reference.md`
- **Referência CLI**: `guides/2.cli-reference.md`
- **Exemplos**: Diretório `tests/`

## Exemplo Completo

Veja `guides/8.AI-flow-authoring-recipe.md` seção "Apêndice A" para um exemplo completo com:
- Setup compartilhado com exports
- Jornada principal com dependencies
- Inputs encadeados (select dependente)
- Cleanup com iteração
- Uso de anchors, Faker, JavaScript, e JMESPath

---

**Quando usar esta skill:**
Sempre que você precisar criar novos testes de API em YAML ou modificar testes existentes, ative esta skill para garantir que você está seguindo as melhores práticas e aproveitando ao máximo os recursos de reutilização do Flow Test Engine.
