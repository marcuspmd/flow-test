import { BaseComponentV2 } from "../common/base-component-v2";

export interface FilterOption {
  id: string;
  label: string;
  count?: number;
  active?: boolean;
}

export interface FilterGroup {
  id: string;
  title: string;
  type: "checkbox" | "radio" | "search" | "select";
  options?: FilterOption[];
  placeholder?: string;
  value?: string;
}

export class FiltersPanelComponent extends BaseComponentV2 {
  renderFiltersPanel(filterGroups: FilterGroup[]): string {
    return this.html`
      <div class="filters-panel bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <!-- Search Bar -->
        <div class="mb-4">
          <div class="relative">
            <input
              type="text"
              id="global-search"
              placeholder="Search tests, suites..."
              class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              oninput="handleGlobalSearch(this.value)"
            >
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span class="text-gray-400 text-sm">🔍</span>
            </div>
          </div>
        </div>

        <!-- Filter Groups -->
        ${filterGroups.map((group) => this.renderFilterGroup(group)).join("")}

        <!-- Action Buttons -->
        <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 flex space-x-2">
          <button
            onclick="applyFilters()"
            class="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
          >
            Apply Filters
          </button>
          <button
            onclick="clearFilters()"
            class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            Clear
          </button>
        </div>
      </div>
    `;
  }

  private renderFilterGroup(group: FilterGroup): string {
    return this.html`
      <div class="filter-group mb-4">
        <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">${
          group.title
        }</h3>
        ${this.renderFilterContent(group)}
      </div>
    `;
  }

  private renderFilterContent(group: FilterGroup): string {
    switch (group.type) {
      case "search":
        return this.renderSearchFilter(group);
      case "select":
        return this.renderSelectFilter(group);
      case "checkbox":
        return this.renderCheckboxFilter(group);
      case "radio":
        return this.renderRadioFilter(group);
      default:
        return "";
    }
  }

  private renderSearchFilter(group: FilterGroup): string {
    return this.html`
      <input
        type="text"
        id="${group.id}"
        placeholder="${group.placeholder || "Search..."}"
        value="${group.value || ""}"
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        oninput="handleFilterChange('${group.id}', this.value)"
      >
    `;
  }

  private renderSelectFilter(group: FilterGroup): string {
    return this.html`
      <select
        id="${group.id}"
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        onchange="handleFilterChange('${group.id}', this.value)"
      >
        <option value="">All</option>
        ${(group.options || [])
          .map(
            (option) => this.html`
          <option value="${option.id}" ${option.active ? "selected" : ""}>
            ${option.label} ${option.count ? `(${option.count})` : ""}
          </option>
        `
          )
          .join("")}
      </select>
    `;
  }

  private renderCheckboxFilter(group: FilterGroup): string {
    return this.html`
      <div class="space-y-2 max-h-40 overflow-y-auto">
        ${(group.options || [])
          .map(
            (option) => this.html`
          <label class="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded">
            <input
              type="checkbox"
              name="${group.id}"
              value="${option.id}"
              ${option.active ? "checked" : ""}
              class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              onchange="handleFilterChange('${
                group.id
              }', this.value, this.checked)"
            >
            <span class="text-sm text-gray-700 dark:text-gray-300 flex-1">${
              option.label
            }</span>
            ${
              option.count
                ? this.html`
              <span class="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded-full">
                ${option.count}
              </span>
            `
                : ""
            }
          </label>
        `
          )
          .join("")}
      </div>
    `;
  }

  private renderRadioFilter(group: FilterGroup): string {
    return this.html`
      <div class="space-y-2">
        ${(group.options || [])
          .map(
            (option) => this.html`
          <label class="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded">
            <input
              type="radio"
              name="${group.id}"
              value="${option.id}"
              ${option.active ? "checked" : ""}
              class="border-gray-300 text-blue-600 focus:ring-blue-500"
              onchange="handleFilterChange('${group.id}', this.value)"
            >
            <span class="text-sm text-gray-700 dark:text-gray-300 flex-1">${
              option.label
            }</span>
            ${
              option.count
                ? this.html`
              <span class="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded-full">
                ${option.count}
              </span>
            `
                : ""
            }
          </label>
        `
          )
          .join("")}
      </div>
    `;
  }

  renderDefaultFilters(): string {
    const defaultFilterGroups: FilterGroup[] = [
      {
        id: "status",
        title: "Status",
        type: "checkbox",
        options: [
          { id: "success", label: "Success", count: 42, active: true },
          { id: "failed", label: "Failed", count: 0 },
          { id: "skipped", label: "Skipped", count: 0 },
        ],
      },
      {
        id: "priority",
        title: "Priority",
        type: "checkbox",
        options: [
          { id: "critical", label: "Critical", count: 12 },
          { id: "high", label: "High", count: 15 },
          { id: "medium", label: "Medium", count: 10 },
          { id: "low", label: "Low", count: 5 },
        ],
      },
      {
        id: "tags",
        title: "Tags",
        type: "checkbox",
        options: [
          { id: "smoke", label: "Smoke", count: 8 },
          { id: "regression", label: "Regression", count: 15 },
          { id: "api", label: "API", count: 25 },
          { id: "auth", label: "Auth", count: 6 },
        ],
      },
      {
        id: "duration",
        title: "Duration",
        type: "radio",
        options: [
          { id: "all", label: "All", active: true },
          { id: "fast", label: "< 1s", count: 30 },
          { id: "medium", label: "1-5s", count: 10 },
          { id: "slow", label: "> 5s", count: 2 },
        ],
      },
    ];

    return this.renderFiltersPanel(defaultFilterGroups);
  }

  render(): string {
    return this.renderDefaultFilters();
  }
}
