import fs from 'fs';
import path from 'path';
import { AggregatedResult, StepExecutionResult } from '../types/config.types';

export interface HTMLGeneratorOptions {
  templateDir?: string;
  outputDir?: string;
  includeCurlCommands?: boolean;
  includeRawData?: boolean;
  theme?: 'light' | 'dark' | 'auto';
}

export class HTMLReportGenerator {
  private options: HTMLGeneratorOptions;
  private compiledCSS: string = '';
  private logoBase64: string = '';

  constructor(options: HTMLGeneratorOptions = {}) {
    this.options = {
      templateDir: path.join(__dirname, '../templates'),
      outputDir: './results',
      includeCurlCommands: true,
      includeRawData: true,
      theme: 'auto',
      ...options,
    };
  }

  async generateFromJSON(jsonPath: string, outputPath?: string): Promise<string> {
    const jsonData = await this.loadJSONData(jsonPath);
    return this.generateHTML(jsonData, outputPath);
  }

  async generateHTML(data: AggregatedResult, outputPath?: string): Promise<string> {
    if (!this.compiledCSS) {
      await this.compileCSS();
    }
    if (!this.logoBase64) {
      this.logoBase64 = this.loadLogo();
    }

    const html = this.buildHTMLReport(data);

    const finalOutputPath =
      outputPath ||
      path.join(
        this.options.outputDir!,
        `${this.sanitizeFileName(data.project_name)}_${this.generateTimestamp()}.html`
      );

    const outputDir = path.dirname(finalOutputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(finalOutputPath, html, 'utf8');

    const latestPath = path.join(this.options.outputDir!, 'latest.html');
    fs.writeFileSync(latestPath, html, 'utf8');

    return finalOutputPath;
  }

  private async loadJSONData(jsonPath: string): Promise<AggregatedResult> {
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`JSON file not found: ${jsonPath}`);
    }
    const jsonContent = fs.readFileSync(jsonPath, 'utf8');
    return JSON.parse(jsonContent) as AggregatedResult;
  }

  private async compileCSS(): Promise<void> {
    try {
      this.compiledCSS = fs.readFileSync(path.join(__dirname, '../templates/styles.css'), 'utf8');
    } catch (error) {
      console.warn('Could not load compiled CSS, using fallback');
      this.compiledCSS = this.getFallbackCSS();
    }
  }

  private loadLogo(): string {
    try {
      const logoPath = '/Users/marcusp/Documents/flow-test/public/assets/Gemini_Generated_Image_sqoh86sqoh86sqoh.png';
      const logoBuffer = fs.readFileSync(logoPath);
      return `data:image/png;base64,${logoBuffer.toString('base64')}`;
    } catch (error) {
      console.warn('Could not load logo, using placeholder.');
      return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iY3VycmVudENvbG9yIiB3aWR0aD0iMzIiIGhlaWdodD0iMzIiPjxwYXRoIGQ9Ik0xMiAyQTEwIDEwIDAgMSAwIDEyIDIyQTEwIDEwIDAgMCAwIDEyIDJ6bTAgMThhOCA4IDAgMSAxIDAtMTYgOCA4IDAgMCAxIDAgMTZ6TTggMTJoNGwzLTNoM2wtNCA0IDQgNGgtM2wtMy0zaC00djJoNHYyaC00djJoNHYySDh6Ii8+PC9zdmc+';
    }
  }

  private getFallbackCSS(): string {
    return `body { font-family: sans-serif; background-color: #f0f2f5; color: #333; }`;
  }

  private buildHTMLReport(data: AggregatedResult): string {
    const { project_name } = data;

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Report: ${this.escapeHtml(project_name)}</title>
    <style>${this.compiledCSS}</style>
</head>
<body class="bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
    <div class="min-h-screen">
        <div class="container mx-auto px-4 py-6 max-w-7xl">
            ${this.buildHeader(data.project_name, this.getOverallStatusClass(data))}
            <div class="mb-8">
                ${this.buildSummaryCards(data)}
            </div>
            <div class="space-y-4">
                ${data.suites_results.map((suite: any) => this.buildSuiteCard(suite)).join('')}
            </div>
            ${this.buildFooter(data)}
        </div>
    </div>
    ${this.buildJavaScript()}
</body>
</html>`;
  }

  private loadClientComponents(): string {
    const componentFiles = [
      'Layout.js',
      'Header.js',
      'Summary.js',
      'TestSuite.js',
      'TestStep.js',
      'Charts.js',
      'FilterPanel.js',
      'ReportApp.js'
    ];

    let componentsCode = '';

    componentFiles.forEach(filename => {
      try {
        // Try both development and production paths
        const devPath = path.join(__dirname, '../../src/report-generator/client/components', filename === 'ReportApp.js' ? '../ReportApp.js' : filename);
        const prodPath = path.join(__dirname, 'client/components', filename === 'ReportApp.js' ? '../ReportApp.js' : filename);

        let componentPath = devPath;
        if (fs.existsSync(prodPath)) {
          componentPath = prodPath;
        } else if (!fs.existsSync(devPath)) {
          console.warn(`Component file not found in either path: ${devPath} or ${prodPath}`);
          return;
        }

        componentsCode += fs.readFileSync(componentPath, 'utf8') + '\n\n';
      } catch (error) {
        console.warn(`Failed to load component ${filename}:`, error);
      }
    });

    if (componentsCode.trim() === '') {
      console.warn('No components loaded, falling back to server-side rendering');
      return this.getFallbackComponents();
    }

    return componentsCode;
  }

  private getFallbackComponents(): string {
    return `
      // Fallback: Simple client-side initialization
      document.addEventListener('DOMContentLoaded', function() {
        const loadingScreen = document.getElementById('loading-screen');
        const reportContainer = document.getElementById('report-container');

        if (loadingScreen) loadingScreen.style.display = 'none';
        if (reportContainer) {
          reportContainer.innerHTML = '<div class="p-8 text-center"><h1 class="text-2xl font-bold mb-4">Componentes não carregados</h1><p>Os componentes client-side não foram encontrados. Gerando relatório básico...</p></div>';
          reportContainer.style.opacity = '1';
        }
      });
    `;
  }

  private buildClientInitializationScript(): string {
    return `
      // Initialize the client-side application
      document.addEventListener('DOMContentLoaded', function() {
        try {
          // Load report data from external JSON file
          fetch(window.reportDataUrl || './latest.json')
            .then(response => {
              if (!response.ok) {
                throw new Error('Failed to load report data: ' + response.status);
              }
              return response.json();
            })
            .then(data => {
              // Store data globally for components to access
              window.reportData = data;

              // Hide loading screen and show report container
              const loadingScreen = document.getElementById('loading-screen');
              const reportContainer = document.getElementById('report-container');

              // Initialize the ReportApp with loaded data
              const reportApp = new ReportApp({
                containerId: 'report-container',
                autoRefresh: false,
                enableRouting: false
              });

              // Show the report with a smooth transition
              setTimeout(() => {
                if (loadingScreen) {
                  loadingScreen.style.opacity = '0';
                  setTimeout(() => {
                    loadingScreen.style.display = 'none';
                  }, 500);
                }

                if (reportContainer) {
                  reportContainer.style.opacity = '1';
                }
              }, 500);
            })
            .catch(error => {
              console.error('Failed to load report data:', error);
              throw error;
            });

        } catch (error) {
          console.error('Failed to initialize report:', error);

          // Show error message
          const errorMessage = document.createElement('div');
          errorMessage.className = 'fixed inset-0 flex items-center justify-center bg-white dark:bg-gray-900';
          errorMessage.innerHTML = \`
            <div class="text-center max-w-md mx-auto p-8">
              <div class="text-red-500 text-6xl mb-4">⚠️</div>
              <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">Erro ao Carregar Relatório</h1>
              <p class="text-gray-600 dark:text-gray-400 mb-6">Ocorreu um erro ao inicializar o relatório. Tente atualizar a página.</p>
              <button onclick="location.reload()" class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                Atualizar Página
              </button>
              <details class="mt-4 text-left">
                <summary class="cursor-pointer text-sm text-gray-500 dark:text-gray-400">Detalhes do erro</summary>
                <pre class="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">\${error.message}</pre>
              </details>
            </div>
          \`;

          document.body.appendChild(errorMessage);

          // Hide loading screen
          const loadingScreen = document.getElementById('loading-screen');
          if (loadingScreen) {
            loadingScreen.style.display = 'none';
          }
        }
      });

      // Add custom CSS animations for the new components
      const customStyles = document.createElement('style');
      customStyles.textContent = \`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.5s ease-out;
        }

        /* Smooth scrolling */
        html {
          scroll-behavior: smooth;
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        ::-webkit-scrollbar-track {
          background: transparent;
        }

        ::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.5);
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: rgba(156, 163, 175, 0.7);
        }

        .dark ::-webkit-scrollbar-thumb {
          background: rgba(75, 85, 99, 0.5);
        }

        .dark ::-webkit-scrollbar-thumb:hover {
          background: rgba(75, 85, 99, 0.7);
        }

        /* Loading animations */
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes pulse {
          50% { opacity: .5; }
        }

        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        /* Focus styles for accessibility */
        .focus\\:ring-2:focus {
          outline: 2px solid transparent;
          outline-offset: 2px;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
        }

        /* Print styles */
        @media print {
          body {
            background: white !important;
            color: black !important;
          }

          .no-print,
          .filter-panel,
          .charts-container,
          button {
            display: none !important;
          }

          .bg-gray-800,
          .bg-gray-700,
          .dark\\:bg-gray-800,
          .dark\\:bg-gray-700 {
            background: white !important;
            color: black !important;
          }
        }
      \`;

      document.head.appendChild(customStyles);
    `;
  }

  // Legacy methods - keeping for backward compatibility but not used in new architecture
  private buildHeader(projectName: string, statusClass: string): string {
    return `<header class="flex justify-between items-center mb-8">
            <div class="flex items-center space-x-4">
                <img src="${this.logoBase64}" alt="Logo" class="h-12 w-12 object-contain"/>
                <h1 class="text-3xl font-bold">${this.escapeHtml(projectName)}</h1>
                <div class="w-4 h-4 rounded-full ${statusClass}"></div>
            </div>
            <div class="flex items-center space-x-4">
                <button id="theme-toggle" class="text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm p-2.5">
                    <svg id="theme-toggle-dark-icon" class="hidden w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path></svg>
                    <svg id="theme-toggle-light-icon" class="hidden w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 5.05A1 1 0 003.636 6.464l.707.707a1 1 0 001.414-1.414l-.707-.707zM3 11a1 1 0 100-2H2a1 1 0 100 2h1zm7.536 2.464a1 1 0 01-1.414 0l-.707-.707a1 1 0 011.414-1.414l.707.707a1 1 0 010 1.414zM13.536 6.464a1 1 0 01-1.414 0l-.707-.707a1 1 0 011.414-1.414l.707.707a1 1 0 010 1.414z"></path></svg>
                </button>
            </div>
        </header>`;
  }

  private buildSummaryCards(data: AggregatedResult): string {
    const successRateColor = data.success_rate === 100 ? 'text-green-500' : data.success_rate >= 80 ? 'text-yellow-500' : 'text-red-500';

    return `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <!-- Total Tests Card -->
            <div class="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-lg shadow-md border border-blue-200 dark:border-blue-800 hover:shadow-lg transition-shadow duration-200">
                <div class="flex items-center">
                    <div class="p-3 rounded-full bg-blue-500 text-white mr-4">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                        </svg>
                    </div>
                    <div>
                        <h3 class="text-sm font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Total Tests</h3>
                        <p class="text-3xl font-bold text-gray-900 dark:text-white">${data.total_tests}</p>
                    </div>
                </div>
            </div>

            <!-- Passed Tests Card -->
            <div class="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-6 rounded-lg shadow-md border border-green-200 dark:border-green-800 hover:shadow-lg transition-shadow duration-200">
                <div class="flex items-center">
                    <div class="p-3 rounded-full bg-green-500 text-white mr-4">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                    </div>
                    <div>
                        <h3 class="text-sm font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">Passed</h3>
                        <p class="text-3xl font-bold text-gray-900 dark:text-white">${data.successful_tests}</p>
                    </div>
                </div>
            </div>

            <!-- Failed Tests Card -->
            <div class="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-6 rounded-lg shadow-md border border-red-200 dark:border-red-800 hover:shadow-lg transition-shadow duration-200">
                <div class="flex items-center">
                    <div class="p-3 rounded-full bg-red-500 text-white mr-4">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </div>
                    <div>
                        <h3 class="text-sm font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">Failed</h3>
                        <p class="text-3xl font-bold text-gray-900 dark:text-white">${data.failed_tests}</p>
                    </div>
                </div>
            </div>

            <!-- Success Rate Card -->
            <div class="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-6 rounded-lg shadow-md border border-purple-200 dark:border-purple-800 hover:shadow-lg transition-shadow duration-200">
                <div class="flex items-center">
                    <div class="p-3 rounded-full bg-purple-500 text-white mr-4">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                        </svg>
                    </div>
                    <div>
                        <h3 class="text-sm font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide">Success Rate</h3>
                        <p class="text-3xl font-bold ${successRateColor}">${data.success_rate.toFixed(1)}%</p>
                    </div>
                </div>
            </div>
        </div>`;
  }

  private buildSuiteCard(suite: any): string {
    const statusClass = suite.status === 'success' ? 'border-green-500' : 'border-red-500';
    const statusBgClass = suite.status === 'success' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20';
    const statusIcon = suite.status === 'success' ? '✅' : '❌';
    const successRate = suite.success_rate || 0;

    return `<div class="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow duration-200">
            <div class="p-6 ${statusBgClass} border-l-4 ${statusClass} cursor-pointer" onclick="toggleSuite(this)">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="flex items-center space-x-3 mb-2">
                            <h3 class="text-xl font-bold text-gray-900 dark:text-white">${this.escapeHtml(suite.suite_name)}</h3>
                            <span class="text-2xl">${statusIcon}</span>
                        </div>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <span class="font-medium text-gray-600 dark:text-gray-400">Steps:</span>
                                <span class="ml-1 font-semibold">${suite.steps_executed || 0}</span>
                            </div>
                            <div>
                                <span class="font-medium text-gray-600 dark:text-gray-400">Success Rate:</span>
                                <span class="ml-1 font-semibold ${successRate === 100 ? 'text-green-600' : successRate >= 80 ? 'text-yellow-600' : 'text-red-600'}">${successRate.toFixed(1)}%</span>
                            </div>
                            <div>
                                <span class="font-medium text-gray-600 dark:text-gray-400">Duration:</span>
                                <span class="ml-1 font-semibold">${this.formatDuration(suite.duration_ms)}</span>
                            </div>
                            <div>
                                <span class="font-medium text-gray-600 dark:text-gray-400">Priority:</span>
                                <span class="ml-1 px-2 py-1 text-xs rounded-full ${this.getPriorityClass(suite.priority)}">${suite.priority || 'normal'}</span>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center space-x-3 ml-4">
                        <span class="transform transition-transform duration-200 text-gray-500 dark:text-gray-400">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                            </svg>
                        </span>
                    </div>
                </div>
            </div>
            <div class="hidden p-4 space-y-2">
                ${suite.steps_results.map((step: any, index: number) => this.buildStepCard(step, index)).join('')}
            </div>
        </div>`;
  }

  private buildAssertionsTab(assertions: any[]): string {
    if (!assertions.length) return '<p class="text-gray-500 dark:text-gray-400 text-sm">No assertions were made.</p>';
    return `<ul class="text-sm space-y-1">${assertions.map(a => `
        <li class="flex items-center font-mono">
            <span class="mr-2">${a.passed ? '<span class="text-green-500">✓</span>' : '<span class="text-red-500">✗</span>'}</span>
            <span>${this.escapeHtml(a.field)}</span>
            <span class="text-gray-500 dark:text-gray-400 mx-2">${this.escapeHtml(a.operator)}</span>
            <span class="text-blue-500">${this.escapeHtml(a.expected)}</span>
            ${!a.passed ? `<span class="text-red-500 ml-2">(Got: ${this.escapeHtml(a.actual)})</span>` : ''}
        </li>`).join('')}</ul>`;
  }

  private buildRequestTab(request: any): string {
    return `<div>
              <h4 class="font-bold mb-1">Headers</h4>
              <pre class="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 p-2 rounded text-xs mb-2">${this.escapeHtml(JSON.stringify(request.headers, null, 2))}</pre>
              <h4 class="font-bold mb-1">Body</h4>
              <pre class="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 p-2 rounded text-xs">${this.escapeHtml(JSON.stringify(request.body, null, 2))}</pre>
          </div>`;
  }

  private buildResponseTab(response: any): string {
    return `<div>
              <h4 class="font-bold mb-1">Status: ${response.status_code}</h4>
              <h4 class="font-bold mb-1">Headers</h4>
              <pre class="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 p-2 rounded text-xs mb-2">${this.escapeHtml(JSON.stringify(response.headers, null, 2))}</pre>
              <h4 class="font-bold mb-1">Body</h4>
              <pre class="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 p-2 rounded text-xs">${this.escapeHtml(JSON.stringify(response.body, null, 2))}</pre>
          </div>`;
  }

  private buildCurlTab(curl: string): string {
    return `<pre class="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 p-2 rounded text-xs">${this.escapeHtml(curl)}</pre>`;
  }

  private buildIterationTab(iterations: any): string {
    return `<pre class="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 p-2 rounded text-xs">${this.escapeHtml(JSON.stringify(iterations, null, 2))}</pre>`;
  }

  private buildStepCard(step: StepExecutionResult, index: number): string {
    const statusClass = step.status === 'success' ? 'border-green-500' : 'border-red-500';
    const statusIcon = step.status === 'success' ? '✓' : '✗';
    const stepId = `step-${index}-${Math.random().toString(36).substr(2, 9)}`;
    return `<div class="border-l-4 ${statusClass} rounded bg-gray-50 dark:bg-gray-700">
              <div class="flex justify-between items-center p-2 cursor-pointer" onclick="toggleStep(this)">
                  <div class="flex items-center space-x-2">
                      <span class="font-mono text-sm">#${index + 1}</span>
                      <span class="text-lg">${statusIcon}</span>
                      <span>${this.escapeHtml(step.step_name)}</span>
                  </div>
                  <div class="flex items-center space-x-4">
                      <span class="text-sm text-gray-500 dark:text-gray-400">${this.formatDuration(step.duration_ms)}</span>
                      <span class="transform transition-transform duration-200">▶</span>
                  </div>
              </div>
              <div class="hidden p-2 border-t border-gray-200 dark:border-gray-600">
                  <div class="flex border-b border-gray-200 dark:border-gray-600 mb-2">
                      <button class="tab-button active" onclick="switchTab(this, '${stepId}-assertions')">Assertions</button>
                      ${step.request_details ? `<button class="tab-button" onclick="switchTab(this, '${stepId}-request')">Request</button>` : ''}
                      ${step.response_details ? `<button class="tab-button" onclick="switchTab(this, '${stepId}-response')">Response</button>` : ''}
                      ${step.iteration_results ? `<button class="tab-button" onclick="switchTab(this, '${stepId}-iteration')">Iteration</button>` : ''}
                      ${step.request_details?.curl_command ? `<button class="tab-button" onclick="switchTab(this, '${stepId}-curl')">cURL</button>` : ''}
                  </div>
                  <div id="${stepId}-assertions" class="tab-content">${this.buildAssertionsTab(step.assertions_results || [])}</div>
                  ${step.request_details ? `<div id="${stepId}-request" class="tab-content hidden">${this.buildRequestTab(step.request_details)}</div>` : ''}
                  ${step.response_details ? `<div id="${stepId}-response" class="tab-content hidden">${this.buildResponseTab(step.response_details)}</div>` : ''}
                  ${step.iteration_results ? `<div id="${stepId}-iteration" class="tab-content hidden">${this.buildIterationTab(step.iteration_results)}</div>` : ''}
                  ${step.request_details?.curl_command ? `<div id="${stepId}-curl" class="tab-content hidden">${this.buildCurlTab(step.request_details.curl_command)}</div>` : ''}
              </div>
          </div>`;
  }

  private buildFooter(data: AggregatedResult): string {
    return `<footer class="text-center mt-8 text-sm text-gray-500 dark:text-gray-400">
            <p>Generated on ${new Date().toLocaleString()} | Total Duration: ${this.formatDuration(data.total_duration_ms)}</p>
            <p>Flow Test Engine</p>
        </footer>`;
  }

  private buildJavaScript(): string {
    return `<script>
        function toggleSuite(element) {
            const content = element.nextElementSibling;
            const icon = element.querySelector('span.transform');
            content.classList.toggle('hidden');
            icon.classList.toggle('rotate-180');
        }

        function toggleStep(element) {
            const content = element.nextElementSibling;
            const icon = element.querySelector('span.transform');
            content.classList.toggle('hidden');
            icon.classList.toggle('rotate-90');
        }

        function switchTab(button, targetId) {
            const tabContainer = button.parentElement;
            const contentContainer = tabContainer.parentElement;

            tabContainer.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            contentContainer.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
            document.getElementById(targetId).classList.remove('hidden');
        }

        const initTheme = () => {
          const themeToggleBtn = document.getElementById('theme-toggle');
          const themeToggleDarkIcon = document.getElementById('theme-toggle-dark-icon');
          const themeToggleLightIcon = document.getElementById('theme-toggle-light-icon');

          if (localStorage.getItem('color-theme') === 'dark' || (!('color-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
              document.documentElement.classList.add('dark');
              themeToggleLightIcon.classList.remove('hidden');
          } else {
              document.documentElement.classList.remove('dark');
              themeToggleDarkIcon.classList.remove('hidden');
          }

          themeToggleBtn.addEventListener('click', function() {
              themeToggleDarkIcon.classList.toggle('hidden');
              themeToggleLightIcon.classList.toggle('hidden');
              if (localStorage.getItem('color-theme')) {
                  if (localStorage.getItem('color-theme') === 'light') {
                      document.documentElement.classList.add('dark');
                      localStorage.setItem('color-theme', 'dark');
                  } else {
                      document.documentElement.classList.remove('dark');
                      localStorage.setItem('color-theme', 'light');
                  }
              } else {
                  if (document.documentElement.classList.contains('dark')) {
                      document.documentElement.classList.remove('dark');
                      localStorage.setItem('color-theme', 'light');
                  } else {
                      document.documentElement.classList.add('dark');
                      localStorage.setItem('color-theme', 'dark');
                  }
              }
          });

          const style = document.createElement('style');
          style.innerHTML =
            '.tab-button {' +
            '  padding: 8px 16px;' +
            '  cursor: pointer;' +
            '  border: none;' +
            '  background-color: transparent;' +
            '  border-bottom: 2px solid transparent;' +
            '  transition: all 0.2s ease-in-out;' +
            '}' +
            '.tab-button.active {' +
            '  border-bottom: 2px solid #3b82f6;' +
            '  color: #3b82f6;' +
            '}' +
            '.dark .tab-button.active {' +
            '  border-bottom: 2px solid #60a5fa;' +
            '  color: #60a5fa;' +
            '}' +
            '.tab-button:hover {' +
            '  background-color: rgba(0,0,0,0.05);' +
            '}' +
            '.dark .tab-button:hover {' +
            '  background-color: rgba(255,255,255,0.05);' +
            '}';
          document.head.appendChild(style);
        };

        document.addEventListener('DOMContentLoaded', () => {
          initTheme();
        });
    </script>`;
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }

  private generateTimestamp(): string {
    return new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
  }

  private sanitizeFileName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }

  private escapeHtml(text: string | undefined | null): string {
    if (text === undefined || text === null) return '';
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  private getOverallStatusClass(data: AggregatedResult): string {
    return data.success_rate === 100 ? 'bg-green-500' : data.success_rate >= 80 ? 'bg-yellow-500' : 'bg-red-500';
  }

  private getPriorityClass(priority: string): string {
    switch (priority?.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  }
}