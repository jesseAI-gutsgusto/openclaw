import type {
  RunEvent,
  RunEventListener,
  RunState,
  RunStatus,
  RunTransitionOptions,
} from "./types.js";

const VALID_TRANSITIONS: Record<RunStatus, readonly RunStatus[]> = {
  QUEUED: ["RUNNING", "CANCELLED"],
  RUNNING: ["WAITING_APPROVAL", "COMPLETED", "FAILED", "CANCELLED"],
  WAITING_APPROVAL: ["RUNNING", "FAILED", "CANCELLED"],
  COMPLETED: [],
  FAILED: [],
  CANCELLED: [],
};

export function createQueuedRunState(runId: string, at: Date | string = new Date()): RunState {
  const timestamp = normalizeTimestamp(at);
  return {
    runId,
    status: "QUEUED",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function canTransitionRunState(from: RunStatus, to: RunStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

export function transitionRunState(
  current: RunState,
  nextStatus: RunStatus,
  options: RunTransitionOptions = {},
): RunState {
  if (!canTransitionRunState(current.status, nextStatus)) {
    throw new Error(`Invalid run transition: ${current.status} -> ${nextStatus}`);
  }

  const nextState: RunState = {
    ...current,
    status: nextStatus,
    updatedAt: normalizeTimestamp(options.at ?? new Date()),
    metadata: mergeMetadata(current.metadata, options.metadata),
  };

  if (nextStatus === "FAILED") {
    nextState.failureReason = options.failureReason ?? current.failureReason ?? "Run failed";
  } else {
    nextState.failureReason = undefined;
  }

  return nextState;
}

export function emitRunEvent(listeners: Iterable<RunEventListener>, event: RunEvent): void {
  for (const listener of listeners) {
    listener(event);
  }
}

export class RunOrchestrator {
  #state: RunState;
  readonly #listeners = new Set<RunEventListener>();

  constructor(runIdOrState: string | RunState, at?: Date | string) {
    this.#state =
      typeof runIdOrState === "string"
        ? createQueuedRunState(runIdOrState, at)
        : { ...runIdOrState };
  }

  getState(): RunState {
    return { ...this.#state };
  }

  subscribe(listener: RunEventListener): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  transition(nextStatus: RunStatus, options?: RunTransitionOptions): RunState {
    const previous = this.#state;
    const next = transitionRunState(previous, nextStatus, options);
    this.#state = next;

    emitRunEvent(this.#listeners, {
      type: "run.state.changed",
      runId: next.runId,
      from: previous.status,
      to: next.status,
      at: next.updatedAt,
      state: next,
    });

    return next;
  }

  start(options?: RunTransitionOptions): RunState {
    return this.transition("RUNNING", options);
  }

  waitForApproval(options?: RunTransitionOptions): RunState {
    return this.transition("WAITING_APPROVAL", options);
  }

  resume(options?: RunTransitionOptions): RunState {
    return this.transition("RUNNING", options);
  }

  complete(options?: RunTransitionOptions): RunState {
    return this.transition("COMPLETED", options);
  }

  fail(failureReason?: string, options?: Omit<RunTransitionOptions, "failureReason">): RunState {
    return this.transition("FAILED", {
      ...options,
      failureReason,
    });
  }

  cancel(options?: RunTransitionOptions): RunState {
    return this.transition("CANCELLED", options);
  }
}

function mergeMetadata(
  current: Record<string, unknown> | undefined,
  incoming: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!incoming) {
    return current;
  }

  return {
    ...current,
    ...incoming,
  };
}

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
