import type { ChannelMessageActionAdapter } from "../types.js";

const LEGACY_TELEGRAM_REMOVED_ERROR =
  "Telegram actions were removed from core. Install a Telegram channel plugin to re-enable them.";

export const telegramMessageActions: ChannelMessageActionAdapter = {
  listActions: () => [],
  supportsAction: () => false,
  extractToolSend: () => null,
  handleAction: async () => {
    throw new Error(LEGACY_TELEGRAM_REMOVED_ERROR);
  },
};
