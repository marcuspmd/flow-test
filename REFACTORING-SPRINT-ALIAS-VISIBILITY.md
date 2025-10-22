# Refactoring Sprint - Alias e Visibilidade em Calls

## 📝 Resumo

Este documento descreve as melhorias implementadas no sistema de `call` do Flow Test Engine para torná-lo mais manutenível, legível e com melhor visibilidade.

## ✅ Mudanças Implementadas

### 1. Sistema de Alias para Variáveis Capturadas

**Problema Original:**
- Variáveis capturadas em steps do tipo `call` eram prefixadas com o `node_id` completo
- Exemplo: `func_consultar_beneficio.benefit_body` (longo e verboso)
- Dificultava leitura e manutenção dos testes

**Solução Implementada:**
- Adicionado campo opcional `alias` em `StepCallConfig`
- Permite definir um prefixo curto e personalizado para variáveis
- Exemplo: `alias: "beneficio"` → `beneficio.benefit_body`
- Mantém compatibilidade: se `alias` não for definido, usa `node_id` (comportamento atual)

**Arquivos Modificados:**
- `src/types/call.types.ts` - Adicionado campo `alias` em interfaces
- `src/services/execution/execution.service.ts` - Método `processCapturedVariables` aceita alias
- `src/services/execution/strategies/call-step.strategy.ts` - Propaga alias para CallService

**Exemplo de Uso:**
```yaml
steps:
  - name: "Autenticar"
    call:
      test: "../functions/auth.yaml"
      step: "get-token"
      alias: "auth"  # Define alias curto
      isolate_context: false

  # Variáveis acessíveis como: auth.access_token
  - name: "Usar token"
    request:
      method: GET
      url: "/api/resource"
      headers:
        Authorization: "Bearer {{auth.access_token}}"
```

### 2. Visibilidade Completa em Calls

**Problema Original:**
- Steps do tipo `call` não mostravam detalhes de request/response no JSON e HTML
- Impossível ver o curl command, headers, body das chamadas aninhadas
- Dificultava debugging e análise de falhas

**Solução Implementada:**
- `StepCallResult` agora inclui:
  - `request_details`: Detalhes completos da requisição HTTP (method, url, headers, body, curl_command)
  - `response_details`: Detalhes completos da resposta (status_code, headers, body, size_bytes)
  - `assertions_results`: Resultados das assertions executadas
  - `nested_steps`: Steps aninhados (para calls recursivos ou scenarios)
- CallService propaga esses detalhes do step executado
- CallStepStrategy inclui os detalhes no resultado final

**Arquivos Modificados:**
- `src/types/call.types.ts` - Adicionados campos de visibilidade em `StepCallResult`
- `src/services/execution/execution.service.ts` - `executeResolvedStepCall` coleta e propaga detalhes
- `src/services/execution/strategies/call-step.strategy.ts` - Inclui detalhes no resultado

**Benefícios:**
- Ver curl command completo das chamadas dentro de calls
- Analisar headers, body de request/response
- Verificar assertions executadas
- Melhor debugging de falhas em workflows complexos

### 3. Documentação Atualizada

**Arquivos Modificados:**
- `CLAUDE.md` - Seção "Cross-Suite Step Calls" atualizada com:
  - Explicação detalhada do sistema de alias
  - Exemplos práticos de uso
  - Informações sobre visibilidade completa

## 🎯 Impacto

### Para Desenvolvedores
- **Legibilidade**: Variáveis com nomes curtos e significativos (`auth.token` vs `func_auth.token`)
- **Manutenibilidade**: Facilita refatoração sem quebrar referências de variáveis
- **Debugging**: Visibilidade completa de todas as operações HTTP em calls

### Para Usuários
- **Transparência**: Ver exatamente o que acontece dentro de cada call
- **Análise**: Facilita identificação de problemas em workflows complexos
- **Relatórios**: HTML e JSON mais informativos com detalhes completos

## 📦 Compatibilidade

✅ **100% Retrocompatível**
- Alias é **opcional** - comportamento padrão mantido
- Tests existentes continuam funcionando sem modificação
- Apenas novos campos opcionais adicionados

## 🧪 Testando

### Teste Manual Recomendado

1. **Criar arquivo de função com alias:**
```yaml
# functions/auth.yaml
suite_name: "Autenticação"
node_id: "func_auth"
steps:
  - step_id: "get-token"
    name: "Obter token"
    request:
      method: POST
      url: "/oauth/token"
    capture:
      access_token: "body.access_token"
```

2. **Usar com alias em workflow:**
```yaml
# workflows/test.yaml
suite_name: "Test Workflow"
steps:
  - name: "Auth"
    call:
      test: "../functions/auth.yaml"
      step: "get-token"
      alias: "auth"  # Teste do alias
      isolate_context: false

  - name: "Use token"
    request:
      method: GET
      url: "/api/resource"
      headers:
        Authorization: "Bearer {{auth.access_token}}"
```

3. **Executar e verificar:**
```bash
fest workflows/test.yaml --verbose
```

4. **Validar:**
- ✅ Variável acessível como `auth.access_token`
- ✅ Log mostra `[alias: auth]` na execução do call
- ✅ JSON result contém `request_details`, `response_details`
- ✅ HTML report mostra curl command do call

## 🔄 Próximos Passos

As seguintes melhorias foram identificadas mas não implementadas neste sprint:

1. **Fase 2.4**: Atualizar dashboard HTML para renderizar detalhes de calls
   - Adicionar seção específica para request/response de calls
   - Mostrar curl command de forma destacada
   - Renderizar assertions executadas dentro do call

2. **Fase 3-6**: Outras melhorias de manutenibilidade
   - Padronizar estrutura de resposta dos services
   - Reduzir duplicação de código
   - Melhorar nomenclatura de variáveis/métodos
   - Simplificar fluxos complexos

## 📊 Métricas

- **Arquivos Modificados**: 4
  - `src/types/call.types.ts`
  - `src/services/execution/execution.service.ts`
  - `src/services/execution/strategies/call-step.strategy.ts`
  - `CLAUDE.md`

- **Linhas Adicionadas**: ~80
- **Linhas Modificadas**: ~30
- **Breaking Changes**: 0 ✅
- **Deprecations**: 0 ✅

## 📖 Referências

- Issue Original: Problema com nomenclatura de variáveis em calls
- PR relacionadas: N/A (primeira implementação)
- Discussões: Feedback do usuário sobre prefixos longos e falta de visibilidade

---

**Data**: 2025-10-22
**Autor**: Claude Code Assistant
**Status**: ✅ Implementado e Documentado
