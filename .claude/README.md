# Claude Code Configuration

Este diretório contém configurações e skills para Claude Code ao trabalhar com o projeto Flow Test Engine.

## Skills Disponíveis

### flow-test-generator

Skill especializada para auxiliar na criação de novos fluxos de teste de API em YAML.

**Quando usar:**
- Criar novos testes de API
- Identificar oportunidades de reutilização de fluxos existentes
- Entender como usar dependencies para compartilhar variáveis entre fluxos
- Seguir as melhores práticas do Flow Test Engine

**Como usar:**
Simplesmente mencione que você quer criar um novo fluxo de teste ou peça ajuda com testes de API, e o Claude utilizará automaticamente esta skill.

**Recursos da skill:**
- Descoberta automática de fluxos existentes
- Identificação de variáveis exportadas reutilizáveis
- Templates e exemplos prontos
- Checklist de boas práticas
- Guia completo de recursos avançados (dependencies, iterations, scenarios, etc.)

## Estrutura

```
.claude/
├── README.md                          # Este arquivo
└── skills/
    └── flow-test-generator.md        # Skill para geração de flows
```

## Mais Informações

Para mais detalhes sobre o Flow Test Engine, consulte:
- `CLAUDE.md` - Instruções principais para Claude Code
- `guides/` - Documentação completa do projeto
- `guides/8.AI-flow-authoring-recipe.md` - Guia específico para criação de flows com IA
