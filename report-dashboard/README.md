# Flow Test - Dashboard de Relatórios Dinâmicos

Sistema modular de visualização de relatórios de testes de API construído com **Astro + React + TypeScript + Tailwind CSS + DaisyUI**.

## 🎯 Status Atual

✅ **FASE 1: ARQUITETURA E PLANEJAMENTO - CONCLUÍDA**

> A pasta `guides/` do repositório principal é sincronizada automaticamente para `src/content/guides/` sempre que `npm run dev` ou `npm run build` são executados. Esses arquivos alimentam a área **Documentação** disponível no menu lateral do dashboard.

### O que foi implementado:

1. **Estrutura base do projeto** configurada com Astro + React + DaisyUI
2. **Sistema de tipos TypeScript** completo (`dashboard.types.ts`)
3. **Configuração JSON** flexível para layout e componentes (`dashboard.json`)
4. **Processador de dados** com JSONPath e transformações (`dataProcessor.ts`)
5. **Sistema de contexto React** para gerenciamento de estado (`ReportContext.tsx`)
6. **Comandos integrados** ao package.json principal
7. **Documentação detalhada** de arquitetura e extensibilidade

### Próximas Fases (Para Implementação):

- **FASE 2:** Componentes React (Layout, Sidebar, Header, Footer)
- **FASE 3:** Componentes de conteúdo (Cards, Tables, Charts, Tabs)
- **FASE 4:** Páginas Astro e roteamento
- **FASE 5:** Integração com dados reais, docs sincronizados e testes

## 🏗️ Arquitetura Implementada

### Estrutura de Arquivos Criada

```
report-dashboard/
├── src/
│   ├── types/
│   │   └── dashboard.types.ts      ✅ 30+ interfaces TypeScript
│   ├── config/
│   │   └── dashboard.json          ✅ Configuração completa
│   ├── utils/
│   │   ├── dataProcessor.ts        ✅ Processamento de dados
│   │   └── ReportContext.tsx       ✅ Context + hooks
│   ├── styles/
│   │   └── global.css              ✅ Tailwind + estilos customizados
│   ├── components/                 📋 Para implementar
│   ├── layouts/                    📋 Para implementar
│   ├── pages/                      📋 Para implementar
│   └── data/                       📋 Para dados JSON
├── tailwind.config.js              ✅ Configurado com DaisyUI
├── astro.config.mjs                ✅ React + build estático
└── README.md                       ✅ Este arquivo
```

### Principais Recursos Arquiteturais

#### 🧩 Sistema de Tipos (TypeScript)
```typescript
// Interfaces principais implementadas:
- ReportData          // Estrutura do results/latest.json
- DashboardConfig     // Configuração do dashboard
- ComponentConfig     // Configuração de componentes
- UIState            // Estado da interface
- SuiteResult        // Dados de suites de teste
- StepResult         // Dados de steps individuais
```

#### ⚙️ Sistema de Configuração JSON
```json
{
  "navigation": [/* Menu lateral configurável */],
  "components": {
    "overview": [/* Componentes da seção overview */],
    "suites": [/* Componentes da seção suites */]
  },
  "themes": {/* Configuração de temas */}
}
```

#### 🔄 Processamento de Dados
```typescript
// Funcionalidades implementadas:
- DataProcessor.extractByPath()      // JSONPath simples
- DataProcessor.calculateMetrics()   // Métricas automáticas
- DataProcessor.transformForComponent() // Transformações por tipo
- Formatação de durações e status
- Estatísticas por prioridade
```

#### 🎛️ Gerenciamento de Estado
```typescript
// Context React com:
- ReportProvider      // Provider principal
- useReport()         // Hook para dados
- useNavigation()     // Hook para navegação
- Persistência em localStorage
- Controle de temas DaisyUI
```

## 🚀 Comandos Configurados

```bash
# No projeto principal flow-test:
npm run report:dashboard:install    # ✅ Instalar dependências
npm run report:dashboard:dev        # ✅ Servidor de desenvolvimento
npm run report:dashboard:build      # ✅ Build para produção
npm run report:dashboard:serve      # ✅ Build + serve estático
npm run orchestrator:dev             # ✅ (raiz) Orchestrator com SSE para runs ao vivo
```

## 🔌 Integração com o Orchestrator em Tempo Real

O dashboard agora suporta monitoramento ao vivo das execuções através do **Flow Test Orchestrator**.

1. **Suba o orchestrator** a partir da raiz do projeto:
   ```bash
   npm run orchestrator:dev
   ```

2. **Configure a URL** (opcional). Por padrão o dashboard se conecta em `http://localhost:3333`. Para ambientes diferentes, defina a variável de ambiente antes de iniciar o Astro:
   ```bash
   PUBLIC_ORCHESTRATOR_URL=https://seu-orchestrator.dev npm run report:dashboard:dev
   ```

3. Acesse a nova página **Live Monitor** (`/live`) para:
   - Disparar execuções do Flow Test Engine
   - Visualizar runs em tempo real via SSE
   - Consultar histórico e repetir execuções concluídas

### 📡 Eventos SSE Disponíveis

O orchestrator expõe um endpoint dedicado para streaming de logs em tempo real:

- **URL:** `GET /logs`
- **Parâmetros opcionais:**
   - `runId` filtra os eventos de um run específico.
   - `levels` aceita uma lista separada por vírgula (`info,warn,error`).
   - `limit` controla o backlog inicial (padrão: 200 eventos mais recentes).

A resposta utiliza Server-Sent Events com os seguintes tipos:

- `runs`: entrega o snapshot inicial de sessões ativas e concluídas.
- `log`: emite cada log normalizado com metadados, status e contexto sanitizado.
- `ping`: heartbeat enviado a cada 15s para manter a conexão aberta.

Use essas informações para conectar dashboards externos ou ferramentas de observabilidade ao fluxo de logs do engine.

## 📊 Tipos de Componentes Planejados

### ✅ Já Especificados:
- **`metrics`** - Cards com estatísticas (implementado no DataProcessor)
- **`chart`** - Gráficos (transformação implementada)
- **`table`** - Tabelas (headers/rows implementados)
- **`tabs`** - Request/Response/cURL (estrutura definida)
- **`scenarios`** - Cenários condicionais (processamento implementado)
- **`code`** - Blocos de código com highlight

### 📋 Para Implementar:
- Componentes React correspondentes
- Layouts Astro
- Páginas de navegação
- Integração real com dados

## 🎨 Sistema de Temas

✅ **Configurado DaisyUI com temas:**
- `light`, `dark`, `corporate`, `emerald`, `cupcake`, `bumblebee`
- Persistência automática no localStorage
- Aplicação via `data-theme` no document

## 📈 Roadmap de Implementação

### 🔲 FASE 2: Componentes Base (4-6h)
- [ ] `AdminLayout.astro` - Layout principal com drawer
- [ ] `AdminSidebar.tsx` - Menu lateral colapsável
- [ ] `AdminHeader.tsx` - Header com breadcrumbs e tema
- [ ] `AdminFooter.tsx` - Footer informativo

### 🔲 FASE 3: Componentes de Conteúdo (6-8h)
- [ ] `MetricsCards.tsx` - Cards de estatísticas
- [ ] `RequestTabs.tsx` - Inspetor de request/response
- [ ] `SuitesTable.tsx` - Tabela de suites
- [ ] `ScenariosViewer.tsx` - Visualizador de cenários

### 🔲 FASE 4: Páginas e Roteamento (3-4h)
- [ ] `index.astro` - Dashboard overview
- [ ] `suites.astro` - Lista de suites
- [ ] `suites/[id].astro` - Detalhes de suite
- [ ] Navegação entre páginas

### 🔲 FASE 5: Integração e Testes (2-3h)
- [ ] Copiar `results/latest.json` para `src/data/`
- [ ] Testar processamento de dados real
- [ ] Validar responsividade
- [ ] Build e deploy

## 🔧 Como Continuar o Desenvolvimento

1. **Implementar Componentes Base:**
   ```bash
   cd report-dashboard
   # Criar AdminLayout.astro usando a estrutura drawer do DaisyUI
   # Implementar AdminSidebar.tsx com navigation do JSON
   ```

2. **Usar os Tipos e Utils Existentes:**
   ```tsx
   import { useReport } from '../utils/ReportContext';
   import { DataProcessor } from '../utils/dataProcessor';
   import type { ComponentConfig } from '../types/dashboard.types';
   ```

3. **Seguir a Configuração JSON:**
   - Navigation items são carregados automaticamente
   - ComponentConfig define quais componentes renderizar
   - DataProcessor transforma os dados conforme o tipo

4. **Testar com Dados Reais:**
   ```bash
   cp ../results/latest.json src/data/
   npm run dev
   ```

## ✨ Destaques da Arquitetura

### 🎯 **Extensibilidade**
- Novos componentes: só adicionar no JSON + criar componente React
- Novas seções: adicionar na navegação + criar página Astro
- Novos tipos de dados: estender interfaces TypeScript

### 🚀 **Performance**
- SSG (Static Site Generation) com Astro
- Hidratação seletiva de componentes React
- Code splitting automático

### 🎨 **Flexibilidade**
- Sistema de temas DaisyUI completo
- Layout responsivo mobile-first
- Configuração via JSON externa

### 🔒 **Robustez**
- TypeScript strict mode
- Tratamento de erros no DataProcessor
- Validação de dados de entrada

---

**Status:** ✅ **ARQUITETURA COMPLETA - Pronto para implementação dos componentes**

**Próximo Passo:** Implementar AdminLayout.astro e AdminSidebar.tsx
