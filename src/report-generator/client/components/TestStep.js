/**
 * TestStep Component - Detailed step view with tabs
 * Shows assertions, request/response details, iterations, and cURL commands
 */
class TestStep {
  constructor(stepData, options = {}) {
    this.stepData = stepData;
    this.options = {
      showTabs: true,
      showAssertions: true,
      showRequest: true,
      showResponse: true,
      showCurl: true,
      showIterations: true,
      defaultTab: 'assertions',
      enableCodeHighlight: true,
      ...options
    };
    this.element = null;
    this.activeTab = this.options.defaultTab;
  }

  render(targetElement) {
    this.element = this.createElement();
    if (targetElement) {
      targetElement.appendChild(this.element);
    }
    this.attachEventListeners();
    this.switchToTab(this.activeTab);
    return this.element;
  }

  createElement() {
    const stepContainer = document.createElement('div');
    stepContainer.className = 'test-step-container bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden';

    const statusClass = this.getStatusClass(this.stepData.status);

    stepContainer.innerHTML = `
      <!-- Step Header -->
      <div class="step-header p-4 border-b border-gray-200 dark:border-gray-600 ${this.getHeaderBgClass(this.stepData.status)}">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="flex-shrink-0">
              ${this.renderStatusIcon()}
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                ${this.escapeHtml(this.stepData.step_name || 'Test Step')}
              </h3>
              <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                ${this.getStepDescription()}
              </p>
            </div>
          </div>

          <div class="flex items-center space-x-3">
            <!-- Step Metrics -->
            <div class="text-right">
              <div class="text-sm font-medium text-gray-900 dark:text-white">
                ${this.formatDuration(this.stepData.duration_ms || 0)}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                ${this.getAssertionsSummary()}
              </div>
            </div>

            <!-- Close Button -->
            <button class="close-step p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" title="Fechar">
              <svg class="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>

      ${this.options.showTabs ? this.renderTabs() : ''}

      <!-- Content Container -->
      <div class="step-content">
        ${this.renderTabContents()}
      </div>
    `;

    return stepContainer;
  }

  renderStatusIcon() {
    const iconMap = {
      success: `
        <div class="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
          <svg class="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
          </svg>
        </div>
      `,
      failed: `
        <div class="w-8 h-8 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
          <svg class="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
          </svg>
        </div>
      `,
      running: `
        <div class="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
          <div class="w-4 h-4 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse"></div>
        </div>
      `
    };

    return iconMap[this.stepData.status] || iconMap.failed;
  }

  renderTabs() {
    const availableTabs = this.getAvailableTabs();

    return `
      <div class="tabs-container border-b border-gray-200 dark:border-gray-600">
        <nav class="flex overflow-x-auto">
          ${availableTabs.map(tab => this.renderTab(tab)).join('')}
        </nav>
      </div>
    `;
  }

  renderTab(tab) {
    const isActive = this.activeTab === tab.id;
    const activeClass = isActive
      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300';

    return `
      <button class="tab-button flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 ${activeClass} transition-colors duration-200"
              data-tab="${tab.id}">
        <span class="mr-2">${tab.icon}</span>
        ${tab.label}
        ${tab.badge ? `<span class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${tab.badgeClass}">${tab.badge}</span>` : ''}
      </button>
    `;
  }

  renderTabContents() {
    const availableTabs = this.getAvailableTabs();

    return availableTabs.map(tab => `
      <div class="tab-content ${this.activeTab === tab.id ? '' : 'hidden'}" data-tab-content="${tab.id}">
        ${this.renderTabContent(tab.id)}
      </div>
    `).join('');
  }

  renderTabContent(tabId) {
    const contentMap = {
      assertions: () => this.renderAssertionsContent(),
      request: () => this.renderRequestContent(),
      response: () => this.renderResponseContent(),
      curl: () => this.renderCurlContent(),
      iterations: () => this.renderIterationsContent(),
      timeline: () => this.renderTimelineContent()
    };

    const renderer = contentMap[tabId];
    return renderer ? renderer() : '<div class="p-4">Conteúdo não encontrado</div>';
  }

  renderAssertionsContent() {
    const assertions = this.stepData.assertions_results || [];

    if (assertions.length === 0) {
      return `
        <div class="p-6 text-center text-gray-500 dark:text-gray-400">
          <svg class="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p>Nenhuma assertion foi executada</p>
        </div>
      `;
    }

    return `
      <div class="p-4 space-y-3">
        ${assertions.map((assertion, index) => this.renderAssertionItem(assertion, index)).join('')}
      </div>
    `;
  }

  renderAssertionItem(assertion, index) {
    const statusIcon = assertion.passed
      ? '<svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>'
      : '<svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>';

    const bgClass = assertion.passed ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';

    return `
      <div class="assertion-item p-3 border rounded-lg ${bgClass}">
        <div class="flex items-start space-x-3">
          <div class="flex-shrink-0 mt-0.5">${statusIcon}</div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <code class="text-sm font-mono text-gray-900 dark:text-white">${this.escapeHtml(assertion.field || '')}</code>
              <span class="text-xs text-gray-500 dark:text-gray-400">#${index + 1}</span>
            </div>
            <div class="mt-1 text-sm">
              <span class="font-medium">${this.escapeHtml(assertion.operator || '')}</span>
              <span class="ml-2 text-blue-600 dark:text-blue-400 font-mono">${this.escapeHtml(String(assertion.expected || ''))}</span>
            </div>
            ${!assertion.passed ? `
              <div class="mt-2 p-2 bg-red-100 dark:bg-red-900/40 rounded text-sm">
                <span class="text-red-600 dark:text-red-400 font-medium">Valor atual:</span>
                <span class="font-mono text-red-800 dark:text-red-200 ml-2">${this.escapeHtml(String(assertion.actual || ''))}</span>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  renderRequestContent() {
    const request = this.stepData.request_details;
    if (!request) {
      return '<div class="p-4 text-gray-500 dark:text-gray-400">Detalhes da requisição não disponíveis</div>';
    }

    return `
      <div class="p-4 space-y-4">
        <!-- Method and URL -->
        <div class="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
          <div class="flex items-center space-x-2">
            <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium ${this.getMethodBadgeClass(request.method)}">
              ${request.method || 'GET'}
            </span>
            <code class="text-sm text-gray-700 dark:text-gray-300 break-all">${this.escapeHtml(request.url || '')}</code>
          </div>
        </div>

        <!-- Headers -->
        ${this.renderCodeSection('Headers', JSON.stringify(request.headers || {}, null, 2), 'json')}

        <!-- Body -->
        ${request.body ? this.renderCodeSection('Body', this.formatRequestBody(request.body), 'json') : ''}
      </div>
    `;
  }

  renderResponseContent() {
    const response = this.stepData.response_details;
    if (!response) {
      return '<div class="p-4 text-gray-500 dark:text-gray-400">Detalhes da resposta não disponíveis</div>';
    }

    return `
      <div class="p-4 space-y-4">
        <!-- Status -->
        <div class="flex items-center space-x-4">
          <div class="flex items-center space-x-2">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</span>
            <span class="inline-flex items-center px-2 py-1 rounded text-sm font-medium ${this.getStatusBadgeClass(response.status_code)}">
              ${response.status_code || 'N/A'}
            </span>
          </div>
          <div class="text-sm text-gray-500 dark:text-gray-400">
            Tamanho: ${this.formatBytes(this.getResponseSize(response.body))}
          </div>
        </div>

        <!-- Headers -->
        ${this.renderCodeSection('Response Headers', JSON.stringify(response.headers || {}, null, 2), 'json')}

        <!-- Body -->
        ${this.renderCodeSection('Response Body', this.formatResponseBody(response.body), 'json')}
      </div>
    `;
  }

  renderCurlContent() {
    const curlCommand = this.stepData.request_details?.curl_command;
    if (!curlCommand) {
      return '<div class="p-4 text-gray-500 dark:text-gray-400">Comando cURL não disponível</div>';
    }

    return `
      <div class="p-4">
        <div class="flex items-center justify-between mb-3">
          <h4 class="font-medium text-gray-900 dark:text-white">cURL Command</h4>
          <button class="copy-curl px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
            Copiar
          </button>
        </div>
        ${this.renderCodeSection('', curlCommand, 'bash', false)}
      </div>
    `;
  }

  renderIterationsContent() {
    const iterations = this.stepData.iteration_results;
    if (!iterations) {
      return '<div class="p-4 text-gray-500 dark:text-gray-400">Resultados de iteração não disponíveis</div>';
    }

    return `
      <div class="p-4">
        ${this.renderCodeSection('Iteration Results', JSON.stringify(iterations, null, 2), 'json')}
      </div>
    `;
  }

  renderTimelineContent() {
    return `
      <div class="p-4">
        <div class="space-y-3">
          <div class="flex items-center space-x-3">
            <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
            <div class="text-sm">Requisição iniciada</div>
            <div class="text-xs text-gray-500">0ms</div>
          </div>
          <div class="flex items-center space-x-3">
            <div class="w-2 h-2 bg-green-500 rounded-full"></div>
            <div class="text-sm">Resposta recebida</div>
            <div class="text-xs text-gray-500">${this.stepData.duration_ms || 0}ms</div>
          </div>
          <div class="flex items-center space-x-3">
            <div class="w-2 h-2 bg-purple-500 rounded-full"></div>
            <div class="text-sm">Assertions executadas</div>
            <div class="text-xs text-gray-500">${(this.stepData.duration_ms || 0) + 5}ms</div>
          </div>
        </div>
      </div>
    `;
  }

  renderCodeSection(title, content, language = 'json', showTitle = true) {
    return `
      <div class="code-section">
        ${showTitle ? `<h4 class="font-medium text-gray-900 dark:text-white mb-2">${title}</h4>` : ''}
        <div class="relative">
          <pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm"><code class="language-${language}">${this.escapeHtml(content)}</code></pre>
          <button class="copy-code absolute top-2 right-2 px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600">
            Copy
          </button>
        </div>
      </div>
    `;
  }

  // Event listeners
  attachEventListeners() {
    if (!this.element) return;

    // Tab switching
    const tabButtons = this.element.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tabId = button.getAttribute('data-tab');
        this.switchToTab(tabId);
      });
    });

    // Close button
    const closeButton = this.element.querySelector('.close-step');
    if (closeButton) {
      closeButton.addEventListener('click', () => this.close());
    }

    // Copy buttons
    this.attachCopyListeners();
  }

  attachCopyListeners() {
    const copyButtons = this.element.querySelectorAll('.copy-code, .copy-curl');
    copyButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const codeElement = button.parentElement.querySelector('code') ||
                           button.parentElement.querySelector('pre');

        if (codeElement) {
          navigator.clipboard.writeText(codeElement.textContent).then(() => {
            button.textContent = 'Copiado!';
            setTimeout(() => {
              button.textContent = button.classList.contains('copy-curl') ? 'Copiar' : 'Copy';
            }, 2000);
          });
        }
      });
    });
  }

  switchToTab(tabId) {
    this.activeTab = tabId;

    // Update tab buttons
    const tabButtons = this.element.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
      const isActive = button.getAttribute('data-tab') === tabId;
      button.classList.toggle('border-blue-500', isActive);
      button.classList.toggle('text-blue-600', isActive);
      button.classList.toggle('dark:text-blue-400', isActive);
      button.classList.toggle('border-transparent', !isActive);
      button.classList.toggle('text-gray-500', !isActive);
      button.classList.toggle('dark:text-gray-400', !isActive);
    });

    // Update content visibility
    const contentElements = this.element.querySelectorAll('.tab-content');
    contentElements.forEach(content => {
      const isActive = content.getAttribute('data-tab-content') === tabId;
      content.classList.toggle('hidden', !isActive);
    });
  }

  close() {
    this.element.dispatchEvent(new CustomEvent('stepClose', {
      detail: { stepData: this.stepData }
    }));
  }

  // Utility methods
  getAvailableTabs() {
    const tabs = [];

    if (this.options.showAssertions) {
      const assertionsCount = this.stepData.assertions_results?.length || 0;
      tabs.push({
        id: 'assertions',
        label: 'Assertions',
        icon: '✓',
        badge: assertionsCount > 0 ? assertionsCount : null,
        badgeClass: this.getAssertionsBadgeClass()
      });
    }

    if (this.options.showRequest && this.stepData.request_details) {
      tabs.push({
        id: 'request',
        label: 'Request',
        icon: '📤'
      });
    }

    if (this.options.showResponse && this.stepData.response_details) {
      tabs.push({
        id: 'response',
        label: 'Response',
        icon: '📥'
      });
    }

    if (this.options.showCurl && this.stepData.request_details?.curl_command) {
      tabs.push({
        id: 'curl',
        label: 'cURL',
        icon: '💻'
      });
    }

    if (this.options.showIterations && this.stepData.iteration_results) {
      tabs.push({
        id: 'iterations',
        label: 'Iterations',
        icon: '🔄'
      });
    }

    tabs.push({
      id: 'timeline',
      label: 'Timeline',
      icon: '⏱️'
    });

    return tabs;
  }

  getAssertionsBadgeClass() {
    const assertions = this.stepData.assertions_results || [];
    const passed = assertions.filter(a => a.passed).length;
    const total = assertions.length;

    if (total === 0) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    if (passed === total) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  }

  getStatusClass(status) {
    return `step-${status}`;
  }

  getHeaderBgClass(status) {
    const bgMap = {
      success: 'bg-green-50 dark:bg-green-900/20',
      failed: 'bg-red-50 dark:bg-red-900/20',
      running: 'bg-blue-50 dark:bg-blue-900/20'
    };
    return bgMap[status] || '';
  }

  getMethodBadgeClass(method) {
    const colorMap = {
      GET: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      POST: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      PUT: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      DELETE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      PATCH: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    };
    return colorMap[method] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }

  getStatusBadgeClass(statusCode) {
    if (statusCode >= 200 && statusCode < 300) {
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    }
    if (statusCode >= 300 && statusCode < 400) {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
    if (statusCode >= 400) {
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    }
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }

  getStepDescription() {
    const request = this.stepData.request_details;
    if (request && request.url) {
      return `${request.method || 'GET'} ${request.url}`;
    }
    return this.stepData.description || 'No description available';
  }

  getAssertionsSummary() {
    const assertions = this.stepData.assertions_results || [];
    const passed = assertions.filter(a => a.passed).length;
    return `${passed}/${assertions.length} assertions passed`;
  }

  formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  getResponseSize(body) {
    if (!body) return 0;
    return new Blob([typeof body === 'string' ? body : JSON.stringify(body)]).size;
  }

  formatRequestBody(body) {
    if (typeof body === 'string') {
      try {
        return JSON.stringify(JSON.parse(body), null, 2);
      } catch (e) {
        return body;
      }
    }
    return JSON.stringify(body, null, 2);
  }

  formatResponseBody(body) {
    if (typeof body === 'string') {
      try {
        const parsed = JSON.parse(body);
        return JSON.stringify(parsed, null, 2);
      } catch (e) {
        return body;
      }
    }
    return JSON.stringify(body, null, 2);
  }

  escapeHtml(text) {
    if (text === null || text === undefined) return '';
    // Enhanced security: prevent any script injection attempts
    const safeText = String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      // Block potential script injection patterns
      .replace(/javascript:/gi, 'blocked:')
      .replace(/data:/gi, 'blocked:')
      .replace(/vbscript:/gi, 'blocked:')
      .replace(/on\w+=/gi, 'blocked=')
      // Block HTML entities that could be used for encoding attacks
      .replace(/&#x/gi, '&amp;#x')
      .replace(/&#\d/gi, (match) => '&amp;' + match.slice(1));

    return safeText;
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
  module.exports = TestStep;
} else {
  window.TestStep = TestStep;
}