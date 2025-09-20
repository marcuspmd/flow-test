/**
 * @packageDocumentation
 * Componente de navegação da sidebar V2
 */

import { BaseComponentV2 } from "../common/base-component-v2";
import { NavigationProps, NavigationItem, ThemeConfig } from "../../types";

/**
 * Renderiza a navegação hierárquica na sidebar
 */
export class NavigationComponent extends BaseComponentV2 {
  constructor(theme: ThemeConfig) {
    super(theme);
  }

  render(): string {
    return ""; // Implementação padrão vazia
  }

  renderNavigation(props: NavigationProps): string {
    const { items } = props;

    if (!items || items.length === 0) {
      return "";
    }

    return this.renderNavigationItems(items, props, 0);
  }

  private renderNavigationItems(
    items: NavigationItem[],
    props: NavigationProps,
    level: number = 0
  ): string {
    return items
      .map((item) => this.renderNavigationItem(item, props, level))
      .join("");
  }

  private renderNavigationItem(
    item: NavigationItem,
    props: NavigationProps,
    level: number
  ): string {
    const { selectedItem, config } = props;
    const isSelected = selectedItem?.id === item.id;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = item.expanded || config.autoExpand;

    const currentLevel = Number.isFinite(level) ? level : 0;
    const indent = Math.max(currentLevel, 0) * 16;
    const headerStyle = indent > 0 ? `style="padding-left: ${indent}px;"` : "";
    const selectedClass = isSelected ? "active" : "";

    const statusIndicator = this.renderStatusIndicator(item);
    const counterMarkup = config.showCounters
      ? this.renderCounter(item)
      : "";

    const searchTokens = [
      item.name,
      item.priority || "",
      (item.tags || []).join(" "),
    ]
      .filter(Boolean)
      .join(" ");

    const toggleButton = hasChildren
      ? this.html`
        <button
          type="button"
          class="toggle-btn"
          data-toggle="${item.id}"
          aria-label="Alternar ${this.escapeHtml(item.name)}"
          onclick="toggleNavItem('${item.id}'); return false;"
        >
          <span class="toggle-icon">${isExpanded ? "▼" : "▶"}</span>
        </button>`
      : "";

    const childrenHtml = hasChildren
      ? this.html`
        <ul class="nav-children ${isExpanded ? "show" : ""}">
          ${this.renderNavigationItems(item.children || [], props, level + 1)}
        </ul>`
      : "";

    return this.html`
      <li
        class="nav-item level-${currentLevel} nav-item--${item.type}"
        data-item-id="${item.id}"
        data-filterable
        data-status="${(item.status || "").toLowerCase()}"
        data-priority="${(item.priority || "").toLowerCase()}"
        data-searchable="${this.escapeHtml(searchTokens)}"
      >
        <div class="nav-item-header" ${headerStyle}>
          <a
            href="#"
            class="nav-link ${selectedClass}"
            data-item-link="${item.id}"
            onclick="selectNavItem('${item.id}'); return false;"
          >
            ${statusIndicator}
            <span class="nav-label">${this.escapeHtml(item.name)}</span>
          </a>
          <div class="nav-item-tools">
            ${counterMarkup}
            ${toggleButton}
          </div>
        </div>
        ${childrenHtml}
      </li>`;
  }

  private renderStatusIndicator(item: NavigationItem): string {
    const statusMap = {
      success: { icon: "✓", className: "status-success", label: "Success" },
      failed: { icon: "✗", className: "status-failed", label: "Failed" },
      failure: { icon: "✗", className: "status-failed", label: "Failed" },
      error: { icon: "!", className: "status-error", label: "Error" },
      skipped: { icon: "·", className: "status-skipped", label: "Skipped" },
    };

    const statusKey = (
      item.status || ""
    ).toLowerCase() as keyof typeof statusMap;
    const config = statusMap[statusKey];

    if (!config?.icon) {
      return "";
    }

    return this.html`
      <span class="nav-status ${config.className}" aria-label="${config.label}">${config.icon}</span>
    `;
  }

  private renderCounter(item: NavigationItem): string {
    if (item.type !== "suite" && item.type !== "group") {
      return "";
    }

    const childCount = item.children?.length || 0;
    if (childCount === 0) return "";

    const successCount = this.countByStatus(item.children, "success");
    const failureCount = this.countByStatus(item.children, [
      "failed",
      "error",
      "failure",
    ]);

    return this.html`
      <span class="nav-counter">
        ${
          successCount > 0
            ? this.html`
          <span class="success-count">
            ${successCount}
          </span>
        `
            : ""
        }
        ${
          failureCount > 0
            ? this.html`
          <span class="failure-count">
            ${failureCount}
          </span>
        `
            : ""
        }
      </span>
    `;
  }

  private renderEmptyState(): string {
    return this.html`
      <div class="empty-navigation text-center py-lg">
        <div class="text-4xl mb-md">📭</div>
        <p class="text-sm text-muted">
          Nenhuma suite de teste encontrada
        </p>
      </div>
    `;
  }

  private countByStatus(
    items: NavigationItem[] = [],
    status: string | string[]
  ): number {
    const statusArray = Array.isArray(status) ? status : [status];

    return items.reduce((count, item) => {
      let itemCount = statusArray.includes(item.status) ? 1 : 0;

      if (item.children) {
        itemCount += this.countByStatus(item.children, status);
      }

      return count + itemCount;
    }, 0);
  }

  /**
   * Gera o JavaScript para interações da navegação
   */
  renderNavigationScript(): string {
    return this.html`
      <script>
        window.selectNavItem = function(itemId, options) {
          const settings = options || {};

          document.querySelectorAll('.nav-link.active').forEach(link => {
            link.classList.remove('active');
          });

          const newSelected = document.querySelector(
            '.nav-link[data-item-link="' + itemId + '"]'
          );

          if (newSelected) {
            newSelected.classList.add('active');
          }

          if (typeof window.reportV2EnsureExpanded === 'function') {
            window.reportV2EnsureExpanded(itemId);
          }

          if (settings.scroll !== false) {
            // Scroll to top removed - sidebar now has its own scroll
            // window.scrollTo({ top: 0, behavior: settings.behavior || 'smooth' });
          }

          const event = new CustomEvent('nav-item-selected', {
            detail: { itemId }
          });
          document.dispatchEvent(event);

          if (settings.push !== false) {
            try {
              const current = window.history.state || {};
              if (current.nav !== itemId) {
                window.history.pushState({ nav: itemId }, '', '#' + itemId);
              }
            } catch (err) {
              console.warn('History push failed', err);
            }
          }
        };

        window.toggleNavItem = function(itemId) {
          const toggleBtn = document.querySelector(
            '.toggle-btn[data-toggle="' + itemId + '"]'
          );
          if (!toggleBtn) return;

          const navItem = toggleBtn.closest('.nav-item');
          if (!navItem) return;

          const childrenContainer = navItem.querySelector(':scope > .nav-children');
          const toggleIcon = toggleBtn.querySelector('.toggle-icon');

          if (!childrenContainer || !toggleIcon) return;

          const isExpanded = childrenContainer.classList.contains('show');
          childrenContainer.classList.toggle('show', !isExpanded);
          toggleIcon.textContent = isExpanded ? '▶' : '▼';
        };

        window.expandAllNavItems = function() {
          document.querySelectorAll('.nav-children').forEach(container => {
            container.classList.add('show');
          });
          document.querySelectorAll('.toggle-btn .toggle-icon').forEach(icon => {
            icon.textContent = '▼';
          });
        };

        window.collapseAllNavItems = function() {
          document.querySelectorAll('.nav-children').forEach(container => {
            container.classList.remove('show');
          });
          document.querySelectorAll('.toggle-btn .toggle-icon').forEach(icon => {
            icon.textContent = '▶';
          });
        };
      </script>
    `;
  }
}
