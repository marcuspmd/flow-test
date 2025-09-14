/**
 * Summary Component - Key metrics and overview cards
 * Displays test statistics, success rates, and performance indicators
 */
class Summary {
  constructor(data, options = {}) {
    this.data = data;
    this.options = {
      showDetailedMetrics: true,
      showPerformanceMetrics: true,
      animateNumbers: true,
      cardAnimation: true,
      ...options
    };
    this.element = null;
    this.animations = [];
  }

  render(targetElement) {
    this.element = this.createElement();
    if (targetElement) {
      targetElement.appendChild(this.element);
    }

    if (this.options.animateNumbers) {
      setTimeout(() => this.animateNumbers(), 100);
    }

    return this.element;
  }

  createElement() {
    const summary = document.createElement('div');
    summary.className = 'summary-container';

    summary.innerHTML = `
      <!-- Main Metrics Grid -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        ${this.renderMainMetricCards()}
      </div>

      ${this.options.showDetailedMetrics ? this.renderDetailedMetrics() : ''}
      ${this.options.showPerformanceMetrics ? this.renderPerformanceMetrics() : ''}
    `;

    return summary;
  }

  renderMainMetricCards() {
    const metrics = [
      {
        title: 'Total de Testes',
        value: this.data.total_tests || 0,
        icon: '📊',
        color: 'blue',
        description: 'Testes executados'
      },
      {
        title: 'Sucessos',
        value: this.data.successful_tests || 0,
        icon: '✅',
        color: 'green',
        description: 'Testes aprovados',
        percentage: this.data.total_tests ? ((this.data.successful_tests || 0) / this.data.total_tests * 100) : 0
      },
      {
        title: 'Falhas',
        value: this.data.failed_tests || 0,
        icon: '❌',
        color: 'red',
        description: 'Testes falharam',
        percentage: this.data.total_tests ? ((this.data.failed_tests || 0) / this.data.total_tests * 100) : 0
      },
      {
        title: 'Taxa de Sucesso',
        value: `${(this.data.success_rate || 0).toFixed(1)}%`,
        icon: '🎯',
        color: this.getSuccessRateColor(this.data.success_rate || 0),
        description: 'Percentual geral'
      }
    ];

    return metrics.map((metric, index) => this.renderMetricCard(metric, index)).join('');
  }

  renderMetricCard(metric, index) {
    const animationDelay = this.options.cardAnimation ? `style="animation-delay: ${index * 100}ms"` : '';
    const cardColorClass = this.getCardColorClass(metric.color);

    return `
      <div class="metric-card bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-all duration-300 transform hover:scale-105 ${this.options.cardAnimation ? 'animate-fade-in-up' : ''}" ${animationDelay}>
        <!-- Header -->
        <div class="flex items-center justify-between mb-3">
          <span class="text-2xl">${metric.icon}</span>
          ${metric.percentage !== undefined ? `
            <div class="text-xs font-medium px-2 py-1 rounded-full ${cardColorClass.bg} ${cardColorClass.text}">
              ${metric.percentage.toFixed(1)}%
            </div>
          ` : ''}
        </div>

        <!-- Value -->
        <div class="mb-2">
          <div class="text-2xl lg:text-3xl font-bold ${cardColorClass.textMain} counter" data-target="${typeof metric.value === 'string' ? metric.value.replace('%', '') : metric.value}">
            ${typeof metric.value === 'string' && metric.value.includes('%') ? '0%' : '0'}
          </div>
        </div>

        <!-- Title and Description -->
        <div>
          <h3 class="font-medium text-gray-900 dark:text-white text-sm lg:text-base">${metric.title}</h3>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">${metric.description}</p>
        </div>

        <!-- Progress Bar (for percentage metrics) -->
        ${metric.percentage !== undefined ? `
          <div class="mt-3">
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div class="progress-bar h-2 rounded-full ${cardColorClass.progressBg} transition-all duration-1000 ease-out"
                   data-width="${metric.percentage}%" style="width: 0%"></div>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  renderDetailedMetrics() {
    return `
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <span class="mr-2">📈</span>
          Métricas Detalhadas
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <!-- Test Suites -->
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-600 dark:text-blue-400 counter" data-target="${this.data.suites_results?.length || 0}">0</div>
            <div class="text-sm text-gray-600 dark:text-gray-400">Test Suites</div>
          </div>

          <!-- Average Duration -->
          <div class="text-center">
            <div class="text-2xl font-bold text-purple-600 dark:text-purple-400">
              ${this.formatDuration(this.getAverageDuration())}
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-400">Duração Média</div>
          </div>

          <!-- Total Duration -->
          <div class="text-center">
            <div class="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              ${this.formatDuration(this.data.total_duration_ms || 0)}
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-400">Duração Total</div>
          </div>
        </div>
      </div>
    `;
  }

  renderPerformanceMetrics() {
    const performanceData = this.calculatePerformanceMetrics();

    return `
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <span class="mr-2">⚡</span>
          Métricas de Performance
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Performance Score -->
          <div class="text-center">
            <div class="relative inline-flex items-center justify-center w-24 h-24 mb-3">
              <svg class="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
                <path class="text-gray-300 dark:text-gray-700"
                      stroke="currentColor" stroke-width="2" fill="none"
                      d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path class="performance-circle ${this.getPerformanceColorClass(performanceData.score)}"
                      stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"
                      stroke-dasharray="${performanceData.score}, 100"
                      d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <div class="absolute text-lg font-bold">${performanceData.score}%</div>
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-400">Score de Performance</div>
          </div>

          <!-- Performance Breakdown -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-600 dark:text-gray-400">Velocidade</span>
              <div class="flex items-center space-x-2">
                <div class="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                  <div class="h-2 bg-green-500 rounded-full transition-all duration-1000"
                       style="width: ${performanceData.speed}%"></div>
                </div>
                <span class="text-sm font-medium">${performanceData.speed}%</span>
              </div>
            </div>

            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-600 dark:text-gray-400">Confiabilidade</span>
              <div class="flex items-center space-x-2">
                <div class="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                  <div class="h-2 bg-blue-500 rounded-full transition-all duration-1000"
                       style="width: ${performanceData.reliability}%"></div>
                </div>
                <span class="text-sm font-medium">${performanceData.reliability}%</span>
              </div>
            </div>

            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-600 dark:text-gray-400">Eficiência</span>
              <div class="flex items-center space-x-2">
                <div class="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                  <div class="h-2 bg-purple-500 rounded-full transition-all duration-1000"
                       style="width: ${performanceData.efficiency}%"></div>
                </div>
                <span class="text-sm font-medium">${performanceData.efficiency}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  animateNumbers() {
    const counters = this.element.querySelectorAll('.counter');

    counters.forEach(counter => {
      const target = counter.getAttribute('data-target');
      const isPercentage = target.includes('%');
      const targetValue = parseFloat(target.replace('%', ''));
      let current = 0;
      const increment = targetValue / 50; // 50 steps animation

      const updateCounter = () => {
        if (current < targetValue) {
          current += increment;
          if (current > targetValue) current = targetValue;

          const displayValue = Math.floor(current);
          counter.textContent = isPercentage ? `${displayValue}%` : displayValue;
          requestAnimationFrame(updateCounter);
        }
      };

      updateCounter();
    });

    // Animate progress bars
    setTimeout(() => {
      const progressBars = this.element.querySelectorAll('.progress-bar');
      progressBars.forEach(bar => {
        const width = bar.getAttribute('data-width');
        bar.style.width = width;
      });
    }, 500);
  }

  calculatePerformanceMetrics() {
    const successRate = this.data.success_rate || 0;
    const avgDuration = this.getAverageDuration();
    const totalTests = this.data.total_tests || 1;

    // Calculate performance metrics
    const reliability = successRate;
    const speed = Math.max(0, 100 - Math.min(100, (avgDuration / 1000) * 10)); // Penalize slow tests
    const efficiency = Math.min(100, (totalTests / Math.max(1, this.data.total_duration_ms / 1000)) * 10);

    const score = Math.round((reliability * 0.5 + speed * 0.3 + efficiency * 0.2));

    return {
      score: Math.min(100, score),
      reliability: Math.round(reliability),
      speed: Math.round(speed),
      efficiency: Math.round(efficiency)
    };
  }

  getAverageDuration() {
    if (!this.data.suites_results || this.data.suites_results.length === 0) {
      return 0;
    }

    const totalDuration = this.data.suites_results.reduce((sum, suite) => {
      return sum + (suite.duration_ms || 0);
    }, 0);

    return totalDuration / this.data.suites_results.length;
  }

  getSuccessRateColor(rate) {
    if (rate === 100) return 'green';
    if (rate >= 90) return 'yellow';
    if (rate >= 70) return 'orange';
    return 'red';
  }

  getCardColorClass(color) {
    const colorMap = {
      blue: {
        bg: 'bg-blue-100 dark:bg-blue-900',
        text: 'text-blue-800 dark:text-blue-200',
        textMain: 'text-blue-600 dark:text-blue-400',
        progressBg: 'bg-blue-500'
      },
      green: {
        bg: 'bg-green-100 dark:bg-green-900',
        text: 'text-green-800 dark:text-green-200',
        textMain: 'text-green-600 dark:text-green-400',
        progressBg: 'bg-green-500'
      },
      red: {
        bg: 'bg-red-100 dark:bg-red-900',
        text: 'text-red-800 dark:text-red-200',
        textMain: 'text-red-600 dark:text-red-400',
        progressBg: 'bg-red-500'
      },
      yellow: {
        bg: 'bg-yellow-100 dark:bg-yellow-900',
        text: 'text-yellow-800 dark:text-yellow-200',
        textMain: 'text-yellow-600 dark:text-yellow-400',
        progressBg: 'bg-yellow-500'
      },
      orange: {
        bg: 'bg-orange-100 dark:bg-orange-900',
        text: 'text-orange-800 dark:text-orange-200',
        textMain: 'text-orange-600 dark:text-orange-400',
        progressBg: 'bg-orange-500'
      }
    };

    return colorMap[color] || colorMap.blue;
  }

  getPerformanceColorClass(score) {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    if (score >= 50) return 'text-orange-500';
    return 'text-red-500';
  }

  formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;

    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
    this.animations = [];
  }
}

// Export for module systems or attach to window for direct usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Summary;
} else {
  window.Summary = Summary;
}