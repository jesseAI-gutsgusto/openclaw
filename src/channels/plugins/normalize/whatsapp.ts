function normalizeWhatsAppTarget(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }
  const withoutPrefix = trimmed.replace(/^whatsapp:/i, "").trim();
  if (!withoutPrefix) {
    return undefined;
  }
  if (/@(?:g|s)\.us$/i.test(withoutPrefix)) {
    return withoutPrefix.toLowerCase();
  }
  const digits = withoutPrefix.replace(/\D/g, "");
  if (digits.length < 3) {
    return undefined;
  }
  return `+${digits}`;
}

export function normalizeWhatsAppMessagingTarget(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }
  return normalizeWhatsAppTarget(trimmed) ?? undefined;
}

export function looksLikeWhatsAppTargetId(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) {
    return false;
  }
  if (/^whatsapp:/i.test(trimmed)) {
    return true;
  }
  if (trimmed.includes("@")) {
    return true;
  }
  return /^\+?\d{3,}$/.test(trimmed);
}
