import type { ChannelOutboundAdapter } from "../types.js";

const LEGACY_DISCORD_REMOVED_ERROR =
  "Discord adapter was removed from core. Use a channel plugin that provides its own outbound adapter.";

export const discordOutbound: ChannelOutboundAdapter = {
  deliveryMode: "direct",
  chunker: null,
  textChunkLimit: 2000,
  sendText: async ({ to, text, accountId, deps, replyToId, silent }) => {
    const send = deps?.sendDiscord;
    if (!send) {
      throw new Error(LEGACY_DISCORD_REMOVED_ERROR);
    }
    const result = await send(to, text, {
      verbose: false,
      replyTo: replyToId ?? undefined,
      accountId: accountId ?? undefined,
      silent: silent ?? undefined,
    });
    return { channel: "discord", ...result };
  },
  sendMedia: async ({ to, text, mediaUrl, accountId, deps, replyToId, silent }) => {
    const send = deps?.sendDiscord;
    if (!send) {
      throw new Error(LEGACY_DISCORD_REMOVED_ERROR);
    }
    const result = await send(to, text, {
      verbose: false,
      mediaUrl,
      replyTo: replyToId ?? undefined,
      accountId: accountId ?? undefined,
      silent: silent ?? undefined,
    });
    return { channel: "discord", ...result };
  },
  sendPoll: async () => {
    throw new Error(LEGACY_DISCORD_REMOVED_ERROR);
  },
};
