---
summary: "Standard operating procedure for safely importing upstream OpenClaw changes into the B2B single-tenant fork."
read_when:
  - Running weekly upstream sync for this fork
  - Deciding whether to cherry-pick, port, or skip upstream commits
  - Onboarding maintainers to the fork maintenance workflow
title: "Upstream Intake SOP (B2B Fork)"
---

# Upstream Intake SOP (B2B Fork)

## 0) Upstream context and objective

Upstream source of truth:

- `https://github.com/openclaw/openclaw`

Why this matters:

- Upstream ships real security, stability, and runtime correctness fixes.
- Our fork removed product surfaces for B2B focus, so we cannot safely do full merges.
- We still want high-value upstream engineering improvements without losing our B2B direction.

Objective of this SOP:

- Treat upstream as a **high-signal patch feed**.
- Import only what improves our product reliability and security.
- Keep fork maintenance predictable with repeatable intake cycles.

## 1) Goal

Keep this repo aligned with valuable upstream improvements **without** re-introducing removed surfaces or creating merge chaos.

This fork is treated as a **derived B2B product**:

- single-tenant per customer instance
- curated integrations
- risky tools sandbox-first
- selective upstream adoption (not full branch sync)

## 2) Non-negotiable rules

1. Do **not** merge `upstream/main` directly into `main`.
2. Import upstream in small batches via `intake/*` branches.
3. Prefer `git cherry-pick -x` for traceability.
4. Every adopted change must pass local quality gates before merge.
5. Every skipped change gets a short reason in the intake log section below.

## 3) Branch model

- `main`: production branch for this fork.
- `intake/YYYY-MM-DD-<scope>`: temporary upstream intake branch.
- Optional: `hotfix/upstream-<issue>` for urgent security/stability ports.

## 4) Intake cadence

- Default cadence: every 1-2 weeks.
- Security advisories or critical runtime fixes: same day.

## 5) Decision matrix per upstream change

Use one outcome per commit:

- **Adopt**: cherry-pick applies with acceptable conflicts.
- **Port**: rewrite intent manually in fork architecture.
- **Skip**: no fit for product scope or removed surfaces.

Prioritize in this order:

1. Security fixes
2. Data integrity / crash / deadlock fixes
3. Runtime stability and correctness
4. Performance
5. Developer tooling and tests
6. Product features (only if aligned with B2B scope)

## 6) Scope filters for this fork

### 6.1 Usually relevant

- `src/infra/**`
- `src/gateway/**`
- `src/config/**`
- `src/plugins/**`
- `src/agents/**`
- `src/process/**`
- `packages/contracts/**`
- `packages/policy/**`
- `packages/tool-runtime/**`
- `packages/run-orchestrator/**`

### 6.2 Usually not relevant (skip by default)

- removed channel surfaces (legacy non-v1 channels)
- removed mobile surfaces (`apps/ios/**`, `apps/android/**`)
- removed canvas/A2UI surfaces (`vendor/a2ui/**`, `src/canvas-host/**`)
- upstream feature work outside B2B product scope

If a skipped area contains a security fix, **port the fix intent manually** into shared code paths.

## 7) Command playbook

### 7.1 One-time setup (if needed)

```bash
git remote add upstream https://github.com/openclaw/openclaw.git
```

### 7.2 Start intake cycle

```bash
git fetch upstream
git checkout main
git checkout -b intake/$(date +%F)-security-runtime
```

### 7.3 Inspect candidate commits

```bash
git log --oneline main..upstream/main
git log --oneline main..upstream/main -- src/infra src/gateway src/config src/plugins src/agents src/process
```

### 7.4 Adopt commits (traceable)

```bash
git cherry-pick -x <commit_sha>
```

If conflicts are heavy, abort and port manually:

```bash
git cherry-pick --abort
```

### 7.5 Validate batch

```bash
pnpm check
pnpm test
```

### 7.6 Merge to main

```bash
git checkout main
git merge --ff-only intake/<branch-name>
```

If `--ff-only` is not possible, merge via normal PR flow and keep commit history explicit.

## 8) Intake log (required)

For every intake branch, add a short section to the PR description:

```md
## Upstream Intake Log - YYYY-MM-DD

### Adopted

- <sha> <summary> - reason

### Ported

- <sha> <summary> - ported as <local commit/path>

### Skipped

- <sha> <summary> - reason
```

For automation output, use:

- `/Users/jesseburger/Desktop/workspace/openclaw/docs/refactor/intake-reports/YYYY-MM-DD.md`
- Template: `/Users/jesseburger/Desktop/workspace/openclaw/docs/refactor/intake-reports/TEMPLATE.md`

## 9) Quality gates before merge

Must pass:

- `pnpm check`
- `pnpm test`

For risky runtime changes, also run targeted checks for:

- gateway start/stop behavior
- tool invocation path (policy + audit trace)
- Slack/Teams/webhook baseline flows

## 10) Security fast-track

If upstream contains a high-risk security fix:

1. Create `hotfix/upstream-<topic>`.
2. Port/adopt minimal safe patch first.
3. Run gates.
4. Merge immediately.
5. Backfill refactor cleanup in a follow-up PR.

## 11) What this SOP avoids

- giant rebases across hundreds of commits
- accidental reintroduction of removed product surfaces
- undocumented “why did we skip this?” decisions
- fork drift without governance

## 12) Definition of done (per cycle)

Cycle is done when:

1. `upstream/main` has been reviewed for target scope.
2. selected commits are adopted/ported/skipped with logged reasons.
3. quality gates pass.
4. intake branch is merged to `main`.
