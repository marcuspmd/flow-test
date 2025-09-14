/**
 * @packageDocumentation
 * This module provides a base class for server-side HTML components,
 * offering common utilities and enforcing a standard structure.
 */

import { HTMLComponent, ComponentProps } from "./types";

/**
 * An abstract base class for creating server-side HTML components.
 * It provides common utility methods for HTML escaping, formatting, and rendering,
 * and defines the contract for all components.
 */
export abstract class BaseComponent implements HTMLComponent {
  /**
   * Abstract `render` method to be implemented by all extending components.
   * This method is responsible for generating the component's HTML representation.
   *
   * @param props - The properties required to render the component.
   * @returns An HTML string representation of the component.
   */
  abstract render(props: ComponentProps): string;

  /**
   * Escapes special HTML characters in a string to prevent Cross-Site Scripting (XSS) attacks.
   *
   * @param text - The input text to escape. Can be of any type, will be converted to a string.
   * @returns The escaped HTML string. Returns an empty string if the input is null or undefined.
   * @example
   * ```typescript
   * const escaped = this.escapeHtml('<script>alert("xss")</script>');
   * console.log(escaped); // &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;
   * ```
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
   * Formats a duration from milliseconds into a human-readable string.
   *
   * @param ms - The duration in milliseconds.
   * @returns A formatted string (e.g., "500ms", "1.2s", "1m 30s").
   */
  protected formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  }

  /**
   * Generates a unique ID for an HTML element.
   *
   * @param prefix - An optional prefix for the generated ID.
   * @returns A unique string identifier (e.g., "component-a1b2c3d4e").
   */
  protected generateId(prefix = "component"): string {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Joins a list of class names, filtering out any falsy values.
   *
   * @param classes - An array of strings or falsy values.
   * @returns A single string of space-separated class names.
   * @example
   * ```typescript
   * const active = true;
   * const classes = this.classNames('base', active && 'active', 'disabled');
   * console.log(classes); // "base active disabled"
   * ```
   */
  protected classNames(
    ...classes: (string | undefined | null | false)[]
  ): string {
    return classes.filter(Boolean).join(" ");
  }

  /**
   * Renders a list of items using a provided template function.
   *
   * @typeParam T - The type of items in the list.
   * @param items - An array of items to render.
   * @param itemRenderer - A function that takes an item and its index and returns an HTML string.
   * @returns A single HTML string containing the rendered list.
   */
  protected renderList<T>(
    items: T[],
    itemRenderer: (item: T, index: number) => string
  ): string {
    return items.map(itemRenderer).join("");
  }

  /**
   * A simple template literal tag for creating HTML strings.
   * This primarily serves as a semantic wrapper and can be extended for more advanced features.
   *
   * @param strings - The template strings array.
   * @param values - The values to be interpolated into the string.
   * @returns The resulting HTML string.
   */
  protected html(strings: TemplateStringsArray, ...values: any[]): string {
    let result = "";
    for (let i = 0; i < strings.length; i++) {
      result += strings[i];
      if (i < values.length) {
        const value = values[i];
        // For simplicity, we just convert to string. In a more advanced version,
        // this is where you might auto-escape values.
        result += typeof value === "string" ? value : String(value);
      }
    }
    return result;
  }
}
