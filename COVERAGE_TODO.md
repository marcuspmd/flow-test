# TODO: Aumentar Coverage para 80% Mínimo

**Status Atual:** 61.1% de cobertura de linhas
**Meta:** 80% mínimo em todas as classes

---

## 🔴 PRIORIDADE CRÍTICA (< 30% coverage)

### 1. services/reporting/ - 0% coverage
- [ ] **index.ts** (0%) - Exportações do módulo
  - Criar testes básicos de integração dos exports

### 2. services/interpolation/ - 0% coverage  
- [ ] **index.ts** (0%) - Exportações do módulo
  - Criar testes básicos de integração dos exports

### 3. services/reporting/templates/HtmlTemplateRenderer.ts - 0.66%
- [ ] Testar método `render()` com dados válidos
- [ ] Testar geração de HTML com diferentes cenários de teste
- [ ] Testar templates de sucesso e falha
- [ ] Testar formatação de data/hora
- [ ] Testar renderização de assertions
- [ ] Testar renderização de variáveis capturadas
- [ ] Testar casos com dados ausentes/nulos

### 4. services/reporting/utils/ReportingUtils.ts - 1.04%
- [ ] Testar `calculateDuration()`
- [ ] Testar `formatTimestamp()`
- [ ] Testar `generateSummary()`
- [ ] Testar `sanitizeHtml()`
- [ ] Testar agregação de estatísticas
- [ ] Testar casos extremos (timestamps inválidos, durações negativas)

### 5. services/reporting/strategies/ - 17.14%

#### HtmlReportStrategy.ts - 11.86%
- [ ] Testar `generate()` com diferentes tipos de resultados
- [ ] Testar criação de arquivo HTML
- [ ] Testar integração com HtmlTemplateRenderer
- [ ] Testar tratamento de erros de escrita
- [ ] Testar estrutura do relatório HTML

#### JsonReportStrategy.ts - 22.72%
- [ ] Testar `generate()` com resultados completos
- [ ] Testar serialização JSON
- [ ] Testar escrita de arquivo
- [ ] Testar formatação com indent
- [ ] Testar tratamento de dados não serializáveis

#### QAReportStrategy.ts - 25%
- [ ] Testar geração de relatório QA
- [ ] Testar formatação específica para QA
- [ ] Testar métricas de qualidade
- [ ] Testar integração com sistema de CI/CD

### 6. services/input/strategies/prompt-styles/ - 26.86%

#### boxed-style.strategy.ts - 10.52%
- [ ] Testar renderização de caixa com bordas
- [ ] Testar diferentes tamanhos de texto
- [ ] Testar alinhamento
- [ ] Testar cores e formatação

#### highlighted-style.strategy.ts - 16.66%
- [ ] Testar aplicação de highlight
- [ ] Testar diferentes cores de destaque
- [ ] Testar texto multilinha

#### simple-style.strategy.ts - 16.66%
- [ ] Testar renderização simples
- [ ] Testar quebra de linha
- [ ] Testar formatação básica

#### index.ts - 50%
- [ ] Completar testes de factory pattern
- [ ] Testar seleção de estratégias
- [ ] Testar fallback para estilo padrão

### 7. test-utils/di-test-helpers.ts - 30.3%
- [ ] Testar `createTestContainer()`
- [ ] Testar `mockService()`
- [ ] Testar `resetContainer()`
- [ ] Testar helpers de binding
- [ ] Testar helpers de resolução
- [ ] Testar cleanup de containers

### 8. services/validation/validation-result.ts - 31.42%
- [ ] Testar criação de resultados de validação
- [ ] Testar agregação de erros
- [ ] Testar métodos `isValid()`, `hasWarnings()`
- [ ] Testar formatação de mensagens de erro
- [ ] Testar merge de múltiplos resultados

---

## 🟡 PRIORIDADE ALTA (30-60% coverage)

### 9. utils/response-context-builder.ts - 40%
- [ ] Testar construção de contexto com headers
- [ ] Testar construção com body JSON
- [ ] Testar construção com body text
- [ ] Testar tratamento de status codes
- [ ] Testar casos com dados ausentes

### 10. services/execution/cli-executor.service.ts - 42.1%
- [ ] Testar execução de comandos simples
- [ ] Testar execução com timeout
- [ ] Testar captura de stdout/stderr
- [ ] Testar tratamento de erros de execução
- [ ] Testar comandos com argumentos complexos
- [ ] Testar environment variables

### 11. services/http-execution-strategy.service.ts - 44.44%
- [ ] Testar estratégia de retry
- [ ] Testar timeout handling
- [ ] Testar diferentes métodos HTTP
- [ ] Testar configuração de headers
- [ ] Testar tratamento de respostas

### 12. services/configuration/env-manager.service.ts - 46.42%
- [ ] Testar carregamento de variáveis .env
- [ ] Testar precedência de variáveis
- [ ] Testar validação de variáveis obrigatórias
- [ ] Testar substituição de valores
- [ ] Testar cache de configurações

### 13. services/configuration/config-manager.service.ts - 48.14%
- [ ] Testar load de arquivo YAML
- [ ] Testar merge de configurações
- [ ] Testar validação de schema
- [ ] Testar configurações padrão
- [ ] Testar override via CLI

### 14. services/execution/hook-executor.service.ts - 51.35%
- [ ] Testar execução de pre-hooks
- [ ] Testar execução de post-hooks
- [ ] Testar hooks condicionais
- [ ] Testar propagação de erros
- [ ] Testar context sharing entre hooks
- [ ] Testar timeout de hooks

### 15. services/faker.service.ts - 51.58%
- [ ] Testar geração de emails
- [ ] Testar geração de nomes
- [ ] Testar geração de números
- [ ] Testar geração de datas
- [ ] Testar seed para resultados determinísticos
- [ ] Testar todos os métodos faker disponíveis
- [ ] Testar locale configuration

### 16. services/interpolation/strategies/environment-variable.strategy.ts - 55.55%
- [ ] Testar interpolação de `{{$env.VAR}}`
- [ ] Testar variáveis não existentes
- [ ] Testar valores vazios
- [ ] Testar fallback values
- [ ] Testar escape de caracteres especiais

### 17. services/validation/validation-context.ts - 56.25%
- [ ] Testar criação de contexto
- [ ] Testar adição de validações
- [ ] Testar execução de validações
- [ ] Testar acumulação de erros
- [ ] Testar reset de contexto

### 18. services/interpolation/strategies/faker.strategy.ts - 57.69%
- [ ] Testar interpolação `{{$faker.method}}`
- [ ] Testar nested faker methods
- [ ] Testar parâmetros para faker
- [ ] Testar métodos inválidos
- [ ] Testar formatação de saída

### 19. services/interpolation/strategies/variable.strategy.ts - 50%
- [ ] Testar interpolação de variáveis locais
- [ ] Testar interpolação de variáveis globais
- [ ] Testar variáveis não encontradas
- [ ] Testar nested variables
- [ ] Testar circular references

### 20. services/interpolation/strategies/javascript.strategy.ts - 64.15%
- [ ] Completar testes de expressões JavaScript
- [ ] Testar operações matemáticas
- [ ] Testar funções built-in
- [ ] Testar acesso a variáveis no contexto
- [ ] Testar tratamento de erros de sintaxe
- [ ] Testar execução segura (sandbox)

---

## 🟢 PRIORIDADE MÉDIA (60-80% coverage)

### 21. services/validation/strategies/pattern.validation.ts - 74%
- [ ] Testar padrões regex complexos
- [ ] Testar flags de regex
- [ ] Testar casos especiais de Unicode
- [ ] Testar mensagens de erro customizadas

### 22. utils/error-handler.ts - 20.48%
- [ ] Testar diferentes tipos de erro
- [ ] Testar stack trace formatting
- [ ] Testar error recovery strategies
- [ ] Testar logging de erros
- [ ] Testar error wrapping

### 23. services/validation/strategies/type.validation.ts - 79.62%
- [ ] Completar testes para todos os tipos
- [ ] Testar tipos complexos (arrays, objects)
- [ ] Testar type coercion
- [ ] Testar null/undefined handling

### 24. services/suite-executor.service.ts - 70.64%
- [ ] Testar execução de suite completa
- [ ] Testar ordem de execução de steps
- [ ] Testar propagação de variáveis
- [ ] Testar exports de variáveis

### 25. services/global-registry.service.ts - 75%
- [ ] Completar testes de set/get
- [ ] Testar namespacing de variáveis
- [ ] Testar clear registry
- [ ] Testar concurrent access

### 26. services/data-mapping.service.ts - 74.4%
- [ ] Testar mapeamento de objetos complexos
- [ ] Testar arrays de objetos
- [ ] Testar transformações de dados
- [ ] Testar validação de schemas

### 27. services/variable.service.ts - 78.78%
- [ ] Completar testes de resolução de variáveis
- [ ] Testar precedência de variáveis
- [ ] Testar scoping correto

---

## 📊 ESTATÍSTICAS POR MÓDULO

| Módulo | Coverage Atual | Meta | Gap |
|--------|---------------|------|-----|
| services/reporting/templates | 0.66% | 80% | +79.34% |
| services/reporting/utils | 1.04% | 80% | +78.96% |
| services/reporting/strategies | 17.14% | 80% | +62.86% |
| services/input/strategies/prompt-styles | 26.86% | 80% | +53.14% |
| test-utils | 30.3% | 80% | +49.7% |
| utils/response-context-builder | 40% | 80% | +40% |
| services/execution/cli-executor | 42.1% | 80% | +37.9% |
| services/faker | 51.58% | 80% | +28.42% |
| services/interpolation/strategies | 61.02% | 80% | +18.98% |
| services/validation | 61.32% | 80% | +18.68% |

---

## 🎯 ESTRATÉGIA DE EXECUÇÃO

### Fase 1: Quick Wins (1-2 dias)
1. Testar exports (index.ts) - trivial mas aumenta números
2. Criar testes básicos para DI helpers
3. Completar testes de services com > 70% coverage

### Fase 2: Core Features (3-5 dias)
1. Reporting strategies (HTML, JSON, QA)
2. Template renderer
3. Interpolation strategies completas
4. Validation completeness

### Fase 3: Advanced Features (2-3 dias)
1. CLI executor
2. Hook executor
3. Error handling
4. Response context builder

### Fase 4: Polish (1-2 dias)
1. Edge cases
2. Error scenarios
3. Integration tests
4. Revisão de cobertura

---

## 📝 NOTAS

- **Total de arquivos com < 80%:** ~50 arquivos
- **Maior gap:** HtmlTemplateRenderer (0.66% → 80% = +79.34%)
- **Módulo mais crítico:** services/reporting (média de 5.94%)
- **Esforço estimado:** 8-12 dias de desenvolvimento focado
- **Testes estimados a criar:** ~500-700 novos casos de teste

---

## ✅ CHECKLIST DE VALIDAÇÃO

Para cada arquivo testado:
- [ ] Coverage de statements >= 80%
- [ ] Coverage de branches >= 75%
- [ ] Coverage de functions >= 80%
- [ ] Coverage de lines >= 80%
- [ ] Todos os casos de erro testados
- [ ] Edge cases cobertos
- [ ] Testes são determinísticos
- [ ] Testes não dependem de ordem de execução
- [ ] Mocks apropriados para dependências externas

---

**Última atualização:** 2025-10-30
**Executar `npm test -- --coverage` para verificar progresso**
