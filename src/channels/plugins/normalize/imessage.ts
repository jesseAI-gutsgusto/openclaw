// Service prefixes that indicate explicit delivery method; must be preserved during normalization
const SERVICE_PREFIXES = ["imessage:", "sms:", "auto:"] as const;
const CHAT_TARGET_PREFIX_RE =
  /^(chat_id:|chatid:|chat:|chat_guid:|chatguid:|guid:|chat_identifier:|chatidentifier:|chatident:)/i;

function normalizeIMessageHandle(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }

  const chatMatch = CHAT_TARGET_PREFIX_RE.exec(trimmed);
  if (chatMatch) {
    const value = trimmed.slice(chatMatch[0].length).trim();
    if (!value) {
      return undefined;
    }
    const key = chatMatch[0].toLowerCase();
    if (key === "chat_id:" || key === "chatid:" || key === "chat:") {
      return `chat_id:${value}`;
    }
    if (key === "chat_guid:" || key === "chatguid:" || key === "guid:") {
      return `chat_guid:${value}`;
    }
    return `chat_identifier:${value}`;
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

export function normalizeIMessageMessagingTarget(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }

  // Preserve service prefix if present (e.g., "sms:+1555" → "sms:+15551234567")
  const lower = trimmed.toLowerCase();
  for (const prefix of SERVICE_PREFIXES) {
    if (lower.startsWith(prefix)) {
      const remainder = trimmed.slice(prefix.length).trim();
      const normalizedHandle = normalizeIMessageHandle(remainder);
      if (!normalizedHandle) {
        return undefined;
      }
      if (CHAT_TARGET_PREFIX_RE.test(normalizedHandle)) {
        return normalizedHandle;
      }
      return `${prefix}${normalizedHandle}`;
    }
  }

  const normalized = normalizeIMessageHandle(trimmed);
  return normalized || undefined;
}

export function looksLikeIMessageTargetId(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) {
    return false;
  }
  if (/^(imessage:|sms:|auto:)/i.test(trimmed)) {
    return true;
  }
  if (CHAT_TARGET_PREFIX_RE.test(trimmed)) {
    return true;
  }
  if (trimmed.includes("@")) {
    return true;
  }
  return /^\+?\d{3,}$/.test(trimmed);
}
