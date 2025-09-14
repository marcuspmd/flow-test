/**
 * Classe base para componentes HTML server-side
 * Fornece utilidades comuns e escaping de HTML
 */
import { HTMLComponent, ComponentProps } from "./types";

export abstract class BaseComponent implements HTMLComponent {
  /**
   * Método abstrato que deve ser implementado por cada componente
   */
  abstract render(props: ComponentProps): string;

  /**
   * Escapa caracteres especiais HTML para prevenir XSS
   */
  protected escapeHtml(text: any): string {
    if (text === null || text === undefined) return "";

    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return String(text).replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * Formata duração em milissegundos para string legível
   */
  protected formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  }

  /**
   * Gera ID único para elementos
   */
  protected generateId(prefix = "component"): string {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cria classes CSS condicionais
   */
  protected classNames(
    ...classes: (string | undefined | null | false)[]
  ): string {
    return classes.filter(Boolean).join(" ");
  }

  /**
   * Renderiza lista de itens com template
   */
  protected renderList<T>(
    items: T[],
    itemRenderer: (item: T, index: number) => string
  ): string {
    return items.map(itemRenderer).join("");
  }

  /**
   * Wrapper para template literals seguros
   */
  protected html(strings: TemplateStringsArray, ...values: any[]): string {
    let result = "";
    for (let i = 0; i < strings.length; i++) {
      result += strings[i];
      if (i < values.length) {
        const value = values[i];
        result += typeof value === "string" ? value : String(value);
      }
    }
    return result;
  }
}
