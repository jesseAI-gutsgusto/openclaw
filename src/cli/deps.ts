import type { OutboundSendDeps } from "../infra/outbound/deliver.js";
import { sendMessageSlack } from "../slack/send.js";

export type CliDeps = {
  sendMessageSlack: typeof sendMessageSlack;
};

export function createDefaultDeps(): CliDeps {
  return {
    sendMessageSlack,
  };
}

// Provider docking: extend this mapping when adding new outbound send deps.
export function createOutboundSendDeps(deps: CliDeps): OutboundSendDeps {
  return {
    sendSlack: deps.sendMessageSlack,
  };
}
