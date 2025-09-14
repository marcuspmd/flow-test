/**
 * Index de componentes - Exporta todos os componentes modulares
 * Facilita importação e uso dos componentes no gerador principal
 */

export { BaseComponent } from "./base-component";
export { HeaderComponent } from "./header.component";
export { SummaryCardsComponent } from "./summary-cards.component";
export { TestSuiteComponent } from "./test-suite.component";
export { TestStepComponent } from "./test-step.component";

// Exportar todos os tipos
export * from "./types";

// Importações para a factory
import { HeaderComponent } from "./header.component";
import { SummaryCardsComponent } from "./summary-cards.component";
import { TestSuiteComponent } from "./test-suite.component";
import { TestStepComponent } from "./test-step.component";

// Classe utilitária para instanciar todos os componentes
export class ComponentFactory {
  public readonly header = new HeaderComponent();
  public readonly summaryCards = new SummaryCardsComponent();
  public readonly testSuite = new TestSuiteComponent();
  public readonly testStep = new TestStepComponent();
}
