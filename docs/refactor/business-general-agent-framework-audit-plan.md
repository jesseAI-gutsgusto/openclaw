---
summary: "OpenClaw Business General Agent audit delta plus hard-break B2B refactor roadmap"
read_when:
  - Planning hard-break B2B refocus for OpenClaw runtime
  - Defining policy, tool runtime, plugin governance, and customer-instance boundaries
  - Building a PR-by-PR migration plan for direct B2B rebuild
title: "Business General Agent Framework Audit + Refactor Plan"
---

# OpenClaw -> Business General Agent Framework Audit + Refactor Plan

**Date**: 2026-02-13  
**Status**: In Progress  
**Strategy**: Hard-break B2B baseline (no compatibility migration path)

## Execution Status (2026-02-14)

Completed in `main`:

- Platform hard prune done: iOS + Android + A2UI/canvas bundling paths removed.
- Build/CI normalized: mobile/canvas scripts and CI steps removed.
- Extension distro prune done: non-v1 channel extensions removed; retained curated lane + Slack/MSTeams.
- Runtime decouple pass done: core registry/runtime paths reduced to Slack/MSTeams baseline.
- Canvas host removal done: `src/canvas-host/**` removed; gateway/config/protocol wiring removed.
- Outbound + auto-reply cleanup done for new channel baseline.
- Test suite stabilized for the hard-break scope.
- New package skeletons added:
  - `packages/contracts`
  - `packages/policy`
  - `packages/tool-runtime`
  - `packages/run-orchestrator`
- Runtime wiring landed:
  - central tool invocation adapter (`src/agents/tool-runtime-adapter.ts`) used by PI + gateway HTTP invoke paths
  - policy decision traces emitted on tool invoke paths
  - run lifecycle event bridge (`src/infra/run-events.ts`) backed by run-orchestrator transitions
- B2B governance config keys landed:
  - `deployment.mode`
  - `security.egress.allowlist`
  - `plugins.trustMode`
  - `tools.riskyExecution`
  - `tools.riskyRequireApproval`
- Security default enforcement landed:
  - `tools.riskyExecution="sandbox_only"` disables risky tools outside sandbox lanes
  - `security.egress.allowlist` enforced for `web_fetch`
- Plugin governance hardening landed:
  - curated trust-mode gating for non-bundled plugins
  - signed trust-mode checks in loader/install paths (manifest publisher/signature required)

Current quality gates:

- `pnpm check`: passing on 2026-02-14.
- `pnpm test`: passing on 2026-02-14.

Remaining waves:

- Continue docs rewrite to match B2B-only scope.
- Complete broad integration of new run/tool/policy contracts across all gateway surfaces.
- Finish source-delete wave for legacy non-v1 runtime channel modules under `src/**` where still present.

## 1) Executive summary

OpenClaw already has strong building blocks for a Business General Agent (BGA): typed tools, policy layering, gateway scopes, approvals, plugin SDK, and diagnostics hooks. The main gap is not feature absence but **boundary strength**: customer-instance isolation, immutable audit model, strict extension governance, and clear separation between generic run orchestration and chat/channel UX.

This plan intentionally drops legacy compatibility paths and rebuilds OpenClaw directly around B2B production constraints.

## 2) Scope and success criteria

### In scope

- Runtime architecture refactor to separate generic orchestrator from chat adapters.
- Customer-instance-scoped policy and tool execution envelope.
- B2B production defaults for risky tools and network egress.
- Plugin governance (manifest v2, permissions enforcement, signature/trust modes).
- Audit/event contracts for run lifecycle and policy decisions.

### Out of scope for initial tranche

- Full product-line rewrite of mobile/native apps.
- Replacing Pi runtime as the orchestration engine.
- Rebuilding every connector before governance foundation lands.

### Success criteria

- Legacy compatibility is not a target in this roadmap.
- B2B baseline can deny risky paths by default without code changes.
- Every tool call and policy decision emits structured, queryable audit events.
- Plugin runtime enforces permission boundaries in production by default.
- Run lifecycle can execute without channel-specific logic.

## 3) Code-validated baseline (current as-built)

This section reflects repository state verified in code, not assumptions.

### Product/runtime baseline

- Version and Node baseline in `package.json`: `2026.2.13`, Node `>=22.12.0`.
- Product identity remains local-first/personal in `README.md`.
- Core runtime and orchestration live in `src/` with broad multi-channel support.

### Orchestration and reply pipeline

- `src/auto-reply/reply/agent-runner.ts` is a large orchestration hotspot (~529 LOC).
- Current runner mixes queueing, memory flush, usage accounting, typing UX, streaming payload shaping, and follow-up control.
- Queue/lanes primitives already exist (`src/process/command-queue.ts`, `src/process/lanes.ts`).

### Policy/tool controls already present

- Tool profile/group normalization exists in `src/agents/tool-policy.ts`.
- Effective policy merge logic exists in `src/agents/pi-tools.policy.ts`.
- Sandbox policy defaults exist in `src/agents/sandbox/tool-policy.ts` and constants.
- Exec approvals exist (`src/infra/exec-approvals.ts`, `src/gateway/exec-approval-manager.ts`).
- Gateway method scopes exist in `src/gateway/server-methods.ts`.

### Network/web hardening already present

- SSRF protections and guarded fetch path already exist in `src/infra/net/ssrf.ts` and `src/infra/net/fetch-guard.ts`.
- `web_fetch` path uses guarded fetch.

### Extensibility and plugin runtime

- Plugin loader/registry/runtime exist under `src/plugins/*`.
- Plugin install path supports npm/archive/dir/path sources.
- Plugin install already uses `npm install --omit=dev --ignore-scripts`.
- Manifest/schema checks exist, but strong trust policy and signature enforcement are not yet complete.
- Some extensions still import `src/**` directly, showing migration debt.

### Memory and diagnostics

- Memory subsystem has local store and extension slots (`memory-core`, `memory-lancedb`).
- Event streams and diagnostics exist (`src/infra/diagnostic-events.ts`, `src/infra/agent-events.ts`).
- OTel is available via extension (`extensions/diagnostics-otel/src/service.ts`), not yet a full mandatory audit plane.

## 4) Delta analysis: what is missing for BGA

### Identity and isolation gaps

- Current gateway auth/scopes are operator/node oriented, not customer-instance IAM boundaries.
- Customer-instance context is not yet a canonical key across all runtime contracts.

### Governance and audit gaps

- Eventing exists, but immutable production-grade audit modeling is not yet universal.
- Policy decisions are not consistently emitted as explicit trace objects across all paths.

### Plugin supply chain and runtime boundaries

- Strongly governed trust modes (`signed`, `curated`) are not defaulted/enforced platform-wide.
- Runtime capability exposure to plugins is broad relative to B2B least-privilege expectations.

### Architecture boundaries

- Generic run lifecycle remains coupled with channel UX logic.
- Tool invocation logic is distributed; B2B governance works best with one central invoke pipeline.

## 5) Target architecture (hard-break B2B baseline)

### Design principles

1. Least privilege by default.
2. Customer-instance identity carried in every run and tool envelope.
3. Policy decisions are first-class auditable artifacts.
4. Extension and plugin trust is explicit and enforceable.
5. Chat/channel concerns become adapters on top of a generic orchestrator.

### Target module boundaries

- `packages/contracts/`: shared runtime contracts and schemas.
- `packages/policy/`: policy evaluation and decision traces.
- `packages/tool-runtime/`: central tool registry and invoke/audit hooks.
- `packages/run-orchestrator/`: generic run state machine.
- `src/auto-reply/*`: channel adapter layer using orchestrator.
- `src/plugins/*`: manifest v2 + permission-enforced runtime + trust mode gating.

### Run state model

`QUEUED -> RUNNING -> WAITING_APPROVAL -> COMPLETED|FAILED|CANCELLED`

## 6) Public interfaces and config changes

### New contracts (shared)

- `RunRequestV2`
  - `runId`
  - `customerInstanceId`
  - `environment`
  - `actor`
  - `input`
  - `channelContext`
  - `toolProfile`
  - `policyContext`
  - `idempotencyKey`

- `RunEventV1`
  - `eventId`
  - `runId`
  - `customerInstanceId`
  - `environment`
  - `ts`
  - `type`
  - `phase`
  - `payload`
  - `traceId`

- `ToolInvocationV1`
  - `invocationId`
  - `runId`
  - `customerInstanceId`
  - `environment`
  - `toolName`
  - `argsHash`
  - `policyDecisionId`
  - `startedAt`
  - `endedAt`
  - `outcome`
  - `redactionMeta`

- `PolicyDecisionTraceV1`
  - `decisionId`
  - `subject`
  - `resource`
  - `action`
  - `effect`
  - `matchedRules`
  - `requiresApproval`
  - `rationale`

- `PluginManifestV2`
  - `name`
  - `version`
  - `permissions[]`
  - `publisher`
  - `signature`
  - `checksum`
  - `sdkVersion`

### Proposed gateway methods

- `runs.create`
- `runs.get`
- `runs.list`
- `runs.cancel`
- `policy.evaluate`
- `audit.events.list`

### Config keys

- `deployment.mode: "b2b"`
- `security.egress.allowlist: string[]`
- `plugins.trustMode: "signed" | "curated"`
- `tools.riskyExecution: "sandbox_only"`
- `tools.riskyRequireApproval: boolean` (default `false`, per-customer override allowed)

## 7) Phased roadmap

### Phase 0: Requirements and threat-model lock (1-2 weeks)

Deliverables:

- Threat model and abuse-case catalog for B2B production deployment.
- Customer-instance identity model and retention constraints.
- Default production tool policy profile definition.

Acceptance:

- Signed-off architecture decision record (ADR) set for identity, policy, and audit.

### Phase 1: Contracts and envelope-first instrumentation (1-2 weeks)

Deliverables:

- Create `packages/contracts` with schemas for run/tool/policy events.
- Emit contract-compliant events from existing runtime paths with no behavior change.

Acceptance:

- Every run emits start, tool-call, policy-decision, and completion events.
- Existing user-facing behavior unchanged.

### Phase 2: Policy extraction and traceability (2-3 weeks)

Deliverables:

- Extract policy logic into `packages/policy`.
- Keep temporary compatibility wrappers at existing import points.
- Emit explicit `PolicyDecisionTraceV1` for every allow/deny/approval decision.

Acceptance:

- Policy parity with the new B2B baseline behavior.
- Decision traces available and queryable.

### Phase 3: Orchestrator decomposition (2-4 weeks)

Deliverables:

- Move generic run lifecycle from `agent-runner.ts` into `packages/run-orchestrator`.
- Keep typing/threading/stream formatting in adapter layer.

Acceptance:

- Auto-reply regression suite passes.
- Orchestrator runs without channel-specific dependencies.

### Phase 4: Central tool-runtime invoke path (2-3 weeks)

Deliverables:

- Introduce `packages/tool-runtime` as single invoke path.
- Force audit hooks and policy decision binding for all tool calls.

Acceptance:

- No direct bypass path for tool execution in supported flows.
- All tool calls carry `policyDecisionId`.

### Phase 5: Production defaults and egress control (2-4 weeks)

Deliverables:

- Set production defaults directly (no alternate runtime profile).
- Enforce `sandbox_only` execution for risky tool classes.
- Enforce outbound allowlist for web-fetch/browser paths in production.

Acceptance:

- Security regression suite passes for SSRF/private-net/approval gating.
- Production defaults require no code customization.

### Phase 6: Plugin governance v2 (3-5 weeks)

Deliverables:

- Add `PluginManifestV2` validation path.
- Enforce trust modes (`signed`, `curated`) by deployment mode.
- Restrict privileged runtime capabilities by declared permissions.

Acceptance:

- Unsigned plugin load/install blocked in production mode.
- Runtime permission violations are denied and audited.

### Phase 7: Instance-scoped storage adapters (4-6 weeks)

Deliverables:

- Add `customerInstanceId` keys to run/memory/audit storage interfaces.
- Introduce dual-write adapter for migration safety.

Acceptance:

- Isolation tests prove cross-customer leakage is blocked.
- Migration can roll back without data loss in pilot stage.

## 8) First 10 PRs (implementation backlog)

1. `contracts: add RunEventV1 ToolInvocationV1 PolicyDecisionTraceV1 schemas`
2. `runtime: emit structured run and tool envelopes in existing paths`
3. `policy: extract evaluator package with compatibility wrappers`
4. `policy: emit decision traces and bind trace IDs to run context`
5. `orchestrator: add generic run state machine package`
6. `reply: rewire auto-reply pipeline to orchestrator adapter`
7. `tool-runtime: centralize tool invocation and audit hooks`
8. `production-profile: set sandbox-only risky tools and egress allowlist defaults`
9. `plugins: enforce manifest v2 permissions and trust mode gating`
10. `storage: propagate customer instance context and add dual-write adapter`

## 9) Test strategy and acceptance matrix

### Unit tests

- Policy evaluation parity fixtures.
- State machine transition coverage.
- Manifest v2 validation and permission gate behavior.
- Egress allowlist and blocked-target logic.

### Contract tests

- JSON schema validation for all run/tool/policy envelopes.
- Compatibility tests only for new B2B contract versions and migration tooling.

### End-to-end tests

- Ingress message -> run -> tool -> output for representative channels.
- Sandbox-enforced flows for exec/browser in production mode.
- Plugin load/install matrix across trust modes.

### Security regression tests

- SSRF/private IP target blocking.
- Prompt-injection containment checks around tool calls.
- Privilege escalation attempts via plugin runtime API.

### Performance tests

- P95 run start latency budget.
- Tool invocation overhead before/after central runtime path.
- Policy evaluation overhead budget with trace emission enabled.

## 10) Rollout plan

### Rollout stages

1. Cut hard-break branch and remove deprecated consumer surfaces.
2. Deploy first production customer instance with curated integrations.
3. Validate runtime/security SLOs on first instances.
4. Roll out standardized per-customer deployment templates.

### Rollback strategy

- Roll back to the previous tagged release if customer migrations fail.
- Keep dual-write storage until reconciliation validates parity.
- Retain a temporary fallback invoke path only during tool-runtime cutover.

## 11) Risks and mitigations

- Risk: behavior regressions during decomposition.
  - Mitigation: envelope-first instrumentation and parity tests before extraction.
- Risk: policy complexity creep.
  - Mitigation: explicit decision traces with deterministic fixture tests.
- Risk: plugin ecosystem friction.
  - Mitigation: staged trust modes and migration docs for extension authors.
- Risk: hard-break removals break hidden coupling paths.
  - Mitigation: enforce PR sequence and run full CI gates between each deletion wave.

## 12) KPI and governance checks

- Audit completeness: 100% of tool calls linked to policy decision IDs.
- Security posture: zero high-severity bypasses in regression suite.
- Stability: no net increase in incident class tied to orchestration regressions.
- Adoption: time-to-first-production customer instance and repeatable customer rollout time.

## 13) Concrete file map for initial work

- `package.json`
- `src/auto-reply/reply/agent-runner.ts`
- `src/agents/tool-policy.ts`
- `src/agents/pi-tools.policy.ts`
- `src/agents/sandbox/tool-policy.ts`
- `src/infra/exec-approvals.ts`
- `src/gateway/exec-approval-manager.ts`
- `src/gateway/server-methods.ts`
- `src/gateway/server-methods-list.ts`
- `src/infra/net/ssrf.ts`
- `src/infra/net/fetch-guard.ts`
- `src/plugins/loader.ts`
- `src/plugins/registry.ts`
- `src/plugins/runtime/index.ts`
- `docs/refactor/plugin-sdk.md`
- `docs/refactor/exec-host.md`

## 14) Assumptions and defaults used in this plan

- The objective is direct B2B rebuild, replacing legacy multi-surface positioning in this branch.
- Pi remains the orchestration engine in this roadmap.
- Existing plugin and extension ecosystem remains available only via curated lanes.
- Production defaults are always on (no optional profile split).
- Prior refactor docs under `docs/refactor/` remain authoritative inputs and should be linked from future updates.

## 15) Open follow-up items for expansion

- Define canonical customer-instance/user/role object model with exact schema.
- Define signature verification implementation and key distribution model.
- Choose default production storage backend profile and migration path.
- Formalize connector permission taxonomy and data classification labels.
- Add operations runbook for policy troubleshooting using decision traces.

## 16) Deletion matrix (hard-break B2B profile)

This matrix reflects the chosen product direction:

- Single-tenant deployment per customer instance.
- Channels in v1: Slack, Microsoft Teams, email/webhook API.
- iOS and Android removed.
- Keep a simple admin UI.
- Canvas/A2UI removed.
- Risky tools (`exec`/browser) allowed only in isolated customer sandbox lanes.

### Keep now

- `src/**` core runtime, especially:
  - `src/index.ts`
  - `src/runtime.ts`
  - `src/cli/**`
  - `src/commands/**`
  - `src/agents/**`
  - `src/auto-reply/**`
  - `src/config/**`
  - `src/infra/**`
  - `src/gateway/**`
- Channel/runtime pieces needed for kept channels:
  - `src/slack/**`
  - `extensions/slack/**`
  - `extensions/msteams/**`
  - webhook/email-related runtime paths under `src/web/**` and `src/hooks/**` used for ingress/automation.
- Admin/operator surfaces:
  - `ui/**`
  - `apps/macos/**`
  - `apps/shared/OpenClawKit/**` (except canvas-specific subpaths removed below).

### Delete now (safe hard delete)

- Mobile apps:
  - `apps/ios/**`
  - `apps/android/**`
- Canvas/A2UI vendor and build assets:
  - `vendor/a2ui/**`
  - `apps/shared/OpenClawKit/Tools/CanvasA2UI/**`
  - `scripts/bundle-a2ui.sh`
  - `scripts/canvas-a2ui-copy.ts`
- Non-v1 channel extensions from default distro (remove from repo or move to external archive lane):
  - `extensions/discord/**`
  - `extensions/telegram/**`
  - `extensions/whatsapp/**`
  - `extensions/signal/**`
  - `extensions/imessage/**`
  - `extensions/googlechat/**`
  - `extensions/irc/**`
  - `extensions/line/**`
  - `extensions/matrix/**`
  - `extensions/mattermost/**`
  - `extensions/nextcloud-talk/**`
  - `extensions/nostr/**`
  - `extensions/tlon/**`
  - `extensions/twitch/**`
  - `extensions/zalo/**`
  - `extensions/zalouser/**`
  - `extensions/bluebubbles/**`

### Delete later (after decoupling blockers)

- Non-v1 channel runtime code under `src/` (must first remove imports and registry entries):
  - `src/discord/**`
  - `src/telegram/**`
  - `src/whatsapp/**`
  - `src/signal/**`
  - `src/imessage/**`
  - `src/googlechat/**`
  - `src/irc/**`
  - `src/line/**` (if present)
  - `src/channels/**` parts tied to removed channels
- Canvas host runtime:
  - `src/canvas-host/**` (only after `canvasHost` runtime/config/test references are removed from gateway/config).

### Archive lane (optional, per-customer curated install)

Keep out of default distro but available as curated add-ons when a customer explicitly needs them:

- `extensions/memory-core/**`
- `extensions/memory-lancedb/**`
- `extensions/diagnostics-otel/**`
- `extensions/open-prose/**`
- `extensions/llm-task/**`
- `extensions/lobster/**`
- `extensions/voice-call/**`
- `extensions/phone-control/**`
- auth/portal helper extensions (qwen/minimax/google auth variants)

### Coupling blockers that must be addressed first

- `src/plugins/runtime/index.ts` (large central import graph across channels/tools).
- `src/channels/registry.ts` (channel IDs/order/meta still include removed channels).
- `src/cli/channels-cli.ts` (channel-specific flags and onboarding switches).
- `src/config/types.channels.ts` and related config schema files.
- gateway/config references to `canvasHost` in `src/gateway/**` and config schema.

## 17) First 5 sloop-PRs (execution-ready)

### PR 1: Remove mobile and A2UI build path

- Delete:
  - `apps/ios/**`
  - `apps/android/**`
  - `vendor/a2ui/**`
  - `apps/shared/OpenClawKit/Tools/CanvasA2UI/**`
  - `scripts/bundle-a2ui.sh`
  - `scripts/canvas-a2ui-copy.ts`
- Update `package.json` scripts:
  - remove all `android:*`
  - remove all `ios:*`
  - remove `canvas:a2ui:bundle`
  - remove canvas steps from `build` and `prepack`.

### PR 2: Restrict default channel distro to Slack + Teams + email/webhook

- Remove non-v1 channel extension folders from `extensions/**` (or move to archive repo).
- Update:
  - `pnpm-workspace.yaml`
  - `package.json` dependencies tied only to deleted channels
  - `.github/labeler.yml` channel label paths.

### PR 3: Rewire runtime registration and channel registry

- Refactor:
  - `src/plugins/runtime/index.ts`
  - `src/channels/registry.ts`
  - `src/cli/channels-cli.ts`
  - `src/config/types.channels.ts`
- Goal: runtime builds with only Slack/Teams/email/webhook channel surfaces.

### PR 4: Remove deprecated `src/<channel>` runtime modules

- After PR 3 compiles cleanly, hard-delete non-v1 channel runtime folders in `src/`.
- Remove leftover channel-specific tool adapters and tests tied to deleted channels.

### PR 5: Remove canvas host runtime and simplify CI/docs

- Remove `src/canvas-host/**` and `canvasHost` config/runtime/test references.
- Simplify CI in `.github/workflows/ci.yml`:
  - remove iOS/Android scope handling and jobs
  - remove `canvas:a2ui:bundle` steps.
- Update docs to reflect new B2B product line:
  - remove mobile/node pages
  - remove channel docs for deleted channels
  - keep Slack/Teams/webhook/email docs as core.
