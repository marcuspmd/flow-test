import { BaseComponentV2 } from "../common/base-component-v2";
import { DetailsPanelProps, ThemeConfig, NavigationItem } from "../../types";
import { SuiteComponent } from "./suite/suite.component";
import { StepComponent } from "./step/step.component";
import { GroupComponent } from "./group/group.component";

/**
 * Renderiza o painel principal de detalhes com mais espaço para visualização
 */
export class DetailsPanelComponent extends BaseComponentV2 {
  private suiteComponent: SuiteComponent;
  private stepComponent: StepComponent;
  private groupComponent: GroupComponent;

  constructor(theme: ThemeConfig) {
    super(theme);
    this.suiteComponent = new SuiteComponent(theme);
    this.stepComponent = new StepComponent(theme);
    this.groupComponent = new GroupComponent(theme);
  }

  render(): string {
    return ""; // Implementação padrão vazia
  }

  renderDetailsPanel(props: DetailsPanelProps): string {
    const { selectedItem, navigationItems, testData } = props;

    if (!navigationItems || navigationItems.length === 0) {
      return this.renderWelcomeState();
    }

    const activeId = selectedItem?.id || navigationItems[0]?.id || "";
    const sections = navigationItems
      .flatMap((item) => {
        const itemSections = [
          this.renderDetailSection(item, testData, activeId),
        ];
        if (item.children) {
          item.children.forEach((child) => {
            itemSections.push(
              this.renderDetailSection(child, testData, activeId)
            );
          });
        }
        return itemSections;
      })
      .filter(Boolean);

    if (sections.length === 0) {
      return this.renderWelcomeState();
    }

    return this.html`
      <div id="main-content-area" class="p-4" data-active-id="${this.escapeHtml(
        activeId
      )}">
        ${sections.join("\n")}
      </div>
    `;
  }

  private renderDetailSection(
    item: NavigationItem,
    testData: any,
    activeId: string
  ): string {
    const content = this.renderItemContent(item, testData);
    if (!content) return "";

    const isActive = item.id === activeId;
    return `
        <section class="transition-opacity duration-300 ${
          isActive ? "opacity-100" : "opacity-0 hidden"
        }" data-item-id="${this.escapeHtml(item.id)}">
          ${content}
        </section>
    `;
  }

  private renderItemContent(item: NavigationItem, testData: any): string {
    switch (item.type) {
      case "suite":
        const suiteData = this.findSuiteData(item.id, testData);
        return this.suiteComponent.renderSuite(item, suiteData);
      case "step":
        const stepResult = this.findStepData(item.id, testData);
        return this.stepComponent.renderStep(
          item,
          stepResult?.step,
          stepResult?.suite?.name || "Unknown Suite"
        );
      case "group":
        return this.groupComponent.renderGroup(item);
      default:
        return this.renderUnknownItemType(item);
    }
  }

  private renderWelcomeState(): string {
    return `
      <div class="flex items-center justify-center h-full">
        <div class="text-center">
          <h2 class="text-2xl font-bold mb-4">Bem-vindo ao Relatório de Testes</h2>
          <p class="text-gray-600">Selecione um item na navegação para ver os detalhes.</p>
        </div>
      </div>
    `;
  }

  private renderUnknownItemType(item: NavigationItem): string {
    return `<p>Tipo de item desconhecido: ${item.type}</p>`;
  }

  private findSuiteData(id: string, testData: any): any {
    return testData?.suites?.find((suite: any) => suite.id === id);
  }

  private findStepData(
    id: string,
    testData: any
  ): { step: any; suite: any } | null {
    if (!testData?.suites) return null;
    for (const suite of testData.suites) {
      const step = (suite.steps || []).find((s: any) => s.id === id);
      if (step) return { step, suite };
    }
    return null;
  }
}
