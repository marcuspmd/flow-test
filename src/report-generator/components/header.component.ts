/**
 * Componente Header - Cabeçalho do relatório
 *
 * Responsabilidades:
 * - Exibir logo da aplicação
 * - Mostrar título do projeto
 * - Indicador visual de status (sucesso/falha)
 * - Toggle para alternar tema dark/light
 * - Design responsivo e acessível
 */

import { BaseComponent } from "./base-component";
import { HeaderProps } from "./types";

export class HeaderComponent extends BaseComponent {
  render(props: HeaderProps): string {
    const { projectName, logoBase64, statusClass } = props;

    return this.html`
      <header class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8 p-6 bg-secondary rounded-xl border border-default">
        <!-- Logo e título -->
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
                Relatório de Testes
              </span>
            </div>
          </div>
        </div>

        <!-- Controles do cabeçalho -->
        <div class="flex items-center gap-4">
          <!-- Data e hora -->
          <div class="hidden sm:block text-right">
            <div class="text-sm text-secondary">Gerado em</div>
            <div class="text-sm font-mono text-primary">
              ${new Date().toLocaleString("pt-BR")}
            </div>
          </div>

          <!-- Toggle de tema -->
          <button
            id="theme-toggle"
            class="btn-secondary no-print group relative overflow-hidden"
            title="Alternar tema"
            aria-label="Alternar entre tema claro e escuro"
          >
            <!-- Ícone de sol (modo claro) -->
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

            <!-- Ícone de lua (modo escuro) -->
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
