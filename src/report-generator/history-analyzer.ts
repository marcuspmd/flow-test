import fs from 'fs';
import path from 'path';
import { AggregatedResult } from '../types/config.types';

export interface HistoryComparison {
  baseline: AggregatedResult;
  current: AggregatedResult;
  comparison: ComparisonResult;
}

export interface ComparisonResult {
  summary: {
    success_rate_change: number;
    total_tests_change: number;
    duration_change_ms: number;
    duration_change_percent: number;
  };
  suites: SuiteComparison[];
  performance: PerformanceComparison;
  trends: TrendAnalysis;
}

export interface SuiteComparison {
  suite_name: string;
  baseline_status: string;
  current_status: string;
  status_changed: boolean;
  duration_change_ms: number;
  duration_change_percent: number;
  steps_comparison: {
    baseline_successful: number;
    current_successful: number;
    success_change: number;
  };
}

export interface PerformanceComparison {
  average_response_time_change_ms: number;
  requests_per_second_change: number;
  total_requests_change: number;
  slowest_endpoints_comparison: Array<{
    url: string;
    baseline_time_ms: number;
    current_time_ms: number;
    change_ms: number;
    change_percent: number;
  }>;
}

export interface TrendAnalysis {
  regression_detected: boolean;
  improvement_detected: boolean;
  stability_score: number; // 0-100, higher is more stable
  recommendations: string[];
}

export class HistoryAnalyzer {
  /**
   * Compares current results with historical baseline
   */
  async compareWithBaseline(currentJsonPath: string, baselineJsonPath: string): Promise<HistoryComparison> {
    const current = await this.loadJSONData(currentJsonPath);
    const baseline = await this.loadJSONData(baselineJsonPath);
    
    const comparison = this.performComparison(baseline, current);
    
    return {
      baseline,
      current,
      comparison
    };
  }

  /**
   * Analyzes trends across multiple historical reports
   */
  async analyzeTrends(jsonPaths: string[]): Promise<TrendAnalysis & { reports: AggregatedResult[] }> {
    const reports = await Promise.all(jsonPaths.map(path => this.loadJSONData(path)));
    
    // Sort by execution time
    reports.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    
    const trends = this.calculateTrends(reports);
    
    return {
      ...trends,
      reports
    };
  }

  /**
   * Finds all JSON reports in a directory and creates historical dashboard
   */
  async createHistoricalDashboard(resultsDir: string, outputPath?: string): Promise<string> {
    if (!fs.existsSync(resultsDir)) {
      throw new Error(`Results directory not found: ${resultsDir}`);
    }

    // Find all JSON files
    const jsonFiles = fs.readdirSync(resultsDir)
      .filter(file => file.endsWith('.json') && file !== 'latest.json')
      .map(file => path.join(resultsDir, file));

    if (jsonFiles.length < 2) {
      throw new Error('Need at least 2 historical reports for comparison');
    }

    const trendAnalysis = await this.analyzeTrends(jsonFiles);
    const dashboard = this.buildHistoricalDashboard(trendAnalysis);
    
    const finalOutputPath = outputPath || path.join(resultsDir, 'historical_dashboard.html');
    fs.writeFileSync(finalOutputPath, dashboard, 'utf8');
    
    return finalOutputPath;
  }

  private async loadJSONData(jsonPath: string): Promise<AggregatedResult> {
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`JSON file not found: ${jsonPath}`);
    }
    
    const jsonContent = fs.readFileSync(jsonPath, 'utf8');
    return JSON.parse(jsonContent) as AggregatedResult;
  }

  private performComparison(baseline: AggregatedResult, current: AggregatedResult): ComparisonResult {
    const summary = {
      success_rate_change: current.success_rate - baseline.success_rate,
      total_tests_change: current.total_tests - baseline.total_tests,
      duration_change_ms: current.total_duration_ms - baseline.total_duration_ms,
      duration_change_percent: ((current.total_duration_ms - baseline.total_duration_ms) / baseline.total_duration_ms) * 100
    };

    const suites = this.compareSuites(baseline.suites_results, current.suites_results);
    const performance = this.comparePerformance(baseline.performance_summary, current.performance_summary);
    const trends = this.analyzeSingleComparison(baseline, current);

    return {
      summary,
      suites,
      performance,
      trends
    };
  }

  private compareSuites(baselineSuites: any[], currentSuites: any[]): SuiteComparison[] {
    const comparisons: SuiteComparison[] = [];
    
    // Create maps for easy lookup
    const baselineMap = new Map(baselineSuites.map(suite => [suite.suite_name, suite]));
    const currentMap = new Map(currentSuites.map(suite => [suite.suite_name, suite]));
    
    // Get all unique suite names
    const allSuiteNames = new Set([...baselineMap.keys(), ...currentMap.keys()]);
    
    for (const suiteName of allSuiteNames) {
      const baselineSuite = baselineMap.get(suiteName);
      const currentSuite = currentMap.get(suiteName);
      
      if (baselineSuite && currentSuite) {
        comparisons.push({
          suite_name: suiteName,
          baseline_status: baselineSuite.status,
          current_status: currentSuite.status,
          status_changed: baselineSuite.status !== currentSuite.status,
          duration_change_ms: currentSuite.duration_ms - baselineSuite.duration_ms,
          duration_change_percent: ((currentSuite.duration_ms - baselineSuite.duration_ms) / baselineSuite.duration_ms) * 100,
          steps_comparison: {
            baseline_successful: baselineSuite.steps_successful || 0,
            current_successful: currentSuite.steps_successful || 0,
            success_change: (currentSuite.steps_successful || 0) - (baselineSuite.steps_successful || 0)
          }
        });
      }
    }
    
    return comparisons;
  }

  private comparePerformance(baseline: any, current: any): PerformanceComparison {
    if (!baseline || !current) {
      return {
        average_response_time_change_ms: 0,
        requests_per_second_change: 0,
        total_requests_change: 0,
        slowest_endpoints_comparison: []
      };
    }

    const slowestEndpoints = this.compareSlowEndpoints(
      baseline.slowest_endpoints || [],
      current.slowest_endpoints || []
    );

    return {
      average_response_time_change_ms: current.average_response_time_ms - baseline.average_response_time_ms,
      requests_per_second_change: current.requests_per_second - baseline.requests_per_second,
      total_requests_change: current.total_requests - baseline.total_requests,
      slowest_endpoints_comparison: slowestEndpoints
    };
  }

  private compareSlowEndpoints(baseline: any[], current: any[]): Array<any> {
    const comparisons: Array<any> = [];
    const baselineMap = new Map(baseline.map(ep => [ep.url, ep]));
    const currentMap = new Map(current.map(ep => [ep.url, ep]));
    
    const allUrls = new Set([...baselineMap.keys(), ...currentMap.keys()]);
    
    for (const url of allUrls) {
      const baselineEp = baselineMap.get(url);
      const currentEp = currentMap.get(url);
      
      if (baselineEp && currentEp) {
        const change = currentEp.average_time_ms - baselineEp.average_time_ms;
        const changePercent = (change / baselineEp.average_time_ms) * 100;
        
        comparisons.push({
          url,
          baseline_time_ms: baselineEp.average_time_ms,
          current_time_ms: currentEp.average_time_ms,
          change_ms: change,
          change_percent: changePercent
        });
      }
    }
    
    return comparisons.sort((a, b) => Math.abs(b.change_percent) - Math.abs(a.change_percent));
  }

  private analyzeSingleComparison(baseline: AggregatedResult, current: AggregatedResult): TrendAnalysis {
    const regressionThreshold = -5; // 5% decrease in success rate
    const improvementThreshold = 5; // 5% increase in success rate
    
    const successRateChange = current.success_rate - baseline.success_rate;
    const regressionDetected = successRateChange < regressionThreshold;
    const improvementDetected = successRateChange > improvementThreshold;
    
    // Calculate stability score
    let stabilityScore = 100;
    
    // Penalize for success rate changes
    stabilityScore -= Math.abs(successRateChange) * 2;
    
    // Penalize for large duration changes
    const durationChangePercent = Math.abs((current.total_duration_ms - baseline.total_duration_ms) / baseline.total_duration_ms) * 100;
    stabilityScore -= Math.min(durationChangePercent, 20);
    
    // Penalize for failed tests
    stabilityScore -= current.failed_tests * 5;
    
    stabilityScore = Math.max(0, Math.min(100, stabilityScore));
    
    const recommendations = this.generateRecommendations(baseline, current, {
      regressionDetected,
      improvementDetected,
      successRateChange,
      durationChangePercent
    });

    return {
      regression_detected: regressionDetected,
      improvement_detected: improvementDetected,
      stability_score: Math.round(stabilityScore),
      recommendations
    };
  }

  private calculateTrends(reports: AggregatedResult[]): TrendAnalysis {
    if (reports.length < 2) {
      return {
        regression_detected: false,
        improvement_detected: false,
        stability_score: 100,
        recommendations: ['Need at least 2 reports for trend analysis']
      };
    }

    const successRates = reports.map(r => r.success_rate);
    const durations = reports.map(r => r.total_duration_ms);
    
    // Calculate trends using simple linear regression
    const successRateTrend = this.calculateLinearTrend(successRates);
    const durationTrend = this.calculateLinearTrend(durations);
    
    const regressionDetected = successRateTrend < -0.5; // Decreasing success rate
    const improvementDetected = successRateTrend > 0.5; // Increasing success rate
    
    // Calculate stability score based on variance
    const successRateVariance = this.calculateVariance(successRates);
    const durationVariance = this.calculateVariance(durations);
    
    let stabilityScore = 100;
    stabilityScore -= Math.min(successRateVariance * 10, 30);
    stabilityScore -= Math.min((durationVariance / 1000000), 20); // Scale down duration variance
    
    const avgFailedTests = reports.reduce((sum, r) => sum + r.failed_tests, 0) / reports.length;
    stabilityScore -= avgFailedTests * 3;
    
    stabilityScore = Math.max(0, Math.min(100, stabilityScore));

    const recommendations = this.generateTrendRecommendations({
      successRateTrend,
      durationTrend,
      successRateVariance,
      avgFailedTests,
      reportCount: reports.length
    });

    return {
      regression_detected: regressionDetected,
      improvement_detected: improvementDetected,
      stability_score: Math.round(stabilityScore),
      recommendations
    };
  }

  private calculateLinearTrend(values: number[]): number {
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const meanX = x.reduce((sum, val) => sum + val, 0) / n;
    const meanY = values.reduce((sum, val) => sum + val, 0) / n;
    
    const numerator = x.reduce((sum, xi, i) => sum + (xi - meanX) * (values[i] - meanY), 0);
    const denominator = x.reduce((sum, xi) => sum + (xi - meanX) ** 2, 0);
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / values.length;
    return variance;
  }

  private generateRecommendations(baseline: AggregatedResult, current: AggregatedResult, analysis: any): string[] {
    const recommendations: string[] = [];

    if (analysis.regressionDetected) {
      recommendations.push('🚨 Regression detected: Success rate decreased significantly');
      recommendations.push('Review failed tests and investigate root causes');
    }

    if (analysis.improvementDetected) {
      recommendations.push('✅ Improvement detected: Success rate increased');
      recommendations.push('Document changes that led to improvement');
    }

    if (analysis.durationChangePercent > 20) {
      recommendations.push('⏱️  Test execution duration increased significantly');
      recommendations.push('Consider optimizing slow test steps or infrastructure');
    }

    if (current.failed_tests > baseline.failed_tests) {
      recommendations.push('📈 Number of failed tests increased');
      recommendations.push('Focus on stabilizing flaky tests');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ No significant issues detected');
      recommendations.push('Maintain current testing practices');
    }

    return recommendations;
  }

  private generateTrendRecommendations(analysis: any): string[] {
    const recommendations: string[] = [];

    if (analysis.successRateTrend < -0.5) {
      recommendations.push('📉 Declining success rate trend detected');
      recommendations.push('Investigate systematic issues affecting test stability');
    }

    if (analysis.durationTrend > 100) {
      recommendations.push('🐌 Test execution time is trending upward');
      recommendations.push('Consider performance optimization or test parallelization');
    }

    if (analysis.successRateVariance > 10) {
      recommendations.push('🌪️  High variability in success rates');
      recommendations.push('Focus on stabilizing flaky or intermittent test failures');
    }

    if (analysis.avgFailedTests > 2) {
      recommendations.push('❌ Consistently high number of failed tests');
      recommendations.push('Review test maintenance and environment stability');
    }

    if (analysis.reportCount < 5) {
      recommendations.push('📊 Limited historical data available');
      recommendations.push('Continue collecting data for better trend analysis');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Stable trends across all metrics');
      recommendations.push('Continue current testing practices');
    }

    return recommendations;
  }

  private buildHistoricalDashboard(trendAnalysis: TrendAnalysis & { reports: AggregatedResult[] }): string {
    const reports = trendAnalysis.reports;
    const latest = reports[reports.length - 1];
    const oldest = reports[0];

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Historical Test Dashboard - ${latest.project_name}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: system-ui, sans-serif; margin: 0; background: #f8fafc; }
        .container { max-width: 1400px; margin: 0 auto; padding: 2rem; }
        .header { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); margin-bottom: 2rem; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; margin: 2rem 0; }
        .card { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
        .metric { text-align: center; }
        .metric-value { font-size: 2.5rem; font-weight: bold; margin: 0; }
        .metric-label { color: #6b7280; margin: 0.5rem 0; }
        .trend-up { color: #10b981; }
        .trend-down { color: #ef4444; }
        .trend-stable { color: #6b7280; }
        .chart-container { height: 300px; margin: 1rem 0; }
        .recommendation { padding: 0.75rem; margin: 0.5rem 0; border-radius: 6px; border-left: 4px solid #3b82f6; background: #eff6ff; }
        .recommendation.warning { border-color: #f59e0b; background: #fffbeb; }
        .recommendation.error { border-color: #ef4444; background: #fef2f2; }
        .recommendation.success { border-color: #10b981; background: #f0fdf4; }
        .reports-table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
        .reports-table th, .reports-table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #e5e7eb; }
        .reports-table th { background: #f8fafc; font-weight: 600; }
        .status-success { color: #10b981; }
        .status-error { color: #ef4444; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${latest.project_name} - Historical Dashboard</h1>
            <p>Analysis of ${reports.length} test executions from ${oldest.start_time} to ${latest.start_time}</p>
        </div>

        <div class="grid">
            <div class="card">
                <div class="metric">
                    <div class="metric-value trend-${trendAnalysis.stability_score >= 80 ? 'up' : trendAnalysis.stability_score >= 60 ? 'stable' : 'down'}">${trendAnalysis.stability_score}%</div>
                    <div class="metric-label">Stability Score</div>
                </div>
            </div>
            
            <div class="card">
                <div class="metric">
                    <div class="metric-value">${(latest.success_rate || 0).toFixed(1)}%</div>
                    <div class="metric-label">Latest Success Rate</div>
                </div>
            </div>
            
            <div class="card">
                <div class="metric">
                    <div class="metric-value">${reports.length}</div>
                    <div class="metric-label">Total Reports</div>
                </div>
            </div>
        </div>

        <div class="card">
            <h3>Success Rate Trend</h3>
            <div class="chart-container">
                <canvas id="successRateChart"></canvas>
            </div>
        </div>

        <div class="card">
            <h3>Execution Duration Trend</h3>
            <div class="chart-container">
                <canvas id="durationChart"></canvas>
            </div>
        </div>

        <div class="card">
            <h3>Recommendations</h3>
            ${trendAnalysis.recommendations.map(rec => {
              const type = rec.includes('🚨') || rec.includes('❌') ? 'error' :
                          rec.includes('⏱️') || rec.includes('📈') ? 'warning' :
                          rec.includes('✅') ? 'success' : '';
              return `<div class="recommendation ${type}">${rec}</div>`;
            }).join('')}
        </div>

        <div class="card">
            <h3>Recent Test Executions</h3>
            <table class="reports-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Success Rate</th>
                        <th>Duration</th>
                        <th>Tests</th>
                        <th>Failed</th>
                    </tr>
                </thead>
                <tbody>
                    ${reports.slice(-10).reverse().map(report => `
                        <tr>
                            <td>${new Date(report.start_time).toLocaleString()}</td>
                            <td class="status-${(report.success_rate || 0) >= 95 ? 'success' : 'error'}">${(report.success_rate || 0).toFixed(1)}%</td>
                            <td>${this.formatDuration(report.total_duration_ms)}</td>
                            <td>${report.total_tests || 0}</td>
                            <td>${report.failed_tests || 0}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>

    <script>
        // Success Rate Chart
        const successRateCtx = document.getElementById('successRateChart').getContext('2d');
        new Chart(successRateCtx, {
            type: 'line',
            data: {
                labels: ${JSON.stringify(reports.map(r => new Date(r.start_time).toLocaleDateString()))},
                datasets: [{
                    label: 'Success Rate (%)',
                    data: ${JSON.stringify(reports.map(r => r.success_rate))},
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.1,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });

        // Duration Chart
        const durationCtx = document.getElementById('durationChart').getContext('2d');
        new Chart(durationCtx, {
            type: 'line',
            data: {
                labels: ${JSON.stringify(reports.map(r => new Date(r.start_time).toLocaleDateString()))},
                datasets: [{
                    label: 'Duration (ms)',
                    data: ${JSON.stringify(reports.map(r => r.total_duration_ms))},
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.1,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    </script>
</body>
</html>`;
  }

  private formatDuration(ms: number | undefined): string {
    if (!ms || ms < 1000) return `${ms || 0}ms`;
    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = seconds / 60;
    return `${minutes.toFixed(1)}m`;
  }
}