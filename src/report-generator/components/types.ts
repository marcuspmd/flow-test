/**
 * Tipos e interfaces para componentes HTML server-side
 * Define contratos claros para cada componente modular
 */

export interface ComponentProps {
  [key: string]: any;
}

export interface HeaderProps extends ComponentProps {
  projectName: string;
  logoBase64: string;
  statusClass: string;
}

export interface SummaryCardData {
  title: string;
  value: string | number;
  icon: string;
  colorScheme: "primary" | "success" | "error" | "warning";
}

export interface SummaryCardsProps extends ComponentProps {
  cards: SummaryCardData[];
}

export interface TestSuiteProps extends ComponentProps {
  suiteName: string;
  status: "success" | "failure";
  duration: number;
  steps: TestStepData[];
  suiteId: string;
}

export interface TestStepData {
  stepName: string;
  status: "success" | "failure";
  duration: number;
  assertions: AssertionData[];
  request?: RequestData;
  response?: ResponseData;
  curlCommand?: string;
  stepId: string;
}

export interface TestStepProps extends ComponentProps {
  step: TestStepData;
  index: number;
}

export interface AssertionData {
  type: string;
  actual: any;
  expected: any;
  passed: boolean;
  operator?: string;
}

export interface RequestData {
  headers: Record<string, any>;
  body: any;
  method: string;
  url: string;
}

export interface ResponseData {
  status_code: number;
  headers: Record<string, any>;
  body: any;
}

export interface TabData {
  id: string;
  label: string;
  content: string;
  active?: boolean;
}

export interface TabsProps extends ComponentProps {
  tabs: TabData[];
  containerId: string;
}

/**
 * Interface base para todos os componentes HTML
 */
export interface HTMLComponent {
  render(props: ComponentProps): string;
}
