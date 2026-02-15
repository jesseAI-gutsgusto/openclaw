type PolicyEffect = "allow" | "deny";
type PolicyReasonInput = string | readonly string[];

export type PolicyContext = {
  subject?: string;
  resource?: string;
  action?: string;
  environment?: string;
  metadata?: Record<string, unknown>;
};

export type PolicyEvaluation = {
  effect: PolicyEffect;
  reasons?: PolicyReasonInput;
  matchedRules?: readonly string[];
  requiresApproval?: boolean;
  decisionId?: string;
};

export type PolicyDecision = {
  decisionId: string;
  effect: PolicyEffect;
  reasons: string[];
  matchedRules: string[];
  requiresApproval: boolean;
  trace: {
    decisionId: string;
    subject: string;
    resource: string;
    action: string;
    effect: PolicyEffect;
    matchedRules: string[];
    requiresApproval: boolean;
    rationale: string;
  };
};

type RetryOptions = {
  maxAttempts?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: unknown, attempt: number) => Promise<boolean> | boolean;
};

export type InvocationOptions = {
  timeoutMs?: number;
  retry?: RetryOptions;
};

type PolicyOutcomeV1 = "allow" | "deny" | "review";

export const POLICY_DECISION_TRACE_V1 = "policy.decision.trace.v1" as const;

export type ToolPolicyDecisionTraceV1 = {
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

export const TOOL_INVOCATION_V1 = "tool.invocation.v1" as const;

export type ToolInvocationV1 = {
  version: typeof TOOL_INVOCATION_V1;
  id: string;
  name: string;
  args?: Record<string, unknown>;
  timeoutMs?: number;
  dryRun?: boolean;
};

const DEFAULT_ALLOW_REASON = "Tool invocation allowed by default in this execution path.";

export type ToolInvocationPolicyOptions = {
  context?: PolicyContext;
  evaluate?: (context: PolicyContext) => PolicyEvaluation | undefined;
  decisionId?: string;
  defaultAllowReason?: string;
};

export type InvokeToolWithRuntimeParams<TInput, TOutput> = {
  toolName: string;
  toolCallId?: string;
  input: TInput;
  invoke: (input: TInput) => Promise<TOutput> | TOutput;
  policy?: ToolInvocationPolicyOptions;
  runtimeOptions?: InvocationOptions;
  onPolicyDecision?: (decision: PolicyDecision) => void;
};

export type ToolInvocationPolicyEnvelope = {
  decisionId: string;
  effect: PolicyDecision["effect"];
  reasons: string[];
  matchedRules: string[];
  requiresApproval: boolean;
  trace: ToolPolicyDecisionTraceV1;
};

export type ToolRuntimeInvokeResult<TOutput> = {
  result: TOutput;
  decision: PolicyDecision;
  tool: ToolInvocationV1;
  policy: ToolInvocationPolicyEnvelope;
  policyDecisionTrace: ToolPolicyDecisionTraceV1;
};

export type ToolRuntimeErrorWithPolicyMetadata = {
  decision?: PolicyDecision;
  tool?: ToolInvocationV1;
  policy?: ToolInvocationPolicyEnvelope;
  policyDecisionTrace?: ToolPolicyDecisionTraceV1;
};

export class ToolInvocationDeniedError extends Error {
  readonly decision: PolicyDecision;

  constructor(decision: PolicyDecision) {
    super(decision.reasons[0] ?? "Tool invocation denied by policy.");
    this.name = "ToolInvocationDeniedError";
    this.decision = decision;
  }
}

function normalizeRuntimeToolName(name: string): string {
  const normalized = name.trim();
  return normalized.length > 0 ? normalized : "tool";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function normalizeStringList(value: PolicyReasonInput | undefined): string[] {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function createDecisionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `policy-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function allow(
  reasons?: PolicyReasonInput,
  options: {
    matchedRules?: readonly string[];
    requiresApproval?: boolean;
    decisionId?: string;
  } = {},
): PolicyEvaluation {
  return {
    effect: "allow",
    reasons,
    matchedRules: options.matchedRules,
    requiresApproval: options.requiresApproval,
    decisionId: options.decisionId,
  };
}

function evaluatePolicy(params: {
  context: PolicyContext;
  evaluate: (context: PolicyContext) => PolicyEvaluation | undefined;
  decisionId?: string;
}): PolicyDecision {
  const evaluation = params.evaluate(params.context) ?? allow(DEFAULT_ALLOW_REASON);
  const reasons = normalizeStringList(evaluation.reasons);
  const matchedRules = normalizeStringList(evaluation.matchedRules);
  const decisionId =
    normalizeNonEmptyString(evaluation.decisionId) ??
    normalizeNonEmptyString(params.decisionId) ??
    createDecisionId();
  const effect = evaluation.effect;
  const requiresApproval = Boolean(evaluation.requiresApproval);
  const rationale =
    reasons[0] ??
    (matchedRules.length > 0 ? `Matched rules: ${matchedRules.join(", ")}` : "Policy evaluated.");

  return {
    decisionId,
    effect,
    reasons:
      reasons.length > 0
        ? reasons
        : [effect === "allow" ? DEFAULT_ALLOW_REASON : DEFAULT_DENY_REASON],
    matchedRules,
    requiresApproval,
    trace: {
      decisionId,
      subject: normalizeNonEmptyString(params.context.subject) ?? UNKNOWN_SUBJECT,
      resource: normalizeNonEmptyString(params.context.resource) ?? UNKNOWN_RESOURCE,
      action: normalizeNonEmptyString(params.context.action) ?? UNKNOWN_ACTION,
      effect,
      matchedRules,
      requiresApproval,
      rationale,
    },
  };
}

function toPolicyOutcome(effect: PolicyDecision["effect"]): PolicyOutcomeV1 {
  return effect === "allow" ? "allow" : "deny";
}

function createToolInvocation(params: {
  toolName: string;
  toolCallId?: string;
  input: unknown;
  runtimeOptions?: InvocationOptions;
}): ToolInvocationV1 {
  const args = isRecord(params.input) ? params.input : undefined;
  const timeoutFromArgs =
    typeof args?.timeoutMs === "number" && Number.isInteger(args.timeoutMs) && args.timeoutMs > 0
      ? args.timeoutMs
      : undefined;
  const timeoutFromOptions =
    typeof params.runtimeOptions?.timeoutMs === "number" &&
    Number.isInteger(params.runtimeOptions.timeoutMs) &&
    params.runtimeOptions.timeoutMs > 0
      ? params.runtimeOptions.timeoutMs
      : undefined;
  const dryRun = typeof args?.dryRun === "boolean" ? args.dryRun : undefined;

  return {
    version: TOOL_INVOCATION_V1,
    id: normalizeNonEmptyString(params.toolCallId) ?? "tool-call",
    name: normalizeRuntimeToolName(params.toolName),
    ...(args ? { args } : {}),
    ...((timeoutFromOptions ?? timeoutFromArgs)
      ? { timeoutMs: timeoutFromOptions ?? timeoutFromArgs }
      : {}),
    ...(dryRun !== undefined ? { dryRun } : {}),
  };
}

function createPolicyDecisionTrace(decision: PolicyDecision): ToolPolicyDecisionTraceV1 {
  const outcome = toPolicyOutcome(decision.effect);
  const matchedRules = decision.matchedRules
    .map((rule) => (typeof rule === "string" ? rule.trim() : ""))
    .filter((rule) => rule.length > 0);
  const reasons = decision.reasons
    .map((reason) => (typeof reason === "string" ? reason.trim() : ""))
    .filter((reason) => reason.length > 0);
  const fallbackReason = reasons[0] ?? decision.trace.rationale ?? "Policy decision evaluated.";
  const ruleIds = matchedRules.length > 0 ? matchedRules : ["policy.default"];
  const ruleHits = ruleIds.map((ruleId, index) => ({
    ruleId,
    effect: outcome,
    reason: reasons[index] ?? fallbackReason,
    metadata: {
      subject: decision.trace.subject,
      resource: decision.trace.resource,
      action: decision.trace.action,
      requiresApproval: decision.requiresApproval,
    },
  }));

  return {
    version: POLICY_DECISION_TRACE_V1,
    decisionId: decision.decisionId,
    requestId: decision.trace.decisionId || decision.decisionId,
    outcome,
    evaluatedAt: new Date().toISOString(),
    ruleHits,
    notes: decision.trace.rationale,
  };
}

type NormalizedRetryOptions = {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
  shouldRetry?: (error: unknown, attempt: number) => Promise<boolean> | boolean;
};

function normalizeRetryOptions(retry?: RetryOptions): NormalizedRetryOptions {
  const maxAttempts = retry?.maxAttempts ?? 1;
  const delayMs = retry?.delayMs ?? 0;
  const backoffMultiplier = retry?.backoffMultiplier ?? 1;
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new Error("retry.maxAttempts must be an integer >= 1");
  }
  if (!Number.isFinite(delayMs) || delayMs < 0) {
    throw new Error("retry.delayMs must be a finite number >= 0");
  }
  if (!Number.isFinite(backoffMultiplier) || backoffMultiplier < 1) {
    throw new Error("retry.backoffMultiplier must be a finite number >= 1");
  }
  return {
    maxAttempts,
    delayMs,
    backoffMultiplier,
    shouldRetry: retry?.shouldRetry,
  };
}

function calculateRetryDelayMs(retry: NormalizedRetryOptions, attempt: number): number {
  if (retry.delayMs === 0) {
    return 0;
  }
  const delay = retry.delayMs * Math.pow(retry.backoffMultiplier, Math.max(0, attempt - 1));
  return Math.max(0, Math.round(delay));
}

function waitMs(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function invokeWithTimeout<T>(
  operation: Promise<T>,
  toolName: string,
  timeoutMs: number | undefined,
): Promise<T> {
  if (timeoutMs === undefined) {
    return await operation;
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs < 0) {
    throw new Error("timeoutMs must be a finite number >= 0");
  }
  return await new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Tool '${toolName}' timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    operation.then(
      (result) => {
        clearTimeout(timeout);
        resolve(result);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

async function invokeWithRuntimeOptions<T>(params: {
  toolName: string;
  runtimeOptions?: InvocationOptions;
  invoke: () => Promise<T>;
}): Promise<T> {
  const retry = normalizeRetryOptions(params.runtimeOptions?.retry);
  const timeoutMs = params.runtimeOptions?.timeoutMs;
  let attempt = 1;
  while (attempt <= retry.maxAttempts) {
    try {
      return await invokeWithTimeout(params.invoke(), params.toolName, timeoutMs);
    } catch (error) {
      const canRetry =
        attempt < retry.maxAttempts &&
        (!retry.shouldRetry || (await retry.shouldRetry(error, attempt)));
      if (!canRetry) {
        throw error;
      }
      await waitMs(calculateRetryDelayMs(retry, attempt));
      attempt += 1;
    }
  }
  throw new Error("Unreachable runtime state");
}

function withToolRuntimePolicyMetadata(
  error: unknown,
  metadata: Required<ToolRuntimeErrorWithPolicyMetadata>,
): unknown {
  if (!error || (typeof error !== "object" && typeof error !== "function")) {
    return error;
  }
  try {
    Object.assign(error, metadata);
  } catch {
    // Ignore failures attaching metadata to frozen or non-extensible objects.
  }
  return error;
}

export function extractToolRuntimePolicyMetadata(
  value: unknown,
): ToolRuntimeErrorWithPolicyMetadata | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as ToolRuntimeErrorWithPolicyMetadata;
  if (!record.policy && !record.tool && !record.policyDecisionTrace && !record.decision) {
    return undefined;
  }
  return {
    decision: record.decision,
    tool: record.tool,
    policy: record.policy,
    policyDecisionTrace: record.policyDecisionTrace,
  };
}

function createDefaultPolicyContext(toolName: string): PolicyContext {
  return {
    subject: "tool-runtime-adapter",
    resource: `tool:${toolName}`,
    action: "invoke",
    metadata: {
      tool: toolName,
    },
  };
}

function evaluateInvocationPolicy(params: {
  toolName: string;
  policy?: ToolInvocationPolicyOptions;
}): PolicyDecision {
  const context = params.policy?.context ?? createDefaultPolicyContext(params.toolName);
  return evaluatePolicy({
    context,
    decisionId: params.policy?.decisionId,
    evaluate: (policyContext) =>
      params.policy?.evaluate?.(policyContext) ??
      allow(params.policy?.defaultAllowReason ?? DEFAULT_ALLOW_REASON),
  });
}

export async function invokeToolWithRuntime<TInput, TOutput>(
  params: InvokeToolWithRuntimeParams<TInput, TOutput>,
): Promise<ToolRuntimeInvokeResult<TOutput>> {
  const toolName = normalizeRuntimeToolName(params.toolName);
  const tool = createToolInvocation({
    toolName,
    toolCallId: params.toolCallId,
    input: params.input,
    runtimeOptions: params.runtimeOptions,
  });
  const decision = evaluateInvocationPolicy({
    toolName,
    policy: params.policy,
  });
  const policyDecisionTrace = createPolicyDecisionTrace(decision);
  const policy = {
    decisionId: decision.decisionId,
    effect: decision.effect,
    reasons: decision.reasons,
    matchedRules: decision.matchedRules,
    requiresApproval: decision.requiresApproval,
    trace: policyDecisionTrace,
  } satisfies ToolInvocationPolicyEnvelope;
  params.onPolicyDecision?.(decision);
  if (decision.effect === "deny") {
    throw withToolRuntimePolicyMetadata(new ToolInvocationDeniedError(decision), {
      decision,
      tool,
      policy,
      policyDecisionTrace,
    });
  }
  let result: TOutput;
  try {
    result = await invokeWithRuntimeOptions({
      toolName,
      runtimeOptions: params.runtimeOptions,
      invoke: async () => await params.invoke(params.input),
    });
  } catch (error) {
    throw withToolRuntimePolicyMetadata(error, {
      decision,
      tool,
      policy,
      policyDecisionTrace,
    });
  }
  return { result, decision, tool, policy, policyDecisionTrace };
}

const UNKNOWN_SUBJECT = "unknown-subject";
const UNKNOWN_RESOURCE = "unknown-resource";
const UNKNOWN_ACTION = "unknown-action";
const DEFAULT_DENY_REASON = "Policy denied request.";
