import { BaseComponentV2 } from "../../common/base-component-v2";
import { LayoutProps } from "../../../types";

export class SidebarComponent extends BaseComponentV2 {
  renderSidebar(
    props: LayoutProps,
    filtersHtml: string,
    navigationHtml: string
  ): string {
    const { layout } = props.appState;
    if (!layout.showSidebar) {
      return "";
    }

    return this.html`
      <aside id="sidebar" class="w-80 bg-gray-50 p-4 border-r border-gray-200 flex-shrink-0 hidden md:block">
        <div class="h-full flex flex-col">
          <!-- Sidebar Header with Theme Toggle -->
          <div class="flex items-center justify-between mb-4 pb-3 border-b border-gray-300">
            <h2 class="text-lg font-semibold text-gray-900">Navigation</h2>
            <button
              onclick="toggleTheme()"
              class="p-2 rounded-md bg-gray-200 hover:bg-gray-300 transition-colors duration-200"
              title="Toggle Theme"
            >
              <span class="text-sm">🌓</span>
            </button>
          </div>

          <!-- Filters Section -->
          <div class="flex-shrink-0 mb-4">
            ${filtersHtml}
          </div>

          <!-- Navigation Section -->
          <div id="navigation-container" class="flex-1 overflow-y-auto">
            ${navigationHtml}
          </div>
        </div>
      </aside>

      <!-- Mobile Sidebar Overlay -->
      <div id="mobile-sidebar-overlay" class="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40 hidden">
        <aside class="fixed left-0 top-0 h-full w-80 bg-gray-50 p-4 transform transition-transform duration-300 ease-in-out">
          <div class="h-full flex flex-col">
            <!-- Mobile Header with Close Button -->
            <div class="flex items-center justify-between mb-4 pb-3 border-b border-gray-300">
              <h2 class="text-lg font-semibold text-gray-900">Navigation</h2>
              <div class="flex items-center space-x-2">
                <button
                  onclick="toggleTheme()"
                  class="p-2 rounded-md bg-gray-200 hover:bg-gray-300 transition-colors duration-200"
                  title="Toggle Theme"
                >
                  <span class="text-sm">🌓</span>
                </button>
                <button
                  onclick="toggleSidebar(false)"
                  class="p-2 rounded-md bg-gray-200 hover:bg-gray-300 transition-colors duration-200"
                  title="Close Navigation"
                >
                  <span class="text-sm">✕</span>
                </button>
              </div>
            </div>

            <!-- Mobile Filters -->
            <div class="flex-shrink-0 mb-4">
              ${filtersHtml}
            </div>

            <!-- Mobile Navigation -->
            <div class="flex-1 overflow-y-auto">
              ${navigationHtml}
            </div>
          </div>
        </aside>
      </div>
    `;
  }

  render(): string {
    return "";
  }
}
