/**
 * @packageDocumentation
 * Tipos e interfaces para o Report Generator V2
 *
 * @remarks
 * Esta versão V2 oferece uma arquitetura mais modular com layout
 * inspirado em design systems modernos, com sidebar de navegação
 * e área de visualização expandida.
 */

// Re-export dos tipos existentes para compatibilidade
export * from "../components/types";

/**
 * Configuração do layout V2
 */
export interface LayoutConfig {
  /** Se deve mostrar a sidebar */
  showSidebar: boolean;
  /** Largura da sidebar em pixels */
  sidebarWidth: number;
  /** Tema aplicado */
  theme: ThemeConfig;
  /** Configurações de navegação */
  navigation: NavigationConfig;
}

/**
 * Configuração de tema
 */
export interface ThemeConfig {
  /** Nome do tema */
  name: string;
  /** Cores principais */
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
  };
  /** Configurações de tipografia */
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      "2xl": string;
    };
  };
  /** Espaçamento */
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  /** CSS customizado adicional */
  customCSS?: string;
}

/**
 * Configuração de navegação
 */
export interface NavigationConfig {
  /** Se deve expandir automaticamente os grupos */
  autoExpand: boolean;
  /** Se deve mostrar contadores de status */
  showCounters: boolean;
  /** Se deve mostrar ícones de prioridade */
  showPriorityIcons: boolean;
  /** Filtros ativos */
  filters: {
    status?: string[];
    priority?: string[];
    tags?: string[];
  };
}

/**
 * Item de navegação da sidebar
 */
export interface NavigationItem {
  /** ID único do item */
  id: string;
  /** Nome para exibição */
  name: string;
  /** Tipo do item */
  type: "suite" | "step" | "group";
  /** Status do item */
  status: string;
  /** Prioridade (se aplicável) */
  priority?: string;
  /** Tags (se aplicável) */
  tags?: string[];
  /** Filhos (para grupos) */
  children?: NavigationItem[];
  /** Se está expandido */
  expanded?: boolean;
  /** Dados adicionais */
  data?: any;
}

/**
 * Estado da aplicação V2
 */
export interface AppState {
  /** Item atualmente selecionado */
  selectedItem?: NavigationItem;
  /** Configuração do layout */
  layout: LayoutConfig;
  /** Dados dos testes */
  testData: any;
  /** Estado de filtros */
  filters: {
    search: string;
    status: string[];
    priority: string[];
    tags: string[];
  };
}

/**
 * Props para componentes de layout
 */
export interface LayoutProps {
  /** Estado da aplicação */
  appState: AppState;
  /** Callback para mudanças de estado */
  onStateChange?: (newState: Partial<AppState>) => void;
  /** Conteúdo a ser renderizado */
  children?: string;
  /** HTML pronto para injetar na navegação da sidebar */
  navigationHtml?: string;
  /** Script adicional relacionado à navegação */
  navigationScript?: string;
  /** HTML customizado para filtros da sidebar */
  filtersHtml?: string;
}

/**
 * Props para componentes de navegação
 */
export interface NavigationProps {
  /** Itens de navegação */
  items: NavigationItem[];
  /** Item selecionado */
  selectedItem?: NavigationItem;
  /** Configuração de navegação */
  config: NavigationConfig;
  /** Callback para seleção */
  onSelect?: (item: NavigationItem) => void;
  /** Callback para expansão/colapso */
  onToggle?: (item: NavigationItem) => void;
}

/**
 * Props para área de detalhes
 */
export interface DetailsPanelProps {
  /** Item atualmente selecionado */
  selectedItem?: NavigationItem;
  /** Itens completos da navegação */
  navigationItems: NavigationItem[];
  /** Configuração do tema */
  theme: ThemeConfig;
  /** Dados completos do teste */
  testData: any;
}

/**
 * Configuração de componentes modulares
 */
export interface ComponentConfig {
  /** Se deve renderizar o componente */
  enabled: boolean;
  /** Configurações específicas */
  settings?: Record<string, any>;
  /** CSS customizado */
  customCSS?: string;
}

/**
 * Configuração completa do report V2
 */
export interface ReportConfigV2 {
  /** Configuração de layout */
  layout: LayoutConfig;
  /** Configuração de componentes */
  components: {
    header: ComponentConfig;
    sidebar: ComponentConfig;
    navigation: ComponentConfig;
    detailsPanel: ComponentConfig;
    summary: ComponentConfig;
    footer: ComponentConfig;
  };
  /** Metadados do report */
  metadata: {
    title: string;
    description?: string;
    version: string;
    generatedAt: string;
    author?: string;
  };
}
