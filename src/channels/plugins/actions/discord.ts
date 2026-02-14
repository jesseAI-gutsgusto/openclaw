import type { ChannelMessageActionAdapter } from "../types.js";

const LEGACY_DISCORD_REMOVED_ERROR =
  "Discord actions were removed from core. Install a Discord channel plugin to re-enable them.";

export const discordMessageActions: ChannelMessageActionAdapter = {
  listActions: () => [],
  supportsAction: () => false,
  extractToolSend: () => null,
  handleAction: async () => {
    throw new Error(LEGACY_DISCORD_REMOVED_ERROR);
  },
};
