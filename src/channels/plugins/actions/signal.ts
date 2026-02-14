import type { ChannelMessageActionAdapter } from "../types.js";

const LEGACY_SIGNAL_REMOVED_ERROR =
  "Signal actions were removed from core. Install a Signal channel plugin to re-enable them.";

export const signalMessageActions: ChannelMessageActionAdapter = {
  listActions: () => [],
  supportsAction: () => false,
  extractToolSend: () => null,
  handleAction: async () => {
    throw new Error(LEGACY_SIGNAL_REMOVED_ERROR);
  },
};
