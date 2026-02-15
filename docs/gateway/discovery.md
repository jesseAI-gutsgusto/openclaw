---
summary: "Discovery and transport model for single-tenant customer gateway instances"
read_when:
  - Designing endpoint discovery for customer deployments
  - Choosing direct vs SSH transport for operator access
  - Defining pairing and auth boundaries for clients
title: "Discovery and transports"
---

# Discovery and transports

In the B2B deployment model, each customer has a dedicated OpenClaw Gateway instance. Discovery is about finding the correct customer endpoint without creating cross-customer ambiguity.

## Discovery goals

1. Operator tools (CLI, Control UI, desktop clients) can reliably find the right customer instance.
2. Integrations and clients connect through explicit, auditable transport paths.
3. Risky execution stays policy-gated (sandbox lane), independent of transport.

## Terms

- **Customer gateway instance**: one long-running `openclaw gateway` process for one customer environment.
- **Gateway WS control plane**: WebSocket endpoint (default `127.0.0.1:18789`).
- **Direct transport**: reachable Gateway WS endpoint over LAN, tailnet, or private network.
- **SSH transport**: loopback forwarding over SSH when direct routing is unavailable.

Protocol references:

- [Gateway protocol](/gateway/protocol)
- [Remote access](/gateway/remote)

## Discovery inputs

### 1) Provisioned endpoint record (preferred)

For production B2B deployments, store the customer endpoint in deployment metadata (hostname, port, auth mode, certificate details). Clients should use this as the primary source of truth.

### 2) Bonjour / mDNS (LAN convenience)

Bonjour can be used for same-network discovery in controlled environments.

- Service type: `_openclaw-gw._tcp`
- Keep TXT data non-secret and descriptive only.
- Treat mDNS as convenience, not authoritative identity.

For setup details, see [Bonjour](/gateway/bonjour).

### 3) Manual SSH target (universal fallback)

When direct routing is blocked, use SSH forwarding to reach loopback safely.

- Requires only SSH reachability.
- Avoids exposing additional public listener surfaces.
- Works across disconnected network segments.

## Transport selection policy

Recommended client order:

1. Use configured customer direct endpoint when reachable.
2. If unavailable, use approved tailnet/private endpoint.
3. If still unavailable, fall back to SSH forwarding.

Do not auto-switch between customer instances; endpoint selection should remain explicit.

## Pairing and auth

The gateway instance remains the source of truth for admission control:

- Token or key-based auth enforcement.
- Scope checks and ACL checks.
- Rate limits and policy checks.

See [Gateway pairing](/gateway/pairing) and [Security](/gateway/security).

## Responsibilities by component

- **Gateway instance**: advertises transport metadata, enforces auth, owns pairing decisions.
- **Operator clients**: select and persist the intended customer endpoint.
- **Integration connectors**: deliver events only to their assigned customer instance.

Discovery chooses where traffic goes. Policy decides what that traffic is allowed to do.
