import type {
  ChannelCapabilities,
  ChannelId,
  ChannelOutboundAdapter,
  ChannelPlugin,
} from "../channels/plugins/types.js";
import type { PluginRegistry } from "../plugins/registry.js";

export const createTestRegistry = (channels: PluginRegistry["channels"] = []): PluginRegistry => ({
  plugins: [],
  tools: [],
  hooks: [],
  typedHooks: [],
  channels,
  providers: [],
  gatewayHandlers: {},
  httpHandlers: [],
  httpRoutes: [],
  cliRegistrars: [],
  services: [],
  commands: [],
  diagnostics: [],
});

const IMESSAGE_CHAT_PREFIX =
  /^(chat_id:|chatid:|chat:|chat_guid:|chatguid:|guid:|chat_identifier:|chatidentifier:|chatident:)/i;

function normalizeIMessageTestTarget(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }

  const normalizeWithPrefix = (prefix: "imessage:" | "sms:" | "auto:") => {
    const remainder = trimmed.slice(prefix.length).trim();
    const normalized = normalizeIMessageTestTarget(remainder);
    if (!normalized) {
      return undefined;
    }
    if (IMESSAGE_CHAT_PREFIX.test(normalized)) {
      return normalized;
    }
    return `${prefix}${normalized}`;
  };

  const lower = trimmed.toLowerCase();
  if (lower.startsWith("imessage:")) {
    return normalizeWithPrefix("imessage:");
  }
  if (lower.startsWith("sms:")) {
    return normalizeWithPrefix("sms:");
  }
  if (lower.startsWith("auto:")) {
    return normalizeWithPrefix("auto:");
  }

  const chatMatch = IMESSAGE_CHAT_PREFIX.exec(trimmed);
  if (chatMatch) {
    const value = trimmed.slice(chatMatch[0].length).trim();
    if (!value) {
      return undefined;
    }
    const rawKey = chatMatch[0].toLowerCase();
    const key =
      rawKey === "chat_id:" || rawKey === "chatid:" || rawKey === "chat:"
        ? "chat_id:"
        : rawKey === "chat_guid:" || rawKey === "chatguid:" || rawKey === "guid:"
          ? "chat_guid:"
          : "chat_identifier:";
    return `${key}${value}`;
  }

  if (trimmed.includes("@")) {
    return trimmed.toLowerCase();
  }

  if (/^\+?[\d\s().-]+$/.test(trimmed)) {
    const digits = trimmed.replace(/\D/g, "");
    if (digits.length < 3) {
      return undefined;
    }
    return `+${digits}`;
  }

  return trimmed.toLowerCase();
}

const imessageTestOutbound: ChannelOutboundAdapter = {
  deliveryMode: "direct",
  textChunkLimit: 4000,
  sendText: async ({ to, text, deps, accountId }) => {
    const send = deps?.sendIMessage;
    if (!send) {
      return { channel: "imessage", messageId: "imessage-test-message", chatId: to };
    }
    const result = await send(to, text, {
      accountId: accountId ?? undefined,
    });
    return { channel: "imessage", ...result };
  },
  sendMedia: async ({ to, text, mediaUrl, deps, accountId }) => {
    const send = deps?.sendIMessage;
    if (!send) {
      return { channel: "imessage", messageId: "imessage-test-message", chatId: to };
    }
    const result = await send(to, text, {
      mediaUrl,
      accountId: accountId ?? undefined,
    });
    return { channel: "imessage", ...result };
  },
};

export const createIMessageTestPlugin = (params?: {
  outbound?: ChannelOutboundAdapter;
}): ChannelPlugin => ({
  id: "imessage",
  meta: {
    id: "imessage",
    label: "iMessage",
    selectionLabel: "iMessage (imsg)",
    docsPath: "/channels/imessage",
    blurb: "iMessage test stub.",
    aliases: ["imsg"],
  },
  capabilities: { chatTypes: ["direct", "group"], media: true },
  config: {
    listAccountIds: () => [],
    resolveAccount: () => ({}),
  },
  status: {
    collectStatusIssues: (accounts) =>
      accounts.flatMap((account) => {
        const lastError = typeof account.lastError === "string" ? account.lastError.trim() : "";
        if (!lastError) {
          return [];
        }
        return [
          {
            channel: "imessage",
            accountId: account.accountId,
            kind: "runtime",
            message: `Channel error: ${lastError}`,
          },
        ];
      }),
  },
  outbound: params?.outbound ?? imessageTestOutbound,
  messaging: {
    targetResolver: {
      looksLikeId: (raw) => {
        const trimmed = raw.trim();
        if (!trimmed) {
          return false;
        }
        if (/^(imessage:|sms:|auto:|chat_id:|chat_guid:|chat_identifier:)/i.test(trimmed)) {
          return true;
        }
        if (trimmed.includes("@")) {
          return true;
        }
        return /^\+?\d{3,}$/.test(trimmed);
      },
      hint: "<handle|chat_id:ID>",
    },
    normalizeTarget: (raw) => normalizeIMessageTestTarget(raw),
  },
});

export const createOutboundTestPlugin = (params: {
  id: ChannelId;
  outbound: ChannelOutboundAdapter;
  label?: string;
  docsPath?: string;
  capabilities?: ChannelCapabilities;
}): ChannelPlugin => ({
  id: params.id,
  meta: {
    id: params.id,
    label: params.label ?? String(params.id),
    selectionLabel: params.label ?? String(params.id),
    docsPath: params.docsPath ?? `/channels/${params.id}`,
    blurb: "test stub.",
  },
  capabilities: params.capabilities ?? { chatTypes: ["direct"] },
  config: {
    listAccountIds: () => [],
    resolveAccount: () => ({}),
  },
  outbound: params.outbound,
});
