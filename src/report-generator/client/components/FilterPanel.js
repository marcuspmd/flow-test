/**
 * FilterPanel Component - Advanced filtering and search functionality
 * Provides real-time filtering of test results with multiple criteria
 */
class FilterPanel {
  constructor(data, options = {}) {
    this.data = data;
    this.originalData = JSON.parse(JSON.stringify(data)); // Deep copy
    this.options = {
      showSearch: true,
      showStatusFilter: true,
      showDurationFilter: true,
      showSuiteFilter: true,
      showAssertionFilter: true,
      enableRealTimeFilter: true,
      showQuickFilters: true,
      ...options
    };
    this.element = null;
    this.filters = this.initializeFilters();
    this.isCollapsed = false;
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
    const filterPanel = document.createElement('div');
    filterPanel.className = 'filter-panel bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden';

    filterPanel.innerHTML = `
      <!-- Filter Header -->
      <div class="filter-header p-4 border-b border-gray-200 dark:border-gray-600 cursor-pointer" role="button" tabindex="0">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white">
              🔍 Filtros e Busca
            </h3>
            <span class="filter-count inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              0 filtros ativos
            </span>
          </div>

          <div class="flex items-center space-x-2">
            <!-- Clear All Filters -->
            <button class="clear-filters px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors">
              Limpar
            </button>

            <!-- Collapse Toggle -->
            <button class="collapse-toggle p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
              <svg class="w-5 h-5 text-gray-400 transform transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Filter Content -->
      <div class="filter-content ${this.isCollapsed ? 'hidden' : ''}">
        ${this.options.showQuickFilters ? this.renderQuickFilters() : ''}

        <div class="p-4 space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${this.options.showSearch ? this.renderSearchFilter() : ''}
            ${this.options.showStatusFilter ? this.renderStatusFilter() : ''}
            ${this.options.showDurationFilter ? this.renderDurationFilter() : ''}
            ${this.options.showSuiteFilter ? this.renderSuiteFilter() : ''}
            ${this.options.showAssertionFilter ? this.renderAssertionFilter() : ''}
            ${this.renderAdvancedFilters()}
          </div>

          <!-- Filter Results Summary -->
          <div class="filter-results mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-600 dark:text-gray-400">
                Mostrando <span class="results-count font-medium">0</span> de <span class="total-count font-medium">${this.getTotalItemsCount()}</span> resultados
              </span>
              <div class="flex items-center space-x-4">
                <span class="success-count text-green-600 dark:text-green-400">✓ 0</span>
                <span class="failed-count text-red-600 dark:text-red-400">✗ 0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    return filterPanel;
  }

  renderQuickFilters() {
    return `
      <div class="quick-filters p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-600">
        <div class="flex flex-wrap gap-2">
          <button class="quick-filter px-3 py-1 text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  data-filter="show-all">
            Todos
          </button>
          <button class="quick-filter px-3 py-1 text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-green-50 hover:border-green-300 hover:text-green-700 dark:hover:bg-green-900/20 dark:hover:text-green-400 transition-colors"
                  data-filter="success-only">
            Apenas Sucessos
          </button>
          <button class="quick-filter px-3 py-1 text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-red-50 hover:border-red-300 hover:text-red-700 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
                  data-filter="failed-only">
            Apenas Falhas
          </button>
          <button class="quick-filter px-3 py-1 text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-yellow-50 hover:border-yellow-300 hover:text-yellow-700 dark:hover:bg-yellow-900/20 dark:hover:text-yellow-400 transition-colors"
                  data-filter="slow-tests">
            Testes Lentos
          </button>
          <button class="quick-filter px-3 py-1 text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 dark:hover:bg-purple-900/20 dark:hover:text-purple-400 transition-colors"
                  data-filter="assertion-failures">
            Falhas de Assertion
          </button>
        </div>
      </div>
    `;
  }

  renderSearchFilter() {
    return `
      <div class="filter-group">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Buscar
        </label>
        <div class="relative">
          <input type="text"
                 class="search-input w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                 placeholder="Buscar por nome, URL, ou conteúdo..."
                 value="${this.filters.search}">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
        </div>
      </div>
    `;
  }

  renderStatusFilter() {
    return `
      <div class="filter-group">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Status
        </label>
        <select class="status-filter w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          <option value="">Todos os status</option>
          <option value="success" ${this.filters.status === 'success' ? 'selected' : ''}>Sucesso</option>
          <option value="failed" ${this.filters.status === 'failed' ? 'selected' : ''}>Falha</option>
          <option value="running" ${this.filters.status === 'running' ? 'selected' : ''}>Executando</option>
          <option value="pending" ${this.filters.status === 'pending' ? 'selected' : ''}>Pendente</option>
        </select>
      </div>
    `;
  }

  renderDurationFilter() {
    const maxDuration = this.getMaxDuration();

    return `
      <div class="filter-group">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Duração (ms)
        </label>
        <div class="space-y-2">
          <div class="flex items-center space-x-2">
            <input type="number"
                   class="duration-min flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                   placeholder="Min"
                   value="${this.filters.durationMin || ''}"
                   min="0">
            <span class="text-gray-500 dark:text-gray-400">até</span>
            <input type="number"
                   class="duration-max flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                   placeholder="Max"
                   value="${this.filters.durationMax || ''}"
                   max="${maxDuration}">
          </div>
          <div class="text-xs text-gray-500 dark:text-gray-400">
            Máximo: ${this.formatDuration(maxDuration)}
          </div>
        </div>
      </div>
    `;
  }

  renderSuiteFilter() {
    const suites = this.getSuiteNames();

    return `
      <div class="filter-group">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Test Suite
        </label>
        <select class="suite-filter w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          <option value="">Todas as suites</option>
          ${suites.map(suite => `
            <option value="${this.escapeHtml(suite)}" ${this.filters.suite === suite ? 'selected' : ''}>
              ${this.escapeHtml(suite)}
            </option>
          `).join('')}
        </select>
      </div>
    `;
  }

  renderAssertionFilter() {
    return `
      <div class="filter-group">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Assertions
        </label>
        <select class="assertion-filter w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          <option value="">Todas as assertions</option>
          <option value="has-assertions" ${this.filters.assertions === 'has-assertions' ? 'selected' : ''}>Com assertions</option>
          <option value="no-assertions" ${this.filters.assertions === 'no-assertions' ? 'selected' : ''}>Sem assertions</option>
          <option value="failed-assertions" ${this.filters.assertions === 'failed-assertions' ? 'selected' : ''}>Assertions falharam</option>
          <option value="passed-assertions" ${this.filters.assertions === 'passed-assertions' ? 'selected' : ''}>Todas assertions passaram</option>
        </select>
      </div>
    `;
  }

  renderAdvancedFilters() {
    return `
      <div class="filter-group md:col-span-2 lg:col-span-3">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Filtros Avançados
        </label>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <!-- HTTP Method Filter -->
          <select class="method-filter px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
            <option value="">Qualquer método</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
            <option value="PATCH">PATCH</option>
          </select>

          <!-- Status Code Filter -->
          <select class="status-code-filter px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
            <option value="">Qualquer status code</option>
            <option value="2xx">2xx - Success</option>
            <option value="3xx">3xx - Redirect</option>
            <option value="4xx">4xx - Client Error</option>
            <option value="5xx">5xx - Server Error</option>
          </select>

          <!-- Has cURL Filter -->
          <div class="flex items-center space-x-2">
            <input type="checkbox"
                   class="curl-filter w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                   ${this.filters.hasCurl ? 'checked' : ''}>
            <label class="text-sm text-gray-700 dark:text-gray-300">Tem cURL</label>
          </div>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    if (!this.element) return;

    // Toggle collapse
    const header = this.element.querySelector('.filter-header');
    const collapseToggle = this.element.querySelector('.collapse-toggle');
    const content = this.element.querySelector('.filter-content');

    if (header && content) {
      const toggleCollapse = () => {
        this.isCollapsed = !this.isCollapsed;
        content.classList.toggle('hidden', this.isCollapsed);

        const arrow = collapseToggle.querySelector('svg');
        if (arrow) {
          arrow.classList.toggle('rotate-180', !this.isCollapsed);
        }
      };

      header.addEventListener('click', toggleCollapse);
      header.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleCollapse();
        }
      });
    }

    // Search filter
    const searchInput = this.element.querySelector('.search-input');
    if (searchInput) {
      const handleSearch = this.debounce(() => {
        this.filters.search = searchInput.value;
        this.applyFilters();
      }, 300);

      searchInput.addEventListener('input', handleSearch);
    }

    // Status filter
    const statusFilter = this.element.querySelector('.status-filter');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        this.filters.status = e.target.value;
        this.applyFilters();
      });
    }

    // Duration filters
    const durationMin = this.element.querySelector('.duration-min');
    const durationMax = this.element.querySelector('.duration-max');

    if (durationMin) {
      durationMin.addEventListener('change', (e) => {
        this.filters.durationMin = e.target.value ? parseInt(e.target.value) : null;
        this.applyFilters();
      });
    }

    if (durationMax) {
      durationMax.addEventListener('change', (e) => {
        this.filters.durationMax = e.target.value ? parseInt(e.target.value) : null;
        this.applyFilters();
      });
    }

    // Suite filter
    const suiteFilter = this.element.querySelector('.suite-filter');
    if (suiteFilter) {
      suiteFilter.addEventListener('change', (e) => {
        this.filters.suite = e.target.value;
        this.applyFilters();
      });
    }

    // Assertion filter
    const assertionFilter = this.element.querySelector('.assertion-filter');
    if (assertionFilter) {
      assertionFilter.addEventListener('change', (e) => {
        this.filters.assertions = e.target.value;
        this.applyFilters();
      });
    }

    // Advanced filters
    this.attachAdvancedFilterListeners();

    // Quick filters
    const quickFilters = this.element.querySelectorAll('.quick-filter');
    quickFilters.forEach(button => {
      button.addEventListener('click', (e) => {
        this.applyQuickFilter(e.target.dataset.filter);
        this.updateQuickFilterStyles(e.target);
      });
    });

    // Clear filters
    const clearButton = this.element.querySelector('.clear-filters');
    if (clearButton) {
      clearButton.addEventListener('click', () => this.clearAllFilters());
    }
  }

  attachAdvancedFilterListeners() {
    // Method filter
    const methodFilter = this.element.querySelector('.method-filter');
    if (methodFilter) {
      methodFilter.addEventListener('change', (e) => {
        this.filters.method = e.target.value;
        this.applyFilters();
      });
    }

    // Status code filter
    const statusCodeFilter = this.element.querySelector('.status-code-filter');
    if (statusCodeFilter) {
      statusCodeFilter.addEventListener('change', (e) => {
        this.filters.statusCode = e.target.value;
        this.applyFilters();
      });
    }

    // cURL filter
    const curlFilter = this.element.querySelector('.curl-filter');
    if (curlFilter) {
      curlFilter.addEventListener('change', (e) => {
        this.filters.hasCurl = e.target.checked;
        this.applyFilters();
      });
    }
  }

  applyQuickFilter(filterType) {
    switch (filterType) {
      case 'show-all':
        this.clearAllFilters(false);
        break;
      case 'success-only':
        this.filters.status = 'success';
        break;
      case 'failed-only':
        this.filters.status = 'failed';
        break;
      case 'slow-tests':
        this.filters.durationMin = 5000; // 5 seconds
        break;
      case 'assertion-failures':
        this.filters.assertions = 'failed-assertions';
        break;
    }

    this.updateFilterInputs();
    this.applyFilters();
  }

  updateQuickFilterStyles(activeButton) {
    const quickFilters = this.element.querySelectorAll('.quick-filter');
    quickFilters.forEach(button => {
      button.classList.remove('bg-blue-500', 'text-white', 'border-blue-500');
      button.classList.add('bg-white', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-300');
    });

    activeButton.classList.remove('bg-white', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-300');
    activeButton.classList.add('bg-blue-500', 'text-white', 'border-blue-500');
  }

  applyFilters() {
    const filteredData = this.filterData(this.originalData);
    this.updateResultsSummary(filteredData);
    this.updateActiveFiltersCount();

    // Trigger filtered data event
    this.element.dispatchEvent(new CustomEvent('dataFiltered', {
      detail: {
        filteredData,
        filters: this.filters,
        totalResults: this.countFilteredResults(filteredData)
      }
    }));
  }

  filterData(data) {
    const filtered = JSON.parse(JSON.stringify(data)); // Deep copy

    if (!filtered.suites_results) return filtered;

    filtered.suites_results = filtered.suites_results.filter(suite => {
      return this.matchesSuiteFilters(suite);
    }).map(suite => {
      const filteredSuite = { ...suite };

      if (filteredSuite.steps_results) {
        filteredSuite.steps_results = filteredSuite.steps_results.filter(step => {
          return this.matchesStepFilters(step, suite);
        });
      }

      return filteredSuite;
    });

    // Recalculate totals
    this.recalculateFilteredTotals(filtered);

    return filtered;
  }

  matchesSuiteFilters(suite) {
    // Suite name filter
    if (this.filters.suite && suite.suite_name !== this.filters.suite) {
      return false;
    }

    // Search filter (suite name)
    if (this.filters.search) {
      const searchTerm = this.filters.search.toLowerCase();
      if (!suite.suite_name?.toLowerCase().includes(searchTerm)) {
        // Check if any step matches the search
        const hasMatchingStep = suite.steps_results?.some(step =>
          this.matchesSearchInStep(step, searchTerm)
        );
        if (!hasMatchingStep) return false;
      }
    }

    return true;
  }

  matchesStepFilters(step, suite) {
    // Status filter
    if (this.filters.status && step.status !== this.filters.status) {
      return false;
    }

    // Duration filter
    const duration = step.duration_ms || 0;
    if (this.filters.durationMin && duration < this.filters.durationMin) {
      return false;
    }
    if (this.filters.durationMax && duration > this.filters.durationMax) {
      return false;
    }

    // Search filter
    if (this.filters.search) {
      const searchTerm = this.filters.search.toLowerCase();
      if (!this.matchesSearchInStep(step, searchTerm)) {
        return false;
      }
    }

    // Assertion filter
    if (this.filters.assertions && !this.matchesAssertionFilter(step)) {
      return false;
    }

    // Method filter
    if (this.filters.method && step.request_details?.method !== this.filters.method) {
      return false;
    }

    // Status code filter
    if (this.filters.statusCode && !this.matchesStatusCodeFilter(step)) {
      return false;
    }

    // cURL filter
    if (this.filters.hasCurl && !step.request_details?.curl_command) {
      return false;
    }

    return true;
  }

  matchesSearchInStep(step, searchTerm) {
    return (
      step.step_name?.toLowerCase().includes(searchTerm) ||
      step.request_details?.url?.toLowerCase().includes(searchTerm) ||
      step.request_details?.method?.toLowerCase().includes(searchTerm) ||
      JSON.stringify(step.request_details?.body || {}).toLowerCase().includes(searchTerm) ||
      JSON.stringify(step.response_details?.body || {}).toLowerCase().includes(searchTerm)
    );
  }

  matchesAssertionFilter(step) {
    const assertions = step.assertions_results || [];

    switch (this.filters.assertions) {
      case 'has-assertions':
        return assertions.length > 0;
      case 'no-assertions':
        return assertions.length === 0;
      case 'failed-assertions':
        return assertions.some(a => !a.passed);
      case 'passed-assertions':
        return assertions.length > 0 && assertions.every(a => a.passed);
      default:
        return true;
    }
  }

  matchesStatusCodeFilter(step) {
    const statusCode = step.response_details?.status_code;
    if (!statusCode) return false;

    switch (this.filters.statusCode) {
      case '2xx':
        return statusCode >= 200 && statusCode < 300;
      case '3xx':
        return statusCode >= 300 && statusCode < 400;
      case '4xx':
        return statusCode >= 400 && statusCode < 500;
      case '5xx':
        return statusCode >= 500;
      default:
        return true;
    }
  }

  recalculateFilteredTotals(filteredData) {
    let totalTests = 0;
    let successfulTests = 0;
    let failedTests = 0;

    filteredData.suites_results.forEach(suite => {
      if (suite.steps_results) {
        totalTests += suite.steps_results.length;
        successfulTests += suite.steps_results.filter(step => step.status === 'success').length;
        failedTests += suite.steps_results.filter(step => step.status === 'failed').length;
      }
    });

    filteredData.total_tests = totalTests;
    filteredData.successful_tests = successfulTests;
    filteredData.failed_tests = failedTests;
    filteredData.success_rate = totalTests > 0 ? (successfulTests / totalTests) * 100 : 0;
  }

  updateResultsSummary(filteredData) {
    const resultsCount = this.element.querySelector('.results-count');
    const successCount = this.element.querySelector('.success-count');
    const failedCount = this.element.querySelector('.failed-count');

    if (resultsCount) {
      resultsCount.textContent = this.countFilteredResults(filteredData);
    }

    if (successCount) {
      successCount.textContent = `✓ ${filteredData.successful_tests || 0}`;
    }

    if (failedCount) {
      failedCount.textContent = `✗ ${filteredData.failed_tests || 0}`;
    }
  }

  updateActiveFiltersCount() {
    const activeCount = this.getActiveFiltersCount();
    const filterCount = this.element.querySelector('.filter-count');

    if (filterCount) {
      filterCount.textContent = `${activeCount} ${activeCount === 1 ? 'filtro ativo' : 'filtros ativos'}`;
      filterCount.className = activeCount > 0
        ? 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
        : 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  }

  clearAllFilters(applyImmediately = true) {
    this.filters = this.initializeFilters();
    this.updateFilterInputs();

    if (applyImmediately) {
      this.applyFilters();
    }

    // Reset quick filter styles
    const quickFilters = this.element.querySelectorAll('.quick-filter');
    quickFilters.forEach(button => {
      button.classList.remove('bg-blue-500', 'text-white', 'border-blue-500');
      button.classList.add('bg-white', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-300');
    });

    // Highlight "show all" button
    const showAllButton = this.element.querySelector('[data-filter="show-all"]');
    if (showAllButton) {
      this.updateQuickFilterStyles(showAllButton);
    }
  }

  updateFilterInputs() {
    // Update all form inputs to match current filter state
    const searchInput = this.element.querySelector('.search-input');
    if (searchInput) searchInput.value = this.filters.search || '';

    const statusFilter = this.element.querySelector('.status-filter');
    if (statusFilter) statusFilter.value = this.filters.status || '';

    const durationMin = this.element.querySelector('.duration-min');
    if (durationMin) durationMin.value = this.filters.durationMin || '';

    const durationMax = this.element.querySelector('.duration-max');
    if (durationMax) durationMax.value = this.filters.durationMax || '';

    const suiteFilter = this.element.querySelector('.suite-filter');
    if (suiteFilter) suiteFilter.value = this.filters.suite || '';

    const assertionFilter = this.element.querySelector('.assertion-filter');
    if (assertionFilter) assertionFilter.value = this.filters.assertions || '';

    const methodFilter = this.element.querySelector('.method-filter');
    if (methodFilter) methodFilter.value = this.filters.method || '';

    const statusCodeFilter = this.element.querySelector('.status-code-filter');
    if (statusCodeFilter) statusCodeFilter.value = this.filters.statusCode || '';

    const curlFilter = this.element.querySelector('.curl-filter');
    if (curlFilter) curlFilter.checked = this.filters.hasCurl || false;
  }

  // Utility methods
  initializeFilters() {
    return {
      search: '',
      status: '',
      durationMin: null,
      durationMax: null,
      suite: '',
      assertions: '',
      method: '',
      statusCode: '',
      hasCurl: false
    };
  }

  getActiveFiltersCount() {
    return Object.entries(this.filters).filter(([key, value]) => {
      if (key === 'hasCurl') return value === true;
      return value !== '' && value !== null && value !== undefined;
    }).length;
  }

  countFilteredResults(filteredData) {
    return filteredData.suites_results?.reduce((total, suite) => {
      return total + (suite.steps_results?.length || 0);
    }, 0) || 0;
  }

  getTotalItemsCount() {
    return this.originalData.suites_results?.reduce((total, suite) => {
      return total + (suite.steps_results?.length || 0);
    }, 0) || 0;
  }

  getMaxDuration() {
    let maxDuration = 0;
    this.originalData.suites_results?.forEach(suite => {
      suite.steps_results?.forEach(step => {
        if (step.duration_ms > maxDuration) {
          maxDuration = step.duration_ms;
        }
      });
    });
    return maxDuration;
  }

  getSuiteNames() {
    return this.originalData.suites_results?.map(suite => suite.suite_name).filter(Boolean) || [];
  }

  formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;

    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
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
  module.exports = FilterPanel;
} else {
  window.FilterPanel = FilterPanel;
}