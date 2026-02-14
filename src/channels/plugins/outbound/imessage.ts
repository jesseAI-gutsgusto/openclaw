import type { ChannelOutboundAdapter } from "../types.js";
import { chunkText } from "../../../auto-reply/chunk.js";
import { resolveChannelMediaMaxBytes } from "../media-limits.js";

const LEGACY_IMESSAGE_REMOVED_ERROR =
  "iMessage adapter was removed from core. Use a channel plugin that provides its own outbound adapter.";

export const imessageOutbound: ChannelOutboundAdapter = {
  deliveryMode: "direct",
  chunker: chunkText,
  chunkerMode: "text",
  textChunkLimit: 4000,
  sendText: async ({ cfg, to, text, accountId, deps }) => {
    const send = deps?.sendIMessage;
    if (!send) {
      throw new Error(LEGACY_IMESSAGE_REMOVED_ERROR);
    }
    const maxBytes = resolveChannelMediaMaxBytes({
      cfg,
      resolveChannelLimitMb: ({ cfg, accountId }) =>
        cfg.channels?.imessage?.accounts?.[accountId]?.mediaMaxMb ??
        cfg.channels?.imessage?.mediaMaxMb,
      accountId,
    });
    const result = await send(to, text, {
      maxBytes,
      accountId: accountId ?? undefined,
    });
    return { channel: "imessage", ...result };
  },
  sendMedia: async ({ cfg, to, text, mediaUrl, accountId, deps }) => {
    const send = deps?.sendIMessage;
    if (!send) {
      throw new Error(LEGACY_IMESSAGE_REMOVED_ERROR);
    }
    const maxBytes = resolveChannelMediaMaxBytes({
      cfg,
      resolveChannelLimitMb: ({ cfg, accountId }) =>
        cfg.channels?.imessage?.accounts?.[accountId]?.mediaMaxMb ??
        cfg.channels?.imessage?.mediaMaxMb,
      accountId,
    });
    const result = await send(to, text, {
      mediaUrl,
      maxBytes,
      accountId: accountId ?? undefined,
    });
    return { channel: "imessage", ...result };
  },
};
