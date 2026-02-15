import type { AgentToolResult } from "@mariozechner/pi-agent-core";
import type { DiscordActionConfig } from "../../config/config.js";
import type { ActionGate } from "./common.js";

const LEGACY_DISCORD_REMOVED_ERROR =
  "Discord actions were removed from core. Install a Discord channel plugin to re-enable them.";

export async function handleDiscordGuildAction(
  action: string,
  _params: Record<string, unknown>,
  _isActionEnabled: ActionGate<DiscordActionConfig>,
): Promise<AgentToolResult<unknown>> {
  throw new Error(`${LEGACY_DISCORD_REMOVED_ERROR} (action: ${action})`);
}
