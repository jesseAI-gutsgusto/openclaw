import type { AgentToolResult } from "@mariozechner/pi-agent-core";
import type { OpenClawConfig } from "../../config/config.js";
import { readStringParam } from "./common.js";

const LEGACY_WHATSAPP_REMOVED_ERROR =
  "WhatsApp actions were removed from core. Install a WhatsApp channel plugin to re-enable them.";

export async function handleWhatsAppAction(
  params: Record<string, unknown>,
  _cfg: OpenClawConfig,
): Promise<AgentToolResult<unknown>> {
  const action = readStringParam(params, "action", { required: true });
  throw new Error(`${LEGACY_WHATSAPP_REMOVED_ERROR} (action: ${action})`);
}
