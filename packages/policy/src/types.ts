export type PolicyEffect = "allow" | "deny";

export interface PolicyContext {
  subject?: string;
  resource?: string;
  action?: string;
  environment?: string;
  metadata?: Record<string, unknown>;
}

export interface PolicyDecisionTraceV1 {
  decisionId: string;
  subject: string;
  resource: string;
  action: string;
  effect: PolicyEffect;
  matchedRules: string[];
  requiresApproval: boolean;
  rationale: string;
}

export type PolicyReasonInput = string | readonly string[];

export interface PolicyDecisionOptions {
  matchedRules?: readonly string[];
  requiresApproval?: boolean;
  decisionId?: string;
}

export interface PolicyEvaluation extends PolicyDecisionOptions {
  effect: PolicyEffect;
  reasons?: PolicyReasonInput;
}

export type PolicyEvaluator = (context: PolicyContext) => PolicyEvaluation;

export interface EvaluatePolicyParams {
  context: PolicyContext;
  evaluate: PolicyEvaluator;
  decisionId?: string;
}

export interface BuildPolicyDecisionTraceInput {
  decisionId: string;
  context: PolicyContext;
  effect: PolicyEffect;
  matchedRules?: readonly string[];
  requiresApproval?: boolean;
  rationale?: string;
}

export interface PolicyDecision {
  decisionId: string;
  effect: PolicyEffect;
  reasons: string[];
  matchedRules: string[];
  requiresApproval: boolean;
  trace: PolicyDecisionTraceV1;
}
