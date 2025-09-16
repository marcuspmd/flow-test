# GitHub Pages Setup Instructions

## Configuração do GitHub Pages

Para ativar o GitHub Pages e fazer o deploy automático da documentação, siga estes passos:

### 1. Configurar GitHub Pages no Repositório

1. Acesse o repositório no GitHub
2. Vá em **Settings** > **Pages**
3. Em **Source**, selecione **GitHub Actions**
4. Salve as configurações

### 2. Verificar Permissões

Certifique-se de que as **Actions** têm permissão para escrever no repositório:

1. Vá em **Settings** > **Actions** > **General**
2. Em **Workflow permissions**, selecione **Read and write permissions**
3. Marque **Allow GitHub Actions to create and approve pull requests**
4. Salve as configurações

### 3. Testar o Pipeline

O pipeline será executado automaticamente quando:
- Houver push na branch `master`
- Houver pull request para a branch `master`
- For executado manualmente via **Actions** > **Deploy Documentation to GitHub Pages** > **Run workflow**

### 4. Acessar a Documentação

Após o deploy bem-sucedido, a documentação estará disponível em:
```
https://<seu-usuario>.github.io/<nome-do-repositorio>/
```

### 5. Estrutura do Workflow

O workflow `deploy-docs.yml` executa:

1. **Build Job**:
   - Faz checkout do código
   - Instala Node.js 18
   - Instala dependências com `npm ci`
   - Compila o projeto com `npm run build`
   - Gera documentação com `npm run docs`
   - Faz upload dos artefatos

2. **Deploy Job** (apenas na branch master):
   - Faz deploy dos artefatos para GitHub Pages

### 6. Comandos Locais para Testar

Para testar localmente antes do deploy:

```bash
# Instalar dependências
npm ci

# Compilar projeto
npm run build

# Gerar documentação
npm run docs

# Servir documentação localmente (opcional)
npm run docs:serve
```

### 7. Troubleshooting

Se o deploy falhar:

1. Verifique os logs nas **Actions**
2. Certifique-se de que o comando `npm run docs` funciona localmente
3. Verifique se o diretório `docs` está sendo gerado corretamente
4. Confirme que as permissões estão configuradas corretamente

### 8. Automatização

O pipeline é executado automaticamente em:
- Pushes para `master`
- Pull requests para `master`
- Execução manual via interface do GitHub

A documentação será atualizada automaticamente a cada push na branch principal.