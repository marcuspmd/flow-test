// Dashboard Configuration Types
export interface DashboardConfig {
  layout: LayoutConfig;
  navigation: NavigationItem[];
  components: ComponentsConfig;
  themes: ThemeConfig;
}

export interface LayoutConfig {
  sidebarWidth: string;
  headerHeight: string;
  collapsible: boolean;
  responsive: boolean;
}

export interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  path: string; // URL path for navigation
  children?: NavigationItem[];
  badge?: string;
  description?: string;
}

export interface ComponentsConfig {
  [section: string]: ComponentConfig[];
}

export interface ComponentConfig {
  id: string;
  type: "card" | "chart" | "table" | "tabs" | "metrics" | "code" | "scenarios";
  title: string;
  description?: string;
  dataSource: string; // JSONPath para extrair dados
  props: Record<string, any>;
  grid?: {
    cols: number;
    rows?: number;
  };
}

export interface ThemeConfig {
  default: string;
  available: string[];
  darkMode: boolean;
}

// Report Data Types (based on results/latest.json structure)
export interface ReportData {
  project_name: string;
  start_time: string;
  end_time: string;
  total_duration_ms: number;
  total_tests: number;
  successful_tests: number;
  failed_tests: number;
  skipped_tests: number;
  success_rate: number;
  suites_results: SuiteResult[];
  report_metadata: ReportMetadata;
}

export interface SuiteResult {
  node_id: string;
  suite_name: string;
  file_path: string;
  priority: "critical" | "high" | "medium" | "low";
  start_time: string;
  end_time: string;
  duration_ms: number;
  status: "success" | "failed" | "skipped";
  steps_executed: number;
  steps_successful: number;
  steps_failed: number;
  success_rate: number;
  steps_results: StepResult[];
  description?: string;
  metadata?: SuiteMetadata;
  suite_yaml_content?: string;
}

export interface SuiteMetadata {
  priority?: string;
  tags?: string[];
  timeout?: number;
  estimated_duration_ms?: number;
  description?: string;
}

export interface StepResult {
  step_name: string;
  status: "success" | "failed" | "skipped";
  duration_ms: number;
  request_details: RequestDetails;
  response_details: ResponseDetails;
  assertions_results: AssertionResult[];
  captured_variables: Record<string, any>;
  available_variables: Record<string, any>;
  scenarios_meta?: ScenariosMetadata;
  iteration_results?: IterationResult[];
}

export interface IterationResult {
  step_name: string;
  status: "success" | "failed" | "skipped";
  duration_ms: number;
  request_details: RequestDetails;
  response_details: ResponseDetails;
  assertions_results: AssertionResult[];
  captured_variables: Record<string, any>;
  available_variables: Record<string, any>;
}

export interface RequestDetails {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: any;
  base_url: string;
  full_url: string;
  curl_command: string;
  raw_request: string;
  raw_url: string;
}

export interface ResponseDetails {
  status_code: number;
  headers: Record<string, string>;
  body: any;
  size_bytes: number;
  raw_response: string;
}

export interface AssertionResult {
  field: string;
  expected: any;
  actual: any;
  passed: boolean;
  message: string;
}

export interface ScenariosMetadata {
  has_scenarios: boolean;
  executed_count: number;
  evaluations: ScenarioEvaluation[];
}

export interface ScenarioEvaluation {
  index: number;
  condition: string;
  matched: boolean;
  executed: boolean;
  branch: string;
  assertions_added: number;
  captures_added: number;
}

export interface ReportMetadata {
  generated_at: string;
  format: string;
  version: string;
}

// UI State Types
export interface UIState {
  sidebarCollapsed: boolean;
  activeSection: string;
  currentSuite: SuiteResult | null;
  currentStep: StepResult | null;
  theme: string;
  expandedMenus: string[]; // IDs of expanded navigation menus
}

export interface MetricsData {
  totalTests: number;
  successRate: number;
  avgDuration: number;
  criticalTests: number;
  failedTests: number;
  skippedTests: number;
}
