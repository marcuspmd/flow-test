#!/bin/bash
# Script para criar estrutura de testes faltantes

echo "🚀 Criando estrutura de testes para módulos críticos..."

# Criar diretórios de teste
mkdir -p src/services/validation/__tests__
mkdir -p src/services/interpolation/strategies/__tests__
mkdir -p src/services/input/strategies/__tests__
mkdir -p src/services/input/strategies/prompt-styles/__tests__
mkdir -p src/utils/error-handling/__tests__
mkdir -p src/utils/error-handling/handlers/__tests__

echo "✅ Diretórios criados"

# Listar arquivos sem testes (< 50% coverage)
echo ""
echo "📊 Arquivos prioritários sem testes adequados:"
echo "1. services/validation/validation-result.ts (31.42%)"
echo "2. services/validation/validation-context.ts (56.25%)"
echo "3. utils/error-handler.ts (20.48%)"
echo "4. services/faker.service.ts (51.58%)"
echo ""
echo "✅ Estrutura pronta. Execute os próximos passos manualmente."
