---
summary: "Pairing overview: approve who can DM your customer instance"
read_when:
  - Setting up DM access control for Slack or Microsoft Teams
  - Reviewing ingress auth and allowlist posture
title: "Pairing"
---

# Pairing

Pairing is OpenClaw's explicit owner-approval step for unknown DM senders.
In the B2B v1 baseline, pairing applies to chat channels:

- [Slack](/channels/slack)
- [Microsoft Teams](/channels/msteams)

Email/webhook ingress uses token auth, not DM pairing. See [Webhooks](/automation/webhook).

## DM pairing flow

When a channel uses DM policy `pairing`, unknown senders receive a short code and
that message is not processed until you approve the code.

Pairing codes:

- 8 characters, uppercase, no ambiguous chars (`0O1I`).
- Expire after 1 hour.
- Pending requests are rate-limited per channel.

## Approve a sender

```bash
openclaw pairing list slack
openclaw pairing approve slack <CODE>
```

Use the same commands with `msteams` for Microsoft Teams.

Supported v1 channel IDs: `slack`, `msteams`.

## Where pairing state is stored

Stored under `~/.openclaw/credentials/`:

- Pending requests: `<channel>-pairing.json`
- Approved allowlist: `<channel>-allowFrom.json`

Treat these files as sensitive because they gate inbound chat access.

## Webhook ingress auth (no pairing)

Webhook/email ingestion is authenticated with `hooks.token` and does not use pairing codes.
Use a dedicated secret and keep webhook endpoints on trusted networks.

## Related docs

- Security model: [Security](/gateway/security)
- Slack setup: [Slack](/channels/slack)
- Microsoft Teams setup: [Microsoft Teams](/channels/msteams)
- Webhook auth and routing: [Webhooks](/automation/webhook)
