import type { AgentToolResult } from "@mariozechner/pi-agent-core";
import type { OpenClawConfig } from "../../config/config.js";
import { readStringParam } from "./common.js";

const LEGACY_TELEGRAM_REMOVED_ERROR =
  "Telegram actions were removed from core. Install a Telegram channel plugin to re-enable them.";

type TelegramButton = {
  text: string;
  callback_data: string;
};

export function readTelegramButtons(
  params: Record<string, unknown>,
): TelegramButton[][] | undefined {
  const raw = params.buttons;
  if (raw == null) {
    return undefined;
  }
  if (!Array.isArray(raw)) {
    throw new Error("buttons must be an array of button rows");
  }
  const rows = raw.map((row, rowIndex) => {
    if (!Array.isArray(row)) {
      throw new Error(`buttons[${rowIndex}] must be an array`);
    }
    return row.map((button, buttonIndex) => {
      if (!button || typeof button !== "object") {
        throw new Error(`buttons[${rowIndex}][${buttonIndex}] must be an object`);
      }
      const text =
        typeof (button as { text?: unknown }).text === "string"
          ? (button as { text: string }).text.trim()
          : "";
      const callbackData =
        typeof (button as { callback_data?: unknown }).callback_data === "string"
          ? (button as { callback_data: string }).callback_data.trim()
          : "";
      if (!text || !callbackData) {
        throw new Error(`buttons[${rowIndex}][${buttonIndex}] requires text and callback_data`);
      }
      if (callbackData.length > 64) {
        throw new Error(
          `buttons[${rowIndex}][${buttonIndex}] callback_data too long (max 64 chars)`,
        );
      }
      return { text, callback_data: callbackData };
    });
  });
  const filtered = rows.filter((row) => row.length > 0);
  return filtered.length > 0 ? filtered : undefined;
}

export async function handleTelegramAction(
  params: Record<string, unknown>,
  _cfg: OpenClawConfig,
): Promise<AgentToolResult<unknown>> {
  const action = readStringParam(params, "action", { required: true });
  throw new Error(`${LEGACY_TELEGRAM_REMOVED_ERROR} (action: ${action})`);
}
