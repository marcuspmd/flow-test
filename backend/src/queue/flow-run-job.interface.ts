import { FlowExecutionOptions } from '../engine/services/flow-engine.service';

export interface FlowRunJobPayload {
  runId: string;
  options: FlowExecutionOptions;
  label?: string;
}
