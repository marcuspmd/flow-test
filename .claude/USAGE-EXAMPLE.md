# Exemplo de Uso da Skill Flow Test Generator

## Cenário: Criar um novo fluxo de teste para API de E-commerce

### Passo 1: Ativar o contexto

Simplesmente peça ao Claude para ajudar com a criação de um fluxo de teste:

```
Usuário: "Preciso criar um novo fluxo de teste para a API de produtos do meu e-commerce.
O fluxo deve criar um produto, listar produtos, atualizar o produto criado e depois deletá-lo."
```

### Passo 2: Claude usa a skill automaticamente

O Claude irá:

1. **Descobrir fluxos existentes** no projeto:
   ```bash
   # Verificar configuração
   cat flow-test.config.yml

   # Listar fluxos existentes
   find tests/ -name "*.yaml"
   ```

2. **Identificar oportunidades de reutilização**:
   - Procurar por fluxos de autenticação (`auth-flows-test.yaml`)
   - Verificar se há fluxos de setup que exportam variáveis úteis
   - Identificar padrões similares (CRUD operations)

3. **Sugerir estrutura do novo fluxo**:
   ```yaml
   ---
   node_id: "ecommerce_product_crud"
   suite_name: "E-commerce Product CRUD Operations"
   description: "Testa operações completas de CRUD para produtos"

   metadata:
     priority: "high"
     tags: ["ecommerce", "products", "crud", "api"]

   depends:
     - node_id: "auth-setup"  # Se existir
       required: true
       cache: true

   base_url: "{{api_base_url}}"

   variables:
     # Dados dinâmicos com Faker
     product_name: "{{$faker.commerce.productName}}"
     product_price: "{{$faker.commerce.price}}"
     product_description: "{{$faker.lorem.paragraph}}"

     common_headers: &common_headers
       Content-Type: "application/json"
       Accept: "application/json"

   exports: ["product_id", "created_product"]

   steps:
     - name: "Create Product"
       request:
         method: POST
         url: "/api/products"
         headers:
           <<: *common_headers
           Authorization: "Bearer {{auth-setup.auth_token}}"
         body:
           name: "{{product_name}}"
           price: "{{product_price}}"
           description: "{{product_description}}"

       assert:
         status_code: 201
         body:
           id: { exists: true }
           name: { equals: "{{product_name}}" }

       capture:
         product_id: "body.id"
         created_product: "body"

     # ... mais steps
   ```

### Passo 3: Refinamento

O usuário pode pedir ajustes:

```
Usuário: "Adicione também um teste de busca por produtos com paginação e
         filtragem por preço usando iteração."
```

Claude adicionará:

```yaml
steps:
  - name: "Test pagination and filtering - Page {{page}}"
    iterate:
      range:
        start: 1
        end: 3
      as: "page"
    request:
      method: GET
      url: "/api/products"
      headers:
        <<: *common_headers
      params:
        page: "{{page}}"
        limit: 10
        min_price: 10
        max_price: 100

    assert:
      status_code: 200
      body:
        products: { type: "array" }
        pagination:
          page: { equals: "{{page}}" }
          limit: { equals: 10 }
```

## Comandos Úteis Durante o Desenvolvimento

### Testar o fluxo criado

```bash
# Dry-run para validar estrutura
fest tests/ecommerce_product_crud.yaml --dry-run

# Executar com verbose
fest tests/ecommerce_product_crud.yaml --verbose

# Executar só os testes críticos
fest --priority critical
```

### Visualizar dependencies

```bash
# Ver grafo de dependências
fest graph mermaid

# Salvar em arquivo
fest graph mermaid --output docs/dependencies.mmd
```

### Debugging

```bash
# Ver logs detalhados
fest tests/ecommerce_product_crud.yaml --verbose

# Ver apenas resultados
fest tests/ecommerce_product_crud.yaml --silent
```

## Perguntas Comuns

### Como reutilizar steps de outro fluxo?

Use dependencies:

```yaml
depends:
  - node_id: "auth-setup"
    required: true

steps:
  - name: "Usar variáveis do flow de dependência"
    request:
      headers:
        Authorization: "Bearer {{auth-setup.auth_token}}"
```

### Como compartilhar dados entre steps?

Use `capture` e `exports`:

```yaml
steps:
  - name: "Step 1"
    capture:
      my_var: "body.data.id"

  - name: "Step 2"
    request:
      url: "/api/resource/{{my_var}}"
```

### Como usar dados dinâmicos?

Use Faker.js ou JavaScript:

```yaml
variables:
  # Faker
  random_email: "{{$faker.internet.email}}"
  random_uuid: "{{$faker.string.uuid}}"

  # JavaScript
  timestamp: "{{$js.return Date.now()}}"
  computed: "{{$js.return variables.price * 1.15}}"
```

### Como fazer testes condicionais?

Use `scenarios`:

```yaml
steps:
  - name: "Conditional test"
    request:
      method: GET
      url: "/api/status"

    scenarios:
      - condition: "status_code == `200`"
        then:
          capture:
            is_active: true

      - condition: "status_code == `404`"
        then:
          capture:
            is_active: false
```

## Próximos Passos

1. Experimente criar um fluxo simples
2. Execute com `fest --dry-run` para validar
3. Execute o teste real
4. Visualize os resultados em `results/latest.json`
5. Use o dashboard para análise visual: `fest dashboard dev`

## Recursos Adicionais

- **Documentação Completa**: `guides/`
- **Exemplos Avançados**: `tests/` (vários YAMLs de exemplo)
- **Guia de IA**: `guides/8.AI-flow-authoring-recipe.md`
- **Features Avançadas**: `guides/5.advanced-features.md`
