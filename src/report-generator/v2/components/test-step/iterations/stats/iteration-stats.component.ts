import { BaseComponentV2 } from "../../../common/base-component-v2";
import { ThemeConfig } from "../../../../types";

export interface IterationStats {
  totalIterations: number;
  successfulIterations: number;
  failedIterations: number;
  totalDuration: number;
  averageDuration: number;
}

export class IterationStatsComponent extends BaseComponentV2 {
  constructor(theme: ThemeConfig) {
    super(theme);
  }

  renderStats(stats: IterationStats): string {
    const successRate =
      stats.totalIterations > 0
        ? ((stats.successfulIterations / stats.totalIterations) * 100).toFixed(
            1
          )
        : "0";

    return `
      <div class="iteration-stats grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div class="stat-card bg-white p-4 rounded-lg border text-center">
          <div class="text-2xl text-blue-600 mb-2">📊</div>
          <div class="text-xl font-bold text-gray-900">${
            stats.totalIterations
          }</div>
          <div class="text-xs text-gray-500">Total</div>
        </div>

        <div class="stat-card bg-white p-4 rounded-lg border text-center">
          <div class="text-2xl text-green-600 mb-2">✅</div>
          <div class="text-xl font-bold text-green-600">${
            stats.successfulIterations
          }</div>
          <div class="text-xs text-gray-500">Success</div>
        </div>

        <div class="stat-card bg-white p-4 rounded-lg border text-center">
          <div class="text-2xl text-red-600 mb-2">❌</div>
          <div class="text-xl font-bold text-red-600">${
            stats.failedIterations
          }</div>
          <div class="text-xs text-gray-500">Failed</div>
        </div>

        <div class="stat-card bg-white p-4 rounded-lg border text-center">
          <div class="text-2xl text-yellow-600 mb-2">📈</div>
          <div class="text-xl font-bold text-gray-900">${successRate}%</div>
          <div class="text-xs text-gray-500">Success Rate</div>
        </div>

        <div class="stat-card bg-white p-4 rounded-lg border text-center">
          <div class="text-2xl text-purple-600 mb-2">⏱️</div>
          <div class="text-xl font-bold text-gray-900">${this.formatDuration(
            stats.averageDuration
          )}</div>
          <div class="text-xs text-gray-500">Avg Duration</div>
        </div>
      </div>
    `;
  }

  calculateStats(iterations: any[]): IterationStats {
    const totalIterations = iterations.length;
    const successfulIterations = iterations.filter(
      (i) => i.status === "success"
    ).length;
    const failedIterations = totalIterations - successfulIterations;
    const totalDuration = iterations.reduce(
      (sum, i) => sum + (i.duration_ms || 0),
      0
    );
    const averageDuration =
      totalIterations > 0 ? totalDuration / totalIterations : 0;

    return {
      totalIterations,
      successfulIterations,
      failedIterations,
      totalDuration,
      averageDuration,
    };
  }

  render(): string {
    return "";
  }
}
