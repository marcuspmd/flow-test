# Flow Test Engine - Guia Completo de Capacidades

Este guia fornece uma documentação abrangente sobre o Flow Test Engine, um sistema TypeScript para testes de API que permite criar testes complexos usando arquivos YAML declarativos.

## 📋 Visão Geral

O Flow Test Engine é uma ferramenta poderosa para automação de testes de API que combina:

- **Configuração Declarativa**: Testes definidos em YAML limpo e legível
- **Engine TypeScript**: Execução robusta com strict type checking
- **JMESPath Integration**: Queries avançadas para manipulação de dados
- **Faker.js Support**: Geração de dados realísticos
- **Sistema Modular**: Arquitetura extensível e organizadas em services

### Arquitetura Principal

```
src/
├── core/           # Engine principal e descoberta de testes
├── services/       # Serviços especializados (HTTP, Assertions, etc.)
├── types/          # Definições TypeScript
└── cli.ts         # Interface de linha de comando
```

## 🚀 Tipos de Testes Suportados

### 1. Testes de API REST
Suporte completo para todos os métodos HTTP:

```yaml
# Exemplo básico de teste GET
- name: "Get user profile"
  request:
    method: GET
    url: "/users/{{user_id}}"
    headers:
      Authorization: "Bearer {{auth_token}}"
  assert:
    status_code: 200
    body:
      id: { type: "number" }
      name: { type: "string", exists: true }
```

```yaml
# Exemplo de teste POST com validação completa
- name: "Create new user"
  request:
    method: POST
    url: "/users"
    headers:
      Content-Type: "application/json"
    body:
      name: "{{faker.person.fullName}}"
      email: "{{faker.internet.email}}"
      age: "{{faker.number.int}}"
  assert:
    status_code: 201
    body:
      id: { exists: true, type: "number" }
      email: { regex: "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$" }
  capture:
    created_user_id: "body.id"
    user_email: "body.email"
```

### 2. Testes de Autenticação
Fluxos de login e gerenciamento de tokens:

```yaml
# Login e captura de token
- name: "User authentication"
  request:
    method: POST
    url: "/auth/login"
    body:
      email: "admin@example.com"
      password: "secure_password"
  assert:
    status_code: 200
    body:
      token: { exists: true, type: "string" }
      expires_in: { type: "number", greater_than: 0 }
  capture:
    auth_token: "body.token"
    token_expiry: "body.expires_in"

# Uso do token em requisições subsequentes
- name: "Access protected resource"
  request:
    method: GET
    url: "/admin/dashboard"
    headers:
      Authorization: "Bearer {{auth_token}}"
  assert:
    status_code: 200
```

### 3. Testes de Performance
Validação de tempo de resposta e throughput:

```yaml
- name: "Performance critical endpoint"
  request:
    method: GET
    url: "/api/search"
    params:
      q: "performance test"
    timeout: 5000
  assert:
    status_code: 200
    response_time_ms:
      less_than: 500
      greater_than: 10
    body:
      results: { type: "array", length: { greater_than: 0 } }
```

### 4. Testes de Integração com Dependências
Execução sequencial com dependências entre flows:

```yaml
# Flow principal com dependências
depends:
  - path: "./setup-database.yaml"
    required: true
    cache: 300  # Cache por 5 minutos
  - path: "./create-test-data.yaml"
    condition: "environment == 'test'"

steps:
  - name: "Test with pre-configured data"
    request:
      method: GET
      url: "/api/reports"
    assert:
      status_code: 200
```

### 5. Testes de Segurança
Validação de headers de segurança e dados sensíveis:

```yaml
- name: "Security headers validation"
  request:
    method: GET
    url: "/secure-endpoint"
    headers:
      Authorization: "Bearer {{secure_token}}"
  assert:
    status_code: 200
    headers:
      "x-frame-options": { exists: true }
      "x-content-type-options": { equals: "nosniff" }
      "strict-transport-security": { exists: true }
    # Validar que dados sensíveis não estão expostos
    body:
      password: { exists: false }
      secret_key: { exists: false }
```

## ✅ Sistema de Validações (Assertions)

### Operadores Básicos

```yaml
assert:
  status_code: 200                    # Comparação direta
  body:
    name:
      equals: "John Doe"              # Igualdade exata
      not_equals: "Jane Doe"          # Desigualdade
      contains: "John"                # Contém substring
      exists: true                    # Campo existe
```

### Validações Numéricas

```yaml
assert:
  body:
    age:
      greater_than: 18               # Maior que
      less_than: 65                  # Menor que
      type: "number"                 # Tipo correto
    salary:
      greater_than: 50000
      less_than: 150000
```

### Validações de Texto

```yaml
assert:
  body:
    email:
      regex: "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$"  # Pattern regex
      type: "string"
      length: { greater_than: 5, less_than: 100 }      # Comprimento
    phone:
      pattern: "^\\+?[1-9]\\d{1,14}$"                  # Pattern alternativo
      minLength: 10                                     # Comprimento mínimo
    description:
      notEmpty: true                                    # Não vazio
```

### Validações de Arrays

```yaml
assert:
  body:
    items:
      type: "array"
      length:
        equals: 5                    # Exatamente 5 itens
      # OU
      length:
        greater_than: 0              # Pelo menos 1 item
        less_than: 100               # Máximo 99 itens
    tags:
      contains: "premium"            # Array contém valor
```

### Validações de Performance

```yaml
assert:
  status_code: 200
  response_time_ms:
    less_than: 1000                  # Máximo 1 segundo
    greater_than: 50                 # Mínimo 50ms
```

### Assertions Customizadas com JavaScript

```yaml
assert:
  status_code: 200
  custom:
    - name: "Valid user ID format"
      condition: "body.user_id && typeof body.user_id === 'number' && body.user_id > 0"
      message: "User ID must be a positive number"

    - name: "Email domain check"
      condition: "body.email.endsWith('@company.com')"
      message: "Email must be from company domain"

    - name: "Array not empty"
      condition: "Array.isArray(body.items) && body.items.length > 0"
      message: "Items array must not be empty"
```

## 🔄 Sistema de Iteração

### Iteração sobre Arrays

```yaml
# Definir dados de teste
variables:
  test_users:
    - { id: 1, name: "Alice", role: "admin" }
    - { id: 2, name: "Bob", role: "user" }
    - { id: 3, name: "Carol", role: "moderator" }

steps:
  - name: "Test user {{current_user.name}}"
    iterate:
      over: "{{test_users}}"         # Array para iterar
      as: "current_user"             # Nome da variável do item atual
    request:
      method: GET
      url: "/users/{{current_user.id}}"
    assert:
      status_code: 200
      body:
        name: { equals: "{{current_user.name}}" }
        role: { equals: "{{current_user.role}}" }
    capture:
      user_{{current_user.id}}_data: "body"
```

### Iteração sobre Ranges Numéricos

```yaml
- name: "Test pagination page {{page_num}}"
  iterate:
    range: "1..5"                    # Páginas 1 a 5
    as: "page_num"                   # Variável para número atual
  request:
    method: GET
    url: "/api/items"
    params:
      page: "{{page_num}}"
      limit: 10
  assert:
    status_code: 200
    body:
      page: { equals: "{{page_num}}" }
      items: { type: "array" }
```

### Contexto de Iteração

Durante a iteração, você tem acesso às seguintes propriedades:
- `{{item}}` - O valor atual (para ranges: o número atual)
- `index` - Índice da iteração (0-based)
- `isFirst` - Boolean indicando se é a primeira iteração
- `isLast` - Boolean indicando se é a última iteração

## 🔍 JMESPath para Captura e Filtragem

### Sintaxe Básica

```yaml
capture:
  # Navegação simples de objeto
  user_id: "body.user.id"
  user_name: "body.user.profile.name"

  # Acesso a arrays por índice
  first_item: "body.items[0]"
  last_item: "body.items[-1]"

  # Informações da resposta
  response_status: "status_code"
  response_time: "duration_ms"
  response_size: "size_bytes"
```

### Filtragem de Arrays

```yaml
capture:
  # Filtrar por condição simples
  active_users: "body.users[?status == 'active']"

  # Filtrar por múltiplas condições
  senior_admins: "body.users[?status == 'active' && role == 'admin' && age > 25]"

  # Filtrar arrays numéricos
  high_scores: "body.scores[?@ > 80]"

  # Filtrar por substring
  gmail_users: "body.users[?contains(email, 'gmail.com')]"

  # Filtrar por padrão de início
  names_starting_a: "body.users[?starts_with(name, 'A')]"
```

### Projeções e Transformações

```yaml
capture:
  # Extrair campos específicos
  user_names: "body.users[*].name"
  user_emails: "body.users[*].email"

  # Criar novos objetos
  user_summary: "body.users[*].{id: id, name: name, active: status == 'active'}"

  # Combinar filtro com projeção
  active_user_names: "body.users[?status == 'active'].name"

  # Contar elementos
  total_users: "body.users | length(@)"
  active_user_count: "body.users[?status == 'active'] | length(@)"
```

### Flatten Operations (Arrays Aninhados)

```yaml
capture:
  # Flatten simples - arrays dentro de objetos
  all_tags: "body.products[*].tags[]"

  # Double flatten - arrays de arrays
  all_permissions: "body.users[*].permission_groups[][]"

  # Filtrar arrays aninhados
  admin_permissions: "body.users[?contains(permission_groups[][], 'admin')]"

  # Matriz de números
  all_coordinates: "body.coordinate_matrix[]"  # [[1,2], [3,4]] → [1,2,3,4]
```

### Queries Complexas

```yaml
capture:
  # Filtrar e transformar em uma expressão
  premium_product_info: "body.products[?price > 100].{name: name, price: price, available: stock > 0}"

  # Análise de dados aninhados
  engineering_skills: "body.users[?department == 'Engineering'][*].skills[]"

  # Operações condicionais complexas
  user_classification: "body.users[*].{name: name, level: salary > 100000 && 'senior' || salary > 50000 && 'mid' || 'junior'}"

  # Filtros com múltiplas condições em arrays
  gaming_electronics: "body.products[?category == 'electronics' && contains(tags, 'gaming') && price < 500]"
```

## 🔧 Sistema de Variáveis

### Interpolação Básica

```yaml
variables:
  api_base: "https://api.example.com"
  user_id: 123
  test_email: "test@example.com"

steps:
  - name: "Get user data"
    request:
      method: GET
      url: "{{api_base}}/users/{{user_id}}"
      headers:
        X-Test-Email: "{{test_email}}"
```

### Captura de Dados (JMESPath)

```yaml
- name: "Login and capture token"
  request:
    method: POST
    url: "/auth/login"
    body:
      email: "admin@example.com"
      password: "password123"
  capture:
    # Captura simples
    auth_token: "body.token"
    user_id: "body.user.id"

    # Captura com transformação
    user_full_name: "body.user.first_name + ' ' + body.user.last_name"

    # Captura de arrays
    user_roles: "body.user.roles[*].name"

    # Informações de resposta
    login_time: "duration_ms"
    server_version: "headers.\"x-api-version\""
```

### Faker.js Integration

```yaml
variables:
  # Dados pessoais
  test_user:
    name: "{{faker.person.fullName}}"
    email: "{{faker.internet.email}}"
    phone: "{{faker.phone.number}}"
    birth_date: "{{faker.date.birthdate}}"

  # Dados comerciais
  product:
    name: "{{faker.commerce.productName}}"
    price: "{{faker.commerce.price}}"
    description: "{{faker.commerce.productDescription}}"

  # Dados técnicos
  system:
    uuid: "{{faker.string.uuid}}"
    ip_address: "{{faker.internet.ip}}"
    user_agent: "{{faker.internet.userAgent}}"

  # Arrays e seleções
  priority: "{{faker.helpers.arrayElement(['high', 'medium', 'low'])}}"
  is_active: "{{faker.datatype.boolean}}"
```

### JavaScript Expressions

```yaml
variables:
  # Cálculos matemáticos
  calculated_price: "{{$js.return base_price * 1.20}}"  # 20% markup

  # Manipulação de strings
  formatted_name: "{{$js.return user_name.toUpperCase()}}"

  # Data/hora atual
  current_timestamp: "{{$js.return Date.now()}}"
  current_date: "{{$js.return new Date().toISOString().split('T')[0]}}"

  # Lógica condicional
  user_type: "{{$js.return age >= 18 ? 'adult' : 'minor'}}"

  # Arrays e objetos
  random_item: "{{$js.return ['item1', 'item2', 'item3'][Math.floor(Math.random() * 3)]}}"

  # Usando variáveis capturadas
  welcome_message: "{{$js.return `Welcome, ${captured_user_name}!`}}"
```

### Variáveis de Ambiente

```yaml
variables:
  api_key: "{{$env.API_KEY}}"
  database_url: "{{$env.DATABASE_URL}}"
  environment: "{{$env.NODE_ENV}}"

steps:
  - name: "Environment-specific test"
    request:
      method: GET
      url: "/api/config"
      headers:
        X-API-Key: "{{api_key}}"
        X-Environment: "{{environment}}"
```

## 🎯 Cenários Condicionais

### Condições Básicas com JMESPath

```yaml
- name: "User profile test"
  request:
    method: GET
    url: "/users/{{user_id}}"
  assert:
    status_code: 200
  scenarios:
    # Cenário para usuários admin
    - name: "Admin user validation"
      condition: "body.role == 'admin'"
      then:
        assert:
          body:
            permissions: { type: "array", length: { greater_than: 5 } }
            admin_panel_access: { equals: true }
        capture:
          admin_permissions: "body.permissions"

    # Cenário para usuários regulares
    - name: "Regular user validation"
      condition: "body.role == 'user'"
      then:
        assert:
          body:
            permissions: { type: "array", length: { less_than: 3 } }
        capture:
          basic_permissions: "body.permissions"
```

### Condições com JavaScript

```yaml
scenarios:
  # Validação de idade
  - name: "Adult user scenario"
    condition: "{{$js.return body.age >= 18}}"
    then:
      assert:
        body:
          can_purchase_alcohol: { equals: true }

  # Condições complexas
  - name: "Premium user scenario"
    condition: "{{$js.return body.subscription_type === 'premium' && body.account_balance > 100}}"
    then:
      assert:
        body:
          premium_features: { exists: true }
          priority_support: { equals: true }
```

### Cenários com Then/Else

```yaml
scenarios:
  - name: "Payment validation"
    condition: "body.payment_status == 'completed'"
    then:
      # Sucesso no pagamento
      assert:
        body:
          order_status: { equals: "confirmed" }
          tracking_number: { exists: true }
      capture:
        order_id: "body.order_id"
        tracking_code: "body.tracking_number"
    else:
      # Falha no pagamento
      assert:
        body:
          order_status: { equals: "pending" }
          error_message: { exists: true }
      capture:
        error_reason: "body.error_message"
```

### Skip Logic (Pular Testes)

```yaml
- name: "Production-only test"
  metadata:
    skip: "{{environment}} !== 'production'"
    description: "Only run in production environment"
  request:
    method: GET
    url: "/admin/production-metrics"

- name: "Feature flag dependent test"
  metadata:
    skip: "{{feature_flags.new_api}} !== 'true'"
  request:
    method: GET
    url: "/api/v2/new-feature"
```

## 🎨 Funcionalidades Avançadas

### Input Interativo

```yaml
- name: "Interactive API key setup"
  input:
    prompt: "Enter your API key:"
    variable: "user_api_key"
    type: "password"
    required: true
    validation:
      min_length: 20
      pattern: "^sk-[a-zA-Z0-9]+"
    description: "API key for authentication"

# Usar a variável capturada
- name: "Test with user API key"
  request:
    method: GET
    url: "/user/profile"
    headers:
      Authorization: "Bearer {{user_api_key}}"
```

#### Inputs dinâmicos com captura/computed

- Use o bloco `dynamic` para criar variáveis derivadas a partir do valor digitado.
- `capture` executa JMESPath sobre um contexto contendo `value`, `input` e `variables` atuais.
- `computed` executa JavaScript com acesso a `variables.__input_value`, metadados do step e variáveis globais.
- `persist_to_global` e `exports` controlam quais variáveis entram no registro global automaticamente.
- Definições dentro de `reevaluate` são executadas novamente quando variáveis listadas em `reevaluateOn` mudam.

```yaml
- name: "Configurar tenant dinamicamente"
  input:
    prompt: "Informe o código do tenant"
    variable: "tenant_code"
    type: "text"
    ci_default: "acme"
    dynamic:
      capture:
        tenant_normalized: "toupper(value)"
      computed:
        auth_header: "`Bearer ${variables.api_token}-${variables.__input_value}`"
      persist_to_global: true
      reevaluate:
        - name: "tenant_header"
          expression:
            "variables.auth_header + ':' + variables.current_environment"
          scope: "suite"
          reevaluateOn: ["current_environment", "auth_header"]
      exports: ["auth_header"]
```

Após a coleta, quaisquer variáveis derivadas aparecem em `captured_variables` do step e ficam disponíveis nos escopos `runtime`, `suite` ou `global`, de acordo com a configuração.

#### Validação dinâmica de inputs

- Adicione regras em `validation.expressions` para validar o valor com JMESPath (`language: jmespath`) ou JavaScript.
- Utilize `severity: warning` para alertas não-bloqueantes; o campo é mantido em `validation_warnings` no resultado.
- Expressões são avaliadas tanto em modo interativo quanto em CI (`ci_default` passa pelo mesmo pipeline).

```yaml
validation:
  expressions:
    - expression: "contains(value, '@example.com')"
      language: "jmespath"
      message: "E-mail deve usar o domínio example.com"
      severity: "warning"
    - expression: "variables.__input_value.length >= 8"
      message: "Senha precisa de pelo menos 8 caracteres"
```

Mensagens de erro interrompem o fluxo do input; avisos são registrados nos logs e propagados para relatórios sem bloquear o teste.

### Retry Logic

```yaml
- name: "Flaky endpoint test"
  request:
    method: GET
    url: "/unstable-endpoint"
  metadata:
    retry:
      max_attempts: 3
      delay_ms: 1000
  assert:
    status_code: 200
```

### Priorização e Tags

```yaml
# Definir prioridades e tags
- name: "Critical user authentication"
  metadata:
    priority: "critical"
    tags: ["auth", "smoke", "security"]
    timeout: 5000
  request:
    method: POST
    url: "/auth/login"

# Executar apenas testes críticos
# flow-test --priority critical

# Executar testes por tag
# flow-test --tag auth,smoke
```

### Cleanup Operations

```yaml
- name: "Setup test data"
  request:
    method: POST
    url: "/test-data"
    body:
      test_id: "{{test_session_id}}"
  capture:
    created_data_id: "body.id"

- name: "Main test operation"
  request:
    method: GET
    url: "/api/test"
  metadata:
    continue_on_failure: true

# Sempre executar cleanup, mesmo se testes falharem
- name: "Cleanup test data"
  metadata:
    always_run: true
  request:
    method: DELETE
    url: "/test-data/{{created_data_id}}"
```

## 📚 Exemplos Práticos Completos

### 1. E-commerce API Test Suite

```yaml
suite_name: "E-commerce API Tests"
node_id: "ecommerce_api"
base_url: "{{api_base_url}}"

variables:
  test_customer:
    name: "{{faker.person.fullName}}"
    email: "{{faker.internet.email}}"
    phone: "{{faker.phone.number}}"

exports: ["customer_id", "order_id", "payment_token"]

steps:
  # 1. Criar cliente
  - name: "Create customer account"
    request:
      method: POST
      url: "/customers"
      body:
        name: "{{test_customer.name}}"
        email: "{{test_customer.email}}"
        phone: "{{test_customer.phone}}"
    assert:
      status_code: 201
      body:
        id: { exists: true, type: "number" }
        email: { equals: "{{test_customer.email}}" }
    capture:
      customer_id: "body.id"
      customer_email: "body.email"

  # 2. Adicionar produtos ao carrinho
  - name: "Add product {{item.name}} to cart"
    iterate:
      over: "{{test_products}}"
      as: "item"
    request:
      method: POST
      url: "/customers/{{customer_id}}/cart"
      body:
        product_id: "{{item.id}}"
        quantity: "{{item.quantity}}"
    assert:
      status_code: 200
      body:
        cart_total: { type: "number", greater_than: 0 }

  # 3. Checkout condicional
  - name: "Process checkout"
    request:
      method: POST
      url: "/customers/{{customer_id}}/checkout"
    assert:
      status_code: 200
    scenarios:
      - name: "Successful payment"
        condition: "body.payment_status == 'completed'"
        then:
          assert:
            body:
              order_id: { exists: true }
              tracking_number: { exists: true }
          capture:
            order_id: "body.order_id"
            tracking_number: "body.tracking_number"

      - name: "Failed payment"
        condition: "body.payment_status == 'failed'"
        then:
          capture:
            payment_error: "body.error_message"
```

### 2. Teste de Performance com Métricas

```yaml
suite_name: "API Performance Tests"
node_id: "performance_tests"

variables:
  concurrent_users: 10
  test_duration_seconds: 30

steps:
  # Teste de latência
  - name: "Response time test - endpoint {{endpoint.path}}"
    iterate:
      over: "{{api_endpoints}}"
      as: "endpoint"
    request:
      method: "{{endpoint.method}}"
      url: "{{endpoint.path}}"
      timeout: 5000
    assert:
      status_code: 200
      response_time_ms:
        less_than: 500
        greater_than: 10
    capture:
      endpoint_{{endpoint.name}}_time: "duration_ms"
      endpoint_{{endpoint.name}}_size: "size_bytes"

  # Teste de throughput
  - name: "Throughput test page {{page}}"
    iterate:
      range: "1..100"
      as: "page"
    request:
      method: GET
      url: "/api/items"
      params:
        page: "{{page}}"
        limit: 50
    assert:
      status_code: 200
      response_time_ms:
        less_than: 1000
      body:
        items: { type: "array" }
        total: { type: "number" }
```

### 3. Teste de Segurança e Autenticação

```yaml
suite_name: "Security & Authentication Tests"
node_id: "security_tests"

steps:
  # Teste de autenticação JWT
  - name: "JWT Authentication Flow"
    request:
      method: POST
      url: "/auth/login"
      body:
        username: "{{secure_username}}"
        password: "{{secure_password}}"
    assert:
      status_code: 200
      body:
        token: { exists: true, type: "string" }
        refresh_token: { exists: true }
        expires_in: { type: "number", greater_than: 3600 }
      headers:
        "set-cookie": { exists: true }
    capture:
      jwt_token: "body.token"
      refresh_token: "body.refresh_token"

  # Teste de autorização
  - name: "Protected resource access"
    request:
      method: GET
      url: "/api/admin/users"
      headers:
        Authorization: "Bearer {{jwt_token}}"
    scenarios:
      - name: "Admin access granted"
        condition: "status_code == 200"
        then:
          assert:
            body:
              users: { type: "array" }
              total_count: { type: "number" }

      - name: "Access denied"
        condition: "status_code == 403"
        then:
          assert:
            body:
              error: { equals: "insufficient_privileges" }

  # Teste de headers de segurança
  - name: "Security headers validation"
    request:
      method: GET
      url: "/api/secure-endpoint"
      headers:
        Authorization: "Bearer {{jwt_token}}"
    assert:
      status_code: 200
      headers:
        "x-frame-options": { exists: true }
        "x-content-type-options": { equals: "nosniff" }
        "strict-transport-security": { exists: true }
        "x-xss-protection": { exists: true }
```

### 4. Teste com Filtragem Avançada de Arrays

```yaml
suite_name: "Advanced Array Filtering Tests"
node_id: "array_filtering"

variables:
  test_dataset:
    users:
      - { id: 1, name: "Alice", department: "Engineering", salary: 95000, skills: ["JavaScript", "Python"] }
      - { id: 2, name: "Bob", department: "Sales", salary: 65000, skills: ["Sales", "CRM"] }
      - { id: 3, name: "Carol", department: "Engineering", salary: 110000, skills: ["Java", "DevOps"] }

steps:
  - name: "Filter and analyze user data"
    request:
      method: POST
      url: "/analytics/users"
      body: "{{test_dataset}}"
    assert:
      status_code: 200
    capture:
      # Filtros básicos
      engineering_users: "body.users[?department == 'Engineering']"
      high_earners: "body.users[?salary > 80000]"

      # Filtros com arrays aninhados
      js_developers: "body.users[?contains(skills, 'JavaScript')]"

      # Projeções e transformações
      user_summary: "body.users[*].{name: name, dept: department, high_earner: salary > 90000}"

      # Análise agregada
      total_engineering: "body.users[?department == 'Engineering'] | length(@)"
      avg_engineering_salary: "body.users[?department == 'Engineering'].salary | avg(@)"

      # Filtros complexos combinados
      senior_engineers: "body.users[?department == 'Engineering' && salary > 100000].{name: name, skills: skills}"
```

## 🔌 Integração com Swagger/OpenAPI

### Import Automático

```bash
# Gerar testes a partir de especificação OpenAPI
fest --swagger-import api-spec.json --swagger-output tests/generated/

# Especificar base URL e filtros
fest --swagger-import api-spec.yaml --base-url https://api.example.com --tag user-management
```

### Exemplo de Teste Gerado

```yaml
# Gerado automaticamente a partir do Swagger
suite_name: "User Management API - Generated Tests"
node_id: "user_mgmt_swagger"
base_url: "https://api.example.com/v1"

steps:
  # GET /users - Gerado do schema OpenAPI
  - name: "Get users list"
    request:
      method: GET
      url: "/users"
      params:
        page: 1
        limit: 10
    assert:
      status_code: 200
      body:
        users: { type: "array" }
        pagination:
          page: { type: "number" }
          total: { type: "number" }

  # POST /users - Com validação do schema
  - name: "Create user from schema"
    request:
      method: POST
      url: "/users"
      headers:
        Content-Type: "application/json"
      body:
        name: "{{faker.person.fullName}}"
        email: "{{faker.internet.email}}"
        role: "{{faker.helpers.arrayElement(['user', 'admin', 'moderator'])}}"
    assert:
      status_code: 201
      body:
        id: { type: "number", exists: true }
        name: { type: "string" }
        email: { regex: "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$" }
        role: { oneOf: ["user", "admin", "moderator"] }
```

## 🚀 Comandos e Execução

### Comandos Básicos

```bash
# Executar suite padrão
fest

# Executar arquivo específico
fest tests/user-api-test.yaml

# Modo desenvolvimento com reload
npm run dev tests/my-test.yaml

# Dry run (mostrar plano sem executar)
fest --dry-run tests/integration-test.yaml

# Executar com prioridade
fest --priority critical,high

# Filtrar por tags
fest --tag auth,smoke --verbose
```

### Configuração e Reports

```bash
# Usar configuração específica
fest --config custom-config.yml

# Gerar relatório HTML
fest && npm run report:dashboard:build

# Executar com Docker (httpbin)
npm run server:docker && npm test
```

## 📈 Dashboard e Relatórios

O Flow Test Engine gera relatórios detalhados em formato JSON que podem ser visualizados em dashboard HTML:

### Estrutura do Relatório

```json
{
  "summary": {
    "total_suites": 5,
    "successful_suites": 4,
    "failed_suites": 1,
    "total_steps": 23,
    "success_rate": 87.5,
    "total_duration_ms": 4500
  },
  "suites": [
    {
      "suite_name": "User API Tests",
      "status": "success",
      "steps": [
        {
          "name": "Create user",
          "status": "success",
          "duration_ms": 245,
          "assertions": [
            { "field": "status_code", "passed": true },
            { "field": "body.email", "passed": true }
          ]
        }
      ]
    }
  ]
}
```

### Visualização Web

```bash
# Executar dashboard local
npm run report:dashboard:dev

# Acessar em http://localhost:4321
# O dashboard mostra:
# - Métricas de execução
# - Gráficos de performance
# - Detalhes de falhas
# - Timeline de execução
```

---

## 💡 Dicas e Melhores Práticas

### 1. Organização de Testes
- Use `node_id` único para cada suite
- Organize testes por funcionalidade
- Use tags para categorização
- Defina prioridades claras

### 2. Variáveis e Reutilização
- Centralize configurações em `variables`
- Use `exports` para compartilhar dados entre suites
- Aproveite Faker.js para dados realísticos
- Mantenha variáveis de ambiente seguras

### 3. Performance
- Use cache para dependências lentas
- Configure timeouts apropriados
- Monitore `response_time_ms`
- Use iteração para testes de carga

### 4. Manutenabilidade
- Escreva asserções específicas
- Use cenários condicionais para flexibilidade
- Documente testes complexos
- Mantenha arquivos YAML organizados

### 5. CI/CD Integration
- Configure variáveis de ambiente
- Use prioridades para testes críticos
- Gere relatórios para análise
- Implemente cleanup automático

Este guia fornece uma base sólida para usar o Flow Test Engine em cenários reais, desde testes simples até suítes complexas de integração e performance.