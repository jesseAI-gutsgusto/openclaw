import { describe, expect, it } from "vitest";
import {
  formatChannelSelectionLine,
  listChatChannels,
  normalizeChatChannelId,
} from "./registry.js";

describe("channel registry", () => {
  it("normalizes aliases", () => {
    expect(normalizeChatChannelId("teams")).toBe("msteams");
    expect(normalizeChatChannelId("ms-teams")).toBe("msteams");
    expect(normalizeChatChannelId("microsoft-teams")).toBe("msteams");
    expect(normalizeChatChannelId("web")).toBeNull();
  });

  it("keeps Slack first in the default order", () => {
    const channels = listChatChannels();
    expect(channels[0]?.id).toBe("slack");
  });

  it("includes MS Teams by default", () => {
    const channels = listChatChannels();
    expect(channels.some((channel) => channel.id === "msteams")).toBe(true);
  });

  it("formats selection lines with docs labels", () => {
    const channels = listChatChannels();
    const first = channels[0];
    if (!first) {
      throw new Error("Missing channel metadata.");
    }
    const line = formatChannelSelectionLine(first, (path, label) =>
      [label, path].filter(Boolean).join(":"),
    );
    expect(line).toContain("Docs:");
    expect(line).toContain("slack:/channels/slack");
  });
});
