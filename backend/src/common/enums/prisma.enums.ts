export const PRIORITY_LEVEL_VALUES = [
  'CRITICAL',
  'HIGH',
  'MEDIUM',
  'LOW',
] as const;
export type PriorityLevelValue = (typeof PRIORITY_LEVEL_VALUES)[number];

export const FLOW_RUN_STATUS_VALUES = [
  'QUEUED',
  'RUNNING',
  'WAITING_INPUT',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
] as const;
export type FlowRunStatusValue = (typeof FLOW_RUN_STATUS_VALUES)[number];

export const STEP_RUN_STATUS_VALUES = [
  'PENDING',
  'RUNNING',
  'WAITING_INPUT',
  'SUCCESS',
  'WARNING',
  'FAILED',
  'SKIPPED',
  'ABORTED',
] as const;
export type StepRunStatusValue = (typeof STEP_RUN_STATUS_VALUES)[number];

export const TRIGGER_SOURCE_VALUES = [
  'CLI',
  'API',
  'SCHEDULE',
  'DEPENDENCY',
] as const;
export type TriggerSourceValue = (typeof TRIGGER_SOURCE_VALUES)[number];

export const MANUAL_RETRY_STATUS_VALUES = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'EXECUTED',
] as const;
export type ManualRetryStatusValue =
  (typeof MANUAL_RETRY_STATUS_VALUES)[number];
