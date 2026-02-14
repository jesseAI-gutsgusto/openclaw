# @openclaw/policy

Minimal policy core for OpenClaw packages.

## Exports

- `PolicyContext`
- `PolicyDecision`
- `PolicyDecisionTraceV1`
- `allow(...)`
- `deny(...)`
- `evaluatePolicy(...)`
- `buildPolicyDecisionTrace(...)`

## Example

```ts
import { allow, deny, evaluatePolicy, type PolicyContext } from "@openclaw/policy";

const context: PolicyContext = {
  subject: "user:123",
  resource: "tool:exec",
  action: "invoke",
};

const decision = evaluatePolicy({
  context,
  evaluate: (policyContext) => {
    if (policyContext.resource === "tool:exec") {
      return deny("Exec is disabled in this profile.", {
        matchedRules: ["tool.exec.disabled"],
      });
    }
    return allow("Default allow.");
  },
});

console.log(decision.effect); // "deny"
console.log(decision.reasons); // ["Exec is disabled in this profile."]
console.log(decision.trace); // PolicyDecisionTraceV1-compatible shape
```
