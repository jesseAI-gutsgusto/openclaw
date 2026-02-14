import type { AgentToolResult } from "@mariozechner/pi-agent-core";
import type { ChannelMessageActionContext } from "../../types.js";

const LEGACY_DISCORD_REMOVED_ERROR =
  "Discord actions were removed from core. Install a Discord channel plugin to re-enable them.";

export async function handleDiscordMessageAction(
  _ctx: Pick<ChannelMessageActionContext, "action" | "params" | "cfg" | "accountId">,
): Promise<AgentToolResult<unknown>> {
  throw new Error(LEGACY_DISCORD_REMOVED_ERROR);
}
