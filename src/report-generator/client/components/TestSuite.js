/**
 * TestSuite Component - Interactive test suite visualization
 * Handles expansion/collapse, step details, and suite-level metrics
 */
class TestSuite {
  constructor(suiteData, options = {}) {
    this.suiteData = suiteData;
    this.options = {
      expandable: true,
      showStepDetails: true,
      showMetrics: true,
      animateExpansion: true,
      highlightFailures: true,
      ...options
    };
    this.element = null;
    this.isExpanded = false;
    this.stepComponents = [];
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
    const suiteContainer = document.createElement('div');
    suiteContainer.className = `test-suite-container mb-4 ${this.options.animateExpansion ? 'transition-all duration-300' : ''}`;
    suiteContainer.dataset.suiteId = this.generateSuiteId();

    const statusClass = this.getStatusClass(this.suiteData.status);
    const borderClass = this.getBorderClass(this.suiteData.status);

    suiteContainer.innerHTML = `
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border ${borderClass} overflow-hidden">
        <!-- Suite Header -->
        <div class="suite-header p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
             ${this.options.expandable ? 'role="button" tabindex="0"' : ''}>

          <div class="flex items-center justify-between">
            <!-- Left Section: Status and Title -->
            <div class="flex items-center space-x-3 flex-1 min-w-0">
              <!-- Status Icon -->
              <div class="flex-shrink-0">
                ${this.renderStatusIcon()}
              </div>

              <!-- Suite Info -->
              <div class="flex-1 min-w-0">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  ${this.escapeHtml(this.suiteData.suite_name || 'Test Suite')}
                </h3>
                <div class="flex items-center space-x-4 mt-1">
                  <span class="text-sm text-gray-500 dark:text-gray-400">
                    ${this.getStepCount()} steps
                  </span>
                  <span class="text-sm text-gray-500 dark:text-gray-400">
                    ${this.formatDuration(this.suiteData.duration_ms || 0)}
                  </span>
                  ${this.options.showMetrics ? this.renderSuiteMetrics() : ''}
                </div>
              </div>
            </div>

            <!-- Right Section: Actions and Status -->
            <div class="flex items-center space-x-3 flex-shrink-0">
              <!-- Quick Stats -->
              <div class="hidden sm:flex items-center space-x-2 text-sm">
                ${this.renderQuickStats()}
              </div>

              <!-- Expand/Collapse Arrow -->
              ${this.options.expandable ? `
                <div class="expand-arrow transform transition-transform duration-200 ${this.isExpanded ? 'rotate-180' : ''}">
                  <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Progress Bar (for running suites) -->
          ${this.suiteData.status === 'running' ? this.renderProgressBar() : ''}
        </div>

        <!-- Suite Content (Steps) -->
        <div class="suite-content ${this.isExpanded ? '' : 'hidden'} border-t border-gray-200 dark:border-gray-600">
          ${this.options.showStepDetails ? this.renderStepsContainer() : ''}
        </div>
      </div>
    `;

    return suiteContainer;
  }

  renderStatusIcon() {
    const iconMap = {
      success: `
        <div class="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
          <svg class="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
          </svg>
        </div>
      `,
      failed: `
        <div class="w-6 h-6 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
          <svg class="w-4 h-4 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
          </svg>
        </div>
      `,
      running: `
        <div class="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
          <div class="w-3 h-3 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse"></div>
        </div>
      `,
      pending: `
        <div class="w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
          <div class="w-3 h-3 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
        </div>
      `
    };

    return iconMap[this.suiteData.status] || iconMap.pending;
  }

  renderSuiteMetrics() {
    const successfulSteps = this.getSuccessfulStepsCount();
    const totalSteps = this.getStepCount();
    const successRate = totalSteps > 0 ? (successfulSteps / totalSteps * 100) : 0;

    return `
      <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${this.getSuccessRateBadgeClass(successRate)}">
        ${successRate.toFixed(0)}% success
      </span>
    `;
  }

  renderQuickStats() {
    const steps = this.suiteData.steps_results || [];
    const successful = steps.filter(step => step.status === 'success').length;
    const failed = steps.filter(step => step.status === 'failed').length;

    return `
      <span class="text-green-600 dark:text-green-400 font-medium">✓ ${successful}</span>
      <span class="text-red-600 dark:text-red-400 font-medium">✗ ${failed}</span>
    `;
  }

  renderProgressBar() {
    return `
      <div class="mt-3 px-4 pb-2">
        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div class="bg-blue-500 h-2 rounded-full animate-pulse" style="width: 45%"></div>
        </div>
      </div>
    `;
  }

  renderStepsContainer() {
    const steps = this.suiteData.steps_results || [];

    if (steps.length === 0) {
      return `
        <div class="p-6 text-center text-gray-500 dark:text-gray-400">
          <svg class="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <p>Nenhum step encontrado nesta suite</p>
        </div>
      `;
    }

    return `
      <div class="steps-container p-4 space-y-2">
        ${steps.map((step, index) => this.renderStepPreview(step, index)).join('')}
      </div>
    `;
  }

  renderStepPreview(stepData, index) {
    const statusClass = this.getStepStatusClass(stepData.status);
    const statusIcon = this.getStepStatusIcon(stepData.status);

    return `
      <div class="step-preview p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors duration-200"
           data-step-index="${index}">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3 flex-1 min-w-0">
            <span class="text-lg">${statusIcon}</span>
            <div class="flex-1 min-w-0">
              <p class="font-medium text-gray-900 dark:text-white truncate">
                ${this.escapeHtml(stepData.step_name || `Step ${index + 1}`)}
              </p>
              <p class="text-sm text-gray-500 dark:text-gray-400 truncate">
                ${this.getStepSummary(stepData)}
              </p>
            </div>
          </div>

          <div class="flex items-center space-x-2 flex-shrink-0">
            <span class="text-xs text-gray-500 dark:text-gray-400">
              ${this.formatDuration(stepData.duration_ms || 0)}
            </span>
            ${stepData.status === 'failed' && this.options.highlightFailures ? `
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                Falhou
              </span>
            ` : ''}
          </div>
        </div>

        <!-- Quick Assertions Preview -->
        ${stepData.assertions_results && stepData.assertions_results.length > 0 ? this.renderAssertionsPreview(stepData.assertions_results) : ''}
      </div>
    `;
  }

  renderAssertionsPreview(assertions) {
    const passed = assertions.filter(a => a.passed).length;
    const total = assertions.length;

    return `
      <div class="mt-2 flex items-center space-x-2">
        <div class="flex -space-x-1">
          ${assertions.slice(0, 5).map(assertion => `
            <div class="w-3 h-3 rounded-full border border-white dark:border-gray-700 ${assertion.passed ? 'bg-green-500' : 'bg-red-500'}"></div>
          `).join('')}
          ${assertions.length > 5 ? '<span class="text-xs text-gray-500">...</span>' : ''}
        </div>
        <span class="text-xs text-gray-500 dark:text-gray-400">
          ${passed}/${total} assertions passed
        </span>
      </div>
    `;
  }

  attachEventListeners() {
    if (!this.element || !this.options.expandable) return;

    const header = this.element.querySelector('.suite-header');
    const content = this.element.querySelector('.suite-content');
    const arrow = this.element.querySelector('.expand-arrow');

    if (header) {
      header.addEventListener('click', () => this.toggle());
      header.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.toggle();
        }
      });
    }

    // Step click events
    const stepPreviews = this.element.querySelectorAll('.step-preview');
    stepPreviews.forEach((preview, index) => {
      preview.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showStepDetails(index);
      });
    });
  }

  toggle() {
    if (!this.options.expandable) return;

    this.isExpanded = !this.isExpanded;
    const content = this.element.querySelector('.suite-content');
    const arrow = this.element.querySelector('.expand-arrow');

    if (content) {
      if (this.isExpanded) {
        content.classList.remove('hidden');
        if (this.options.animateExpansion) {
          content.style.maxHeight = '0px';
          content.style.overflow = 'hidden';
          setTimeout(() => {
            content.style.maxHeight = content.scrollHeight + 'px';
          }, 10);
        }
      } else {
        if (this.options.animateExpansion) {
          content.style.maxHeight = '0px';
          setTimeout(() => {
            content.classList.add('hidden');
            content.style.maxHeight = '';
            content.style.overflow = '';
          }, 300);
        } else {
          content.classList.add('hidden');
        }
      }
    }

    if (arrow) {
      arrow.classList.toggle('rotate-180', this.isExpanded);
    }

    // Trigger event
    this.element.dispatchEvent(new CustomEvent('suiteToggle', {
      detail: { expanded: this.isExpanded, suiteData: this.suiteData }
    }));
  }

  expand() {
    if (!this.isExpanded) {
      this.toggle();
    }
  }

  collapse() {
    if (this.isExpanded) {
      this.toggle();
    }
  }

  showStepDetails(stepIndex) {
    const stepData = this.suiteData.steps_results?.[stepIndex];
    if (!stepData) return;

    // Trigger event for parent to handle step details display
    this.element.dispatchEvent(new CustomEvent('showStepDetails', {
      detail: { stepData, stepIndex, suiteData: this.suiteData }
    }));
  }

  // Utility methods
  generateSuiteId() {
    return `suite-${Math.random().toString(36).substr(2, 9)}`;
  }

  getStatusClass(status) {
    const statusMap = {
      success: 'suite-success',
      failed: 'suite-failed',
      running: 'suite-running',
      pending: 'suite-pending'
    };
    return statusMap[status] || 'suite-pending';
  }

  getBorderClass(status) {
    const borderMap = {
      success: 'border-green-200 dark:border-green-800',
      failed: 'border-red-200 dark:border-red-800',
      running: 'border-blue-200 dark:border-blue-800',
      pending: 'border-gray-200 dark:border-gray-700'
    };
    return borderMap[status] || 'border-gray-200 dark:border-gray-700';
  }

  getStepStatusClass(status) {
    return this.getStatusClass(status);
  }

  getStepStatusIcon(status) {
    const iconMap = {
      success: '✅',
      failed: '❌',
      running: '🔄',
      pending: '⏳'
    };
    return iconMap[status] || '⏳';
  }

  getSuccessRateBadgeClass(successRate) {
    if (successRate === 100) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (successRate >= 80) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  }

  getStepCount() {
    return this.suiteData.steps_results?.length || 0;
  }

  getSuccessfulStepsCount() {
    return this.suiteData.steps_results?.filter(step => step.status === 'success').length || 0;
  }

  getStepSummary(stepData) {
    const method = stepData.request_details?.method || 'GET';
    const url = stepData.request_details?.url || '';
    const statusCode = stepData.response_details?.status_code;

    if (url) {
      return `${method} ${url}${statusCode ? ` → ${statusCode}` : ''}`;
    }

    return stepData.description || 'No description';
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
    this.stepComponents = [];
  }
}

// Export for module systems or attach to window for direct usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TestSuite;
} else {
  window.TestSuite = TestSuite;
}