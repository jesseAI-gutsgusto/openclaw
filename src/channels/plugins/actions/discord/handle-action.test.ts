import { describe, expect, it } from "vitest";
import { handleDiscordMessageAction } from "./handle-action.js";

describe("handleDiscordMessageAction", () => {
  it("throws after core Discord removal", async () => {
    await expect(
      handleDiscordMessageAction({
        action: "thread-create",
        params: {
          to: "channel:123456789",
          threadName: "Forum thread",
          message: "Initial forum post body",
        },
        cfg: {},
      }),
    ).rejects.toThrow(/removed from core/i);
  });
});
