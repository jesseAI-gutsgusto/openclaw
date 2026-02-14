import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ChannelPlugin } from "./types.js";
import { setActivePluginRegistry } from "../../plugins/runtime.js";
import { createTestRegistry } from "../../test-utils/channel-plugins.js";
import { listChannelDocks } from "../dock.js";

const emptyRegistry = createTestRegistry([]);

const msteamsPlugin: ChannelPlugin = {
  id: "msteams",
  meta: {
    id: "msteams",
    label: "Microsoft Teams",
    selectionLabel: "Microsoft Teams (Bot Framework)",
    docsPath: "/channels/msteams",
    blurb: "test",
  },
  capabilities: { chatTypes: ["direct", "group", "thread"] },
  config: {
    listAccountIds: () => [],
    resolveAccount: () => ({}),
  },
};

describe("listChannelDocks regression", () => {
  beforeEach(() => {
    setActivePluginRegistry(emptyRegistry);
  });

  afterEach(() => {
    setActivePluginRegistry(emptyRegistry);
  });

  it("skips undefined core docks and keeps plugin dock entries", () => {
    setActivePluginRegistry(
      createTestRegistry([{ pluginId: "msteams", source: "test", plugin: msteamsPlugin }]),
    );
    const docks = listChannelDocks();
    expect(docks.every(Boolean)).toBe(true);
    expect(docks.map((dock) => dock.id)).toContain("slack");
    expect(docks.map((dock) => dock.id)).toContain("msteams");
  });
});
