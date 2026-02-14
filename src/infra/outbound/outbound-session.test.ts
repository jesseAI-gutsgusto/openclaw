import { describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../../config/config.js";
import { resolveOutboundSessionRoute } from "./outbound-session.js";

const baseConfig = {} as OpenClawConfig;

describe("resolveOutboundSessionRoute", () => {
  it("builds Slack thread session keys", async () => {
    const route = await resolveOutboundSessionRoute({
      cfg: baseConfig,
      channel: "slack",
      agentId: "main",
      target: "channel:C123",
      replyToId: "456",
    });

    expect(route?.sessionKey).toBe("agent:main:slack:channel:c123:thread:456");
    expect(route?.from).toBe("slack:channel:C123");
    expect(route?.to).toBe("channel:C123");
    expect(route?.threadId).toBe("456");
  });

  it("uses group session keys for Slack mpim allowlist entries", async () => {
    const cfg = {
      channels: {
        slack: {
          dm: {
            groupChannels: ["G123"],
          },
        },
      },
    } as OpenClawConfig;

    const route = await resolveOutboundSessionRoute({
      cfg,
      channel: "slack",
      agentId: "main",
      target: "channel:G123",
    });

    expect(route?.sessionKey).toBe("agent:main:slack:group:g123");
    expect(route?.from).toBe("slack:group:G123");
  });

  it("builds MSTeams channel session keys", async () => {
    const route = await resolveOutboundSessionRoute({
      cfg: baseConfig,
      channel: "msteams",
      agentId: "main",
      target: "msteams:channel:19:abc@thread.tacv2",
    });

    expect(route?.sessionKey).toBe("agent:main:msteams:channel:19:abc@thread.tacv2");
    expect(route?.from).toBe("msteams:channel:19:abc@thread.tacv2");
    expect(route?.to).toBe("conversation:19:abc@thread.tacv2");
  });

  it("falls back to generic routing for Telegram targets", async () => {
    const route = await resolveOutboundSessionRoute({
      cfg: baseConfig,
      channel: "telegram",
      agentId: "main",
      target: "telegram:group:-100123456:topic:42",
      resolvedTarget: {
        to: "group:-100123456:topic:42",
        kind: "group",
        source: "normalized",
      },
    });

    expect(route?.sessionKey).toBe("agent:main:telegram:group:-100123456:topic:42");
    expect(route?.from).toBe("telegram:group:-100123456:topic:42");
    expect(route?.to).toBe("channel:-100123456:topic:42");
  });

  it("honors dmScope identity links through fallback routing", async () => {
    const cfg = {
      session: {
        dmScope: "per-peer",
        identityLinks: {
          alice: ["discord:123"],
        },
      },
    } as OpenClawConfig;

    const route = await resolveOutboundSessionRoute({
      cfg,
      channel: "discord",
      agentId: "main",
      target: "user:123",
    });

    expect(route?.sessionKey).toBe("agent:main:direct:alice");
  });
});
