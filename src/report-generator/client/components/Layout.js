/**
 * Layout Component - Base structure for the HTML report
 * Handles overall page layout and theme management
 */
class Layout {
  constructor(data, options = {}) {
    this.data = data;
    this.options = {
      theme: 'auto',
      showCharts: true,
      showFilters: true,
      ...options
    };
    this.container = null;
  }

  render(targetElement = document.body) {
    this.container = this.createElement();
    targetElement.appendChild(this.container);
    this.initializeTheme();
    return this.container;
  }

  createElement() {
    const layout = document.createElement('div');
    layout.className = 'min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300';
    layout.id = 'report-layout';

    layout.innerHTML = `
      <div class="container mx-auto px-4 py-6 max-w-7xl">
        <!-- Header Section -->
        <div id="header-container" class="mb-8"></div>

        <!-- Filters Section -->
        ${this.options.showFilters ? '<div id="filters-container" class="mb-6"></div>' : ''}

        <!-- Summary Section -->
        <div id="summary-container" class="mb-8"></div>

        <!-- Charts Section -->
        ${this.options.showCharts ? '<div id="charts-container" class="mb-8"></div>' : ''}

        <!-- Main Content -->
        <div class="grid grid-cols-1 gap-6">
          <!-- Test Suites Container -->
          <div id="suites-container"></div>
        </div>

        <!-- Footer Section -->
        <div id="footer-container" class="mt-12"></div>
      </div>

      <!-- Loading Overlay -->
      <div id="loading-overlay" class="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 hidden">
        <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm mx-4">
          <div class="flex items-center space-x-3">
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span class="text-gray-700 dark:text-gray-300">Carregando relatório...</span>
          </div>
        </div>
      </div>
    `;

    return layout;
  }

  initializeTheme() {
    const html = document.documentElement;
    const savedTheme = localStorage.getItem('report-theme');

    if (savedTheme) {
      this.setTheme(savedTheme);
    } else if (this.options.theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.setTheme(prefersDark ? 'dark' : 'light');
    } else {
      this.setTheme(this.options.theme);
    }

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem('report-theme') && this.options.theme === 'auto') {
        this.setTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  setTheme(theme) {
    const html = document.documentElement;
    if (theme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }

  toggleTheme() {
    const html = document.documentElement;
    const isDark = html.classList.contains('dark');
    const newTheme = isDark ? 'light' : 'dark';

    this.setTheme(newTheme);
    localStorage.setItem('report-theme', newTheme);

    // Trigger theme change event
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: newTheme } }));
  }

  showLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.classList.remove('hidden');
    }
  }

  hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }
  }

  // Utility methods for getting container elements
  getHeaderContainer() {
    return document.getElementById('header-container');
  }

  getFiltersContainer() {
    return document.getElementById('filters-container');
  }

  getSummaryContainer() {
    return document.getElementById('summary-container');
  }

  getChartsContainer() {
    return document.getElementById('charts-container');
  }

  getSuitesContainer() {
    return document.getElementById('suites-container');
  }

  getFooterContainer() {
    return document.getElementById('footer-container');
  }

  // Responsive utilities
  isMobile() {
    return window.innerWidth < 768;
  }

  isTablet() {
    return window.innerWidth >= 768 && window.innerWidth < 1024;
  }

  isDesktop() {
    return window.innerWidth >= 1024;
  }

  // Event handling
  on(event, callback) {
    if (this.container) {
      this.container.addEventListener(event, callback);
    }
  }

  off(event, callback) {
    if (this.container) {
      this.container.removeEventListener(event, callback);
    }
  }

  destroy() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
  }
}

// Export for module systems or attach to window for direct usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Layout;
} else {
  window.Layout = Layout;
}