/**
 * @packageDocumentation
 * This module defines the types and interfaces for server-side HTML report components.
 * It establishes clear data contracts for each modular component used to build the final HTML report.
 */

/**
 * A generic properties object for components, allowing any string-indexed property.
 * @remarks This provides flexibility for passing arbitrary data to components.
 */
export interface ComponentProps {
  [key: string]: any;
}

/**
 * Properties for the main header component of the report.
 */
export interface HeaderProps extends ComponentProps {
  /** The name of the project being tested. */
  projectName: string;
  /** A Base64 encoded string for the project logo. */
  logoBase64: string;
  /** A CSS class representing the overall test status (e.g., 'status-success', 'status-failure'). */
  statusClass: string;
  /** Suite metadata including priority, tags, and description */
  suiteMetadata?: SuiteMetadata;
}

/**
 * Suite metadata for enhanced visual display
 */
export interface SuiteMetadata {
  /** Suite priority level */
  priority?: "critical" | "high" | "medium" | "low";
  /** Array of tags associated with the suite */
  tags?: string[];
  /** Suite description */
  description?: string;
  /** Node ID for identification */
  nodeId?: string;
}

/**
 * Captured variables data for display
 */
export interface CapturedVariables {
  /** Variable name */
  name: string;
  /** Variable value */
  value: any;
  /** Variable type for formatting */
  type?: string;
  /** Source step where variable was captured */
  sourceStep?: string;
}

/**
 * Data structure for a single summary card in the report header.
 */
export interface SummaryCardData {
  /** The title of the card (e.g., "Total Tests", "Passed"). */
  title: string;
  /** The value to be displayed on the card. */
  value: string | number;
  /** An icon to be displayed on the card, typically an SVG or a class name. */
  icon: string;
  /** The color scheme for the card, influencing its background or text color. */
  colorScheme: "primary" | "success" | "error" | "warning";
}

/**
 * Properties for the component that renders a collection of summary cards.
 */
export interface SummaryCardsProps extends ComponentProps {
  /** An array of data for each summary card to be rendered. */
  cards: SummaryCardData[];
}

/**
 * Represents the possible execution statuses of a test suite, step, or assertion.
 */
export type Status =
  | "success"
  | "failure"
  | "failed"
  | "error"
  | "unknown"
  | "skipped";

/**
 * Properties for a test suite component, representing a single YAML test file.
 */
export interface TestSuiteProps extends ComponentProps {
  /** The name of the test suite. */
  suiteName: string;
  /** The overall status of the suite. */
  status: Status;
  /** The total execution time of the suite in milliseconds. */
  duration: number;
  /** An array of test steps within this suite. */
  steps: TestStepData[];
  /** A unique identifier for the test suite. */
  suiteId: string;
  /** Suite metadata for enhanced display */
  metadata?: SuiteMetadata;
  /** Variables captured during suite execution */
  capturedVariables?: CapturedVariables[];
}

/**
 * Data structure for a single test step within a suite.
 */
export interface TestStepData {
  /** The name or description of the test step. */
  stepName: string;
  /** The execution status of the step. */
  status: Status;
  /** The execution time of the step in milliseconds. */
  duration: number;
  /** An array of assertions performed in this step. */
  assertions: AssertionData[];
  /** The HTTP request data, if applicable. */
  request?: RequestData;
  /** The HTTP response data, if applicable. */
  response?: ResponseData;
  /** The equivalent cURL command for the request. */
  curlCommand?: string;
  /** A unique identifier for the test step. */
  stepId: string;
  /** An array of iteration results, if this step was part of a loop. */
  iterations?: IterationStepData[];
  /** Metadata related to conditional scenario execution, if any. */
  scenariosMeta?: ScenarioMeta;
  /** Variables captured during this step */
  capturedVariables?: CapturedVariables[];
  /** Error context if step failed */
  errorContext?: ErrorContext;
}

/**
 * Error context for failed steps
 */
export interface ErrorContext {
  /** Error message */
  message: string;
  /** Error type/category */
  type: string;
  /** Stack trace or additional details */
  details?: string;
  /** Expected vs actual values */
  expected?: any;
  actual?: any;
}

/**
 * Properties for the component that renders a single test step.
 */
export interface TestStepProps extends ComponentProps {
  /** The data for the test step to be rendered. */
  step: TestStepData;
  /** The index of the step within the suite. */
  index: number;
}

/**
 * Data structure for a single assertion result.
 */
export interface AssertionData {
  /** The type of assertion (e.g., 'statusCode', 'body'). */
  type: string;
  /** The actual value obtained during the test. */
  actual: any;
  /** The expected value for the assertion. */
  expected: any;
  /** Whether the assertion passed or failed. */
  passed: boolean;
  /** The operator used for comparison (e.g., 'equals', 'contains'). */
  operator?: string;
}

/**
 * Data structure for an HTTP request.
 */
export interface RequestData {
  /** A record of request headers. */
  headers: Record<string, any>;
  /** The body of the request. */
  body: any;
  /** The HTTP method (e.g., 'GET', 'POST'). */
  method: string;
  /** The URL of the request. */
  url: string;
  /** The raw HTTP request string. */
  raw_request?: string;
}

/**
 * Data structure for an HTTP response.
 */
export interface ResponseData {
  /** The HTTP status code of the response. */
  status_code: number;
  /** A record of response headers. */
  headers: Record<string, any>;
  /** The body of the response. */
  body: any;
  /** The raw HTTP response string. */
  raw_response?: string;
}

/**
 * Data structure for a single iteration within an iterated test step.
 */
export interface IterationStepData {
  /** The 1-based index of the iteration. */
  index: number;
  /** The total number of iterations. */
  total: number;
  /** The name of the step for this iteration. */
  stepName: string;
  /** The status of this iteration. */
  status: Status;
  /** The duration of this iteration in milliseconds. */
  duration: number;
  /** The assertions for this iteration. */
  assertions: AssertionData[];
  /** The request data for this iteration. */
  request?: RequestData;
  /** The response data for this iteration. */
  response?: ResponseData;
  /** The cURL command for this iteration's request. */
  curlCommand?: string;
  /** A unique identifier for the iteration step. */
  stepId: string;
}

/**
 * Represents the UI-facing details of a single conditional scenario evaluation.
 */
export interface ScenarioEvaluationUI {
  /** The index of the evaluation. */
  index: number;
  /** The condition that was evaluated. */
  condition: string;
  /** Whether the condition matched. */
  matched: boolean;
  /** Whether the corresponding branch was executed. */
  executed: boolean;
  /** The branch that was chosen based on the condition. */
  branch: "then" | "else" | "none";
  /** The number of assertions added by this scenario branch. */
  assertions_added?: number;
  /** The number of variables captured by this scenario branch. */
  captures_added?: number;
}

/**
 * Metadata about the execution of conditional scenarios within a test step.
 */
export interface ScenarioMeta {
  /** Whether any scenarios were defined for the step. */
  has_scenarios: boolean;
  /** The number of scenario branches that were executed. */
  executed_count: number;
  /** An array detailing each scenario evaluation. */
  evaluations: ScenarioEvaluationUI[];
}

/**
 * Data structure for a single tab in a tabbed interface.
 */
export interface TabData {
  /** A unique identifier for the tab. */
  id: string;
  /** The visible label for the tab. */
  label: string;
  /** The HTML content of the tab panel. */
  content: string;
  /** Whether the tab should be active by default. */
  active?: boolean;
}

/**
 * Properties for a component that renders a tabbed interface.
 */
export interface TabsProps extends ComponentProps {
  /** An array of tab data to be rendered. */
  tabs: TabData[];
  /** A unique identifier for the container of the tabs. */
  containerId: string;
}

/**
 * Base interface for all HTML components.
 * @remarks Ensures that every component has a `render` method.
 */
export interface HTMLComponent {
  /**
   * Renders the component as an HTML string.
   * @param props - The properties required to render the component.
   * @returns An HTML string representation of the component.
   */
  render(props: ComponentProps): string;
}
