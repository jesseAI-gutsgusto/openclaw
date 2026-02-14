import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RuntimeEnv } from "../runtime.js";
import { msteamsPlugin } from "../../extensions/msteams/src/channel.js";
import { slackPlugin } from "../../extensions/slack/src/channel.js";
import { setActivePluginRegistry } from "../plugins/runtime.js";
import { createTestRegistry } from "../test-utils/channel-plugins.js";

const configMocks = vi.hoisted(() => ({
  readConfigFileSnapshot: vi.fn(),
  writeConfigFile: vi.fn().mockResolvedValue(undefined),
}));

const authMocks = vi.hoisted(() => ({
  loadAuthProfileStore: vi.fn(),
}));

vi.mock("../config/config.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../config/config.js")>();
  return {
    ...actual,
    readConfigFileSnapshot: configMocks.readConfigFileSnapshot,
    writeConfigFile: configMocks.writeConfigFile,
  };
});

vi.mock("../agents/auth-profiles.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../agents/auth-profiles.js")>();
  return {
    ...actual,
    loadAuthProfileStore: authMocks.loadAuthProfileStore,
  };
});

import {
  channelsAddCommand,
  channelsListCommand,
  channelsRemoveCommand,
  formatGatewayChannelsStatusLines,
} from "./channels.js";

const runtime: RuntimeEnv = {
  log: vi.fn(),
  error: vi.fn(),
  exit: vi.fn(),
};

const baseSnapshot = {
  path: "/tmp/openclaw.json",
  exists: true,
  raw: "{}",
  parsed: {},
  valid: true,
  config: {},
  issues: [],
  legacyIssues: [],
};

describe("channels command", () => {
  beforeEach(() => {
    configMocks.readConfigFileSnapshot.mockReset();
    configMocks.writeConfigFile.mockClear();
    authMocks.loadAuthProfileStore.mockReset();
    runtime.log.mockClear();
    runtime.error.mockClear();
    runtime.exit.mockClear();
    authMocks.loadAuthProfileStore.mockReturnValue({
      version: 1,
      profiles: {},
    });
    setActivePluginRegistry(
      createTestRegistry([
        { pluginId: "slack", plugin: slackPlugin, source: "test" },
        { pluginId: "msteams", plugin: msteamsPlugin, source: "test" },
      ]),
    );
  });

  it("adds a default slack account with tokens", async () => {
    configMocks.readConfigFileSnapshot.mockResolvedValue({ ...baseSnapshot });
    await channelsAddCommand(
      {
        channel: "slack",
        account: "default",
        botToken: "xoxb-1",
        appToken: "xapp-1",
      },
      runtime,
      { hasFlags: true },
    );

    expect(configMocks.writeConfigFile).toHaveBeenCalledTimes(1);
    const next = configMocks.writeConfigFile.mock.calls[0]?.[0] as {
      channels?: {
        slack?: { enabled?: boolean; botToken?: string; appToken?: string };
      };
    };
    expect(next.channels?.slack?.enabled).toBe(true);
    expect(next.channels?.slack?.botToken).toBe("xoxb-1");
    expect(next.channels?.slack?.appToken).toBe("xapp-1");
  });

  it("adds msteams config", async () => {
    configMocks.readConfigFileSnapshot.mockResolvedValue({ ...baseSnapshot });
    await channelsAddCommand(
      {
        channel: "msteams",
      },
      runtime,
      { hasFlags: true },
    );

    const next = configMocks.writeConfigFile.mock.calls[0]?.[0] as {
      channels?: {
        msteams?: { enabled?: boolean };
      };
    };
    expect(next.channels?.msteams?.enabled).toBe(true);
  });

  it("disables a default slack account when remove has no delete flag", async () => {
    configMocks.readConfigFileSnapshot.mockResolvedValue({
      ...baseSnapshot,
      config: {
        channels: { slack: { botToken: "xoxb-1", appToken: "xapp-1", enabled: true } },
      },
    });

    const prompt = { confirm: vi.fn().mockResolvedValue(true) };
    const prompterModule = await import("../wizard/clack-prompter.js");
    const promptSpy = vi
      .spyOn(prompterModule, "createClackPrompter")
      .mockReturnValue(prompt as never);

    await channelsRemoveCommand({ channel: "slack", account: "default" }, runtime, {
      hasFlags: true,
    });

    const next = configMocks.writeConfigFile.mock.calls[0]?.[0] as {
      channels?: { slack?: { enabled?: boolean } };
    };
    expect(next.channels?.slack?.enabled).toBe(false);
    promptSpy.mockRestore();
  });

  it("includes external auth profiles in JSON output", async () => {
    configMocks.readConfigFileSnapshot.mockResolvedValue({
      ...baseSnapshot,
      config: {},
    });
    authMocks.loadAuthProfileStore.mockReturnValue({
      version: 1,
      profiles: {
        "anthropic:default": {
          type: "oauth",
          provider: "anthropic",
          access: "token",
          refresh: "refresh",
          expires: 0,
          created: 0,
        },
        "openai-codex:default": {
          type: "oauth",
          provider: "openai",
          access: "token",
          refresh: "refresh",
          expires: 0,
          created: 0,
        },
      },
    });

    await channelsListCommand({ json: true, usage: false }, runtime);
    const payload = JSON.parse(String(runtime.log.mock.calls[0]?.[0] ?? "{}")) as {
      auth?: Array<{ id: string }>;
    };
    const ids = payload.auth?.map((entry) => entry.id) ?? [];
    expect(ids).toContain("anthropic:default");
    expect(ids).toContain("openai-codex:default");
  });

  it("formats gateway channel status lines in registry order", () => {
    const lines = formatGatewayChannelsStatusLines({
      channelAccounts: {
        slack: [{ accountId: "default", configured: true }],
        msteams: [{ accountId: "default", configured: true }],
      },
    });

    const slackIndex = lines.findIndex((line) => line.includes("Slack default"));
    const teamsIndex = lines.findIndex((line) => line.includes("Microsoft Teams default"));
    expect(slackIndex).toBeGreaterThan(-1);
    expect(teamsIndex).toBeGreaterThan(-1);
    expect(slackIndex).toBeLessThan(teamsIndex);
  });
});
