/**
 * @packageDocumentation
 * Sistema de temas para o Report Generator V2
 */

import { ThemeConfig } from "../types";

/**
 * Tema padrão - Design limpo e moderno
 */
export const defaultTheme: ThemeConfig = {
  name: "default",
  colors: {
    primary: "#3b82f6", // blue-500
    secondary: "#6b7280", // gray-500
    success: "#10b981", // emerald-500
    warning: "#f59e0b", // amber-500
    error: "#ef4444", // red-500
    background: "#ffffff", // white
    surface: "#f8fafc", // slate-50
    text: "#1f2937", // gray-800
    textSecondary: "#6b7280", // gray-500
  },
  typography: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: {
      xs: "0.75rem", // 12px
      sm: "0.875rem", // 14px
      base: "1rem", // 16px
      lg: "1.125rem", // 18px
      xl: "1.25rem", // 20px
      "2xl": "1.5rem", // 24px
    },
  },
  spacing: {
    xs: "0.25rem", // 4px
    sm: "0.5rem", // 8px
    md: "1rem", // 16px
    lg: "1.5rem", // 24px
    xl: "2rem", // 32px
  },
};

/**
 * Tema escuro
 */
export const darkTheme: ThemeConfig = {
  name: "dark",
  colors: {
    primary: "#60a5fa", // blue-400
    secondary: "#9ca3af", // gray-400
    success: "#34d399", // emerald-400
    warning: "#fbbf24", // amber-400
    error: "#f87171", // red-400
    background: "#111827", // gray-900
    surface: "#1f2937", // gray-800
    text: "#f9fafb", // gray-50
    textSecondary: "#d1d5db", // gray-300
  },
  typography: defaultTheme.typography,
  spacing: defaultTheme.spacing,
};

/**
 * Tema de alto contraste para acessibilidade
 */
export const highContrastTheme: ThemeConfig = {
  name: "high-contrast",
  colors: {
    primary: "#0066cc",
    secondary: "#666666",
    success: "#006600",
    warning: "#ff6600",
    error: "#cc0000",
    background: "#ffffff",
    surface: "#f5f5f5",
    text: "#000000",
    textSecondary: "#333333",
  },
  typography: {
    ...defaultTheme.typography,
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  spacing: {
    xs: "0.5rem", // Espaçamento maior para acessibilidade
    sm: "0.75rem",
    md: "1.25rem",
    lg: "2rem",
    xl: "2.5rem",
  },
};

/**
 * Tema compacto para relatórios com muitos dados
 */
export const compactTheme: ThemeConfig = {
  name: "compact",
  colors: defaultTheme.colors,
  typography: {
    ...defaultTheme.typography,
    fontSize: {
      xs: "0.625rem", // 10px
      sm: "0.75rem", // 12px
      base: "0.875rem", // 14px
      lg: "1rem", // 16px
      xl: "1.125rem", // 18px
      "2xl": "1.25rem", // 20px
    },
  },
  spacing: {
    xs: "0.125rem", // 2px
    sm: "0.25rem", // 4px
    md: "0.5rem", // 8px
    lg: "0.75rem", // 12px
    xl: "1rem", // 16px
  },
};

/**
 * Coleção de todos os temas disponíveis
 */
export const themes: Record<string, ThemeConfig> = {
  default: defaultTheme,
  dark: darkTheme,
  "high-contrast": highContrastTheme,
  compact: compactTheme,
};

/**
 * Gera o CSS do tema
 */
export function generateThemeCSS(theme: ThemeConfig): string {
  return `
    :root {
      /* Cores */
      --color-primary: ${theme.colors.primary};
      --color-secondary: ${theme.colors.secondary};
      --color-success: ${theme.colors.success};
      --color-warning: ${theme.colors.warning};
      --color-error: ${theme.colors.error};
      --color-background: ${theme.colors.background};
      --color-surface: ${theme.colors.surface};
      --color-text: ${theme.colors.text};
      --color-text-secondary: ${theme.colors.textSecondary};

      /* Tipografia */
      --font-family: ${theme.typography.fontFamily};
      --font-size-xs: ${theme.typography.fontSize.xs};
      --font-size-sm: ${theme.typography.fontSize.sm};
      --font-size-base: ${theme.typography.fontSize.base};
      --font-size-lg: ${theme.typography.fontSize.lg};
      --font-size-xl: ${theme.typography.fontSize.xl};
      --font-size-2xl: ${theme.typography.fontSize["2xl"]};

      /* Espaçamento */
      --spacing-xs: ${theme.spacing.xs};
      --spacing-sm: ${theme.spacing.sm};
      --spacing-md: ${theme.spacing.md};
      --spacing-lg: ${theme.spacing.lg};
      --spacing-xl: ${theme.spacing.xl};
    }

    body {
      font-family: var(--font-family);
      font-size: var(--font-size-base);
      color: var(--color-text);
      background-color: var(--color-background);
      margin: 0;
      padding: 0;
    }

    /* Classes utilitárias baseadas no tema */
    .bg-primary { background-color: var(--color-primary); }
    .bg-secondary { background-color: var(--color-secondary); }
    .bg-success { background-color: var(--color-success); }
    .bg-warning { background-color: var(--color-warning); }
    .bg-error { background-color: var(--color-error); }
    .bg-background { background-color: var(--color-background); }
    .bg-surface { background-color: var(--color-surface); }

    .text-primary { color: var(--color-primary); }
    .text-secondary { color: var(--color-secondary); }
    .text-success { color: var(--color-success); }
    .text-warning { color: var(--color-warning); }
    .text-error { color: var(--color-error); }
    .text-default { color: var(--color-text); }
    .text-muted { color: var(--color-text-secondary); }

    .text-xs { font-size: var(--font-size-xs); }
    .text-sm { font-size: var(--font-size-sm); }
    .text-base { font-size: var(--font-size-base); }
    .text-lg { font-size: var(--font-size-lg); }
    .text-xl { font-size: var(--font-size-xl); }
    .text-2xl { font-size: var(--font-size-2xl); }

    .p-xs { padding: var(--spacing-xs); }
    .p-sm { padding: var(--spacing-sm); }
    .p-md { padding: var(--spacing-md); }
    .p-lg { padding: var(--spacing-lg); }
    .p-xl { padding: var(--spacing-xl); }

    .m-xs { margin: var(--spacing-xs); }
    .m-sm { margin: var(--spacing-sm); }
    .m-md { margin: var(--spacing-md); }
    .m-lg { margin: var(--spacing-lg); }
    .m-xl { margin: var(--spacing-xl); }

    ${theme.customCSS || ""}
  `;
}

/**
 * Obtém um tema por nome, retorna o padrão se não encontrar
 */
export function getTheme(name: string): ThemeConfig {
  return themes[name] || defaultTheme;
}

/**
 * Lista todos os temas disponíveis
 */
export function getAvailableThemes(): string[] {
  return Object.keys(themes);
}
