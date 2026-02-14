import type { OpenClawConfig } from "../../../config/config.js";
import type { ChannelOnboardingAdapter } from "../onboarding-types.js";
import { normalizeE164 } from "../../../utils.js";

const channel = "signal" as const;
const MIN_E164_DIGITS = 5;
const MAX_E164_DIGITS = 15;
const DIGITS_ONLY = /^\d+$/;
const LEGACY_SIGNAL_REMOVED_ERROR =
  "Signal onboarding was removed from core. Install a Signal channel plugin to configure this channel.";

export function normalizeSignalAccountInput(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  const normalized = normalizeE164(trimmed);
  const digits = normalized.slice(1);
  if (!DIGITS_ONLY.test(digits)) {
    return null;
  }
  if (digits.length < MIN_E164_DIGITS || digits.length > MAX_E164_DIGITS) {
    return null;
  }
  return `+${digits}`;
}

export const signalOnboardingAdapter: ChannelOnboardingAdapter = {
  channel,
  getStatus: async () => ({
    channel,
    configured: false,
    statusLines: ["Signal: managed by external plugin"],
    selectionHint: "plugin required",
    quickstartScore: 0,
  }),
  configure: async () => {
    throw new Error(LEGACY_SIGNAL_REMOVED_ERROR);
  },
  disable: (cfg: OpenClawConfig) => ({
    ...cfg,
    channels: {
      ...cfg.channels,
      signal: { ...cfg.channels?.signal, enabled: false },
    },
  }),
};
