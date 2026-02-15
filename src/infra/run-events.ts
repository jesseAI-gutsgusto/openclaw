export const POLICY_DECISION_TRACE_V1 = "policy.decision.trace.v1" as const;
export const RUN_EVENT_V1 = "run.event.v1" as const;
export const TOOL_INVOCATION_V1 = "tool.invocation.v1" as const;

type PolicyOutcomeV1 = "allow" | "deny" | "review";

export type RunEventPolicyDecisionTraceV1 = {
  version: typeof POLICY_DECISION_TRACE_V1;
  decisionId: string;
  requestId: string;
  outcome: PolicyOutcomeV1;
  evaluatedAt: string;
  ruleHits: Array<{
    ruleId: string;
    effect: PolicyOutcomeV1;
    reason: string;
    metadata?: Record<string, unknown>;
  }>;
  notes?: string;
};

export type ToolInvocationV1 = {
  version: typeof TOOL_INVOCATION_V1;
  id: string;
  name: string;
  args?: Record<string, unknown>;
  timeoutMs?: number;
  dryRun?: boolean;
};

export type RunEventTypeV1 =
  | "run.started"
  | "run.progress"
  | "run.completed"
  | "run.failed"
  | "tool.started"
  | "tool.completed"
  | "policy.blocked";

export type RunEventErrorV1 = {
  code: string;
  message: string;
  retryable?: boolean;
};

export type RunEventV1 = {
  version: typeof RUN_EVENT_V1;
  eventId: string;
  runId: string;
  type: RunEventTypeV1;
  createdAt: string;
  message?: string;
  tool?: ToolInvocationV1;
  outputText?: string;
  error?: RunEventErrorV1;
  data?: Record<string, unknown>;
};

export const DEFAULT_POLICY_DECISION_ID = "policy.decision.unavailable";

export type RunEventListener = (event: RunEventV1) => void;

type EmitRunEventInput = Omit<RunEventV1, "version" | "eventId" | "createdAt"> & {
  createdAt?: string;
};

type RunToolEventInput = {
  runId: string;
  toolName: string;
  toolCallId: string;
  args?: unknown;
  policyDecisionId?: string;
  policyDecisionTrace?: RunEventPolicyDecisionTraceV1;
};

type RunToolCompletedEventInput = RunToolEventInput & {
  result?: unknown;
  isError?: boolean;
  meta?: string;
  errorMessage?: string;
};

type RunStatus = "QUEUED" | "RUNNING" | "WAITING_APPROVAL" | "COMPLETED" | "FAILED" | "CANCELLED";

type RunState = {
  runId: string;
  status: RunStatus;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
  failureReason?: string;
};

export type RunTransitionOptions = {
  at?: Date | string;
  metadata?: Record<string, unknown>;
  failureReason?: string;
};

export type RunStateChangedEvent = {
  type: "run.state.changed";
  runId: string;
  from: RunStatus;
  to: RunStatus;
  at: string;
  state: RunState;
};

type RunTransitionListener = (event: RunStateChangedEvent) => void;

const VALID_RUN_TRANSITIONS: Record<RunStatus, readonly RunStatus[]> = {
  QUEUED: ["RUNNING", "CANCELLED"],
  RUNNING: ["WAITING_APPROVAL", "COMPLETED", "FAILED", "CANCELLED"],
  WAITING_APPROVAL: ["RUNNING", "FAILED", "CANCELLED"],
  COMPLETED: [],
  FAILED: [],
  CANCELLED: [],
};

function normalizeTimestamp(input: Date | string): string {
  if (input instanceof Date) {
    return input.toISOString();
  }
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid timestamp: ${input}`);
  }
  return parsed.toISOString();
}

function createQueuedRunState(runId: string, at: Date | string = new Date()): RunState {
  const timestamp = normalizeTimestamp(at);
  return {
    runId,
    status: "QUEUED",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function canTransitionRunState(from: RunStatus, to: RunStatus): boolean {
  return VALID_RUN_TRANSITIONS[from].includes(to);
}

class RunOrchestrator {
  #state: RunState;
  readonly #listeners = new Set<RunTransitionListener>();

  constructor(runId: string) {
    this.#state = createQueuedRunState(runId);
  }

  subscribe(listener: RunTransitionListener): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  getState(): RunState {
    return { ...this.#state };
  }

  transition(nextStatus: RunStatus, options: RunTransitionOptions = {}): RunState {
    const previous = this.#state;
    if (!canTransitionRunState(previous.status, nextStatus)) {
      throw new Error(`Invalid run transition: ${previous.status} -> ${nextStatus}`);
    }
    const updatedAt = normalizeTimestamp(options.at ?? new Date());
    const metadata = options.metadata
      ? { ...previous.metadata, ...options.metadata }
      : previous.metadata;
    const nextState: RunState = {
      ...previous,
      status: nextStatus,
      updatedAt,
      ...(metadata ? { metadata } : {}),
      ...(nextStatus === "FAILED"
        ? { failureReason: options.failureReason ?? previous.failureReason ?? "Run failed" }
        : {}),
    };
    this.#state = nextState;
    const event: RunStateChangedEvent = {
      type: "run.state.changed",
      runId: nextState.runId,
      from: previous.status,
      to: nextState.status,
      at: updatedAt,
      state: nextState,
    };
    for (const listener of this.#listeners) {
      listener(event);
    }
    return nextState;
  }
}

const runEventsListeners = new Set<RunEventListener>();
const runOrchestratorsById = new Map<string, RunOrchestrator>();
const runEventSeqById = new Map<string, number>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function isPolicyOutcome(value: unknown): value is PolicyOutcomeV1 {
  return value === "allow" || value === "deny" || value === "review";
}

export function isPolicyDecisionTraceV1(value: unknown): value is RunEventPolicyDecisionTraceV1 {
  if (!isRecord(value)) {
    return false;
  }
  if (value.version !== POLICY_DECISION_TRACE_V1) {
    return false;
  }
  if (!normalizeNonEmptyString(value.decisionId) || !normalizeNonEmptyString(value.requestId)) {
    return false;
  }
  if (!isPolicyOutcome(value.outcome)) {
    return false;
  }
  if (typeof value.evaluatedAt !== "string" || Number.isNaN(Date.parse(value.evaluatedAt))) {
    return false;
  }
  if (!Array.isArray(value.ruleHits)) {
    return false;
  }
  return value.ruleHits.every((entry) => {
    if (!isRecord(entry)) {
      return false;
    }
    return (
      Boolean(normalizeNonEmptyString(entry.ruleId)) &&
      isPolicyOutcome(entry.effect) &&
      Boolean(normalizeNonEmptyString(entry.reason)) &&
      (entry.metadata === undefined || isRecord(entry.metadata))
    );
  });
}

export function isRunEventV1(value: unknown): value is RunEventV1 {
  if (!isRecord(value)) {
    return false;
  }
  if (value.version !== RUN_EVENT_V1) {
    return false;
  }
  if (!normalizeNonEmptyString(value.eventId) || !normalizeNonEmptyString(value.runId)) {
    return false;
  }
  if (
    value.type !== "run.started" &&
    value.type !== "run.progress" &&
    value.type !== "run.completed" &&
    value.type !== "run.failed" &&
    value.type !== "tool.started" &&
    value.type !== "tool.completed" &&
    value.type !== "policy.blocked"
  ) {
    return false;
  }
  if (typeof value.createdAt !== "string" || Number.isNaN(Date.parse(value.createdAt))) {
    return false;
  }
  return true;
}

function nextRunEventId(runId: string): string {
  const next = (runEventSeqById.get(runId) ?? 0) + 1;
  runEventSeqById.set(runId, next);
  return `${runId}:${next}`;
}

function createRunEvent(input: EmitRunEventInput): RunEventV1 {
  return {
    ...input,
    version: RUN_EVENT_V1,
    eventId: nextRunEventId(input.runId),
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

function mapRunTransitionToEventType(event: RunStateChangedEvent): RunEventTypeV1 {
  if (event.to === "RUNNING" && event.from === "QUEUED") {
    return "run.started";
  }
  if (event.to === "COMPLETED") {
    return "run.completed";
  }
  if (event.to === "FAILED" || event.to === "CANCELLED") {
    return "run.failed";
  }
  return "run.progress";
}

function buildTransitionError(event: RunStateChangedEvent): RunEventErrorV1 | undefined {
  if (event.to === "FAILED") {
    return {
      code: "RUN_FAILED",
      message: normalizeNonEmptyString(event.state.failureReason) ?? "Run failed.",
    };
  }
  if (event.to === "CANCELLED") {
    return {
      code: "RUN_CANCELLED",
      message: "Run cancelled.",
    };
  }
  return undefined;
}

function buildTransitionMessage(eventType: RunEventTypeV1): string {
  if (eventType === "run.started") {
    return "Run started.";
  }
  if (eventType === "run.completed") {
    return "Run completed.";
  }
  if (eventType === "run.failed") {
    return "Run failed.";
  }
  return "Run state updated.";
}

function emitRunStateTransitionEvent(event: RunStateChangedEvent): void {
  const eventType = mapRunTransitionToEventType(event);
  const data: Record<string, unknown> = {
    from: event.from,
    to: event.to,
    status: event.state.status,
  };
  if (event.state.metadata) {
    data.metadata = event.state.metadata;
  }
  if (event.state.failureReason) {
    data.failureReason = event.state.failureReason;
  }

  emitRunEvent({
    runId: event.runId,
    type: eventType,
    createdAt: event.at,
    message: buildTransitionMessage(eventType),
    error: buildTransitionError(event),
    data,
  });
}

function getRunOrchestrator(runId: string): RunOrchestrator {
  const normalizedRunId = normalizeNonEmptyString(runId);
  if (!normalizedRunId) {
    throw new Error("runId is required.");
  }
  let orchestrator = runOrchestratorsById.get(normalizedRunId);
  if (orchestrator) {
    return orchestrator;
  }
  orchestrator = new RunOrchestrator(normalizedRunId);
  orchestrator.subscribe((event: RunStateChangedEvent) => {
    emitRunStateTransitionEvent(event);
  });
  runOrchestratorsById.set(normalizedRunId, orchestrator);
  return orchestrator;
}

function createToolInvocation(input: RunToolEventInput): ToolInvocationV1 {
  const args = isRecord(input.args) ? input.args : undefined;
  const timeoutMs =
    typeof args?.timeoutMs === "number" && Number.isInteger(args.timeoutMs) && args.timeoutMs > 0
      ? args.timeoutMs
      : undefined;
  const dryRun = typeof args?.dryRun === "boolean" ? args.dryRun : undefined;

  return {
    version: TOOL_INVOCATION_V1,
    id: normalizeNonEmptyString(input.toolCallId) ?? "tool-call",
    name: normalizeNonEmptyString(input.toolName) ?? "tool",
    ...(args ? { args } : {}),
    ...(timeoutMs !== undefined ? { timeoutMs } : {}),
    ...(dryRun !== undefined ? { dryRun } : {}),
  };
}

function normalizePolicyDecisionId(value: string | undefined): string {
  return normalizeNonEmptyString(value) ?? DEFAULT_POLICY_DECISION_ID;
}

function resolvePolicyDecisionTraceCandidate(
  value: unknown,
): RunEventPolicyDecisionTraceV1 | undefined {
  if (!value) {
    return undefined;
  }
  if (isPolicyDecisionTraceV1(value)) {
    return value;
  }
  if (!isRecord(value)) {
    return undefined;
  }
  const nestedPolicy = isRecord(value.policy) ? value.policy : undefined;
  const candidates: unknown[] = [
    value.policyDecisionTrace,
    value.policyTrace,
    value.trace,
    nestedPolicy?.policyDecisionTrace,
    nestedPolicy?.policyTrace,
    nestedPolicy?.trace,
  ];
  for (const candidate of candidates) {
    if (isPolicyDecisionTraceV1(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

function resolvePolicyDecisionTrace(input: {
  explicit?: RunEventPolicyDecisionTraceV1;
  args?: unknown;
  result?: unknown;
}): RunEventPolicyDecisionTraceV1 | undefined {
  return (
    resolvePolicyDecisionTraceCandidate(input.explicit) ??
    resolvePolicyDecisionTraceCandidate(input.args) ??
    resolvePolicyDecisionTraceCandidate(input.result)
  );
}

function buildPolicyDecisionData(input: {
  policyDecisionId?: string;
  policyDecisionTrace?: RunEventPolicyDecisionTraceV1;
  args?: unknown;
  result?: unknown;
}): {
  policyDecisionId: string;
  policyDecisionTrace?: RunEventPolicyDecisionTraceV1;
} {
  const policyDecisionTrace = resolvePolicyDecisionTrace({
    explicit: input.policyDecisionTrace,
    args: input.args,
    result: input.result,
  });
  const policyDecisionId = normalizePolicyDecisionId(
    input.policyDecisionId ?? policyDecisionTrace?.decisionId,
  );
  return {
    policyDecisionId,
    ...(policyDecisionTrace ? { policyDecisionTrace } : {}),
  };
}

export function emitRunEvent(input: EmitRunEventInput): RunEventV1 {
  const event = createRunEvent(input);
  for (const listener of runEventsListeners) {
    try {
      listener(event);
    } catch {
      // Best-effort dispatch.
    }
  }
  return event;
}

export function onRunEvent(listener: RunEventListener): () => void {
  runEventsListeners.add(listener);
  return () => runEventsListeners.delete(listener);
}

export function transitionRunWithEvents(
  runId: string,
  nextStatus: RunStatus,
  options?: RunTransitionOptions,
): void {
  const normalizedRunId = normalizeNonEmptyString(runId);
  if (!normalizedRunId) {
    return;
  }
  const orchestrator = getRunOrchestrator(normalizedRunId);
  const currentState = orchestrator.getState();
  if (currentState.status === nextStatus) {
    return;
  }
  if (!canTransitionRunState(currentState.status, nextStatus)) {
    return;
  }
  orchestrator.transition(nextStatus, options);
}

export function markRunStarted(runId: string, options?: RunTransitionOptions): void {
  transitionRunWithEvents(runId, "RUNNING", options);
}

export function markRunCompleted(runId: string, options?: RunTransitionOptions): void {
  transitionRunWithEvents(runId, "COMPLETED", options);
}

export function emitRunToolStartedEvent(input: RunToolEventInput): RunEventV1 {
  const policyDecisionData = buildPolicyDecisionData({
    policyDecisionId: input.policyDecisionId,
    policyDecisionTrace: input.policyDecisionTrace,
    args: input.args,
  });
  return emitRunEvent({
    runId: input.runId,
    type: "tool.started",
    tool: createToolInvocation(input),
    data: policyDecisionData,
  });
}

export function emitRunToolCompletedEvent(input: RunToolCompletedEventInput): RunEventV1 {
  const isError = Boolean(input.isError);
  const policyDecisionData = buildPolicyDecisionData({
    policyDecisionId: input.policyDecisionId,
    policyDecisionTrace: input.policyDecisionTrace,
    args: input.args,
    result: input.result,
  });
  const data: Record<string, unknown> = {
    ...policyDecisionData,
    isError,
  };
  if (input.meta !== undefined) {
    data.meta = input.meta;
  }
  if (input.result !== undefined) {
    data.result = input.result;
  }

  return emitRunEvent({
    runId: input.runId,
    type: "tool.completed",
    tool: createToolInvocation(input),
    error: isError
      ? {
          code: "TOOL_ERROR",
          message: normalizeNonEmptyString(input.errorMessage) ?? "Tool execution failed.",
        }
      : undefined,
    data,
  });
}

export function resetRunEventsForTest(): void {
  runOrchestratorsById.clear();
  runEventSeqById.clear();
  runEventsListeners.clear();
}
