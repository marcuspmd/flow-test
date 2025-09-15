# Limitações de JMESPath e Correções Necessárias

## Problemas Identificados

### 1. Função `split()` não existe
❌ **Problemático:**
```yaml
email_domain: "body.json.user.email | split('@') | [1]"
```

✅ **Solução:** Usar interpolação de variável ou criar função customizada
```yaml
email_domain: "body.json.user.email" # Capturar email completo e processar depois
```
✅ **Alternativa com JavaScript (`{{js:}}`):**
```yaml
email_domain: "{{js: body.json?.user?.email ? body.json.user.email.split('@')[1] : null }}"
```

### 2. Operadores matemáticos não suportados
❌ **Problemático:**
```yaml
salary_increase: "{{salary * 1.1}}"
final_computed: "{{user_id}} + {{numbers_sum}} + {{timeout_setting}}"
```

✅ **Solução:** Usar JavaScript expressions ou Faker.js
```yaml
salary_increase: "{{js: variables.salary * 1.1 }}"  # simples
# ou com Faker
salary_increase: "{{faker.number.int({ min: {{salary}}, max: {{js: variables.salary * 2}} })}}"
```

### 3. Operadores de comparação em capture
❌ **Problemático:**
```yaml
is_fast_response: "body.json.metrics.response_time < 200"
```

✅ **Solução:** Capturar valor e usar em scenarios
```yaml
response_time: "body.json.metrics.response_time"
```
✅ **Alternativa com JavaScript (`{{js:}}`):**
```yaml
is_fast_response: "{{js: (body.json?.metrics?.response_time ?? 0) < 200 }}"
```

### 4. Operadores lógicos não suportados
❌ **Problemático:**
```yaml
performance_rating: "body.json.metrics.response_time < 100 && 'excellent' || 'good'"
```

✅ **Solução:** Usar scenarios condicionais
```yaml
# Capturar valor primeiro
response_time: "body.json.metrics.response_time"

# Usar em scenarios
scenarios:
  - condition: "response_time < `100`"
    actions:
      capture:
        performance_rating: "'excellent'"
  - condition: "response_time >= `100`"
    actions:
      capture:
        performance_rating: "'good'"
```

### 5. Interpolação dentro de JMESPath
❌ **Problemático:**
```yaml
processed_array: "{{active_names}}"  # dentro de capture
```

✅ **Solução:** Usar referência direta
```yaml
processed_array: "body.json.some.path.to.active_names"
```
✅ **Alternativa com JavaScript (`{{js:}}`):**
```yaml
processed_array: "{{js: (body.json?.some?.path?.to?.active_names || []).map(n => n.trim()) }}"
```

## Funções JMESPath Suportadas

### Funções Básicas:
- `length()` - tamanho de array/string
- `keys()` - chaves de objeto
- `values()` - valores de objeto
- `type()` - tipo do valor
- `not_null()` - filtrar valores não nulos
- `contains()` - verificar se contém
- `starts_with()` - verificar se inicia com
- `ends_with()` - verificar se termina com

### Funções de Array:
- `sum()` - soma de números (apenas para arrays numéricos)
- `min()` - valor mínimo
- `max()` - valor máximo
- `avg()` - média
- `sort()` - ordenar
- `sort_by()` - ordenar por campo
- `group_by()` - agrupar por campo
- `unique()` - valores únicos
- `reverse()` - reverter array

### Filtros:
- `[?expression]` - filtrar arrays
- `[*]` - todos os elementos
- `[0]` - primeiro elemento
- `[-1]` - último elemento
- `[0:3]` - slice (elementos 0 a 2)

## Recomendações

1. **Captura Simples**: Use JMESPath apenas para extrair valores simples
2. **Processamento Complexo**: Use scenarios condicionais para lógica complexa
3. **Operações Matemáticas**: Use Faker.js ou JavaScript expressions (`{{js: ...}}`)
4. **Comparações**: Prefira scenarios; quando necessário, use `{{js: ...}}`
