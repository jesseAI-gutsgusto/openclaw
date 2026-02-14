import type { OpenClawConfig } from "../../../config/config.js";
import type { ChannelOnboardingAdapter } from "../onboarding-types.js";

const channel = "telegram" as const;
const LEGACY_TELEGRAM_REMOVED_ERROR =
  "Telegram onboarding was removed from core. Install a Telegram channel plugin to configure this channel.";

export const telegramOnboardingAdapter: ChannelOnboardingAdapter = {
  channel,
  getStatus: async () => ({
    channel,
    configured: false,
    statusLines: ["Telegram: managed by external plugin"],
    selectionHint: "plugin required",
    quickstartScore: 0,
  }),
  configure: async () => {
    throw new Error(LEGACY_TELEGRAM_REMOVED_ERROR);
  },
  disable: (cfg: OpenClawConfig) => ({
    ...cfg,
    channels: {
      ...cfg.channels,
      telegram: { ...cfg.channels?.telegram, enabled: false },
    },
  }),
};
