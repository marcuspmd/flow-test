#!/bin/bash

# Script para configurar ambiente de teste local
# Verifica e inicia o container httpbin se necessário

CONTAINER_NAME="flow-test-httpbin"
HTTPBIN_PORT="8080"
HTTPBIN_URL="http://localhost:${HTTPBIN_PORT}"

echo "🔍 Verificando ambiente de teste..."

# Função para verificar se o container está rodando
check_container() {
    docker ps --filter "name=${CONTAINER_NAME}" --filter "status=running" --format "{{.Names}}" | grep -q "${CONTAINER_NAME}"
}

# Função para verificar se o httpbin está respondendo
check_httpbin_health() {
    curl -s --max-time 5 "${HTTPBIN_URL}/get" > /dev/null 2>&1
}

# Verificar se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker não está rodando. Por favor, inicie o Docker primeiro."
    exit 1
fi

# Verificar se o container existe e está rodando
if check_container; then
    echo "✅ Container httpbin já está rodando"
else
    echo "🚀 Iniciando container httpbin..."
    
    # Parar e remover container existente se houver
    docker stop "${CONTAINER_NAME}" 2>/dev/null || true
    docker rm "${CONTAINER_NAME}" 2>/dev/null || true
    
    # Iniciar novo container
    docker run -d -p "${HTTPBIN_PORT}:80" --name "${CONTAINER_NAME}" kennethreitz/httpbin
    
    if [ $? -eq 0 ]; then
        echo "✅ Container httpbin iniciado com sucesso"
    else
        echo "❌ Erro ao iniciar container httpbin"
        exit 1
    fi
fi

# Aguardar o httpbin ficar disponível
echo "⏳ Aguardando httpbin ficar disponível..."
for i in {1..30}; do
    if check_httpbin_health; then
        echo "✅ httpbin está respondendo em ${HTTPBIN_URL}"
        break
    fi
    
    if [ $i -eq 30 ]; then
        echo "❌ Timeout aguardando httpbin responder"
        exit 1
    fi
    
    sleep 1
done

echo "🎯 Ambiente de teste pronto!"
echo "📍 httpbin URL: ${HTTPBIN_URL}"
echo ""
echo "Para parar o ambiente de teste:"
echo "   docker stop ${CONTAINER_NAME}"
echo ""