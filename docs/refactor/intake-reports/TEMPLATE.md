---
summary: "Template for daily/weekly upstream intake reports for the B2B fork."
read_when:
  - Running Codex automation for upstream intake
  - Writing manual intake decisions after reviewing upstream commits
title: "Upstream Intake Report Template"
---

# Upstream Intake Report - YYYY-MM-DD

## 1) Upstream snapshot

- Upstream repo: `https://github.com/openclaw/openclaw`
- Fork repo: `https://github.com/jesseAI-gutsgusto/openclaw`
- Compared refs: `main` vs `upstream/main`
- Ahead/behind at intake start: `<ahead>/<behind>`
- Intake scope: `security | runtime | policy | tools | plugins`

## 2) Why this intake exists

Short reminder:

- Upstream evolves fast and includes fixes we want.
- This fork is B2B single-tenant and intentionally removed some surfaces.
- We import selectively to keep reliability high without reintroducing removed scope.

## 3) Adopted commits

- `<sha> <summary>`
  - reason:
  - files touched:
  - risk level: `low|medium|high`

## 4) Ported changes (manual rewrite)

- upstream `<sha> <summary>`
  - local implementation:
  - reason cherry-pick was not safe:
  - test evidence:

## 5) Skipped commits

- `<sha> <summary>`
  - reason: `out-of-scope | removed-surface | conflict-cost-too-high | superseded`
  - revisit later: `yes|no`

## 6) Validation results

- `pnpm check`: `pass|fail`
- `pnpm test`: `pass|fail`
- Targeted runtime checks:
  - gateway lifecycle: `pass|fail`
  - tool invoke + policy trace: `pass|fail`
  - Slack baseline: `pass|fail`
  - Teams baseline: `pass|fail`
  - webhook ingest baseline: `pass|fail`

## 7) Risks and follow-ups

- Risk:
  - mitigation:
  - owner:
  - due date:

## 8) Next PR plan

1. `<next-pr-title>` - owner - ETA
2. `<next-pr-title>` - owner - ETA
3. `<next-pr-title>` - owner - ETA
