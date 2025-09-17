# Advanced Flow Test Suite Coverage

Este documento detalha os novos testes abrangentes criados para cobrir recursos avançados do Flow Test Engine que não estavam adequadamente testados.

## 📋 Resumo da Cobertura

### ✅ Novos Testes Criados

1. **[Advanced Iteration Testing](./tests/advanced-iteration-comprehensive-test.yaml)**
   - Range iteration com start/end/step
   - Array iteration com dados complexos
   - Dynamic iteration baseada em respostas
   - Nested iteration scenarios
   - Error handling durante iterações
   - Performance testing com iterations
   - Accumulator patterns

2. **[Advanced Retry Patterns](./tests/advanced-retry-patterns-test.yaml)**
   - Exponential backoff retry
   - Linear backoff retry
   - Fixed delay retry
   - Conditional retry baseado em status codes
   - Retry com timeout constraints
   - High-frequency retry testing
   - Retry chain testing

3. **[Performance and Response Time Testing](./tests/performance-response-time-comprehensive-test.yaml)**
   - Response time assertions (max/min/warning thresholds)
   - Load testing patterns
   - Throughput testing
   - Performance com diferentes payload sizes
   - Database simulation performance
   - API chain performance testing
   - Performance comparison tests

4. **[Conditional Execution Testing](./tests/conditional-execution-comprehensive-test.yaml)**
   - Environment-based skip logic
   - Feature flag-based execution
   - JavaScript expression conditions
   - Dynamic skip baseado em resultados anteriores
   - Always_run cleanup operations
   - Performance-based conditional execution

5. **[Advanced Assertions Testing](./tests/advanced-assertions-comprehensive-test.yaml)**
   - Regex matching (email, phone, UUID, URL)
   - Length assertions (exact, min/max, arrays)
   - Type validation (string, number, boolean, object, array)
   - OneOf assertions (strings, numbers, mixed types)
   - Complex nested object validation
   - Array element validation

6. **[Sequential vs Parallel Execution](./tests/sequential-vs-parallel-execution-test.yaml)**
   - Demonstração de diferenças entre modos
   - Timing comparisons
   - Dependency chain testing
   - Load testing patterns
   - Performance analysis

7. **[File Upload and Multipart Forms](./tests/file-upload-multipart-comprehensive-test.yaml)**
   - Text, JSON, binary file uploads
   - Image file upload simulation
   - Multiple files upload
   - Mixed form data (file + text fields)
   - Large file upload simulation
   - Chunked upload process
   - Upload validation and error scenarios

8. **[Error Handling Comprehensive](./tests/error-handling-comprehensive-test.yaml)**
   - Continue_on_failure testing
   - Timeout error handling
   - HTTP error codes (400, 401, 403, 404, 429, 500, 502, 503)
   - Error recovery and fallback
   - Graceful degradation
   - Chain failure recovery
   - Cleanup after errors

9. **[Environment and Feature Flags](./tests/environment-feature-flags-comprehensive-test.yaml)**
   - Environment detection (dev, test, staging, prod)
   - Environment-specific operations
   - Feature flag conditional execution
   - Multi-environment configuration
   - Environment-based data handling
   - Feature flag combinations

10. **[Complex Workflows](./tests/complex-workflows-ecommerce-contracts-test.yaml)**
    - Complete e-commerce flow (registration → checkout → fulfillment)
    - API contract validation
    - Microservices communication
    - End-to-end business processes
    - Workflow analytics tracking

## 🔧 Configurações Específicas

### Configurações de Execução

1. **[Sequential Only](./config/sequential-only.yml)**
   - Força execução sequencial
   - max_parallel: 1
   - Timeouts otimizados para sequential

2. **[Parallel Only](./config/parallel-only.yml)**
   - Força execução paralela
   - max_parallel: 5
   - Timeouts otimizados para parallel

3. **[Performance Testing](./config/performance-test.yml)**
   - Configuração otimizada para testes de performance
   - Timeouts reduzidos
   - Maior concorrência (max_parallel: 10)
   - Sem retries

4. **[Debug Mode](./config/debug-mode.yml)**
   - Logs detalhados
   - Timeouts estendidos
   - Execução sequencial para debug
   - Continue_on_failure habilitado

## 🧠 Smart Test Runner

O projeto agora inclui um **Smart Test Runner** que otimiza a execução dos testes:

### ✨ **Recursos do Smart Test Runner**

- 🔍 **Detecção Automática**: Verifica se o Docker já está rodando
- ⚡ **Otimização**: Não reinicia serviços que já estão ativos
- 🚀 **Execução Inteligente**: Escolhe automaticamente entre Docker e execução direta
- 📊 **Status Visual**: Mostra status dos serviços Docker
- 🔧 **Build Automático**: Constrói o projeto automaticamente quando necessário

### 📋 **Como Funciona**

1. Verifica se Docker está rodando
2. Verifica se serviços necessários (httpbin) já estão ativos
3. Inicia apenas os serviços que precisam ser iniciados
4. Executa os testes de forma otimizada
5. Opcionalmente faz cleanup após os testes

## 🎛️ Configuration Initializer (flow-test init)

O projeto agora inclui um **Configuration Initializer** interativo que facilita a criação de arquivos de configuração:

### ✨ **Recursos do Initializer**

- 🤖 **Setup Interativo**: Perguntas guiadas para configurar seu projeto
- 📋 **Templates Predefinidos**: Templates para diferentes cenários (básico, performance, CI/CD)
- 🔧 **Configuração Personalizada**: Ajuste todos os parâmetros conforme necessário
- 💾 **Geração YAML**: Gera arquivo de configuração com comentários úteis
- 📚 **Documentação Incluída**: Inclui próximos passos e comandos úteis

### 🚀 **Templates Disponíveis**

1. **basic** - Configuração sequencial simples
2. **performance** - Otimizada para testes de performance
3. **ci_cd** - Configuração para pipelines CI/CD
4. **comprehensive** - Configuração completa com todos os recursos

### 💻 **Como Usar o Initializer**

```bash
# Setup interativo (recomendado para iniciantes)
npm run init
# ou
flow-test init

# Usar template específico
npm run init:basic        # Template básico
npm run init:performance  # Template performance
npm run init:ci           # Template CI/CD
npm run init:comprehensive # Template completo

# Comandos avançados
flow-test init --template basic --output custom.yml
flow-test init --force    # Sobrescrever arquivo existente
flow-test init --help     # Ajuda detalhada
```

### 🎯 **Exemplo de Uso Interativo**

```
🚀 Flow Test Engine Configuration Setup
=====================================

📋 Project Information
----------------------
Project name (My API Test Project): E-commerce API Tests
Test directory (./tests): ./api-tests

🌐 API Configuration
--------------------
API base URL (http://localhost:3000): https://api.mystore.com
Add additional global variables? (y/N): y

Variable name (or press Enter to finish): auth_token
Value for "auth_token": {{$env.API_TOKEN}}
✅ Added: auth_token = "{{$env.API_TOKEN}}"

⚙️  Execution Configuration
---------------------------
Execution mode:
→ 1. sequential
  2. parallel
Enter choice (1-2) (1): 2
Maximum parallel executions (3): 5

✅ Configuration saved to: flow-test.config.yml
```

## 🚀 Scripts NPM Melhorados

### Executar por Configuração
```bash
npm run test:sequential    # Execução sequencial apenas
npm run test:parallel      # Execução paralela apenas
npm run test:performance   # Testes de performance
npm run test:debug         # Modo debug com logs detalhados
```

### Executar Testes Específicos
```bash
npm run test:iteration     # Testes de iteração avançada
npm run test:retry         # Testes de retry logic
npm run test:assertions    # Testes de assertions avançadas
npm run test:conditional   # Testes de execução condicional
npm run test:error-handling # Testes de error handling
npm run test:file-upload   # Testes de file upload
npm run test:environment   # Testes de environment/feature flags
npm run test:workflows     # Testes de workflows complexos
```

### Executar por Tags
```bash
npm run test:advanced      # Todos os testes avançados
npm run test:edge-cases    # Casos extremos e edge cases
```

### Gerenciamento Docker Inteligente
```bash
npm run server:status      # Verifica status dos serviços Docker
npm run server:logs        # Visualiza logs do httpbin
npm run server:docker      # Inicia apenas o httpbin
npm run server:down        # Para todos os serviços

npm run test:force-docker  # Força execução com Docker (ignora otimizações)
npm run test:cleanup       # Executa testes e faz cleanup após
```

### Comandos Principais Otimizados
```bash
npm test                   # Smart test runner (recomendado!)
npm run test:all          # Alias para npm test
npm run test:verbose       # Execução com logs detalhados
npm run test:silent        # Execução silenciosa
```

## 📊 Cobertura Alcançada

### Recursos dos Guides Agora Testados
- ✅ Range iteration (start/end/step)
- ✅ Dynamic iteration
- ✅ Retry com backoff (exponential, linear, fixed)
- ✅ Retry condicional (retry_on específicos)
- ✅ Response time assertions (max/min/warning)
- ✅ Skip logic baseado em environment/feature flags
- ✅ Always_run para cleanup
- ✅ Regex matching (matches operator)
- ✅ Length assertions com min/max
- ✅ OneOf assertions
- ✅ Type validation detalhada
- ✅ Execução sequencial vs paralelo configurável
- ✅ File upload simulation
- ✅ Multipart form data
- ✅ Continue_on_failure em diferentes cenários
- ✅ Complex workflows end-to-end
- ✅ API contract validation
- ✅ Microservices communication patterns

### Novos Padrões de Teste
- **Iteration Patterns**: Range, Array, Dynamic, Nested, Error-prone
- **Retry Strategies**: Exponential, Linear, Fixed, Conditional
- **Performance Testing**: Load, Throughput, Response time, Comparison
- **Conditional Logic**: Environment, Feature flags, JavaScript expressions
- **Data Validation**: Regex, Length, Type, OneOf, Complex nested
- **File Handling**: Upload, Multipart, Binary, Large files, Chunked
- **Error Recovery**: Fallback, Graceful degradation, Chain recovery
- **Workflow Orchestration**: E-commerce, Contract validation, Analytics

## 🎯 Casos de Uso Cobertos

### 1. **API Testing Avançado**
- Validação de contratos API
- Testes de schema e tipos
- Error handling robusto
- Performance e timing

### 2. **E-commerce Workflows**
- Customer lifecycle completo
- Cart e checkout process
- Payment processing
- Order fulfillment
- Inventory management

### 3. **Microservices Testing**
- Service-to-service communication
- Contract testing
- Error propagation
- Service dependencies

### 4. **Environment Management**
- Multi-environment deployment
- Feature flag testing
- Environment-specific configuration
- Data handling strategies

### 5. **Performance Testing**
- Load testing patterns
- Response time validation
- Throughput testing
- Resource optimization

## 📈 Melhorias na Qualidade dos Testes

### Antes (Lacunas Identificadas)
- ❌ Iteração range não testada
- ❌ Retry backoff strategies não cobertos
- ❌ Response time assertions limitadas
- ❌ Skip logic básico
- ❌ Assertions regex não testadas
- ❌ File upload não implementado
- ❌ Error handling superficial
- ❌ Workflows simples apenas

### Depois (Cobertura Completa)
- ✅ Todos os recursos dos guides testados
- ✅ Casos edge identificados e cobertos
- ✅ Padrões de erro e recovery testados
- ✅ Performance e timing validados
- ✅ Workflows complexos end-to-end
- ✅ Configurações flexíveis para diferentes cenários
- ✅ Scripts NPM para execução específica

## 🚀 Quick Start - Projeto do Zero

### 1️⃣ **Inicializar Projeto**
```bash
# Setup interativo completo
npm run init

# Ou usar template para começar rapidamente
npm run init:basic        # Para projetos simples
npm run init:performance  # Para testes de performance
npm run init:ci           # Para pipelines CI/CD
```

### 2️⃣ **Verificar Configuração**
```bash
# Ver configuração gerada
cat flow-test.config.yml

# Testar configuração (dry run)
flow-test --dry-run --detailed
```

### 3️⃣ **Executar Primeiros Testes**
```bash
# Executar com smart runner
npm test

# Ou executar testes específicos
npm run test:advanced
npm run test:sequential
```

## 🔍 Como Usar

### Executar Todos os Novos Testes
```bash
npm run test:advanced
```

### Testar Recursos Específicos
```bash
# Testar iterações avançadas
npm run test:iteration

# Testar retry logic
npm run test:retry

# Testar performance
npm run test:performance

# Testar workflows complexos
npm run test:workflows
```

### Comparar Execução Sequential vs Parallel
```bash
# Sequential
npm run test:sequential

# Parallel
npm run test:parallel
```

### Debug de Testes
```bash
npm run test:debug
```

Este conjunto abrangente de testes garante que todos os recursos avançados mencionados nos guides estejam adequadamente cobertos, proporcionando confiança na funcionalidade completa do Flow Test Engine.