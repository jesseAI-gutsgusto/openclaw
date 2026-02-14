/* eslint-disable @typescript-eslint/no-explicit-any */
import type { DmPolicy, GroupPolicy } from "./types.base.js";
import type { MSTeamsConfig } from "./types.msteams.js";
import type { SlackConfig } from "./types.slack.js";

export type ChannelHeartbeatVisibilityConfig = {
  /** Show HEARTBEAT_OK acknowledgments in chat (default: false). */
  showOk?: boolean;
  /** Show heartbeat alerts with actual content (default: true). */
  showAlerts?: boolean;
  /** Emit indicator events for UI status display (default: true). */
  useIndicator?: boolean;
};

export type ChannelDefaultsConfig = {
  groupPolicy?: GroupPolicy;
  /** Default heartbeat visibility for all channels. */
  heartbeat?: ChannelHeartbeatVisibilityConfig;
};

/**
 * Base type for extension channel config sections.
 * Extensions can use this as a starting point for their channel config.
 */
type ExtensionChannelDmConfig = {
  enabled?: boolean;
  policy?: DmPolicy;
  allowFrom?: any[];
  groupEnabled?: boolean;
  groupChannels?: any[];
  replyToMode?: "off" | "first" | "all";
  [key: string]: any;
};

type ExtensionChannelAccountConfig = {
  enabled?: boolean;
  token?: string;
  tokenFile?: string;
  botToken?: string;
  appToken?: string;
  authDir?: string;
  allowFrom?: any[];
  groupAllowFrom?: any[];
  dmPolicy?: DmPolicy;
  groupPolicy?: GroupPolicy;
  mediaMaxMb?: number;
  chunkMode?: "length" | "newline";
  historyLimit?: number;
  replyToMode?: "off" | "first" | "all";
  dm?: ExtensionChannelDmConfig;
  [key: string]: any;
};

export type ExtensionChannelConfig = ExtensionChannelAccountConfig & {
  accounts?: Record<string, ExtensionChannelAccountConfig>;
  guilds?: Record<string, any>;
  channels?: Record<string, any>;
  teams?: Record<string, any>;
  ackReaction?: {
    emoji?: string;
    direct?: boolean;
    group?: "never" | "mentions" | "always";
  };
  webhook?: {
    path?: string;
    port?: number;
    [key: string]: any;
  };
};

export type ChannelsConfig = {
  defaults?: ChannelDefaultsConfig;
  slack?: SlackConfig;
  msteams?: MSTeamsConfig;
  // Extension channels use dynamic keys - use ExtensionChannelConfig in extensions
  [key: string]: ExtensionChannelConfig | undefined;
};
