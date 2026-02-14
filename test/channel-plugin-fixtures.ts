import type { ChannelPlugin } from "../src/channels/plugins/types.js";
import type { OpenClawConfig } from "../src/config/config.js";
import {
  looksLikeSlackTargetId,
  normalizeSlackMessagingTarget,
} from "../src/channels/plugins/normalize/slack.js";
import {
  looksLikeTelegramTargetId,
  normalizeTelegramMessagingTarget,
} from "../src/channels/plugins/normalize/telegram.js";
import {
  looksLikeWhatsAppTargetId,
  normalizeWhatsAppMessagingTarget,
} from "../src/channels/plugins/normalize/whatsapp.js";
import { slackOutbound } from "../src/channels/plugins/outbound/slack.js";
import { telegramOutbound } from "../src/channels/plugins/outbound/telegram.js";
import { whatsappOutbound } from "../src/channels/plugins/outbound/whatsapp.js";

type ChannelConfigRecord = Record<string, unknown>;

function asRecord(value: unknown): ChannelConfigRecord | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as ChannelConfigRecord;
}

function resolveChannelEntry(cfg: OpenClawConfig, channelId: string): ChannelConfigRecord {
  const channels = asRecord(cfg.channels);
  return asRecord(channels?.[channelId]) ?? {};
}

function resolveChannelAccountEntries(
  cfg: OpenClawConfig,
  channelId: string,
): Record<string, ChannelConfigRecord> {
  const accounts = asRecord(resolveChannelEntry(cfg, channelId).accounts);
  if (!accounts) {
    return {};
  }
  const result: Record<string, ChannelConfigRecord> = {};
  for (const [key, value] of Object.entries(accounts)) {
    const record = asRecord(value);
    if (record) {
      result[key] = record;
    }
  }
  return result;
}

function listChannelAccountIds(cfg: OpenClawConfig, channelId: string): string[] {
  return Object.keys(resolveChannelAccountEntries(cfg, channelId));
}

function resolveMergedAccountConfig(
  cfg: OpenClawConfig,
  channelId: string,
  accountId?: string,
): ChannelConfigRecord {
  const base = resolveChannelEntry(cfg, channelId);
  if (!accountId) {
    return base;
  }
  const account = resolveChannelAccountEntries(cfg, channelId)[accountId];
  if (!account) {
    return base;
  }
  return {
    ...base,
    ...account,
  };
}

function resolveAllowFrom(cfg: OpenClawConfig, channelId: string, accountId?: string): string[] {
  const merged = resolveMergedAccountConfig(cfg, channelId, accountId);
  const allowFrom = merged.allowFrom;
  if (!Array.isArray(allowFrom)) {
    return [];
  }
  return allowFrom.map((entry) => String(entry));
}

export function createSlackFixturePlugin(): ChannelPlugin {
  return {
    id: "slack",
    meta: {
      id: "slack",
      label: "Slack",
      selectionLabel: "Slack",
      docsPath: "/channels/slack",
      blurb: "Slack test fixture.",
    },
    capabilities: { chatTypes: ["direct", "group"] },
    config: {
      listAccountIds: (cfg) => listChannelAccountIds(cfg, "slack"),
      resolveAccount: (cfg, accountId) => {
        const config = resolveMergedAccountConfig(cfg, "slack", accountId);
        const dm = asRecord(config.dm) ?? {};
        return { config, dm };
      },
      resolveAllowFrom: ({ cfg, accountId }) => resolveAllowFrom(cfg, "slack", accountId),
    },
    outbound: slackOutbound,
    messaging: {
      normalizeTarget: normalizeSlackMessagingTarget,
      targetResolver: {
        looksLikeId: looksLikeSlackTargetId,
        hint: "<channelId|user:ID|channel:ID>",
      },
    },
    security: {
      collectWarnings: async () => [],
    },
  };
}

export function createTelegramFixturePlugin(): ChannelPlugin {
  return {
    id: "telegram",
    meta: {
      id: "telegram",
      label: "Telegram",
      selectionLabel: "Telegram",
      docsPath: "/channels/telegram",
      blurb: "Telegram test fixture.",
    },
    capabilities: { chatTypes: ["direct", "group"] },
    config: {
      listAccountIds: (cfg) => listChannelAccountIds(cfg, "telegram"),
      resolveAccount: (cfg, accountId) => ({
        config: resolveMergedAccountConfig(cfg, "telegram", accountId),
      }),
      resolveAllowFrom: ({ cfg, accountId }) => resolveAllowFrom(cfg, "telegram", accountId),
    },
    outbound: telegramOutbound,
    messaging: {
      normalizeTarget: normalizeTelegramMessagingTarget,
      targetResolver: {
        looksLikeId: looksLikeTelegramTargetId,
        hint: "<chatId|@username>",
      },
    },
    security: {
      collectWarnings: async () => [],
    },
  };
}

export function createWhatsAppFixturePlugin(): ChannelPlugin {
  return {
    id: "whatsapp",
    meta: {
      id: "whatsapp",
      label: "WhatsApp",
      selectionLabel: "WhatsApp",
      docsPath: "/channels/whatsapp",
      blurb: "WhatsApp test fixture.",
    },
    capabilities: { chatTypes: ["direct", "group"] },
    config: {
      listAccountIds: (cfg) => listChannelAccountIds(cfg, "whatsapp"),
      resolveAccount: (cfg, accountId) => ({
        config: resolveMergedAccountConfig(cfg, "whatsapp", accountId),
      }),
      resolveAllowFrom: ({ cfg, accountId }) => resolveAllowFrom(cfg, "whatsapp", accountId),
    },
    outbound: whatsappOutbound,
    messaging: {
      normalizeTarget: normalizeWhatsAppMessagingTarget,
      targetResolver: {
        looksLikeId: looksLikeWhatsAppTargetId,
        hint: "<E.164|group JID>",
      },
    },
    heartbeat: {
      checkReady: async ({ deps }) => {
        const hasAuth = (await deps?.webAuthExists?.()) ?? true;
        const listenerActive = deps?.hasActiveWebListener?.() ?? true;
        if (!hasAuth || !listenerActive) {
          return { ok: false, reason: "whatsapp-not-linked" };
        }
        return { ok: true, reason: "ready" };
      },
    },
    security: {
      collectWarnings: async () => [],
    },
  };
}

export function createDiscordSecurityFixturePlugin(): ChannelPlugin {
  return {
    id: "discord",
    meta: {
      id: "discord",
      label: "Discord",
      selectionLabel: "Discord",
      docsPath: "/channels/discord",
      blurb: "Discord security test fixture.",
    },
    capabilities: { chatTypes: ["direct", "group"] },
    config: {
      listAccountIds: (cfg) => listChannelAccountIds(cfg, "discord"),
      resolveAccount: (cfg, accountId) => {
        const config = resolveMergedAccountConfig(cfg, "discord", accountId);
        const dm = asRecord(config.dm) ?? {};
        return { config, dm };
      },
    },
    security: {
      collectWarnings: async () => [],
    },
  };
}

export function createTelegramSecurityFixturePlugin(): ChannelPlugin {
  return {
    ...createTelegramFixturePlugin(),
    security: {
      collectWarnings: async () => [],
    },
  };
}
