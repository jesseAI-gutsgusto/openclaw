import { describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../../../config/config.js";
import { telegramMessageActions } from "./telegram.js";

describe("telegramMessageActions", () => {
  it("is disabled after core adapter removal", () => {
    const cfg = { channels: { telegram: { botToken: "tok" } } } as OpenClawConfig;
    expect(telegramMessageActions.listActions({ cfg })).toEqual([]);
    expect(telegramMessageActions.supportsAction?.({ action: "send" })).toBe(false);
    expect(
      telegramMessageActions.extractToolSend?.({ args: { action: "sendMessage", to: "123" } }),
    ).toBe(null);
  });

  it("throws a clear error when invoked", async () => {
    await expect(
      telegramMessageActions.handleAction({
        action: "send",
        params: { to: "123", message: "hello" },
        cfg: {} as OpenClawConfig,
        accountId: undefined,
      }),
    ).rejects.toThrow(/removed from core/i);
  });
});
