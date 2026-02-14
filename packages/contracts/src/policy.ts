export const POLICY_DECISION_TRACE_V1 = "policy.decision.trace.v1" as const;

export type PolicyOutcomeV1 = "allow" | "deny" | "review";

export interface PolicyRuleHitV1 {
  ruleId: string;
  effect: PolicyOutcomeV1;
  reason: string;
  metadata?: Record<string, unknown>;
}

export interface PolicyDecisionTraceV1 {
  version: typeof POLICY_DECISION_TRACE_V1;
  decisionId: string;
  requestId: string;
  outcome: PolicyOutcomeV1;
  evaluatedAt: string;
  ruleHits: PolicyRuleHitV1[];
  notes?: string;
}

const POLICY_OUTCOMES = ["allow", "deny", "review"] as const;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isIsoDate = (value: unknown): value is string => {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
};

const isPolicyOutcome = (value: unknown): value is PolicyOutcomeV1 => {
  return POLICY_OUTCOMES.includes(value as PolicyOutcomeV1);
};

const isPolicyRuleHitV1 = (value: unknown): value is PolicyRuleHitV1 => {
  if (!isRecord(value)) {
    return false;
  }

  if (typeof value["ruleId"] !== "string" || value["ruleId"].length === 0) {
    return false;
  }

  if (!isPolicyOutcome(value["effect"])) {
    return false;
  }

  if (typeof value["reason"] !== "string" || value["reason"].length === 0) {
    return false;
  }

  if ("metadata" in value && value["metadata"] !== undefined && !isRecord(value["metadata"])) {
    return false;
  }

  return true;
};

export function isPolicyDecisionTraceV1(value: unknown): value is PolicyDecisionTraceV1 {
  if (!isRecord(value)) {
    return false;
  }

  if (value["version"] !== POLICY_DECISION_TRACE_V1) {
    return false;
  }

  if (typeof value["decisionId"] !== "string" || value["decisionId"].length === 0) {
    return false;
  }

  if (typeof value["requestId"] !== "string" || value["requestId"].length === 0) {
    return false;
  }

  if (!isPolicyOutcome(value["outcome"])) {
    return false;
  }

  if (!isIsoDate(value["evaluatedAt"])) {
    return false;
  }

  if (
    !Array.isArray(value["ruleHits"]) ||
    !value["ruleHits"].every((hit) => isPolicyRuleHitV1(hit))
  ) {
    return false;
  }

  if ("notes" in value && value["notes"] !== undefined && typeof value["notes"] !== "string") {
    return false;
  }

  return true;
}

export function validatePolicyDecisionTraceV1(value: unknown): string[] {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return ["PolicyDecisionTraceV1 must be an object."];
  }

  if (value["version"] !== POLICY_DECISION_TRACE_V1) {
    errors.push(`version must be "${POLICY_DECISION_TRACE_V1}".`);
  }

  if (typeof value["decisionId"] !== "string" || value["decisionId"].length === 0) {
    errors.push("decisionId must be a non-empty string.");
  }

  if (typeof value["requestId"] !== "string" || value["requestId"].length === 0) {
    errors.push("requestId must be a non-empty string.");
  }

  if (!isPolicyOutcome(value["outcome"])) {
    errors.push("outcome must be one of: allow, deny, review.");
  }

  if (!isIsoDate(value["evaluatedAt"])) {
    errors.push("evaluatedAt must be an ISO-8601 timestamp string.");
  }

  if (!Array.isArray(value["ruleHits"])) {
    errors.push("ruleHits must be an array.");
  } else {
    const invalidRuleHitIndex = value["ruleHits"].findIndex((hit) => !isPolicyRuleHitV1(hit));
    if (invalidRuleHitIndex >= 0) {
      errors.push(`ruleHits[${invalidRuleHitIndex}] must be a valid PolicyRuleHitV1.`);
    }
  }

  if ("notes" in value && value["notes"] !== undefined && typeof value["notes"] !== "string") {
    errors.push("notes must be a string when provided.");
  }

  return errors;
}
