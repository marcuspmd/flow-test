import { BaseComponentV2 } from "../../common/base-component-v2";
import { LayoutProps } from "../../../types";

export class HeaderComponent extends BaseComponentV2 {
  renderHeader(props: LayoutProps): string {
    return this.html`
      <header class="bg-white shadow-md p-4 flex justify-between items-center">
        <div class="flex items-center space-x-4">
          <!-- Mobile Menu Button -->
          <button
            onclick="toggleSidebar()"
            class="md:hidden p-2 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors duration-200"
            title="Open Navigation"
          >
            <span class="text-lg">☰</span>
          </button>

          <!-- Logo/Title -->
          <h1 class="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Flow Test Report
          </h1>
        </div>

        <div class="flex items-center space-x-3">
          <!-- Stats Quick View -->
          <div class="hidden sm:flex items-center space-x-4 text-sm">
            <div class="flex items-center space-x-1">
              <span class="w-2 h-2 bg-green-500 rounded-full"></span>
              <span class="text-gray-600">Online</span>
            </div>
            <div class="text-gray-400">|</div>
            <div class="text-gray-600">
              <span class="font-semibold text-green-600">42</span> tests
            </div>
          </div>

          <!-- Desktop Theme Toggle -->
          <button
            onclick="toggleTheme()"
            class="hidden md:block p-2 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors duration-200"
            title="Toggle Theme"
          >
            <span class="text-lg">🌓</span>
          </button>
        </div>
      </header>
    `;
  }

  render(): string {
    return "";
  }
}
