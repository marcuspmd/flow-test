/**
 * Header Component - Top navigation and branding
 * Includes project title, logo, theme toggle, and navigation controls
 */
class Header {
  constructor(data, options = {}) {
    this.data = data;
    this.options = {
      showLogo: true,
      showThemeToggle: true,
      showMetrics: true,
      logoPath: null,
      ...options
    };
    this.element = null;
  }

  render(targetElement) {
    this.element = this.createElement();
    if (targetElement) {
      targetElement.appendChild(this.element);
    }
    this.attachEventListeners();
    return this.element;
  }

  createElement() {
    const header = document.createElement('header');
    header.className = 'bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-300';

    const successRate = this.data.success_rate || 0;
    const statusColor = this.getStatusColor(successRate);

    header.innerHTML = `
      <div class="flex flex-col space-y-4 lg:space-y-0 lg:flex-row lg:items-center lg:justify-between">
        <!-- Left Section: Logo and Title -->
        <div class="flex items-center space-x-4">
          ${this.options.showLogo ? this.renderLogo() : ''}

          <div class="flex items-center space-x-3">
            <h1 class="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
              ${this.escapeHtml(this.data.project_name || 'Test Report')}
            </h1>

            <!-- Status Indicator -->
            <div class="flex items-center space-x-2">
              <div class="w-3 h-3 rounded-full ${statusColor} animate-pulse"></div>
              <span class="text-sm font-medium ${this.getStatusTextColor(successRate)}">
                ${successRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <!-- Right Section: Controls and Metrics -->
        <div class="flex items-center justify-between lg:justify-end space-x-4">
          ${this.options.showMetrics ? this.renderQuickMetrics() : ''}

          <!-- Controls -->
          <div class="flex items-center space-x-2">
            <!-- Export Menu -->
            <div class="relative">
              <button id="export-menu-button"
                      class="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                      title="Exportar relatório">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </button>

              <!-- Export Dropdown -->
              <div id="export-menu" class="hidden absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-50 border border-gray-200 dark:border-gray-600">
                <div class="py-1">
                  <button class="export-option w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" data-type="json">
                    Exportar JSON
                  </button>
                  <button class="export-option w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" data-type="csv">
                    Exportar CSV
                  </button>
                  <button class="export-option w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" data-type="pdf">
                    Exportar PDF
                  </button>
                </div>
              </div>
            </div>

            ${this.options.showThemeToggle ? this.renderThemeToggle() : ''}

            <!-- Refresh Button -->
            <button id="refresh-button"
                    class="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                    title="Atualizar relatório">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Mobile Navigation Pills (shown on smaller screens) -->
      <div class="flex lg:hidden mt-4 space-x-2 overflow-x-auto">
        <button class="nav-pill flex-shrink-0 px-3 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
          Resumo
        </button>
        <button class="nav-pill flex-shrink-0 px-3 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
          Suites
        </button>
        <button class="nav-pill flex-shrink-0 px-3 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
          Gráficos
        </button>
      </div>
    `;

    return header;
  }

  renderLogo() {
    return `
      <div class="flex-shrink-0">
        <img src="${this.getLogoUrl()}"
             alt="Logo"
             class="h-10 w-10 object-contain rounded-lg"
             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iY3VycmVudENvbG9yIiBjbGFzcz0idGV4dC1ibHVlLTUwMCI+PHBhdGggZD0iTTEyIDJBMTAgMTAgMCAxIDAgMjIgMTJBMTAgMTAgMCAwIDAgMTIgMnptMCAxOGE4IDggMCAxIDEgMC0xNiA4IDggMCAwIDEgMCAxNnoiLz48L3N2Zz4='; this.onerror=null;" />
      </div>
    `;
  }

  renderThemeToggle() {
    return `
      <button id="theme-toggle-button"
              class="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
              title="Alternar tema">
        <!-- Light mode icon (visible in dark mode) -->
        <svg id="theme-toggle-light-icon" class="hidden dark:block w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 2L13.09 8.26L20 9L14 14.74L15.18 21.02L10 17.77L4.82 21.02L6 14.74L0 9L6.91 8.26L10 2Z"></path>
        </svg>
        <!-- Dark mode icon (visible in light mode) -->
        <svg id="theme-toggle-dark-icon" class="block dark:hidden w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
        </svg>
      </button>
    `;
  }

  renderQuickMetrics() {
    return `
      <div class="hidden md:flex items-center space-x-4 text-sm">
        <div class="flex items-center space-x-2">
          <span class="text-green-600 dark:text-green-400 font-medium">✓ ${this.data.successful_tests || 0}</span>
          <span class="text-red-600 dark:text-red-400 font-medium">✗ ${this.data.failed_tests || 0}</span>
          <span class="text-gray-500 dark:text-gray-400">/ ${this.data.total_tests || 0}</span>
        </div>

        <div class="h-4 w-px bg-gray-300 dark:bg-gray-600"></div>

        <div class="text-gray-600 dark:text-gray-400">
          ${this.formatDuration(this.data.total_duration_ms || 0)}
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    if (!this.element) return;

    // Theme toggle
    const themeToggle = this.element.querySelector('#theme-toggle-button');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        this.toggleTheme();
      });
    }

    // Export menu
    const exportButton = this.element.querySelector('#export-menu-button');
    const exportMenu = this.element.querySelector('#export-menu');

    if (exportButton && exportMenu) {
      exportButton.addEventListener('click', (e) => {
        e.stopPropagation();
        exportMenu.classList.toggle('hidden');
      });

      // Close menu when clicking outside
      document.addEventListener('click', () => {
        exportMenu.classList.add('hidden');
      });

      // Export options
      const exportOptions = this.element.querySelectorAll('.export-option');
      exportOptions.forEach(option => {
        option.addEventListener('click', (e) => {
          const type = e.target.dataset.type;
          this.handleExport(type);
          exportMenu.classList.add('hidden');
        });
      });
    }

    // Refresh button
    const refreshButton = this.element.querySelector('#refresh-button');
    if (refreshButton) {
      refreshButton.addEventListener('click', () => {
        this.handleRefresh();
      });
    }

    // Navigation pills (mobile)
    const navPills = this.element.querySelectorAll('.nav-pill');
    navPills.forEach(pill => {
      pill.addEventListener('click', (e) => {
        this.handleNavigation(e.target.textContent.trim());
      });
    });
  }

  toggleTheme() {
    // Dispatch event to layout for theme toggle
    window.dispatchEvent(new CustomEvent('toggleTheme'));
  }

  handleExport(type) {
    window.dispatchEvent(new CustomEvent('exportReport', { detail: { type } }));
  }

  handleRefresh() {
    window.dispatchEvent(new CustomEvent('refreshReport'));
  }

  handleNavigation(section) {
    window.dispatchEvent(new CustomEvent('navigateToSection', { detail: { section } }));
  }

  getStatusColor(successRate) {
    if (successRate === 100) return 'bg-green-500';
    if (successRate >= 90) return 'bg-yellow-500';
    if (successRate >= 70) return 'bg-orange-500';
    return 'bg-red-500';
  }

  getStatusTextColor(successRate) {
    if (successRate === 100) return 'text-green-600 dark:text-green-400';
    if (successRate >= 90) return 'text-yellow-600 dark:text-yellow-400';
    if (successRate >= 70) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  }

  getLogoUrl() {
    if (this.options.logoPath) {
      return this.options.logoPath;
    }

    // Try to find logo in common locations
    const logoUrls = [
      './assets/logo.png',
      './assets/logo.svg',
      '../public/assets/Gemini_Generated_Image_sqoh86sqoh86sqoh.png'
    ];

    return logoUrls[0]; // Return first as default
  }

  formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;

    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }
}

// Export for module systems or attach to window for direct usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Header;
} else {
  window.Header = Header;
}