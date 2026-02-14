import type { OpenClawConfig } from "../../config/types.js";
import type { ChannelDirectoryEntry } from "./types.js";
import { resolveSlackAccount } from "../../slack/accounts.js";
import { normalizeSlackMessagingTarget } from "./normalize/slack.js";

export type DirectoryConfigParams = {
  cfg: OpenClawConfig;
  accountId?: string | null;
  query?: string | null;
  limit?: number | null;
};

export async function listSlackDirectoryPeersFromConfig(
  params: DirectoryConfigParams,
): Promise<ChannelDirectoryEntry[]> {
  const account = resolveSlackAccount({ cfg: params.cfg, accountId: params.accountId });
  const q = params.query?.trim().toLowerCase() || "";
  const ids = new Set<string>();

  for (const entry of account.dm?.allowFrom ?? []) {
    const raw = String(entry).trim();
    if (!raw || raw === "*") {
      continue;
    }
    ids.add(raw);
  }
  for (const id of Object.keys(account.config.dms ?? {})) {
    const trimmed = id.trim();
    if (trimmed) {
      ids.add(trimmed);
    }
  }
  for (const channel of Object.values(account.config.channels ?? {})) {
    for (const user of channel.users ?? []) {
      const raw = String(user).trim();
      if (raw) {
        ids.add(raw);
      }
    }
  }

  return Array.from(ids)
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((raw) => {
      const mention = raw.match(/^<@([A-Z0-9]+)>$/i);
      const normalizedUserId = (mention?.[1] ?? raw).replace(/^(slack|user):/i, "").trim();
      if (!normalizedUserId) {
        return null;
      }
      const target = `user:${normalizedUserId}`;
      return normalizeSlackMessagingTarget(target) ?? target.toLowerCase();
    })
    .filter((id): id is string => Boolean(id))
    .filter((id) => id.startsWith("user:"))
    .filter((id) => (q ? id.toLowerCase().includes(q) : true))
    .slice(0, params.limit && params.limit > 0 ? params.limit : undefined)
    .map((id) => ({ kind: "user", id }) as const);
}

export async function listSlackDirectoryGroupsFromConfig(
  params: DirectoryConfigParams,
): Promise<ChannelDirectoryEntry[]> {
  const account = resolveSlackAccount({ cfg: params.cfg, accountId: params.accountId });
  const q = params.query?.trim().toLowerCase() || "";
  return Object.keys(account.config.channels ?? {})
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((raw) => normalizeSlackMessagingTarget(raw) ?? raw.toLowerCase())
    .filter((id) => id.startsWith("channel:"))
    .filter((id) => (q ? id.toLowerCase().includes(q) : true))
    .slice(0, params.limit && params.limit > 0 ? params.limit : undefined)
    .map((id) => ({ kind: "group", id }) as const);
}
