import { describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../../../config/config.js";
import { discordMessageActions } from "./discord.js";

describe("discordMessageActions", () => {
  it("is disabled after core adapter removal", () => {
    const cfg = { channels: { discord: { token: "d0" } } } as OpenClawConfig;
    expect(discordMessageActions.listActions({ cfg })).toEqual([]);
    expect(discordMessageActions.supportsAction?.({ action: "send" })).toBe(false);
    expect(
      discordMessageActions.extractToolSend?.({ args: { action: "sendMessage", to: "x" } }),
    ).toBe(null);
  });

  it("throws a clear error when invoked", async () => {
    await expect(
      discordMessageActions.handleAction({
        action: "send",
        params: { to: "channel:123", message: "hi" },
        cfg: {} as OpenClawConfig,
        accountId: undefined,
      }),
    ).rejects.toThrow(/removed from core/i);
  });
});
