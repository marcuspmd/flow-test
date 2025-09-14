/**
 * @packageDocumentation
 * This index module exports all modular HTML components.
 * It simplifies importing components into the main report generator and provides a factory for easy instantiation.
 */

export { BaseComponent } from "./base-component";
export { HeaderComponent } from "./header.component";
export { SummaryCardsComponent } from "./summary-cards.component";
export { TestSuiteComponent } from "./test-suite.component";
export { TestStepComponent } from "./test-step.component";

// Export all types for easy access
export * from "./types";

// Imports for the factory
import { HeaderComponent } from "./header.component";
import { SummaryCardsComponent } from "./summary-cards.component";
import { TestSuiteComponent } from "./test-suite.component";
import { TestStepComponent } from "./test-step.component";

/**
 * A utility class that instantiates and provides access to all report components.
 * This simplifies the process of creating and using components in the report generator.
 */
export class ComponentFactory {
  /** An instance of the HeaderComponent. */
  public readonly header = new HeaderComponent();
  /** An instance of the SummaryCardsComponent. */
  public readonly summaryCards = new SummaryCardsComponent();
  /** An instance of the TestSuiteComponent. */
  public readonly testSuite = new TestSuiteComponent();
  /** An instance of the TestStepComponent. */
  public readonly testStep = new TestStepComponent();
}
