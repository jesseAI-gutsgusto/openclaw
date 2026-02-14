import type { OpenClawConfig } from "../../../config/config.js";
import type { ChannelOnboardingAdapter } from "../onboarding-types.js";

const channel = "imessage" as const;
const LEGACY_IMESSAGE_REMOVED_ERROR =
  "iMessage onboarding was removed from core. Install an iMessage channel plugin to configure this channel.";

export const imessageOnboardingAdapter: ChannelOnboardingAdapter = {
  channel,
  getStatus: async () => ({
    channel,
    configured: false,
    statusLines: ["iMessage: managed by external plugin"],
    selectionHint: "plugin required",
    quickstartScore: 0,
  }),
  configure: async () => {
    throw new Error(LEGACY_IMESSAGE_REMOVED_ERROR);
  },
  disable: (cfg: OpenClawConfig) => ({
    ...cfg,
    channels: {
      ...cfg.channels,
      imessage: { ...cfg.channels?.imessage, enabled: false },
    },
  }),
};
