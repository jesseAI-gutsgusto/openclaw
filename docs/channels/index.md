---
summary: "Curated v1 integration channels for OpenClaw customer instances"
read_when:
  - Choosing integrations for a customer deployment
  - Reviewing v1 channel scope and constraints
title: "Chat channels"
---

# Chat channels

OpenClaw uses a curated channel surface in v1. Each customer instance can enable one or more of these integrations:

- [Slack](/channels/slack)
- [Microsoft Teams](/channels/msteams)
- [Email webhook ingress](/automation/webhook)

## V1 channel profile

- Single-tenant per customer instance.
- Credentials are scoped per customer and per integration.
- Routing and session state stay inside the customer instance.
- Risky tools should execute only in sandbox lanes.

## Channel notes

- Slack: best for team conversation and operational handoffs.
- Microsoft Teams: enterprise collaboration workflows with Bot Framework.
- Email webhook ingress: event-driven email intake via trusted webhook senders.

## Rollout guidance

- Start with one primary chat channel (Slack or Teams) and add email webhook ingress second.
- Validate allowlists, routing rules, and sandbox policy before production traffic.
- Expand beyond v1 channels only through curated integration reviews.

For policy defaults and hardening, see [Security](/gateway/security).
