/**
 * @packageDocumentation
 * Componente base para o Report Generator V2
 */

import { ThemeConfig } from "../../types";

/**
 * Interface base para todos os componentes V2
 */
export interface ComponentV2 {
  render(): string;
}

/**
 * Classe base abstrata para componentes V2
 */
export abstract class BaseComponentV2 implements ComponentV2 {
  protected theme: ThemeConfig;

  constructor(theme: ThemeConfig) {
    this.theme = theme;
  }

  /**
   * Método abstrato que deve ser implementado por cada componente
   */
  abstract render(): string;

  /**
   * Template literal helper para HTML com syntax highlighting
   */
  protected html(strings: TemplateStringsArray, ...values: any[]): string {
    return strings.reduce((result, string, i) => {
      const value = i < values.length ? values[i] : "";
      const normalized = value === null || value === undefined ? "" : value;
      return result + string + normalized;
    }, "");
  }

  /**
   * Escapa HTML para prevenir XSS
   */
  protected escapeHtml(value: unknown): string {
    if (value === null || value === undefined) {
      return "";
    }

    const text = String(value);

    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /**
   * Formata JSON de forma legível
   */
  protected formatJSON(obj: any, indent: number = 2): string {
    try {
      return JSON.stringify(obj, null, indent);
    } catch (e) {
      return String(obj);
    }
  }

  /**
   * Gera ID único para elementos
   */
  protected generateId(prefix: string = "component"): string {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Aplica classes CSS com base no tema
   */
  protected getThemeClass(
    variant: "primary" | "secondary" | "success" | "warning" | "error"
  ): string {
    const baseClasses = "px-3 py-2 rounded font-medium transition-colors";

    switch (variant) {
      case "primary":
        return (
          `${baseClasses} text-white` +
          ` hover:opacity-90 focus:ring-2 focus:ring-offset-2`
        );
      case "secondary":
        return (
          `${baseClasses} bg-surface text-secondary border border-gray-300` +
          ` hover:bg-gray-50 focus:ring-2 focus:ring-offset-2`
        );
      case "success":
        return (
          `${baseClasses} text-white` +
          ` hover:opacity-90 focus:ring-2 focus:ring-offset-2`
        );
      case "warning":
        return (
          `${baseClasses} text-white` +
          ` hover:opacity-90 focus:ring-2 focus:ring-offset-2`
        );
      case "error":
        return (
          `${baseClasses} text-white` +
          ` hover:opacity-90 focus:ring-2 focus:ring-offset-2`
        );
      default:
        return baseClasses;
    }
  }

  /**
   * Obtém ícone baseado no status
   */
  protected getStatusIcon(status: string): string {
    switch (status.toLowerCase()) {
      case "success":
      case "passed":
        return "✅";
      case "failure":
      case "failed":
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      case "skipped":
        return "⏭️";
      case "running":
        return "🔄";
      default:
        return "📋";
    }
  }

  /**
   * Obtém cor baseada no status
   */
  protected getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case "success":
      case "passed":
        return "text-success";
      case "failure":
      case "failed":
      case "error":
        return "text-error";
      case "warning":
        return "text-warning";
      case "skipped":
        return "text-secondary";
      case "running":
        return "text-primary";
      default:
        return "text-default";
    }
  }

  /**
   * Formata duração em ms para formato legível
   */
  protected formatDuration(durationMs: number): string {
    if (durationMs < 1000) {
      return `${durationMs}ms`;
    } else if (durationMs < 60000) {
      return `${(durationMs / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(durationMs / 60000);
      const seconds = ((durationMs % 60000) / 1000).toFixed(1);
      return `${minutes}m ${seconds}s`;
    }
  }

  /**
   * Formata timestamp para formato legível
   */
  protected formatTimestamp(timestamp: string | Date): string {
    const date =
      typeof timestamp === "string" ? new Date(timestamp) : timestamp;
    return date.toLocaleString("pt-BR");
  }

  /**
   * Trunca texto se for muito longo
   */
  protected truncateText(text: string, maxLength: number = 100): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  }

  /**
   * Gera CSS inline para cores do tema
   */
  protected getInlineStyle(
    property: string,
    value: keyof ThemeConfig["colors"]
  ): string {
    return `${property}: ${this.theme.colors[value]};`;
  }

  /**
   * Gera atributos de acessibilidade
   */
  protected getA11yAttributes(options: {
    role?: string;
    label?: string;
    describedBy?: string;
    expanded?: boolean;
  }): string {
    const attrs: string[] = [];

    if (options.role) {
      attrs.push(`role="${options.role}"`);
    }
    if (options.label) {
      attrs.push(`aria-label="${this.escapeHtml(options.label)}"`);
    }
    if (options.describedBy) {
      attrs.push(`aria-describedby="${options.describedBy}"`);
    }
    if (options.expanded !== undefined) {
      attrs.push(`aria-expanded="${options.expanded}"`);
    }

    return attrs.join(" ");
  }

  /**
   * Renderiza botão com tema
   */
  protected renderButton(options: {
    text: string;
    variant?: "primary" | "secondary" | "success" | "warning" | "error";
    onclick?: string;
    disabled?: boolean;
    id?: string;
    className?: string;
  }): string {
    const {
      text,
      variant = "primary",
      onclick,
      disabled = false,
      id,
      className = "",
    } = options;

    const buttonId = id || this.generateId("btn");
    const variantClass = this.getThemeClass(variant);
    const disabledClass = disabled
      ? "opacity-50 cursor-not-allowed"
      : "cursor-pointer";
    const colorStyle = this.getInlineStyle("background-color", variant);

    return this.html`
      <button
        id="${buttonId}"
        class="${variantClass} ${disabledClass} ${className}"
        style="${colorStyle}"
        ${onclick ? `onclick="${onclick}"` : ""}
        ${disabled ? "disabled" : ""}
        ${this.getA11yAttributes({ role: "button" })}
      >
        ${this.escapeHtml(text)}
      </button>
    `;
  }

  /**
   * Renderiza badge de status
   */
  protected renderStatusBadge(status: string, className: string = ""): string {
    const icon = this.getStatusIcon(status);
    const color = this.getStatusColor(status);

    return this.html`
      <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${color} ${className}">
        <span class="mr-1">${icon}</span>
        ${this.escapeHtml(status)}
      </span>
    `;
  }
}
