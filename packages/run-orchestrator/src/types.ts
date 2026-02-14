export const RUN_STATUSES = [
  "QUEUED",
  "RUNNING",
  "WAITING_APPROVAL",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
] as const;

export type RunStatus = (typeof RUN_STATUSES)[number];

export interface RunState {
  runId: string;
  status: RunStatus;
  createdAt: string;
  updatedAt: string;
  failureReason?: string;
  metadata?: Record<string, unknown>;
}

export interface RunTransitionOptions {
  at?: Date | string;
  failureReason?: string;
  metadata?: Record<string, unknown>;
}

export interface RunStateChangedEvent {
  type: "run.state.changed";
  runId: string;
  from: RunStatus;
  to: RunStatus;
  at: string;
  state: RunState;
}

export type RunEvent = RunStateChangedEvent;

export type RunEventListener = (event: RunEvent) => void;
