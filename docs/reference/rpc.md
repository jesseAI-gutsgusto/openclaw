---
summary: "RPC and adapter patterns for gateway integrations"
read_when:
  - Adding or changing gateway integration adapters
  - Debugging adapter boundaries between OpenClaw and external systems
title: "RPC Adapters"
---

# RPC adapters

OpenClaw integrates external systems through typed adapter boundaries. In the
B2B v1 baseline, two patterns are common.

## Pattern A: token-authenticated HTTP ingress

- External systems call gateway hook endpoints over HTTP.
- Auth uses shared secret headers (`Authorization: Bearer <token>`).
- Payloads are mapped into agent runs with explicit routing and policy checks.

See [Webhooks](/automation/webhook) for endpoint and payload details.

## Pattern B: channel plugin adapter runtime

- Channel plugins (for example Microsoft Teams) run adapter logic inside the gateway process.
- Plugin config is loaded from `channels.<id>` and validated against schema.
- Message events are normalized into OpenClaw session routing primitives.

See [Microsoft Teams](/channels/msteams) and [Plugins](/tools/plugin).

## Adapter guidelines

- Keep adapter contracts typed and explicit.
- Keep transport auth independent from model/provider auth.
- Enforce least-privilege config defaults (`pairing`/allowlist where applicable).
- Emit structured run and policy events for every ingress path.
