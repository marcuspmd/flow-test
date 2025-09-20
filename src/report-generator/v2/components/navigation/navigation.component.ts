import { BaseComponentV2 } from "../common/base-component-v2";
import { NavigationProps, NavigationItem, ThemeConfig } from "../../types";
import { NavItemComponent } from "./nav-item/nav-item.component";
import { NavScriptComponent } from "./nav-script/nav-script.component";

/**
 * Renderiza a navegação hierárquica na sidebar
 */
export class NavigationComponent extends BaseComponentV2 {
  private navItemComponent: NavItemComponent;
  private navScriptComponent: NavScriptComponent;

  constructor(theme: ThemeConfig) {
    super(theme);
    this.navItemComponent = new NavItemComponent(theme);
    this.navScriptComponent = new NavScriptComponent(theme);
  }

  renderNavigation(props: NavigationProps): string {
    const { items } = props;

    if (!items || items.length === 0) {
      return this.renderEmptyState();
    }

    return this.html`
      <nav class="space-y-1">
        <ul>
          ${items
            .map((item) => this.navItemComponent.renderNavItem(item, props, 0))
            .join("")}
        </ul>
      </nav>
    `;
  }

  renderNavigationScript(): string {
    return this.navScriptComponent.render();
  }

  private renderEmptyState(): string {
    return this.html`
      <div class="text-center py-8">
        <p class="text-gray-500">Nenhuma suite de teste encontrada.</p>
      </div>
    `;
  }

  render(): string {
    return "";
  }
}
