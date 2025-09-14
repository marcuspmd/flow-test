/**
 * @packageDocumentation
 * This module contains the `TestSuiteComponent` for the HTML report.
 *
 * @remarks
 * This component is responsible for rendering a test suite container.
 * It displays suite-level information like name, status, and duration,
 * and contains a collapsible list of individual test steps.
 */

import { BaseComponent } from "./base-component";
import { TestSuiteProps, TestStepData } from "./types";
import { TestStepComponent } from "./test-step.component";

/**
 * Renders a container for a test suite, including its header and a list of test steps.
 */
export class TestSuiteComponent extends BaseComponent {
  private stepComponent = new TestStepComponent();

  /**
   * Gets a simple visual icon for a given status.
   * @param status - The status of the suite.
   * @returns A checkmark ("✓") for success, or a cross ("✗") for failure.
   */
  private getStatusIcon(status: string): string {
    return status === "success" ? "✓" : "✗";
  }

  /**
   * Gets a set of CSS classes based on the suite's status.
   * @param status - The status of the suite.
   * @returns An object of CSS class strings for styling.
   */
  private getStatusClasses(status: string): {
    border: string;
    bg: string;
    text: string;
    icon: string;
  } {
    if (status === "success") {
      return {
        border: "border-l-green-500",
        bg: "bg-green-50 dark:bg-green-900/10",
        text: "text-green-700 dark:text-green-300",
        icon: "text-green-500",
      };
    }

    return {
      border: "border-l-red-500",
      bg: "bg-red-50 dark:bg-red-900/10",
      text: "text-red-700 dark:text-red-300",
      icon: "text-red-500",
    };
  }

  /**
   * Calculates metrics for the test suite based on its steps.
   * @param steps - An array of test step data.
   * @returns An object containing total, passed, failed counts and success rate.
   */
  private getSuiteMetrics(steps: TestStepData[]): {
    total: number;
    passed: number;
    failed: number;
    successRate: string;
  } {
    const total = steps.length;
    const passed = steps.filter((step) => step.status === "success").length;
    const failed = total - passed;
    const successRate = total > 0 ? ((passed / total) * 100).toFixed(1) : "0";

    return { total, passed, failed, successRate };
  }

  /**
   * Renders the entire test suite component.
   * @param props - The properties for the test suite.
   * @returns An HTML string for the complete test suite.
   */
  render(props: TestSuiteProps): string {
    const { suiteName, status, duration, steps, suiteId } = props;
    const statusClasses = this.getStatusClasses(status);
    const statusIcon = this.getStatusIcon(status);
    const metrics = this.getSuiteMetrics(steps);

    return this.html`
      <div class="card ${statusClasses.border} mb-4 overflow-hidden">
        <!-- Suite Header -->
        <div
          class="flex justify-between items-center p-4 cursor-pointer hover:${statusClasses.bg} transition-colors duration-200"
          onclick="toggleSuite('${suiteId}')"
          role="button"
          tabindex="0"
          aria-expanded="false"
          aria-controls="${suiteId}-content"
        >
          <div class="flex items-center space-x-4">
            <!-- Status icon -->
            <div class="flex items-center justify-center w-8 h-8 rounded-full ${statusClasses.bg}">
              <span class="text-lg font-bold ${statusClasses.icon}">
                ${statusIcon}
              </span>
            </div>

            <!-- Suite Name -->
            <div>
              <h2 class="text-lg font-semibold text-primary">
                ${this.escapeHtml(suiteName)}
              </h2>
              <div class="flex items-center space-x-4 text-sm text-secondary">
                <span>${this.formatDuration(duration)}</span>
                <span>•</span>
                <span>${metrics.total} steps</span>
                <span>•</span>
                <span class="text-green-600 dark:text-green-400">${metrics.passed} passed</span>
                ${metrics.failed > 0
                  ? this.html`
                  <span>•</span>
                  <span class="text-red-600 dark:text-red-400">${metrics.failed} failed</span>
                `
                  : ""}
              </div>
            </div>
          </div>

          <!-- Metrics and Controls -->
          <div class="flex items-center space-x-4">
            <!-- Success rate badge -->
            <div class="text-xs font-medium ${parseFloat(metrics.successRate) === 100
                ? "badge badge-green"
                : parseFloat(metrics.successRate) >= 80
                ? "badge badge-amber"
                : "badge badge-gray"}">
              ${metrics.successRate}% success
            </div>

            <!-- Expand/collapse icon -->
            <span
              id="${suiteId}-icon"
              class="transform transition-transform duration-200 text-primary"
              aria-hidden="true"
            >
              ▶
            </span>
          </div>
        </div>

        <!-- Suite Content (Steps) -->
        <div
          id="${suiteId}-content"
          class="hidden border-t border-default"
          aria-labelledby="${suiteId}-header"
        >
          <div class="p-4 space-y-3 bg-tertiary">
            ${steps.length > 0
              ? this.html`
              <div class="text-sm text-secondary mb-3">
                <strong>Suite Steps:</strong>
              </div>
              ${this.renderList(steps, (step, index) =>
                this.stepComponent.render({ step, index })
              )}
            `
              : this.html`
              <div class="text-center p-8 text-secondary">
                <p>No steps found in this suite</p>
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  }
}
