#!/bin/bash

# Script para rodar testes com ambiente local configurado
# Verifica se httpbin Docker está rodando antes de executar os testes

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "${SCRIPT_DIR}")"

echo "🧪 Flow Test Engine - Test Runner"
echo "=================================="

# Configurar ambiente de teste
echo "📋 Configurando ambiente de teste..."
if ! "${SCRIPT_DIR}/setup-test-env.sh"; then
    echo "❌ Falha ao configurar ambiente de teste"
    exit 1
fi

echo ""
echo "🚀 Executando testes..."
echo "=================================="

# Executar testes com configuração
cd "${PROJECT_DIR}"

# Se argumentos foram passados, use-os; caso contrário, use configuração padrão
if [ $# -eq 0 ]; then
    echo "📄 Executando com flow-test.config.yml (modo simples)"
    npm test -- --config flow-test.config.yml --simple
else
    echo "📄 Executando com argumentos customizados: $*"
    npm test -- "$@"
fi

TEST_EXIT_CODE=$?

echo ""
echo "📊 Teste concluído com código: ${TEST_EXIT_CODE}"

if [ ${TEST_EXIT_CODE} -eq 0 ]; then
    echo "✅ Todos os testes passaram!"
else
    echo "⚠️  Alguns testes falharam ou tiveram problemas."
fi

echo ""
echo "📁 Relatórios disponíveis em: ./results/"
echo "🐳 Para parar o ambiente de teste: docker stop flow-test-httpbin"

exit ${TEST_EXIT_CODE}