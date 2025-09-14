/**
 * @packageDocumentation
 * This module contains the `HeaderComponent` for the HTML report.
 *
 * @remarks
 * The header is responsible for displaying:
 * - Application logo and project title.
 * - A visual status indicator (success/failure).
 * - A theme toggle for dark/light mode.
 * - Generation timestamp.
 * It is designed to be responsive and accessible.
 */

import { BaseComponent } from "./base-component";
import { HeaderProps } from "./types";

/**
 * The main header component for the HTML report.
 */
export class HeaderComponent extends BaseComponent {
  /**
   * Renders the header component with project information and controls.
   *
   * @param props - The properties required to render the header.
   * @returns An HTML string representing the header.
   */
  render(props: HeaderProps): string {
    const { projectName, logoBase64, statusClass } = props;

    return this.html`
      <header class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8 p-6 bg-secondary rounded-xl border border-default">
        <!-- Logo and Title -->
        <div class="flex items-center gap-6">
          <div class="flex-shrink-0">
            <img
              src="${logoBase64}"
              alt="Flow Test Logo"
              class="h-16 w-16 sm:h-20 sm:w-20 object-contain rounded-xl shadow-lg bg-primary/10"
              loading="eager"
            />
          </div>

          <div class="flex flex-col gap-2">
            <h1 class="text-2xl sm:text-4xl font-bold text-primary leading-tight">
              ${this.escapeHtml(projectName)}
            </h1>
            <div class="flex items-center gap-3">
              <div class="w-3 h-3 rounded-full ${statusClass} shadow-sm"></div>
              <span class="text-sm text-secondary font-medium">
                Test Report
              </span>
            </div>
          </div>
        </div>

        <!-- Header Controls -->
        <div class="flex items-center gap-4">
          <!-- Timestamp -->
          <div class="hidden sm:block text-right">
            <div class="text-sm text-secondary">Generated on</div>
            <div class="text-sm font-mono text-primary">
              ${new Date().toLocaleString()}
            </div>
          </div>

          <!-- Theme Toggle -->
          <button
            id="theme-toggle"
            class="btn-secondary no-print group relative overflow-hidden"
            title="Toggle theme"
            aria-label="Toggle between light and dark theme"
          >
            <!-- Sun icon (light mode) -->
            <svg
              id="theme-toggle-light-icon"
              class="w-5 h-5 transition-transform group-hover:scale-110"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 5.05A1 1 0 003.636 6.464l.707.707a1 1 0 001.414-1.414l-.707-.707zM3 11a1 1 0 100-2H2a1 1 0 100 2h1zm7.536 2.464a1 1 0 01-1.414 0l-.707-.707a1 1 0 011.414-1.414l.707.707a1 1 0 010 1.414zM13.536 6.464a1 1 0 01-1.414 0l-.707-.707a1 1 0 011.414-1.414l.707.707a1 1 0 010 1.414z"
                clip-rule="evenodd"
              />
            </svg>

            <!-- Moon icon (dark mode) -->
            <svg
              id="theme-toggle-dark-icon"
              class="w-5 h-5 hidden transition-transform group-hover:scale-110"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>

            <span class="sr-only">Toggle theme</span>
          </button>
        </div>
      </header>
    `;
  }
}
