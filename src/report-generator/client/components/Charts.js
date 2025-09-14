/**
 * Charts Component - Interactive charts and data visualizations
 * Uses Chart.js for creating various charts from test data
 */
class Charts {
  constructor(data, options = {}) {
    this.data = data;
    this.options = {
      showSuccessRateChart: true,
      showDurationChart: true,
      showTimelineChart: true,
      showSuiteComparisonChart: true,
      chartHeight: 300,
      responsive: true,
      animate: true,
      ...options
    };
    this.element = null;
    this.chartInstances = new Map();
  }

  render(targetElement) {
    this.element = this.createElement();
    if (targetElement) {
      targetElement.appendChild(this.element);
    }

    // Initialize charts after DOM is ready
    setTimeout(() => this.initializeCharts(), 100);
    return this.element;
  }

  createElement() {
    const chartsContainer = document.createElement('div');
    chartsContainer.className = 'charts-container space-y-6';

    chartsContainer.innerHTML = `
      <!-- Charts Header -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
          <span class="mr-2">📊</span>
          Analytics Dashboard
        </h2>
        <div class="flex items-center space-x-2">
          <button class="refresh-charts px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
            <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            Atualizar
          </button>
        </div>
      </div>

      <!-- Charts Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        ${this.options.showSuccessRateChart ? this.renderSuccessRateChart() : ''}
        ${this.options.showDurationChart ? this.renderDurationChart() : ''}
        ${this.options.showTimelineChart ? this.renderTimelineChart() : ''}
        ${this.options.showSuiteComparisonChart ? this.renderSuiteComparisonChart() : ''}
      </div>

      <!-- Additional Metrics -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        ${this.renderMetricCards()}
      </div>
    `;

    return chartsContainer;
  }

  renderSuccessRateChart() {
    return `
      <div class="chart-card bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">Taxa de Sucesso</h3>
          <div class="text-sm text-gray-500 dark:text-gray-400">
            ${this.data.success_rate?.toFixed(1) || 0}% geral
          </div>
        </div>
        <div class="relative" style="height: ${this.options.chartHeight}px">
          <canvas id="success-rate-chart"></canvas>
        </div>
      </div>
    `;
  }

  renderDurationChart() {
    return `
      <div class="chart-card bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">Duração por Suite</h3>
          <div class="text-sm text-gray-500 dark:text-gray-400">
            Total: ${this.formatDuration(this.data.total_duration_ms || 0)}
          </div>
        </div>
        <div class="relative" style="height: ${this.options.chartHeight}px">
          <canvas id="duration-chart"></canvas>
        </div>
      </div>
    `;
  }

  renderTimelineChart() {
    return `
      <div class="chart-card bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 lg:col-span-2">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">Timeline de Execução</h3>
          <div class="flex items-center space-x-2">
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              ● Sucesso
            </span>
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
              ● Falha
            </span>
          </div>
        </div>
        <div class="relative" style="height: ${this.options.chartHeight}px">
          <canvas id="timeline-chart"></canvas>
        </div>
      </div>
    `;
  }

  renderSuiteComparisonChart() {
    return `
      <div class="chart-card bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 lg:col-span-2">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">Comparação de Suites</h3>
          <select class="chart-type-selector text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700">
            <option value="bar">Barras</option>
            <option value="radar">Radar</option>
            <option value="line">Linha</option>
          </select>
        </div>
        <div class="relative" style="height: ${this.options.chartHeight}px">
          <canvas id="suite-comparison-chart"></canvas>
        </div>
      </div>
    `;
  }

  renderMetricCards() {
    const metrics = this.calculateAdvancedMetrics();

    return `
      <div class="metric-card bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-lg text-white">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-blue-100 text-sm">Eficiência</p>
            <p class="text-2xl font-bold">${metrics.efficiency}%</p>
          </div>
          <div class="text-blue-200">
            <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
            </svg>
          </div>
        </div>
      </div>

      <div class="metric-card bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-lg text-white">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-green-100 text-sm">Velocidade Média</p>
            <p class="text-2xl font-bold">${metrics.avgSpeed}</p>
          </div>
          <div class="text-green-200">
            <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
            </svg>
          </div>
        </div>
      </div>

      <div class="metric-card bg-gradient-to-r from-purple-500 to-purple-600 p-4 rounded-lg text-white">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-purple-100 text-sm">Coverage Score</p>
            <p class="text-2xl font-bold">${metrics.coverage}%</p>
          </div>
          <div class="text-purple-200">
            <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
        </div>
      </div>
    `;
  }

  initializeCharts() {
    if (!window.Chart) {
      console.warn('Chart.js não está carregado. Carregando biblioteca...');
      this.loadChartJS().then(() => this.createCharts());
      return;
    }

    this.createCharts();
  }

  async loadChartJS() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  createCharts() {
    if (this.options.showSuccessRateChart) {
      this.createSuccessRateChart();
    }
    if (this.options.showDurationChart) {
      this.createDurationChart();
    }
    if (this.options.showTimelineChart) {
      this.createTimelineChart();
    }
    if (this.options.showSuiteComparisonChart) {
      this.createSuiteComparisonChart();
    }

    this.attachChartEventListeners();
  }

  createSuccessRateChart() {
    const ctx = this.element.querySelector('#success-rate-chart');
    if (!ctx) return;

    const suiteData = this.data.suites_results || [];
    const chartData = suiteData.map(suite => ({
      suite: this.truncateText(suite.suite_name, 15),
      success: this.calculateSuiteSuccessRate(suite),
      total: suite.steps_results?.length || 0
    }));

    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: chartData.map(d => d.suite),
        datasets: [{
          label: 'Taxa de Sucesso (%)',
          data: chartData.map(d => d.success),
          backgroundColor: [
            'rgba(34, 197, 94, 0.8)',
            'rgba(59, 130, 246, 0.8)',
            'rgba(168, 85, 247, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(20, 184, 166, 0.8)'
          ],
          borderColor: 'rgba(255, 255, 255, 0.2)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#374151',
              font: { size: 12 }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const data = chartData[context.dataIndex];
                return `${context.label}: ${data.success.toFixed(1)}% (${data.total} tests)`;
              }
            }
          }
        },
        animation: this.options.animate
      }
    });

    this.chartInstances.set('success-rate', chart);
  }

  createDurationChart() {
    const ctx = this.element.querySelector('#duration-chart');
    if (!ctx) return;

    const suiteData = this.data.suites_results || [];
    const chartData = suiteData.map(suite => ({
      suite: this.truncateText(suite.suite_name, 20),
      duration: suite.duration_ms || 0,
      status: suite.status
    }));

    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: chartData.map(d => d.suite),
        datasets: [{
          label: 'Duração (ms)',
          data: chartData.map(d => d.duration),
          backgroundColor: chartData.map(d =>
            d.status === 'success' ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)'
          ),
          borderColor: chartData.map(d =>
            d.status === 'success' ? 'rgba(34, 197, 94, 1)' : 'rgba(239, 68, 68, 1)'
          ),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: {
              color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280',
              maxRotation: 45
            },
            grid: {
              color: document.documentElement.classList.contains('dark') ? '#374151' : '#e5e7eb'
            }
          },
          y: {
            ticks: {
              color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280',
              callback: (value) => this.formatDuration(value)
            },
            grid: {
              color: document.documentElement.classList.contains('dark') ? '#374151' : '#e5e7eb'
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => `Duração: ${this.formatDuration(context.raw)}`
            }
          }
        },
        animation: this.options.animate
      }
    });

    this.chartInstances.set('duration', chart);
  }

  createTimelineChart() {
    const ctx = this.element.querySelector('#timeline-chart');
    if (!ctx) return;

    const timelineData = this.generateTimelineData();

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: timelineData.map(d => d.time),
        datasets: [
          {
            label: 'Testes Executados',
            data: timelineData.map(d => d.testsRun),
            borderColor: 'rgba(59, 130, 246, 1)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.4
          },
          {
            label: 'Taxa de Sucesso',
            data: timelineData.map(d => d.successRate),
            borderColor: 'rgba(34, 197, 94, 1)',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            fill: false,
            tension: 0.4,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: {
              color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280',
              maxTicksLimit: 8
            },
            grid: {
              color: document.documentElement.classList.contains('dark') ? '#374151' : '#e5e7eb'
            }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            ticks: {
              color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280'
            },
            grid: {
              color: document.documentElement.classList.contains('dark') ? '#374151' : '#e5e7eb'
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            ticks: {
              color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280',
              callback: (value) => `${value}%`
            },
            grid: {
              drawOnChartArea: false
            },
            max: 100
          }
        },
        plugins: {
          legend: {
            labels: {
              color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#374151'
            }
          }
        },
        animation: this.options.animate
      }
    });

    this.chartInstances.set('timeline', chart);
  }

  createSuiteComparisonChart() {
    const ctx = this.element.querySelector('#suite-comparison-chart');
    if (!ctx) return;

    const suiteData = this.data.suites_results || [];
    const metrics = ['Success Rate', 'Speed Score', 'Efficiency'];

    const datasets = suiteData.slice(0, 5).map((suite, index) => ({
      label: this.truncateText(suite.suite_name, 20),
      data: [
        this.calculateSuiteSuccessRate(suite),
        this.calculateSpeedScore(suite),
        this.calculateEfficiencyScore(suite)
      ],
      backgroundColor: `hsla(${index * 60}, 70%, 60%, 0.2)`,
      borderColor: `hsla(${index * 60}, 70%, 60%, 1)`,
      borderWidth: 2,
      fill: true
    }));

    const chart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: metrics,
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            ticks: {
              color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280'
            },
            grid: {
              color: document.documentElement.classList.contains('dark') ? '#374151' : '#e5e7eb'
            },
            pointLabels: {
              color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#374151'
            }
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#374151',
              font: { size: 11 }
            }
          }
        },
        animation: this.options.animate
      }
    });

    this.chartInstances.set('suite-comparison', chart);

    // Chart type selector
    const selector = this.element.querySelector('.chart-type-selector');
    if (selector) {
      selector.addEventListener('change', (e) => {
        this.updateSuiteComparisonChart(e.target.value);
      });
    }
  }

  updateSuiteComparisonChart(type) {
    const chart = this.chartInstances.get('suite-comparison');
    if (!chart) return;

    chart.destroy();

    // Recreate with new type
    const ctx = this.element.querySelector('#suite-comparison-chart');
    const suiteData = this.data.suites_results || [];

    let newChart;
    if (type === 'bar') {
      // Bar chart implementation
      newChart = this.createBarComparisonChart(ctx, suiteData);
    } else if (type === 'line') {
      // Line chart implementation
      newChart = this.createLineComparisonChart(ctx, suiteData);
    } else {
      // Default radar
      this.createSuiteComparisonChart();
      return;
    }

    this.chartInstances.set('suite-comparison', newChart);
  }

  attachChartEventListeners() {
    // Refresh button
    const refreshButton = this.element.querySelector('.refresh-charts');
    if (refreshButton) {
      refreshButton.addEventListener('click', () => {
        this.refreshCharts();
      });
    }

    // Listen for theme changes
    window.addEventListener('themeChanged', () => {
      setTimeout(() => this.updateChartsTheme(), 100);
    });
  }

  refreshCharts() {
    this.destroyCharts();
    setTimeout(() => this.initializeCharts(), 100);
  }

  updateChartsTheme() {
    this.chartInstances.forEach((chart, key) => {
      const isDark = document.documentElement.classList.contains('dark');
      const textColor = isDark ? '#e5e7eb' : '#374151';
      const gridColor = isDark ? '#374151' : '#e5e7eb';

      // Update chart options for theme
      if (chart.options.plugins && chart.options.plugins.legend) {
        chart.options.plugins.legend.labels.color = textColor;
      }

      if (chart.options.scales) {
        Object.keys(chart.options.scales).forEach(scaleKey => {
          const scale = chart.options.scales[scaleKey];
          if (scale.ticks) scale.ticks.color = isDark ? '#9ca3af' : '#6b7280';
          if (scale.grid) scale.grid.color = gridColor;
          if (scale.pointLabels) scale.pointLabels.color = textColor;
        });
      }

      chart.update();
    });
  }

  // Utility methods
  calculateSuiteSuccessRate(suite) {
    if (!suite.steps_results || suite.steps_results.length === 0) return 0;
    const successful = suite.steps_results.filter(step => step.status === 'success').length;
    return (successful / suite.steps_results.length) * 100;
  }

  calculateSpeedScore(suite) {
    const avgDuration = (suite.duration_ms || 0) / Math.max(1, suite.steps_results?.length || 1);
    return Math.max(0, 100 - Math.min(100, (avgDuration / 1000) * 10));
  }

  calculateEfficiencyScore(suite) {
    const successRate = this.calculateSuiteSuccessRate(suite);
    const speedScore = this.calculateSpeedScore(suite);
    return (successRate * 0.7 + speedScore * 0.3);
  }

  calculateAdvancedMetrics() {
    const suites = this.data.suites_results || [];

    const totalEfficiency = suites.reduce((sum, suite) =>
      sum + this.calculateEfficiencyScore(suite), 0) / Math.max(1, suites.length);

    const avgDuration = (this.data.total_duration_ms || 0) / Math.max(1, this.data.total_tests || 1);
    const avgSpeed = this.formatDuration(avgDuration);

    const coverage = Math.min(100, (this.data.total_tests || 0) * 5); // Simplified coverage metric

    return {
      efficiency: Math.round(totalEfficiency),
      avgSpeed,
      coverage: Math.round(coverage)
    };
  }

  generateTimelineData() {
    const suites = this.data.suites_results || [];
    const timeline = [];
    let cumulativeTests = 0;
    let cumulativeSuccessful = 0;

    suites.forEach((suite, index) => {
      const suiteTests = suite.steps_results?.length || 0;
      const suiteSuccessful = suite.steps_results?.filter(step => step.status === 'success').length || 0;

      cumulativeTests += suiteTests;
      cumulativeSuccessful += suiteSuccessful;

      timeline.push({
        time: `Suite ${index + 1}`,
        testsRun: cumulativeTests,
        successRate: cumulativeTests > 0 ? (cumulativeSuccessful / cumulativeTests) * 100 : 0
      });
    });

    return timeline;
  }

  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  formatDuration(ms) {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;

    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  destroyCharts() {
    this.chartInstances.forEach(chart => chart.destroy());
    this.chartInstances.clear();
  }

  destroy() {
    this.destroyCharts();
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }
}

// Export for module systems or attach to window for direct usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Charts;
} else {
  window.Charts = Charts;
}