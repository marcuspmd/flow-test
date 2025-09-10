# Flow Test - Motor de Testes de API em TypeScript

Motor de testes de API avançado e configurável, construído com TypeScript e Node.js. Permite criar fluxos de teste complexos de forma declarativa usando arquivos YAML, com suporte a encadeamento de requisições, cenários condicionais, importação de fluxos e relatórios detalhados.

## ✨ Funcionalidades Principais

### 🔗 **Fluxos de Teste Avançados**
- **Encadeamento de Requisições**: Capture valores de uma resposta (tokens, IDs, etc.) e use em requisições subsequentes
- **Importação de Fluxos**: Reutilize fluxos completos de outros arquivos YAML para modularidade
- **Cenários Condicionais**: Implemente happy paths e sad paths baseados em condições dinâmicas
- **Variáveis Contextuais**: Sistema hierárquico de variáveis (global, importadas, suite, runtime)

### 🧪 **Sistema de Asserções Robusto**
- **Múltiplos Tipos**: status_code, body, headers, response_time
- **Operadores Avançados**: equals, contains, not_equals, greater_than, less_than, regex
- **Sintaxes Flexíveis**: Suporte a sintaxe plana (`body.status: "success"`) e estruturada
- **Validação Aninhada**: Acesso a campos profundos (`body.data.user.email`)

### 📊 **Relatórios e Logging**
- **Múltiplos Formatos**: JSON, Console, HTML
- **Níveis de Verbosidade**: Silent, Simple, Detailed, Verbose
- **Logs Automáticos**: Geração automática com timestamps e nomes baseados na suite
- **Análise de Performance**: Métricas de tempo de resposta e tamanho

### 🏗️ **Arquitetura Modular**
- **Serviços Especializados**: HTTP, Assertions, Capture, Variables, Flow, Scenarios
- **TypeScript Strict**: Tipagem rigorosa e contratos bem definidos
- **Extensibilidade**: Fácil adição de novas funcionalidades

## 🚀 Instalação e Configuração

### Pré-requisitos
- Node.js 18.x ou superior
- npm (incluído com Node.js)

### Instalação
```bash
# Clone o repositório
git clone https://github.com/marcuspmd/flow-test.git

# Navegue para o diretório
cd flow-test

# Instale as dependências
npm install
```

## 📖 Como Usar

### Execução Básica
```bash
# Executa o arquivo padrão (tests/start-flow.yaml)
npm start

# Executa um arquivo específico
npm start flows/auth/simple-login-flow.yaml

# Com verbosidade detalhada
npm start meu-teste.yaml --detailed
```

### Opções da Linha de Comando
```bash
# Opções de verbosidade
npm start meu-teste.yaml --verbose    # Detalhes completos (req/res)
npm start meu-teste.yaml --detailed   # Informações detalhadas
npm start meu-teste.yaml --simple     # Progresso básico (padrão)
npm start meu-teste.yaml --silent     # Apenas erros

# Controle de execução
npm start meu-teste.yaml --continue   # Continua mesmo com falhas
npm start meu-teste.yaml --timeout 60 # Timeout 60 segundos

# Saída e formato
npm start meu-teste.yaml --no-log     # Não gera arquivo de log
npm start meu-teste.yaml --output results/custom.json
npm start meu-teste.yaml --format json|console|html

# Ajuda
npm start --help
```

## 📋 Estrutura de Arquivo YAML

### Estrutura Básica
```yaml
suite_name: "Nome da Suíte de Testes"
base_url: "https://api.exemplo.com/v1"  # Opcional

# Importações de outros fluxos (opcional)
imports:
  - name: "setup"
    path: "./setup-flow.yaml"
    variables:
      env: "development"

# Variáveis globais (opcional)
variables:
  user_email: "teste@exemplo.com"
  api_key: "sk-test-123"

# Etapas do fluxo
steps:
  - name: "Nome da Etapa"
    request:
      method: POST
      url: "/endpoint"
      headers:
        Content-Type: "application/json"
        Authorization: "Bearer {{token}}"
      body:
        email: "{{user_email}}"

    assert:
      status_code: 200
      body:
        status:
          equals: "success"

    capture:
      user_id: "body.data.id"

    continue_on_failure: false  # Opcional
```

### Sintaxes de Asserções

#### Sintaxe Plana (Recomendada para casos simples)
```yaml
assert:
  status_code: 200
  body.status: "success"
  body.data.email: "user@test.com"
  headers.content-type: "application/json"
```

#### Sintaxe Estruturada (Para validações complexas)
```yaml
assert:
  status_code: 200
  body:
    status:
      equals: "success"
    data:
      count:
        greater_than: 0
      email:
        regex: "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$"
  headers:
    content-type:
      contains: "application/json"
  response_time_ms:
    less_than: 1000
```

#### Operadores Disponíveis
- `equals`: Igualdade exata
- `contains`: Contém substring/elemento
- `not_equals`: Diferente de
- `greater_than`: Maior que (números)
- `less_than`: Menor que (números)
- `regex`: Correspondência com regex

### Cenários Condicionais
```yaml
steps:
  - name: "Login com múltiplos cenários"
    request:
      method: POST
      url: "/auth/login"
      body:
        username: "{{username}}"
        password: "{{password}}"

    scenarios:
      # Happy Path
      - condition: "status_code == `200`"
        then:
          assert:
            body.status: "success"
          capture:
            auth_token: "body.data.token"

      # Sad Path
      - condition: "status_code == `401`"
        then:
          assert:
            body.error: "invalid_credentials"
          capture:
            error_code: "body.error_code"
```

### Importação de Fluxos
```yaml
# arquivo principal.yaml
imports:
  - name: "autenticacao"
    path: "./auth/login-flow.yaml"
    variables:
      username: "admin"
      password: "secret"

  - name: "configuracao"
    path: "./setup/initial-setup.yaml"

steps:
  # As etapas importadas são executadas primeiro
  - name: "Usar dados do login"
    request:
      method: GET
      url: "/profile"
      headers:
        Authorization: "Bearer {{token}}"  # token vem do fluxo importado
```

### Fluxo Reutilizável (exemplo: auth/login-flow.yaml)
```yaml
flow_name: "Login Flow"
description: "Fluxo padrão de autenticação"

variables:
  username: "default_user"
  password: "default_pass"

exports:
  - token
  - refresh_token

steps:
  - name: "Autenticar usuário"
    request:
      method: POST
      url: "/auth/login"
      body:
        username: "{{username}}"
        password: "{{password}}"
    assert:
      status_code: 200
    capture:
      token: "body.access_token"
      refresh_token: "body.refresh_token"
```

## 🔧 Funcionalidades Avançadas

### Sistema de Variáveis Hierárquico
1. **Globais**: Definidas no sistema
2. **Importadas**: Vindas de fluxos importados
3. **Suite**: Definidas na seção `variables:`
4. **Runtime**: Capturadas durante a execução

### Interpolação de Variáveis
```yaml
# Suporta interpolação em qualquer lugar
request:
  url: "/users/{{user_id}}/posts"
  headers:
    Authorization: "Bearer {{auth_token}}"
    X-Custom: "Valor com {{variavel}} interpolada"
  body:
    title: "Post do {{username}}"
    tags: ["{{tag1}}", "{{tag2}}"]
```

### Captura de Dados (JMESPath)
```yaml
capture:
  # Campos simples
  user_id: "body.data.id"

  # Arrays
  first_email: "body.users[0].email"
  all_names: "body.users[*].name"

  # Campos aninhados
  nested_value: "body.response.meta.pagination.total"

  # Valores calculados
  is_admin: "body.user.role == 'admin'"

  # Valores estáticos
  test_run_id: "`test_12345`"
```

## 📊 Logs e Relatórios

### Logs Automáticos
Por padrão, todos os testes geram logs detalhados:
```
results/
├── nome-da-suite_2025-01-09_14-30-15.json
├── login_2025-01-09_14-25-10.json
└── e2e-flow_2025-01-09_14-20-05.json
```

### Estrutura do Log JSON
```json
{
  "suite_name": "Minha Suite",
  "start_time": "2025-01-09T14:30:15.123Z",
  "end_time": "2025-01-09T14:30:18.456Z",
  "total_duration_ms": 3333,
  "success_rate": 85.5,
  "steps_results": [
    {
      "step_name": "Login do usuário",
      "status": "success",
      "duration_ms": 245,
      "request_details": {
        "method": "POST",
        "url": "https://api.com/auth/login",
        "headers": {...},
        "body": {...}
      },
      "response_details": {
        "status_code": 200,
        "headers": {...},
        "body": {...},
        "size_bytes": 156
      },
      "assertions_results": [
        {
          "field": "status_code",
          "expected": 200,
          "actual": 200,
          "passed": true
        }
      ],
      "captured_variables": {
        "auth_token": "eyJ0eXAiOiJKV1QiLCJhb..."
      }
    }
  ],
  "variables_final_state": {
    "auth_token": "eyJ0eXAiOiJKV1QiLCJhb...",
    "user_id": 123
  },
  "imported_flows": ["setup", "auth"]
}
```

## 🏗️ Arquitetura do Sistema

### Componentes Principais

#### Core
- **`Runner`**: Orquestrador principal que executa as suites
- **`main.ts`**: CLI e ponto de entrada

#### Serviços
- **`HttpService`**: Execução de requisições HTTP com axios
- **`AssertionService`**: Validação de asserções múltiplas
- **`CaptureService`**: Extração de dados com JMESPath
- **`VariableService`**: Gerenciamento de variáveis contextuais
- **`FlowService`**: Importação e reutilização de fluxos
- **`ScenarioService`**: Processamento de cenários condicionais

#### Tipos
- **`common.types.ts`**: Contratos TypeScript para YAML e estruturas internas

### Fluxo de Execução
1. **Parsing**: Carregamento e validação do YAML
2. **Imports**: Processamento de fluxos importados
3. **Execution**: Para cada etapa:
   - Interpolação de variáveis
   - Execução HTTP
   - Validação de asserções
   - Captura de variáveis
   - Processamento de cenários
4. **Reporting**: Geração de logs e relatórios

## 📁 Organização de Arquivos

### Estrutura Recomendada
```
projeto/
├── flows/
│   ├── auth/
│   │   ├── login-flow.yaml
│   │   └── register-flow.yaml
│   ├── api/
│   │   ├── users-crud.yaml
│   │   └── products-crud.yaml
│   ├── e2e/
│   │   └── complete-workflow.yaml
│   └── setup/
│       └── environment-setup.yaml
├── results/
│   └── [logs automáticos]
└── tests/
    └── [testes unitários do sistema]
```

## 💡 Exemplos Práticos

### Exemplo 1: API REST Completa
```yaml
suite_name: "CRUD de Usuários"
base_url: "https://api.exemplo.com/v1"

variables:
  admin_token: "sk-admin-123"
  user_email: "novo@usuario.com"

steps:
  - name: "Criar usuário"
    request:
      method: POST
      url: "/users"
      headers:
        Authorization: "Bearer {{admin_token}}"
        Content-Type: "application/json"
      body:
        email: "{{user_email}}"
        name: "Usuário Teste"
        role: "user"
    assert:
      status_code: 201
      body.email: "{{user_email}}"
    capture:
      user_id: "body.id"

  - name: "Buscar usuário criado"
    request:
      method: GET
      url: "/users/{{user_id}}"
      headers:
        Authorization: "Bearer {{admin_token}}"
    assert:
      status_code: 200
      body:
        id:
          equals: "{{user_id}}"
        email:
          equals: "{{user_email}}"
```

### Exemplo 2: Fluxo com Cenários
```yaml
suite_name: "Teste de Login com Múltiplos Cenários"
base_url: "https://auth.exemplo.com"

steps:
  - name: "Tentativa de login"
    request:
      method: POST
      url: "/login"
      body:
        email: "{{email}}"
        password: "{{password}}"

    scenarios:
      - condition: "status_code == `200`"
        then:
          assert:
            body.success: true
          capture:
            access_token: "body.access_token"
            user_name: "body.user.name"

      - condition: "status_code == `401`"
        then:
          assert:
            body.error: "invalid_credentials"
          capture:
            login_failed: "`true`"

      - condition: "status_code == `422`"
        then:
          assert:
            body.validation_errors:
              contains: "email"
          capture:
            validation_error: "body.message"
```

### Exemplo 3: Fluxo E2E com Importações
```yaml
# main-e2e.yaml
suite_name: "Fluxo E2E Completo"
base_url: "https://api.sistema.com"

imports:
  - name: "setup"
    path: "./flows/setup/environment.yaml"

  - name: "auth"
    path: "./flows/auth/admin-login.yaml"
    variables:
      username: "admin@sistema.com"

steps:
  - name: "Criar recurso usando token do admin"
    request:
      method: POST
      url: "/resources"
      headers:
        Authorization: "Bearer {{admin_token}}"
      body:
        name: "Recurso E2E"
        description: "Criado no teste E2E"
    assert:
      status_code: 201
    capture:
      resource_id: "body.id"
```

## 🔍 Debugging e Troubleshooting

### Comandos de Debug
```bash
# Máximo detalhe para debugging
npm start meu-teste.yaml --verbose

# Continua mesmo com falhas para ver todos os problemas
npm start meu-teste.yaml --continue --detailed

# Salva output detalhado para análise
npm start meu-teste.yaml --verbose --output debug-session.json
```

### Problemas Comuns

#### Variáveis não interpoladas
```yaml
# ❌ Errado - aspas na captura
capture:
  token: "body.access_token"  # Remove as aspas do JMESPath

# ✅ Correto
capture:
  token: body.access_token
```

#### URLs mal formadas
```yaml
# ❌ Errado - URL absoluta com base_url
base_url: "https://api.com"
request:
  url: "https://api.com/users"  # Redundante

# ✅ Correto - URL relativa
base_url: "https://api.com"
request:
  url: "/users"  # Concatena automaticamente
```

#### Asserções falhando
```yaml
# ❌ Problemas comuns
assert:
  status_code: "200"  # Deveria ser number, não string
  body.count: 5       # Se body.count for string "5"

# ✅ Correto
assert:
  status_code: 200
  body.count: "5"     # Match exato do tipo
```

## 🚀 Scripts de Automação

### Script de Execução em Lote
```bash
#!/bin/bash
# run-all-tests.sh

echo "🧪 Executando todos os testes..."

# Testes unitários
npm start flows/auth/login-flow.yaml --simple
npm start flows/api/users-crud.yaml --simple

# Testes de integração
npm start flows/e2e/complete-workflow.yaml --detailed

# Testes de regressão
for file in flows/regression/*.yaml; do
    echo "Executando: $file"
    npm start "$file" --continue
done

echo "✅ Todos os testes concluídos!"
```

## 🛣️ Roadmap

### Funcionalidades Planejadas
- [ ] **Suporte a GraphQL**: Queries e mutations
- [ ] **Mocks Integrados**: Mock server embutido para testes
- [ ] **Dados Dinâmicos**: Geração de dados faker.js
- [ ] **Paralelização**: Execução paralela de etapas independentes
- [ ] **Plugins**: Sistema de plugins extensível
- [ ] **Dashboard Web**: Interface visual para resultados
- [ ] **CI/CD Integration**: Plugins para Jenkins, GitHub Actions
- [ ] **Performance Testing**: Métricas de carga e stress

### Melhorias Técnicas
- [ ] **Cache de Resultados**: Para otimizar re-execuções
- [ ] **Retry Automático**: Com backoff exponencial
- [ ] **Validação de Schema**: JSON Schema para YAMLs
- [ ] **IntelliSense**: Extensão VS Code com autocomplete

## 🤝 Contribuição

### Como Contribuir
1. Fork o projeto
2. Crie uma branch feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

### Padrões de Código
- TypeScript strict mode
- Eslint + Prettier
- Testes unitários obrigatórios
- Documentação JSDoc para funções públicas

## 📄 Licença

Este projeto está licenciado sob a **ISC License**. Veja o arquivo `package.json` para detalhes.

---

## 📞 Suporte

Para dúvidas, problemas ou sugestões:
- 🐛 **Issues**: [GitHub Issues](https://github.com/marcuspmd/flow-test/issues)
- 📧 **Email**: Verifique o `package.json` para contato do autor
- 📖 **Documentação**: Este README e comentários no código
