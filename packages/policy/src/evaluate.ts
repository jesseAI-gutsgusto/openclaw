import type {
  BuildPolicyDecisionTraceInput,
  EvaluatePolicyParams,
  PolicyDecision,
  PolicyDecisionOptions,
  PolicyDecisionTraceV1,
  PolicyEffect,
  PolicyEvaluation,
  PolicyReasonInput,
} from "./types.js";

const UNKNOWN_SUBJECT = "unknown-subject";
const UNKNOWN_RESOURCE = "unknown-resource";
const UNKNOWN_ACTION = "unknown-action";
const DEFAULT_ALLOW_REASON = "Policy allowed request.";
const DEFAULT_DENY_REASON = "Policy denied request.";
const DEFAULT_RATIONALE = "No rationale provided.";

export function allow(
  reasons?: PolicyReasonInput,
  options: PolicyDecisionOptions = {},
): PolicyEvaluation {
  return {
    effect: "allow",
    reasons,
    matchedRules: options.matchedRules,
    requiresApproval: options.requiresApproval,
    decisionId: options.decisionId,
  };
}

export function deny(
  reasons?: PolicyReasonInput,
  options: PolicyDecisionOptions = {},
): PolicyEvaluation {
  return {
    effect: "deny",
    reasons,
    matchedRules: options.matchedRules,
    requiresApproval: options.requiresApproval,
    decisionId: options.decisionId,
  };
}

export function evaluatePolicy(params: EvaluatePolicyParams): PolicyDecision {
  const evaluation = params.evaluate(params.context);
  const effect = evaluation.effect;
  const reasons = normalizeReasons(evaluation.reasons, effect);
  const matchedRules = normalizeStringArray(evaluation.matchedRules);
  const requiresApproval = Boolean(evaluation.requiresApproval);
  const decisionId =
    normalizeDecisionId(evaluation.decisionId ?? params.decisionId) ?? createDecisionId();

  const trace = buildPolicyDecisionTrace({
    decisionId,
    context: params.context,
    effect,
    matchedRules,
    requiresApproval,
    rationale: reasons.join(" | "),
  });

  return {
    decisionId,
    effect,
    reasons,
    matchedRules,
    requiresApproval,
    trace,
  };
}

export function buildPolicyDecisionTrace(
  params: BuildPolicyDecisionTraceInput,
): PolicyDecisionTraceV1 {
  const matchedRules = normalizeStringArray(params.matchedRules);
  return {
    decisionId: params.decisionId,
    subject: normalizeField(params.context.subject, UNKNOWN_SUBJECT),
    resource: normalizeField(params.context.resource, UNKNOWN_RESOURCE),
    action: normalizeField(params.context.action, UNKNOWN_ACTION),
    effect: params.effect,
    matchedRules,
    requiresApproval: Boolean(params.requiresApproval),
    rationale: normalizeRationale(params.rationale, matchedRules),
  };
}

function normalizeDecisionId(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function createDecisionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `policy-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeReasons(input: PolicyReasonInput | undefined, effect: PolicyEffect): string[] {
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (trimmed.length > 0) {
      return [trimmed];
    }
  }

  const normalized = normalizeStringArray(input);
  if (normalized.length > 0) {
    return normalized;
  }

  return [effect === "allow" ? DEFAULT_ALLOW_REASON : DEFAULT_DENY_REASON];
}

function normalizeStringArray(input: readonly string[] | undefined): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const normalized: string[] = [];
  for (const value of input) {
    if (typeof value !== "string") {
      continue;
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      continue;
    }
    normalized.push(trimmed);
  }
  return normalized;
}

function normalizeField(value: string | undefined, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function normalizeRationale(
  rationale: string | undefined,
  matchedRules: readonly string[],
): string {
  if (typeof rationale === "string") {
    const trimmed = rationale.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }

  if (matchedRules.length > 0) {
    return `Matched rules: ${matchedRules.join(", ")}`;
  }

  return DEFAULT_RATIONALE;
}
