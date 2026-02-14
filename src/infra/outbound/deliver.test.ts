import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../../config/config.js";
import { slackOutbound } from "../../channels/plugins/outbound/slack.js";
import { setActivePluginRegistry } from "../../plugins/runtime.js";
import { createOutboundTestPlugin, createTestRegistry } from "../../test-utils/channel-plugins.js";

const mocks = vi.hoisted(() => ({
  appendAssistantMessageToSessionTranscript: vi.fn(async () => ({ ok: true, sessionFile: "x" })),
}));
const hookMocks = vi.hoisted(() => ({
  runner: {
    hasHooks: vi.fn(() => false),
    runMessageSent: vi.fn(async () => {}),
  },
}));
const queueMocks = vi.hoisted(() => ({
  enqueueDelivery: vi.fn(async () => "mock-queue-id"),
  ackDelivery: vi.fn(async () => {}),
  failDelivery: vi.fn(async () => {}),
}));

vi.mock("../../config/sessions.js", async () => {
  const actual = await vi.importActual<typeof import("../../config/sessions.js")>(
    "../../config/sessions.js",
  );
  return {
    ...actual,
    appendAssistantMessageToSessionTranscript: mocks.appendAssistantMessageToSessionTranscript,
  };
});
vi.mock("../../plugins/hook-runner-global.js", () => ({
  getGlobalHookRunner: () => hookMocks.runner,
}));
vi.mock("./delivery-queue.js", () => ({
  enqueueDelivery: queueMocks.enqueueDelivery,
  ackDelivery: queueMocks.ackDelivery,
  failDelivery: queueMocks.failDelivery,
}));

const { deliverOutboundPayloads, normalizeOutboundPayloads } = await import("./deliver.js");

const msteamsPlugin = createOutboundTestPlugin({
  id: "msteams",
  outbound: {
    deliveryMode: "direct",
    chunker: null,
    sendText: async ({ to, text, deps }) => {
      const send = deps?.sendMSTeams;
      if (!send) {
        throw new Error("sendMSTeams missing");
      }
      return { channel: "msteams", ...(await send(to, text)) };
    },
    sendMedia: async ({ to, text, mediaUrl, deps }) => {
      const send = deps?.sendMSTeams;
      if (!send) {
        throw new Error("sendMSTeams missing");
      }
      return { channel: "msteams", ...(await send(to, text, { mediaUrl })) };
    },
  },
  capabilities: { chatTypes: ["direct", "group", "channel"], media: true },
});

describe("deliverOutboundPayloads", () => {
  beforeEach(() => {
    setActivePluginRegistry(defaultRegistry);
    hookMocks.runner.hasHooks.mockReset();
    hookMocks.runner.hasHooks.mockReturnValue(false);
    hookMocks.runner.runMessageSent.mockReset();
    hookMocks.runner.runMessageSent.mockResolvedValue(undefined);
    queueMocks.enqueueDelivery.mockReset();
    queueMocks.enqueueDelivery.mockResolvedValue("mock-queue-id");
    queueMocks.ackDelivery.mockReset();
    queueMocks.ackDelivery.mockResolvedValue(undefined);
    queueMocks.failDelivery.mockReset();
    queueMocks.failDelivery.mockResolvedValue(undefined);
  });

  afterEach(() => {
    setActivePluginRegistry(emptyRegistry);
  });

  it("uses Slack outbound deps for text sends", async () => {
    const sendSlack = vi.fn().mockResolvedValue({ messageId: "s1", channelId: "C123" });

    const results = await deliverOutboundPayloads({
      cfg: {},
      channel: "slack",
      to: "channel:C123",
      payloads: [{ text: "hello" }],
      deps: { sendSlack },
    });

    expect(sendSlack).toHaveBeenCalledWith(
      "channel:C123",
      "hello",
      expect.objectContaining({ accountId: undefined, threadTs: undefined }),
    );
    expect(results).toEqual([{ channel: "slack", messageId: "s1", channelId: "C123" }]);
  });

  it("passes explicit accountId to Slack outbound", async () => {
    const sendSlack = vi.fn().mockResolvedValue({ messageId: "s1", channelId: "C123" });

    await deliverOutboundPayloads({
      cfg: {},
      channel: "slack",
      to: "channel:C123",
      accountId: "ops",
      payloads: [{ text: "hello" }],
      deps: { sendSlack },
    });

    expect(sendSlack).toHaveBeenCalledWith(
      "channel:C123",
      "hello",
      expect.objectContaining({ accountId: "ops" }),
    );
  });

  it("uses MSTeams outbound deps for text and media sends", async () => {
    const sendMSTeams = vi
      .fn()
      .mockResolvedValueOnce({ messageId: "ms-1", conversationId: "conv-1" })
      .mockResolvedValueOnce({ messageId: "ms-2", conversationId: "conv-1" });

    const results = await deliverOutboundPayloads({
      cfg: {},
      channel: "msteams",
      to: "conversation:19:abc@thread.tacv2",
      payloads: [{ text: "first" }, { text: "caption", mediaUrl: "https://x.test/a.jpg" }],
      deps: { sendMSTeams },
    });

    expect(sendMSTeams).toHaveBeenNthCalledWith(1, "conversation:19:abc@thread.tacv2", "first");
    expect(sendMSTeams).toHaveBeenNthCalledWith(
      2,
      "conversation:19:abc@thread.tacv2",
      "caption",
      expect.objectContaining({ mediaUrl: "https://x.test/a.jpg" }),
    );
    expect(results.map((result) => result.messageId)).toEqual(["ms-1", "ms-2"]);
  });

  it("preserves fenced blocks for markdown chunkers in newline mode", async () => {
    const chunker = vi.fn((text: string) => (text ? [text] : []));
    const sendText = vi.fn().mockImplementation(async ({ text }: { text: string }) => ({
      channel: "matrix" as const,
      messageId: text,
      roomId: "r1",
    }));
    const sendMedia = vi.fn().mockImplementation(async ({ text }: { text: string }) => ({
      channel: "matrix" as const,
      messageId: text,
      roomId: "r1",
    }));
    setActivePluginRegistry(
      createTestRegistry([
        {
          pluginId: "matrix",
          source: "test",
          plugin: createOutboundTestPlugin({
            id: "matrix",
            outbound: {
              deliveryMode: "direct",
              chunker,
              chunkerMode: "markdown",
              textChunkLimit: 4000,
              sendText,
              sendMedia,
            },
          }),
        },
      ]),
    );

    const cfg: OpenClawConfig = {
      channels: { matrix: { textChunkLimit: 4000, chunkMode: "newline" } },
    };
    const text = "```js\nconst a = 1;\nconst b = 2;\n```\nAfter";

    await deliverOutboundPayloads({
      cfg,
      channel: "matrix",
      to: "!room",
      payloads: [{ text }],
    });

    expect(chunker).toHaveBeenCalledTimes(1);
    expect(chunker).toHaveBeenNthCalledWith(1, text, 4000);
  });

  it("normalizes payloads and drops empty entries", () => {
    const normalized = normalizeOutboundPayloads([
      { text: "hi" },
      { text: "MEDIA:https://x.test/a.jpg" },
      { text: " ", mediaUrls: [] },
    ]);
    expect(normalized).toEqual([
      { text: "hi", mediaUrls: [] },
      { text: "", mediaUrls: ["https://x.test/a.jpg"] },
    ]);
  });

  it("continues on errors when bestEffort is enabled", async () => {
    const sendSlack = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce({ messageId: "s2", channelId: "C123" });
    const onError = vi.fn();

    const results = await deliverOutboundPayloads({
      cfg: {},
      channel: "slack",
      to: "channel:C123",
      payloads: [{ text: "a" }, { text: "b" }],
      deps: { sendSlack },
      bestEffort: true,
      onError,
    });

    expect(sendSlack).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(results).toEqual([{ channel: "slack", messageId: "s2", channelId: "C123" }]);
  });

  it("calls failDelivery instead of ackDelivery on bestEffort partial failure", async () => {
    const sendSlack = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce({ messageId: "s2", channelId: "C123" });

    await deliverOutboundPayloads({
      cfg: {},
      channel: "slack",
      to: "channel:C123",
      payloads: [{ text: "a" }, { text: "b" }],
      deps: { sendSlack },
      bestEffort: true,
      onError: vi.fn(),
    });

    expect(queueMocks.ackDelivery).not.toHaveBeenCalled();
    expect(queueMocks.failDelivery).toHaveBeenCalledWith(
      "mock-queue-id",
      "partial delivery failure (bestEffort)",
    );
  });

  it("acks the queue entry when delivery is aborted", async () => {
    const sendSlack = vi.fn().mockResolvedValue({ messageId: "s1", channelId: "C123" });
    const abortController = new AbortController();
    abortController.abort();

    await expect(
      deliverOutboundPayloads({
        cfg: {},
        channel: "slack",
        to: "channel:C123",
        payloads: [{ text: "a" }],
        deps: { sendSlack },
        abortSignal: abortController.signal,
      }),
    ).rejects.toThrow("Operation aborted");

    expect(queueMocks.ackDelivery).toHaveBeenCalledWith("mock-queue-id");
    expect(queueMocks.failDelivery).not.toHaveBeenCalled();
    expect(sendSlack).not.toHaveBeenCalled();
  });

  it("passes normalized payload to onError", async () => {
    const sendSlack = vi.fn().mockRejectedValue(new Error("boom"));
    const onError = vi.fn();

    await deliverOutboundPayloads({
      cfg: {},
      channel: "slack",
      to: "channel:C123",
      payloads: [{ text: "hi", mediaUrl: "https://x.test/a.jpg" }],
      deps: { sendSlack },
      bestEffort: true,
      onError,
    });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ text: "hi", mediaUrls: ["https://x.test/a.jpg"] }),
    );
  });

  it("mirrors delivered output when mirror options are provided", async () => {
    const sendSlack = vi.fn().mockResolvedValue({ messageId: "s1", channelId: "C123" });
    mocks.appendAssistantMessageToSessionTranscript.mockClear();

    await deliverOutboundPayloads({
      cfg: {},
      channel: "slack",
      to: "channel:C123",
      payloads: [{ text: "caption", mediaUrl: "https://example.com/files/report.pdf?sig=1" }],
      deps: { sendSlack },
      mirror: {
        sessionKey: "agent:main:main",
        text: "caption",
        mediaUrls: ["https://example.com/files/report.pdf?sig=1"],
      },
    });

    expect(mocks.appendAssistantMessageToSessionTranscript).toHaveBeenCalledWith(
      expect.objectContaining({ text: "report.pdf" }),
    );
  });

  it("emits message_sent success for text-only deliveries", async () => {
    hookMocks.runner.hasHooks.mockImplementation((name: string) => name === "message_sent");
    const sendSlack = vi.fn().mockResolvedValue({ messageId: "s1", channelId: "C123" });

    await deliverOutboundPayloads({
      cfg: {},
      channel: "slack",
      to: "channel:C123",
      payloads: [{ text: "hello" }],
      deps: { sendSlack },
    });

    await vi.waitFor(() => {
      expect(hookMocks.runner.runMessageSent).toHaveBeenCalledWith(
        expect.objectContaining({ to: "channel:C123", content: "hello", success: true }),
        expect.objectContaining({ channelId: "slack" }),
      );
    });
  });

  it("emits message_sent success for sendPayload deliveries", async () => {
    hookMocks.runner.hasHooks.mockImplementation((name: string) => name === "message_sent");
    const sendPayload = vi.fn().mockResolvedValue({ channel: "matrix", messageId: "mx-1" });
    const sendText = vi.fn();
    const sendMedia = vi.fn();
    setActivePluginRegistry(
      createTestRegistry([
        {
          pluginId: "matrix",
          source: "test",
          plugin: createOutboundTestPlugin({
            id: "matrix",
            outbound: { deliveryMode: "direct", sendPayload, sendText, sendMedia },
          }),
        },
      ]),
    );

    await deliverOutboundPayloads({
      cfg: {},
      channel: "matrix",
      to: "!room:1",
      payloads: [{ text: "payload text", channelData: { mode: "custom" } }],
    });

    await vi.waitFor(() => {
      expect(hookMocks.runner.runMessageSent).toHaveBeenCalledWith(
        expect.objectContaining({ to: "!room:1", content: "payload text", success: true }),
        expect.objectContaining({ channelId: "matrix" }),
      );
    });
  });

  it("emits message_sent failure when delivery errors", async () => {
    hookMocks.runner.hasHooks.mockImplementation((name: string) => name === "message_sent");
    const sendSlack = vi.fn().mockRejectedValue(new Error("downstream failed"));

    await expect(
      deliverOutboundPayloads({
        cfg: {},
        channel: "slack",
        to: "channel:C123",
        payloads: [{ text: "hi" }],
        deps: { sendSlack },
      }),
    ).rejects.toThrow("downstream failed");

    await vi.waitFor(() => {
      expect(hookMocks.runner.runMessageSent).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "channel:C123",
          content: "hi",
          success: false,
          error: "downstream failed",
        }),
        expect.objectContaining({ channelId: "slack" }),
      );
    });
  });
});

const emptyRegistry = createTestRegistry([]);
const defaultRegistry = createTestRegistry([
  {
    pluginId: "slack",
    plugin: createOutboundTestPlugin({ id: "slack", outbound: slackOutbound }),
    source: "test",
  },
  {
    pluginId: "msteams",
    plugin: msteamsPlugin,
    source: "test",
  },
]);
