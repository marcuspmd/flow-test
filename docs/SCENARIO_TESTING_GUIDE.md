# Guia Completo: Como Utilizar Testes de Cenários

## Introdução aos Testes de Cenários

Os **testes de cenários** no Flow Test Engine permitem criar lógicas condicionais complexas que executam diferentes ações baseadas no resultado de requisições HTTP. Este é um recurso poderoso que permite testar múltiplos caminhos de execução em um único teste, simulando diferentes situações que podem ocorrer em um ambiente real.

## Estrutura Básica de um Cenário

### Sintaxe Fundamental

```yaml
steps:
  - name: "Nome do Step"
    request:
      method: GET
      url: "/endpoint"

    scenarios:
      # Cenário A: Condição de sucesso
      - condition: "status_code == `200`"
        then:
          assert:
            status_code: 200
          capture:
            success: "true"

      # Cenário B: Condição de erro
      - condition: "status_code >= `400`"
        then:
          capture:
            error: "true"
            error_code: "status_code"
```

### Componentes de um Cenário

1. **condition**: Expressão JMESPath que avalia o resultado da requisição
2. **then**: Bloco que define o que fazer quando a condição é verdadeira
3. **assert** (opcional): Validações específicas para este cenário
4. **capture** (opcional): Captura de variáveis específicas do cenário

## Tipos de Condições Disponíveis

### 1. Condições de Status HTTP

```yaml
scenarios:
  # Sucesso
  - condition: "status_code == `200`"
    then: { }

  # Erro de cliente
  - condition: "status_code >= `400` && status_code < `500`"
    then: { }

  # Erro de servidor
  - condition: "status_code >= `500`"
    then: { }

  # Status específicos
  - condition: "status_code == `401`"
    then: { }
```

### 2. Condições de Headers

```yaml
scenarios:
  # Verificar presença de header
  - condition: "headers.authorization != null"
    then: { }

  # Verificar valor específico de header
  - condition: "headers['content-type'] == 'application/json'"
    then: { }

  # Verificar múltiplos headers
  - condition: "headers.authorization != null && headers['x-api-key'] != null"
    then: { }
```

### 3. Condições de Conteúdo (JSON)

```yaml
scenarios:
  # Verificar campo específico
  - condition: "json.status == 'success'"
    then: { }

  # Verificar existência de campo
  - condition: "json.data != null"
    then: { }

  # Verificar estrutura aninhada
  - condition: "json.user.role == 'admin'"
    then: { }

  # Verificar arrays
  - condition: "length(json.items) > 0"
    then: { }
```

### 4. Condições de Parâmetros de Requisição

```yaml
scenarios:
  # Verificar parâmetros enviados
  - condition: "args.action == 'create'"
    then: { }

  # Verificar múltiplos parâmetros
  - condition: "args.type == 'user' && args.action == 'create'"
    then: { }
```

### 5. Condições de Variáveis do Contexto

```yaml
scenarios:
  # Usar variáveis capturadas anteriormente
  - condition: "user_role == 'admin'"
    then: { }

  # Combinar variáveis com resposta
  - condition: "status_code == `200` && user_authenticated == 'true'"
    then: { }
```

## Operadores e Funções Disponíveis

### Operadores de Comparação

- `==` - Igual
- `!=` - Diferente
- `>`, `>=` - Maior, maior ou igual
- `<`, `<=` - Menor, menor ou igual

### Operadores Lógicos

- `&&` - E lógico
- `||` - OU lógico
- `!` - NÃO lógico

### Funções JMESPath Úteis

- `length(array)` - Tamanho de array
- `contains(string, substring)` - Verifica se string contém substring
- `starts_with(string, prefix)` - Verifica se string inicia com prefixo
- `ends_with(string, suffix)` - Verifica se string termina com sufixo
- `type(value)` - Retorna o tipo do valor

## Exemplos Práticos

### 1. Teste de Autenticação com Múltiplos Cenários

```yaml
steps:
  - name: "Login com Diferentes Credenciais"
    request:
      method: POST
      url: "/auth/login"
      headers:
        Content-Type: "application/json"
      body:
        username: "{{username}}"
        password: "{{password}}"

    scenarios:
      # Cenário A: Login bem-sucedido
      - condition: "status_code == `200` && json.token != null"
        then:
          assert:
            status_code: 200
            json.token:
              not_empty: true
          capture:
            auth_token: "json.token"
            login_success: "true"
            user_role: "json.user.role"

      # Cenário B: Credenciais inválidas
      - condition: "status_code == `401`"
        then:
          assert:
            status_code: 401
            json.error:
              contains: "invalid"
          capture:
            login_failed: "true"
            error_message: "json.error"

      # Cenário C: Conta bloqueada
      - condition: "status_code == `403` && json.error == 'account_locked'"
        then:
          capture:
            account_locked: "true"
            unlock_required: "true"

      # Cenário D: Erro de servidor
      - condition: "status_code >= `500`"
        then:
          capture:
            server_error: "true"
            retry_required: "true"
```

### 2. Teste de Permissões Baseado em Papel do Usuário

```yaml
steps:
  - name: "Acesso a Recurso Protegido"
    request:
      method: GET
      url: "/admin/users"
      headers:
        Authorization: "Bearer {{auth_token}}"

    scenarios:
      # Cenário A: Usuário admin tem acesso completo
      - condition: "status_code == `200` && user_role == 'admin'"
        then:
          assert:
            status_code: 200
            json.users:
              type: "array"
          capture:
            admin_access: "true"
            users_count: "length(json.users)"

      # Cenário B: Usuário comum tem acesso negado
      - condition: "status_code == `403` && user_role == 'user'"
        then:
          assert:
            status_code: 403
          capture:
            access_denied: "true"
            insufficient_privileges: "true"

      # Cenário C: Token inválido ou expirado
      - condition: "status_code == `401`"
        then:
          capture:
            token_invalid: "true"
            reauth_required: "true"
```

### 3. Teste de Fluxo de Processamento com Estados

```yaml
steps:
  - name: "Processar Pedido"
    request:
      method: POST
      url: "/orders/{{order_id}}/process"
      headers:
        Content-Type: "application/json"
      body:
        action: "process"

    scenarios:
      # Cenário A: Processamento bem-sucedido
      - condition: "status_code == `200` && json.status == 'processed'"
        then:
          capture:
            processing_success: "true"
            new_status: "json.status"
            processed_at: "json.processed_at"

      # Cenário B: Pedido já processado
      - condition: "status_code == `409` && json.error == 'already_processed'"
        then:
          capture:
            already_processed: "true"
            current_status: "json.current_status"

      # Cenário C: Estoque insuficiente
      - condition: "status_code == `400` && json.error == 'insufficient_stock'"
        then:
          capture:
            stock_issue: "true"
            available_quantity: "json.available_quantity"
            requested_quantity: "json.requested_quantity"

      # Cenário D: Pagamento pendente
      - condition: "status_code == `402` && json.error == 'payment_required'"
        then:
          capture:
            payment_pending: "true"
            payment_url: "json.payment_url"
```

## Cenários Avançados

### 1. Condições Aninhadas e Complexas

```yaml
scenarios:
  # Condição complexa com múltiplas verificações
  - condition: |
      status_code == `200` &&
      json.data != null &&
      length(json.data.items) > 0 &&
      json.data.user.role == 'premium'
    then:
      capture:
        premium_user_data: "json.data"
        item_count: "length(json.data.items)"

  # Condição usando variáveis do contexto
  - condition: |
      status_code == `200` &&
      user_subscription == 'active' &&
      current_usage < usage_limit
    then:
      capture:
        usage_allowed: "true"
        remaining_quota: "{{js: variables.usage_limit - variables.current_usage}}"
```

### 2. Cenários com JavaScript Personalizado

```yaml
scenarios:
  - condition: "status_code == `200`"
    then:
      capture:
        # Processamento complexo usando JavaScript
        email_domain: "{{js: json.user.email ? json.user.email.split('@')[1] : 'unknown'}}"
        is_business_email: "{{js: ['company.com', 'business.org'].includes(variables.email_domain)}}"

        # Cálculos baseados em dados da resposta
        discounted_price: "{{js: json.price ? json.price * 0.9 : 0}}"

        # Formatação de dados
        formatted_date: "{{js: new Date(json.created_at).toLocaleDateString()}}"
```

### 3. Cenários Encadeados com Dependências

```yaml
steps:
  - name: "Verificar Conta"
    request:
      method: GET
      url: "/account/{{user_id}}"

    scenarios:
      - condition: "json.status == 'active'"
        then:
          capture:
            account_active: "true"
            can_process: "true"

      - condition: "json.status == 'suspended'"
        then:
          capture:
            account_suspended: "true"
            can_process: "false"
            suspension_reason: "json.suspension_reason"

  # Step seguinte usa dados capturados
  - name: "Processar Transação"
    # Só executa se conta estiver ativa
    scenarios:
      - condition: "can_process == 'true' && status_code == `200`"
        then:
          capture:
            transaction_processed: "true"

      - condition: "can_process == 'false'"
        then:
          capture:
            transaction_blocked: "true"
            block_reason: "account_not_active"
```

## Melhores Práticas

### 1. Estruturação de Cenários

- **Ordene cenários por prioridade**: Coloque cenários mais específicos primeiro
- **Use nomes descritivos**: Identifique claramente cada cenário
- **Evite condições redundantes**: Não sobreponha cenários desnecessariamente

```yaml
scenarios:
  # ✅ Bom: Específico primeiro
  - condition: "status_code == `401` && json.error == 'token_expired'"
    then: { }

  # ✅ Bom: Geral depois
  - condition: "status_code == `401`"
    then: { }

  # ❌ Ruim: Geral primeiro impediria o específico de executar
```

### 2. Captura de Variáveis Estratégica

```yaml
scenarios:
  - condition: "status_code == `200`"
    then:
      capture:
        # ✅ Capture dados essenciais
        operation_success: "true"
        result_data: "json.data"

        # ✅ Capture informações para debug
        response_time: "{{js: Date.now()}}"
        request_id: "headers['x-request-id']"

        # ✅ Capture dados para próximos steps
        next_step_token: "json.continuation_token"
```

### 3. Tratamento de Erros

```yaml
scenarios:
  # Trate erros específicos primeiro
  - condition: "status_code == `422` && json.validation_errors != null"
    then:
      capture:
        validation_failed: "true"
        field_errors: "json.validation_errors"

  # Depois trate erros gerais
  - condition: "status_code >= `400`"
    then:
      capture:
        request_failed: "true"
        error_category: "{{js: status_code >= 500 ? 'server_error' : 'client_error'}}"

  # Sempre tenha um cenário de fallback
  - condition: "true"  # Sempre executa se nenhum outro executar
    then:
      capture:
        unexpected_response: "true"
        debug_status: "status_code"
```

### 4. Performance e Legibilidade

```yaml
scenarios:
  # ✅ Bom: Condição clara e concisa
  - condition: "json.status == 'success' && json.data != null"
    then: { }

  # ❌ Evite: Condições muito complexas na mesma linha
  - condition: "status_code == `200` && json.user.profile.settings.notifications.email == true && json.user.subscription.plan == 'premium' && json.user.account.status == 'active'"
    then: { }

  # ✅ Melhor: Use variáveis intermediárias
  - condition: "status_code == `200`"
    then:
      capture:
        user_premium: "{{js: json.user?.subscription?.plan === 'premium'}}"
        notifications_enabled: "{{js: json.user?.profile?.settings?.notifications?.email}}"
        account_active: "{{js: json.user?.account?.status === 'active'}}"

  # Então use em step seguinte
  - condition: "user_premium == 'true' && notifications_enabled == 'true' && account_active == 'true'"
    then: { }
```

## Exemplos de Casos de Uso Reais

### 1. E-commerce: Fluxo de Checkout

```yaml
steps:
  - name: "Verificar Carrinho"
    scenarios:
      - condition: "length(json.items) == 0"
        then:
          capture:
            empty_cart: "true"
            can_checkout: "false"

      - condition: "length(json.items) > 0 && json.total > 0"
        then:
          capture:
            cart_valid: "true"
            can_checkout: "true"
            item_count: "length(json.items)"

  - name: "Processar Pagamento"
    scenarios:
      - condition: "can_checkout == 'true' && json.payment_status == 'approved'"
        then:
          capture:
            payment_success: "true"
            order_id: "json.order_id"

      - condition: "can_checkout == 'true' && json.payment_status == 'declined'"
        then:
          capture:
            payment_failed: "true"
            decline_reason: "json.decline_reason"

      - condition: "can_checkout == 'false'"
        then:
          capture:
            checkout_blocked: "true"
```

### 2. Sistema de Monitoramento

```yaml
steps:
  - name: "Health Check de Serviços"
    scenarios:
      - condition: "json.services[?status=='healthy'] | length(@) == length(json.services)"
        then:
          capture:
            all_services_healthy: "true"
            system_status: "operational"

      - condition: "json.services[?status=='unhealthy'] | length(@) > 0"
        then:
          capture:
            unhealthy_services: "json.services[?status=='unhealthy'].name"
            system_status: "degraded"
            alert_required: "true"

      - condition: "json.services[?status=='critical'] | length(@) > 0"
        then:
          capture:
            critical_services: "json.services[?status=='critical'].name"
            system_status: "critical"
            emergency_alert: "true"
```

### 3. Sistema de Permissões Granulares

```yaml
steps:
  - name: "Verificar Permissões de Recurso"
    scenarios:
      - condition: "json.permissions[?action=='read' && resource=='{{target_resource}}'] | length(@) > 0"
        then:
          capture:
            can_read: "true"

      - condition: "json.permissions[?action=='write' && resource=='{{target_resource}}'] | length(@) > 0"
        then:
          capture:
            can_write: "true"

      - condition: "json.permissions[?action=='admin' && resource=='{{target_resource}}'] | length(@) > 0"
        then:
          capture:
            can_admin: "true"
            full_access: "true"

      # Cenário de acesso negado
      - condition: "length(json.permissions) == 0"
        then:
          capture:
            access_denied: "true"
            no_permissions: "true"
```

## Conclusão

Os testes de cenários são uma ferramenta poderosa que permite criar testes robustos e flexíveis que se adaptam a diferentes situações. Com eles, você pode:

1. **Testar múltiplos caminhos** em uma única requisição
2. **Simular diferentes condições** de sistema
3. **Capturar dados específicos** para cada situação
4. **Criar fluxos condicionais** complexos
5. **Melhorar a cobertura de testes** com menos código

Use este guia como referência para criar seus próprios testes de cenários e explore as possibilidades que esta funcionalidade oferece para tornar seus testes mais completos e confiáveis.
