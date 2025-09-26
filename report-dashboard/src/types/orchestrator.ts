export type LiveEventType =
  | "run_registered"
  | "run_started"
  | "suite_started"
  | "suite_completed"
  | "step_completed"
  | "run_error"
  | "run_completed";

export interface LiveEvent<TPayload = any> {
  runId: string;
  type: LiveEventType;
  timestamp: string;
  payload?: TPayload;
}

export type RunStatus = "pending" | "running" | "success" | "failed";

export interface LiveRunRecord {
  id: string;
  status: RunStatus;
  source?: string;
  label?: string;
  options?: Record<string, any>;
  created_at: string;
  started_at?: string;
  finished_at?: string;
  last_event_at?: string;
  stats?: Record<string, any>;
  result?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
    context?: any;
  };
  events: LiveEvent[];
}

export interface RunResponse {
  runId: string;
}

export interface StartRunPayload {
  label?: string;
  options?: Record<string, any>;
}
