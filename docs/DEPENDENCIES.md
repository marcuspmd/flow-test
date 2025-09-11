# Sistema de Dependências do Flow Test Engine

## Visão Geral

O Flow Test Engine suporta um sistema de dependências robusto que permite que testes dependam de outros testes (nodes) para execução. Este sistema garante ordem de execução, compartilhamento de variáveis e isolamento adequado.

## Formato Padrão (ÚNICO FORMATO SUPORTADO)

### Dependência por Node ID (Recomendado)

```yaml
depends:
  - node_id: "auth"
  - node_id: "setup_data"
```

### Estrutura Completa

```yaml
suite_name: "Teste Dependente"
node_id: "calendar"
description: "Fluxo que depende de autenticação"

depends:
  - node_id: "auth"
    required: true        # Opcional: padrão é true
    condition: null       # Opcional: condição JMESPath

variables:
  courtId: "550e8400-e29b-41d4-a716-446655440000"

steps:
  - name: "Usar token do node auth"
    request:
      method: GET
      url: "/api/protected-resource"
      headers:
        Authorization: "Bearer {{auth.token}}"  # Variável exportada do node auth
```

## Como Funciona

### 1. Ordem de Execução
- Dependências são resolvidas automaticamente
- O engine determina a ordem correta de execução
- Dependências circulares são detectadas e bloqueadas

### 2. Compartilhamento de Variáveis
- Variáveis exportadas ficam disponíveis via `{{node_id.variable_name}}`
- Apenas variáveis listadas em `exports:` são compartilhadas
- Variáveis não exportadas são limpas após execução do node

### 3. Isolamento entre Nodes
- Cada node tem seu próprio escopo de variáveis
- Variáveis `runtime` são limpas automaticamente entre nodes
- Variáveis `global` e `suite` permanecem acessíveis

## Exemplos Práticos

### Exemplo 1: Autenticação + API Call

**Node de Autenticação (auth.yaml):**
```yaml
suite_name: "Authentication Flow"
node_id: "auth"

exports:
  - token
  - user_id

steps:
  - name: "Login"
    request:
      method: POST
      url: "/login"
      body:
        email: "user@example.com"
        password: "password"
    capture:
      token: "body.access_token"
      user_id: "body.user.id"
```

**Node Dependente (calendar.yaml):**
```yaml
suite_name: "Calendar Operations"
node_id: "calendar"

depends:
  - node_id: "auth"

steps:
  - name: "Get Calendar"
    request:
      method: GET
      url: "/calendar"
      headers:
        Authorization: "Bearer {{auth.token}}"  # Usa token do node auth
```

### Exemplo 2: Múltiplas Dependências

```yaml
suite_name: "Complex Business Flow"
node_id: "booking"

depends:
  - node_id: "auth"
  - node_id: "setup_data"
  - node_id: "calendar"

steps:
  - name: "Create Booking"
    request:
      method: POST
      url: "/bookings"
      headers:
        Authorization: "Bearer {{auth.token}}"
      body:
        user_id: "{{auth.user_id}}"
        court_id: "{{setup_data.court_id}}"
        slot_id: "{{calendar.available_slot_id}}"
```

## Propriedades de Dependência

| Propriedade | Tipo | Padrão | Descrição |
|------------|------|--------|-----------|
| `node_id` | string | - | **Obrigatório.** ID do node dependente |
| `required` | boolean | `true` | Se a dependência é obrigatória para executar |
| `condition` | string | `null` | Condição JMESPath para execução condicional |

## Regras Importantes

### ✅ Permitido
- Dependências por `node_id`
- Múltiplas dependências no mesmo node
- Acesso a variáveis exportadas via `{{node_id.variable}}`
- Dependências condicionais com `required: false`

### ❌ Não Permitido
- Dependências circulares
- Dependências por path (formato legado removido)
- Acesso direto a variáveis não exportadas
- Auto-referência (`node_id` igual ao próprio node)

## Limpeza de Variáveis

### Variáveis Limpas Entre Nodes
- `runtime`: Capturadas durante execução do step
- Variáveis locais não exportadas

### Variáveis Preservadas
- `global`: Definidas na configuração global
- `suite`: Definidas no próprio node
- Variáveis exportadas de dependências

## Debugging

### Verificar Dependências
```bash
# Ver ordem de execução planejada
npm run test -- --dry-run

# Ver apenas dependências específicas
npm run test -- --suite "node_name" --verbose
```

### Logs Importantes
- `[INFO] Registered node 'node_id'` - Node descoberto
- `[INFO] Dependency-aware execution order` - Ordem resolvida
- `[WARN] Node 'node_id' not found` - Dependência não encontrada
- `[INFO] Exported: node_id.variable = value` - Variável exportada

## Migração de Formatos Legados

### ❌ Formato Antigo (REMOVIDO)
```yaml
# NÃO usar mais
flow_imports:
  - path: "./auth.yaml"

dependencies:
  - "./setup.yaml"

requires:
  - path: "./auth.yaml"
    required: true
```

### ✅ Formato Novo (ÚNICO ACEITO)
```yaml
depends:
  - node_id: "auth"
  - node_id: "setup"
```

## Exemplo Completo

```yaml
# calendar-availability.yaml
suite_name: "Calendar Availability"
node_id: "calendar_availability"
description: "Verificar disponibilidade dependendo de autenticação"

depends:
  - node_id: "auth"
  - node_id: "setup_courts"

variables:
  start_date: "2024-12-25"
  end_date: "2024-12-27"

exports:
  - available_slots
  - booking_windows

steps:
  - name: "Check Specific Court Availability"
    request:
      method: GET
      url: "/calendar/availability"
      headers:
        Authorization: "Bearer {{auth.token}}"
      params:
        dateStart: "{{start_date}}"
        dateEnd: "{{end_date}}"
        courtId: "{{setup_courts.main_court_id}}"
    assert:
      status_code: 200
      body.status: "success"
    capture:
      available_slots: "body.slots"

  - name: "Check All Courts Availability"
    request:
      method: GET
      url: "/calendar/availability"
      headers:
        Authorization: "Bearer {{auth.token}}"
      params:
        dateStart: "{{start_date}}"
        dateEnd: "{{start_date}}"
    assert:
      status_code: 200
      body.status: "success"
    capture:
      booking_windows: "body.booking_windows"
```
