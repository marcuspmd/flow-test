// NestJS-adapted types from the original engine
export interface RequestDetails {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, any>;
  timeout?: number;
  base_url?: string;
  full_url?: string;
  curl_command?: string;
  raw_request?: string;
}

export interface ResponseDetails {
  status_code: number;
  headers: Record<string, string>;
  body: any;
  size_bytes: number;
  raw_response: string;
}

export interface StepExecutionResult {
  step_name: string;
  status: 'success' | 'failure';
  duration_ms: number;
  request_details?: RequestDetails;
  response_details?: ResponseDetails;
  error_message?: string;
  captured_variables: Record<string, any>;
  assertions_results: AssertionResult[];
}

export interface AssertionResult {
  assertion: string;
  expected: any;
  actual: any;
  passed: boolean;
  message?: string;
}

export interface Assertions {
  status_code?: number | AssertionChecks;
  headers?: Record<string, AssertionChecks> | AssertionChecks;
  body?: any;
  response_time?: AssertionChecks;
  [key: string]: any;
}

export interface AssertionChecks {
  equals?: any;
  not_equals?: any;
  contains?: any;
  greater_than?: number;
  less_than?: number;
  regex?: string;
  not_null?: boolean;
  type?: string;
  length?: AssertionChecks;
}

export interface FlowStep {
  name: string;
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, any>;
  timeout?: number;
  assertions?: Assertions;
  capture?: Record<string, string>;
  scenarios?: Record<string, any>;
  skip?: boolean;
  priority?: string;
}

export interface FlowSuite {
  suite_name: string;
  base_url?: string;
  variables?: Record<string, any>;
  steps: FlowStep[];
  dependencies?: string[];
  tags?: string[];
  priority?: string;
}

export interface ExecutionContext {
  variables: Record<string, any>;
  baseUrl?: string;
  suiteId?: string;
  runId?: string;
  stepIndex?: number;
}
