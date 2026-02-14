import { describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../../../config/config.js";
import { signalMessageActions } from "./signal.js";

describe("signalMessageActions", () => {
  it("is disabled after core adapter removal", () => {
    const cfg = { channels: { signal: { account: "+15550001111" } } } as OpenClawConfig;
    expect(signalMessageActions.listActions({ cfg })).toEqual([]);
    expect(signalMessageActions.supportsAction?.({ action: "react" })).toBe(false);
  });

  it("throws a clear error when invoked", async () => {
    await expect(
      signalMessageActions.handleAction({
        action: "react",
        params: { to: "+15550001111", messageId: "123", emoji: "✅" },
        cfg: {} as OpenClawConfig,
        accountId: undefined,
      }),
    ).rejects.toThrow(/removed from core/i);
  });
});
