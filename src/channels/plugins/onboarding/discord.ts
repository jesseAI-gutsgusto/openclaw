import type { OpenClawConfig } from "../../../config/config.js";
import type { ChannelOnboardingAdapter } from "../onboarding-types.js";

const channel = "discord" as const;
const LEGACY_DISCORD_REMOVED_ERROR =
  "Discord onboarding was removed from core. Install a Discord channel plugin to configure this channel.";

export const discordOnboardingAdapter: ChannelOnboardingAdapter = {
  channel,
  getStatus: async () => ({
    channel,
    configured: false,
    statusLines: ["Discord: managed by external plugin"],
    selectionHint: "plugin required",
    quickstartScore: 0,
  }),
  configure: async () => {
    throw new Error(LEGACY_DISCORD_REMOVED_ERROR);
  },
  disable: (cfg: OpenClawConfig) => ({
    ...cfg,
    channels: {
      ...cfg.channels,
      discord: { ...cfg.channels?.discord, enabled: false },
    },
  }),
};
