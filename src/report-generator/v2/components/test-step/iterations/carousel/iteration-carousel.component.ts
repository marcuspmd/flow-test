import { BaseComponentV2 } from "../../../common/base-component-v2";
import { ThemeConfig } from "../../../../types";
import { IterationCardsComponent } from "../cards/iteration-cards.component";

export class IterationCarouselComponent extends BaseComponentV2 {
  private cardsComponent: IterationCardsComponent;

  constructor(theme: ThemeConfig) {
    super(theme);
    this.cardsComponent = new IterationCardsComponent(theme);
  }

  renderCarousel(carouselId: string, iterations: any[]): string {
    const carouselItems = iterations.map((iteration, index) => {
      const isFirst = index === 0;
      const status = iteration.status || "unknown";
      const statusIcon = this.getStatusIcon(status);

      return `
        <div class="carousel-item ${
          isFirst ? "block" : "hidden"
        }" data-index="${index}">
          <div class="iteration-header mb-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4">
                <span class="iteration-icon text-2xl">${statusIcon}</span>
                <div>
                  <h5 class="text-lg font-semibold text-gray-900">
                    Iteration ${index + 1}
                  </h5>
                  <p class="text-sm text-gray-500">
                    ${this.escapeHtml(iteration.step_name || "Unnamed")}
                  </p>
                </div>
              </div>
              ${this.renderStatusBadge(status)}
            </div>
          </div>

          <div class="iteration-details-cards">
            ${this.cardsComponent.renderCards(iteration, index)}
          </div>
        </div>
      `;
    });

    return `
      <div class="carousel-container">
        <div class="carousel-controls flex items-center justify-between mb-4">
          <button
            class="carousel-btn bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            onclick="navigateCarousel('${carouselId}', -1)"
            ${iterations.length <= 1 ? "disabled" : ""}
          >
            ← Previous
          </button>

          <div class="carousel-indicators flex space-x-2">
            ${iterations
              .map(
                (_, index) => `
              <button
                class="indicator w-8 h-8 rounded-full border ${
                  index === 0
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-100"
                }"
                onclick="goToCarouselSlide('${carouselId}', ${index})"
                data-index="${index}"
              >
                ${index + 1}
              </button>
            `
              )
              .join("")}
          </div>

          <button
            class="carousel-btn bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            onclick="navigateCarousel('${carouselId}', 1)"
            ${iterations.length <= 1 ? "disabled" : ""}
          >
            Next →
          </button>
        </div>

        <div class="carousel-content" id="${carouselId}-content">
          ${carouselItems.join("")}
        </div>
      </div>

      <script>
        ${this.renderCarouselScript(carouselId, iterations.length)}
      </script>
    `;
  }

  protected getStatusIcon(status: string): string {
    switch (status) {
      case "success":
        return "✅";
      case "failed":
      case "failure":
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      case "skipped":
        return "⏭️";
      default:
        return "❓";
    }
  }

  protected renderStatusBadge(status: string): string {
    const statusMap: { [key: string]: string } = {
      success: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
      failure: "bg-red-100 text-red-800",
      error: "bg-red-100 text-red-800",
      warning: "bg-yellow-100 text-yellow-800",
      skipped: "bg-gray-100 text-gray-800",
    };
    const statusKey = (status || "").toLowerCase();
    const classes = statusMap[statusKey] || "bg-gray-100 text-gray-800";
    const text = status
      ? status.charAt(0).toUpperCase() + status.slice(1)
      : "Unknown";

    return `<span class="px-3 py-1 rounded-full text-sm font-semibold ${classes}">${text}</span>`;
  }

  private renderCarouselScript(carouselId: string, totalItems: number): string {
    return `
      function navigateCarousel(carouselId, direction) {
        const content = document.getElementById(carouselId + '-content');
        const items = content.querySelectorAll('.carousel-item');
        const indicators = content.parentElement.querySelectorAll('.indicator');
        let currentIndex = 0;

        items.forEach((item, index) => {
          if (!item.classList.contains('hidden')) {
            currentIndex = index;
          }
        });

        let newIndex = currentIndex + direction;
        if (newIndex < 0) newIndex = items.length - 1;
        if (newIndex >= items.length) newIndex = 0;

        items[currentIndex].classList.add('hidden');
        items[currentIndex].classList.remove('block');
        items[newIndex].classList.remove('hidden');
        items[newIndex].classList.add('block');

        indicators[currentIndex].classList.remove('bg-blue-600', 'text-white');
        indicators[currentIndex].classList.add('bg-white', 'text-gray-600');
        indicators[newIndex].classList.add('bg-blue-600', 'text-white');
        indicators[newIndex].classList.remove('bg-white', 'text-gray-600');
      }

      function goToCarouselSlide(carouselId, targetIndex) {
        const content = document.getElementById(carouselId + '-content');
        const items = content.querySelectorAll('.carousel-item');
        const indicators = content.parentElement.querySelectorAll('.indicator');
        let currentIndex = 0;

        items.forEach((item, index) => {
          if (!item.classList.contains('hidden')) {
            currentIndex = index;
          }
        });

        if (currentIndex !== targetIndex) {
          items[currentIndex].classList.add('hidden');
          items[currentIndex].classList.remove('block');
          items[targetIndex].classList.remove('hidden');
          items[targetIndex].classList.add('block');

          indicators[currentIndex].classList.remove('bg-blue-600', 'text-white');
          indicators[currentIndex].classList.add('bg-white', 'text-gray-600');
          indicators[targetIndex].classList.add('bg-blue-600', 'text-white');
          indicators[targetIndex].classList.remove('bg-white', 'text-gray-600');
        }
      }
    `;
  }

  render(): string {
    return "";
  }
}
