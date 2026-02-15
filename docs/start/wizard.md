---
summary: "CLI onboarding wizard for B2B single-tenant customer instances"
read_when:
  - Running onboarding for a customer deployment
  - Reconfiguring integrations and sandbox policy
title: "Onboarding wizard (CLI)"
sidebarTitle: "Onboarding: CLI"
---

# Onboarding wizard (CLI)

The onboarding wizard is the recommended way to create a customer-isolated OpenClaw deployment on macOS, Linux, or Windows (WSL2).

```bash
openclaw onboard
```

In the B2B profile, the wizard sets up:

- One Gateway instance for one customer
- Curated v1 integrations (Slack, Microsoft Teams, email webhook ingress)
- Safety defaults with risky execution routed to sandbox lanes

<Info>
Need a fast smoke test before channel setup? Run `openclaw dashboard` and send a local chat in the Control UI.
</Info>

To reconfigure later:

```bash
openclaw configure
openclaw agents add <name>
```

<Note>
`--json` does not imply non-interactive mode. For scripts, use `--non-interactive`.
</Note>

## QuickStart vs advanced

The wizard starts with QuickStart (defaults) or Advanced (full control).

<Tabs>
  <Tab title="QuickStart (defaults)">
    - Local gateway (`loopback`) with token auth
    - Default workspace for this customer instance
    - Guided setup for Slack, Microsoft Teams, and webhook ingress
    - Baseline sandbox settings for non-main sessions
  </Tab>
  <Tab title="Advanced (full control)">
    - Full control over gateway bind/auth, remote mode, workspace paths, and agent routing
    - Explicit integration selection and credential prompts
    - Policy tuning before first production traffic
  </Tab>
</Tabs>

## What the wizard configures

In local mode, the wizard walks through:

1. Model and auth provider.
2. Customer workspace path and bootstrap files.
3. Gateway bind/auth settings.
4. Curated integrations: Slack, Microsoft Teams, and optional email webhook ingress.
5. Sandbox-lane policy for risky tools.
6. Health check and daemon setup.
7. Optional skill installation.

<Note>
Re-running the wizard does not wipe existing config unless you choose reset (or pass `--reset`).
</Note>

Remote mode configures the local client to connect to an existing Gateway and does not mutate the remote host.

## Add another customer instance

Use `openclaw agents add <name>` when you need another isolated instance in the same operator environment.

What it sets:

- `agents.list[].name`
- `agents.list[].workspace`
- `agents.list[].agentDir`

Use per-customer bindings to avoid cross-customer routing.

## Related docs

- B2B setup guide: [Single-tenant customer setup](/start/openclaw)
- Channel scope: [Chat channels](/channels)
- Security model: [Security](/gateway/security)
- Wizard command reference: [`openclaw onboard`](/cli/onboard)
