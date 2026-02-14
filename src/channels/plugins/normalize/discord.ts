export function normalizeDiscordMessagingTarget(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }

  if (/^<@!?\d+>$/.test(trimmed)) {
    const userId = trimmed.replace(/[<@!>]/g, "");
    return `user:${userId}`;
  }
  if (/^<#\d+>$/.test(trimmed)) {
    const channelId = trimmed.replace(/[<#>]/g, "");
    return `channel:${channelId}`;
  }

  const normalized = trimmed.replace(/^discord:/i, "");
  if (/^(user|channel):/i.test(normalized)) {
    const [kind, idRaw = ""] = normalized.split(":", 2);
    const id = idRaw.trim();
    if (!id) {
      return undefined;
    }
    return `${kind.toLowerCase()}:${id}`;
  }

  if (/^\d+$/.test(normalized)) {
    return `channel:${normalized}`;
  }

  return undefined;
}

export function looksLikeDiscordTargetId(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) {
    return false;
  }
  if (/^<@!?\d+>$/.test(trimmed)) {
    return true;
  }
  if (/^(user|channel|discord):/i.test(trimmed)) {
    return true;
  }
  if (/^\d{6,}$/.test(trimmed)) {
    return true;
  }
  return false;
}
