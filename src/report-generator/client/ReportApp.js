/**
 * ReportApp - Main application controller
 * Orchestrates all components and manages application state
 */
class ReportApp {
  constructor(options = {}) {
    this.options = {
      containerId: 'report-container',
      dataUrl: null,
      enableRouting: false,
      autoRefresh: false,
      refreshInterval: 30000,
      ...options
    };

    this.data = null;
    this.filteredData = null;
    this.components = new Map();
    this.currentStepModal = null;
    this.refreshTimer = null;

    this.init();
  }

  async init() {
    try {
      // Load data
      await this.loadData();

      // Initialize components
      this.initializeComponents();

      // Setup event listeners
      this.setupEventListeners();

      // Auto refresh if enabled
      if (this.options.autoRefresh) {
        this.startAutoRefresh();
      }

    } catch (error) {
      console.error('Failed to initialize ReportApp:', error);
      this.showError('Falha ao carregar o relatório. Tente atualizar a página.');
    }
  }

  async loadData() {
    if (this.options.dataUrl) {
      const response = await fetch(this.options.dataUrl);
      if (!response.ok) {
        throw new Error(`Failed to load data: ${response.statusText}`);
      }
      this.data = await response.json();
    } else {
      // Check if data is embedded in the page
      const dataScript = document.getElementById('report-data');
      if (dataScript) {
        this.data = JSON.parse(dataScript.textContent);
      } else {
        throw new Error('No data source configured');
      }
    }

    this.filteredData = this.data;
  }

  initializeComponents() {
    const container = document.getElementById(this.options.containerId);
    if (!container) {
      throw new Error(`Container element with ID '${this.options.containerId}' not found`);
    }

    // Initialize layout
    const layout = new Layout(this.data, {
      showCharts: true,
      showFilters: true
    });

    layout.render(container);
    this.components.set('layout', layout);

    // Initialize header
    const header = new Header(this.data, {
      showLogo: true,
      showThemeToggle: true,
      showMetrics: true
    });

    header.render(layout.getHeaderContainer());
    this.components.set('header', header);

    // Initialize filter panel
    const filterPanel = new FilterPanel(this.data, {
      showSearch: true,
      showStatusFilter: true,
      showDurationFilter: true,
      enableRealTimeFilter: true
    });

    filterPanel.render(layout.getFiltersContainer());
    this.components.set('filterPanel', filterPanel);

    // Initialize summary
    const summary = new Summary(this.filteredData, {
      showDetailedMetrics: true,
      showPerformanceMetrics: true,
      animateNumbers: true
    });

    summary.render(layout.getSummaryContainer());
    this.components.set('summary', summary);

    // Initialize charts
    const charts = new Charts(this.filteredData, {
      showSuccessRateChart: true,
      showDurationChart: true,
      showTimelineChart: true,
      animate: true
    });

    charts.render(layout.getChartsContainer());
    this.components.set('charts', charts);

    // Initialize test suites
    this.renderTestSuites();

    // Initialize footer
    this.renderFooter();
  }

  renderTestSuites() {
    const suitesContainer = this.components.get('layout').getSuitesContainer();
    const suites = this.filteredData.suites_results || [];

    // Clear existing suites
    suitesContainer.innerHTML = '';

    if (suites.length === 0) {
      suitesContainer.innerHTML = this.renderEmptyState();
      return;
    }

    // Add section header
    const header = document.createElement('div');
    header.className = 'mb-6';
    header.innerHTML = `
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
          Test Suites <span class="text-sm font-normal text-gray-500 dark:text-gray-400">(${suites.length})</span>
        </h2>
        <div class="flex items-center space-x-2">
          <button class="expand-all px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
            Expandir Todos
          </button>
          <button class="collapse-all px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
            Recolher Todos
          </button>
        </div>
      </div>
    `;
    suitesContainer.appendChild(header);

    // Create suites container
    const suitesWrapper = document.createElement('div');
    suitesWrapper.className = 'space-y-4';
    suitesContainer.appendChild(suitesWrapper);

    // Render each suite
    suites.forEach((suiteData, index) => {
      const testSuite = new TestSuite(suiteData, {
        expandable: true,
        showStepDetails: true,
        animateExpansion: true
      });

      testSuite.render(suitesWrapper);
      this.components.set(`suite-${index}`, testSuite);
    });

    // Attach expand/collapse all listeners
    this.attachSuiteControlListeners(header);
  }

  renderEmptyState() {
    return `
      <div class="text-center py-12">
        <svg class="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">Nenhum resultado encontrado</h3>
        <p class="text-gray-500 dark:text-gray-400 mb-4">Nenhuma suite de teste corresponde aos filtros aplicados.</p>
        <button class="clear-filters-btn px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Limpar Filtros
        </button>
      </div>
    `;
  }

  renderFooter() {
    const footerContainer = this.components.get('layout').getFooterContainer();
    const generatedDate = new Date().toLocaleString('pt-BR');

    footerContainer.innerHTML = `
      <footer class="text-center py-8 border-t border-gray-200 dark:border-gray-700">
        <div class="space-y-2">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Relatório gerado em ${generatedDate}
          </p>
          <p class="text-sm text-gray-500 dark:text-gray-500">
            Duração Total: ${this.formatDuration(this.filteredData.total_duration_ms || 0)} |
            Testes Executados: ${this.filteredData.total_tests || 0}
          </p>
          <p class="text-xs text-gray-400 dark:text-gray-600">
            Flow Test Engine - Powered by Client-Side Rendering
          </p>
        </div>
      </footer>
    `;
  }

  setupEventListeners() {
    // Theme toggle
    window.addEventListener('toggleTheme', () => {
      const layout = this.components.get('layout');
      if (layout) layout.toggleTheme();
    });

    // Data filtering
    const filterPanel = this.components.get('filterPanel');
    if (filterPanel && filterPanel.element) {
      filterPanel.element.addEventListener('dataFiltered', (e) => {
        this.handleDataFiltered(e.detail);
      });
    }

    // Step details modal
    document.addEventListener('showStepDetails', (e) => {
      this.showStepDetailsModal(e.detail);
    });

    // Export functionality
    window.addEventListener('exportReport', (e) => {
      this.handleExport(e.detail.type);
    });

    // Refresh functionality
    window.addEventListener('refreshReport', () => {
      this.refresh();
    });

    // Clear filters from empty state
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('clear-filters-btn')) {
        const filterPanel = this.components.get('filterPanel');
        if (filterPanel) filterPanel.clearAllFilters();
      }
    });

    // Handle keyboard shortcuts
    this.setupKeyboardShortcuts();
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + R - Refresh (prevent default browser refresh)
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        this.refresh();
      }

      // Ctrl/Cmd + F - Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }

      // Ctrl/Cmd + T - Toggle theme
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('toggleTheme'));
      }

      // Escape - Close modals
      if (e.key === 'Escape') {
        this.closeStepDetailsModal();
      }
    });
  }

  attachSuiteControlListeners(header) {
    const expandAllBtn = header.querySelector('.expand-all');
    const collapseAllBtn = header.querySelector('.collapse-all');

    if (expandAllBtn) {
      expandAllBtn.addEventListener('click', () => {
        this.components.forEach((component, key) => {
          if (key.startsWith('suite-') && component.expand) {
            component.expand();
          }
        });
      });
    }

    if (collapseAllBtn) {
      collapseAllBtn.addEventListener('click', () => {
        this.components.forEach((component, key) => {
          if (key.startsWith('suite-') && component.collapse) {
            component.collapse();
          }
        });
      });
    }
  }

  handleDataFiltered(filterDetail) {
    const { filteredData, filters, totalResults } = filterDetail;
    this.filteredData = filteredData;

    // Update summary with filtered data
    const summaryComponent = this.components.get('summary');
    if (summaryComponent) {
      summaryComponent.destroy();
      const newSummary = new Summary(this.filteredData, {
        showDetailedMetrics: true,
        showPerformanceMetrics: true,
        animateNumbers: true
      });
      newSummary.render(this.components.get('layout').getSummaryContainer());
      this.components.set('summary', newSummary);
    }

    // Update charts with filtered data
    const chartsComponent = this.components.get('charts');
    if (chartsComponent) {
      chartsComponent.destroy();
      const newCharts = new Charts(this.filteredData, {
        showSuccessRateChart: true,
        showDurationChart: true,
        showTimelineChart: true,
        animate: false // Don't animate on filter updates
      });
      newCharts.render(this.components.get('layout').getChartsContainer());
      this.components.set('charts', newCharts);
    }

    // Update test suites
    this.clearSuiteComponents();
    this.renderTestSuites();
  }

  showStepDetailsModal(stepDetail) {
    const { stepData, stepIndex, suiteData } = stepDetail;

    // Close existing modal
    this.closeStepDetailsModal();

    // Create modal container
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 overflow-y-auto';
    modal.innerHTML = `
      <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" aria-hidden="true"></div>
        <div class="inline-block w-full max-w-4xl my-8 text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-lg">
          <div id="step-details-container" class="relative"></div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Create and render step component
    const testStep = new TestStep(stepData, {
      showTabs: true,
      showAssertions: true,
      showRequest: true,
      showResponse: true,
      showCurl: true
    });

    const container = modal.querySelector('#step-details-container');
    testStep.render(container);

    // Store reference for cleanup
    this.currentStepModal = {
      element: modal,
      component: testStep
    };

    // Close modal on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.classList.contains('bg-gray-500')) {
        this.closeStepDetailsModal();
      }
    });

    // Close modal on step close event
    container.addEventListener('stepClose', () => {
      this.closeStepDetailsModal();
    });
  }

  closeStepDetailsModal() {
    if (this.currentStepModal) {
      if (this.currentStepModal.component) {
        this.currentStepModal.component.destroy();
      }
      if (this.currentStepModal.element && this.currentStepModal.element.parentNode) {
        this.currentStepModal.element.parentNode.removeChild(this.currentStepModal.element);
      }
      this.currentStepModal = null;
    }
  }

  async handleExport(type) {
    const layout = this.components.get('layout');
    if (layout) layout.showLoading();

    try {
      switch (type) {
        case 'json':
          this.exportAsJSON();
          break;
        case 'csv':
          this.exportAsCSV();
          break;
        case 'pdf':
          await this.exportAsPDF();
          break;
        default:
          console.warn(`Unknown export type: ${type}`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Falha na exportação. Tente novamente.');
    } finally {
      if (layout) layout.hideLoading();
    }
  }

  exportAsJSON() {
    const dataStr = JSON.stringify(this.filteredData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `report_${this.getTimestamp()}.json`;
    link.click();

    URL.revokeObjectURL(url);
  }

  exportAsCSV() {
    const csvContent = this.convertToCSV(this.filteredData);
    const dataBlob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `report_${this.getTimestamp()}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  async exportAsPDF() {
    // This would require a PDF generation library like jsPDF
    alert('Exportação PDF não implementada ainda. Use JSON ou CSV.');
  }

  convertToCSV(data) {
    const headers = ['Suite', 'Step', 'Status', 'Duration (ms)', 'Method', 'URL', 'Status Code', 'Assertions Passed', 'Assertions Total'];
    const rows = [headers.join(',')];

    data.suites_results?.forEach(suite => {
      suite.steps_results?.forEach(step => {
        const assertionsResults = step.assertions_results || [];
        const passedAssertions = assertionsResults.filter(a => a.passed).length;

        const row = [
          this.escapeCSV(suite.suite_name),
          this.escapeCSV(step.step_name),
          step.status,
          step.duration_ms || 0,
          step.request_details?.method || '',
          this.escapeCSV(step.request_details?.url || ''),
          step.response_details?.status_code || '',
          passedAssertions,
          assertionsResults.length
        ];

        rows.push(row.join(','));
      });
    });

    return rows.join('\n');
  }

  async refresh() {
    const layout = this.components.get('layout');
    if (layout) layout.showLoading();

    try {
      await this.loadData();
      this.destroyComponents();
      this.initializeComponents();
    } catch (error) {
      console.error('Refresh failed:', error);
      alert('Falha ao atualizar relatório. Tente novamente.');
    } finally {
      if (layout) layout.hideLoading();
    }
  }

  startAutoRefresh() {
    this.refreshTimer = setInterval(() => {
      this.refresh();
    }, this.options.refreshInterval);
  }

  stopAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  clearSuiteComponents() {
    // Remove all suite components
    const keysToRemove = [];
    this.components.forEach((component, key) => {
      if (key.startsWith('suite-')) {
        component.destroy();
        keysToRemove.push(key);
      }
    });

    keysToRemove.forEach(key => {
      this.components.delete(key);
    });
  }

  destroyComponents() {
    this.closeStepDetailsModal();
    this.components.forEach(component => {
      if (component.destroy) component.destroy();
    });
    this.components.clear();
  }

  // Utility methods
  formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;

    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  getTimestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
  }

  escapeCSV(str) {
    if (str === null || str === undefined) return '';
    const stringValue = String(str);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  }

  destroy() {
    this.stopAutoRefresh();
    this.destroyComponents();

    const container = document.getElementById(this.options.containerId);
    if (container) {
      container.innerHTML = '';
    }
  }
}

// Export for module systems or attach to window for direct usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ReportApp;
} else {
  window.ReportApp = ReportApp;
}