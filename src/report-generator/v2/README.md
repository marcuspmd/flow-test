# Flow Test Report Generator V2

Uma versão completamente reformulada do gerador de relatórios HTML com design moderno, arquitetura componetizada e layout expandido inspirado em design systems.

## 🎯 Principais Melhorias da V2

### Layout e Design
- **Layout Sidebar**: Navegação hierárquica em sidebar lateral
- **Área Expandida**: Mais espaço para visualização de detalhes dos testes
- **Design Moderno**: Interface inspirada em design systems como o exemplo do SoftwareBrothers
- **Responsivo**: Funciona bem em desktop e mobile

### Arquitetura
- **Componentização**: Componentes menores e mais focados
- **Modularidade**: Fácil de estender e customizar
- **Separação de Responsabilidades**: Cada componente tem uma função específica
- **Tipagem Forte**: TypeScript com tipos bem definidos

### Funcionalidades
- **Sistema de Temas**: Múltiplos temas (padrão, escuro, alto contraste, compacto)
- **Filtros Avançados**: Busca, filtros por status e prioridade
- **Navegação Interativa**: Expand/collapse, seleção de itens
- **Área de Detalhes Rica**: Visualização ampla com tabs organizadas

## 📁 Estrutura de Arquivos

```
src/report-generator/v2/
├── components/
│   ├── common/
│   │   └── base-component-v2.ts     # Classe base para componentes
│   ├── layout/
│   │   ├── main-layout.component.ts  # Layout principal da aplicação
│   │   └── details-panel.component.ts # Painel de detalhes expandido
│   ├── navigation/
│   │   └── navigation.component.ts   # Componente de navegação da sidebar
│   └── test-step/
│       ├── assertions.component.ts   # Componente de assertions (dividido)
│       └── request-response.component.ts # Componente de req/res (dividido)
├── themes/
│   └── index.ts                     # Sistema de temas
├── types.ts                         # Tipos e interfaces V2
├── index.ts                         # Exports principais
├── report-generator-v2.ts           # Gerador principal
├── examples.ts                      # Exemplos de uso
└── README.md                        # Esta documentação
```

## 🚀 Como Usar

### Uso Básico

```typescript
import { ReportGeneratorV2 } from './src/report-generator/v2/report-generator-v2';

const gerador = new ReportGeneratorV2();

await gerador.generateReport(
  dadosDosTestes,
  './results/report-v2.html'
);
```

### Com Temas

```typescript
// Tema escuro
await gerador.generateReport(
  dadosDosTestes,
  './results/report-dark.html',
  { theme: 'dark' }
);

// Tema de alto contraste
await gerador.generateReport(
  dadosDosTestes,
  './results/report-accessible.html',
  { theme: 'high-contrast' }
);
```

### Configuração Customizada

```typescript
import { ReportGeneratorV2, getTheme } from './src/report-generator/v2';

const gerador = new ReportGeneratorV2({
  layout: {
    showSidebar: true,
    sidebarWidth: 400,
    theme: getTheme('compact'),
    navigation: {
      autoExpand: false,
      showCounters: true,
      showPriorityIcons: true,
      filters: {}
    }
  },
  components: {
    header: { enabled: true },
    sidebar: { enabled: true },
    navigation: { enabled: true },
    detailsPanel: { enabled: true },
    summary: { enabled: true },
    footer: { enabled: false }
  }
});
```

## 🎨 Temas Disponíveis

### `default`
Tema padrão com cores azuis e design limpo.

### `dark`
Tema escuro para reduzir fadiga visual.

### `high-contrast`
Tema de alto contraste para acessibilidade.

### `compact`
Tema com espaçamentos reduzidos para relatórios densos.

## 🧩 Componentes Modulares

### `MainLayoutComponent`
Layout principal com sidebar e área de conteúdo.

### `DetailsPanelComponent`
Painel principal de detalhes com visualização expandida.

### `NavigationComponent`
Navegação hierárquica na sidebar com filtros.

### `AssertionsComponent`
Componente focado apenas em assertions.

### `RequestResponseComponent`
Componente para detalhes de request/response.

## 📊 Comparação V1 vs V2

| Aspecto | V1 | V2 |
|---------|----|----|
| **Layout** | Vertical stacked | Sidebar + Main area |
| **Espaço** | Limitado | Expandido |
| **Componentes** | Monolíticos (1000+ linhas) | Modulares (100-300 linhas) |
| **Temas** | CSS fixo | Sistema de temas flexível |
| **Navegação** | Sequencial | Hierárquica com filtros |
| **Customização** | Difícil | Fácil via configuração |
| **Responsivo** | Básico | Completo |

## 🛠️ Desenvolvimento

### Executar Exemplos

```bash
# Compilar TypeScript
npm run build

# Executar exemplos
node dist/report-generator/v2/examples.js
```

### Estrutura de Dados

A V2 aceita os mesmos dados da V1, mas com estrutura interna otimizada:

```typescript
interface AggregatedResultV2 {
  project_name?: string;
  total_tests?: number;
  successful_tests?: number;
  failed_tests?: number;
  success_rate?: number;
  total_duration_ms?: number;
  suites_results?: SuiteResultV2[];
  metadata?: {
    version: string;
    environment?: string;
    author?: string;
  };
}
```

### Extendendo Componentes

```typescript
import { BaseComponentV2 } from './components/common/base-component-v2';

class MeuComponenteCustom extends BaseComponentV2 {
  render(): string {
    return this.html`
      <div class="meu-componente">
        <h3>Componente Customizado</h3>
        ${this.renderStatusBadge('success')}
      </div>
    `;
  }
}
```

## 🔄 Migração da V1 para V2

### 1. **Manter V1 Funcionando**
A V2 não substitui a V1 - ambas coexistem.

### 2. **Testar Gradualmente**
Use a V2 em paralelo para comparar resultados.

### 3. **Configurar Conforme Necessário**
Ajuste temas e layout conforme suas necessidades.

### 4. **Feedback e Iteração**
A V2 é projetada para ser facilmente modificável.

## 📝 Scripts Úteis

```bash
# Gerar relatório V2 com tema padrão
npm run report:v2

# Gerar relatório V2 com tema escuro
npm run report:v2:dark

# Gerar todos os exemplos da V2
npm run report:v2:examples
```

## 🎯 Roadmap

- [ ] **Suporte a Plugins**: Sistema de plugins para extensões
- [ ] **Export em PDF**: Geração nativa de PDF além de HTML
- [ ] **Live Updates**: Atualização em tempo real durante execução
- [ ] **Temas Customizáveis**: Editor visual de temas
- [ ] **Comparação de Runs**: Comparar execuções diferentes
- [ ] **Integração CI/CD**: Comentários automáticos em PRs

## 💡 Contribuindo

1. **Identifique Necessidades**: Que funcionalidades estão faltando?
2. **Crie Componentes**: Novos componentes seguindo o padrão
3. **Adicione Temas**: Novos temas para casos específicos
4. **Documente**: Atualize esta documentação
5. **Teste**: Garanta que tudo funciona nos diferentes cenários

## 🐛 Problemas Conhecidos

- [ ] **Performance**: Com muitos testes, pode ser lento
- [ ] **IE Support**: Não há suporte para Internet Explorer
- [ ] **Mobile UX**: Navegação mobile pode ser melhorada

## 📞 Suporte

Para dúvidas sobre a V2:
1. Verifique os exemplos em `examples.ts`
2. Consulte a documentação dos componentes
3. Abra uma issue no repositório