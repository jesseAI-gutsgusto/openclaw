import { describe, expect, it } from "vitest";
import { applyPluginAutoEnable } from "./plugin-auto-enable.js";

describe("applyPluginAutoEnable", () => {
  it("configures channel plugins with disabled state and updates allowlist", () => {
    const result = applyPluginAutoEnable({
      config: {
        channels: { slack: { botToken: "x" } },
        plugins: { allow: ["telegram"] },
      },
      env: {},
    });

    expect(result.config.plugins?.entries?.slack?.enabled).toBe(false);
    expect(result.config.plugins?.allow).toEqual(["telegram", "slack"]);
    expect(result.changes.join("\n")).toContain("Slack configured, not enabled yet.");
  });

  it("respects explicit disable", () => {
    const result = applyPluginAutoEnable({
      config: {
        channels: { slack: { botToken: "x" } },
        plugins: { entries: { slack: { enabled: false } } },
      },
      env: {},
    });

    expect(result.config.plugins?.entries?.slack?.enabled).toBe(false);
    expect(result.changes).toEqual([]);
  });

  it("does not auto-configure irc when the plugin is not bundled", () => {
    const result = applyPluginAutoEnable({
      config: {},
      env: {
        IRC_HOST: "irc.libera.chat",
        IRC_NICK: "openclaw-bot",
      },
    });

    expect(result.config.plugins?.entries?.irc?.enabled).toBeUndefined();
    expect(result.changes.join("\n")).not.toContain("IRC configured, not enabled yet.");
  });

  it("configures provider auth plugins as disabled when profiles exist", () => {
    const result = applyPluginAutoEnable({
      config: {
        auth: {
          profiles: {
            "google-antigravity:default": {
              provider: "google-antigravity",
              mode: "oauth",
            },
          },
        },
      },
      env: {},
    });

    expect(result.config.plugins?.entries?.["google-antigravity-auth"]?.enabled).toBe(false);
  });

  it("skips when plugins are globally disabled", () => {
    const result = applyPluginAutoEnable({
      config: {
        channels: { slack: { botToken: "x" } },
        plugins: { enabled: false },
      },
      env: {},
    });

    expect(result.config.plugins?.entries?.slack?.enabled).toBeUndefined();
    expect(result.changes).toEqual([]);
  });

  describe("retained channel auto-enable behavior", () => {
    it("auto-configures both slack and msteams when both are configured", () => {
      const result = applyPluginAutoEnable({
        config: {
          channels: {
            slack: { botToken: "x" },
            msteams: { tenantId: "tenant-a" },
          },
        },
        env: {},
      });

      expect(result.config.plugins?.entries?.slack?.enabled).toBe(false);
      expect(result.config.plugins?.entries?.msteams?.enabled).toBe(false);
      expect(result.changes.join("\n")).toContain("Slack configured, not enabled yet.");
      expect(result.changes.join("\n")).toContain("Microsoft Teams configured, not enabled yet.");
    });

    it("keeps explicitly enabled entries unchanged while auto-configuring others", () => {
      const result = applyPluginAutoEnable({
        config: {
          channels: {
            slack: { botToken: "x" },
            msteams: { tenantId: "tenant-a" },
          },
          plugins: { entries: { slack: { enabled: true } } },
        },
        env: {},
      });

      expect(result.config.plugins?.entries?.slack?.enabled).toBe(true);
      expect(result.config.plugins?.entries?.msteams?.enabled).toBe(false);
    });

    it("respects explicit disable for msteams", () => {
      const result = applyPluginAutoEnable({
        config: {
          channels: {
            slack: { botToken: "x" },
            msteams: { tenantId: "tenant-a" },
          },
          plugins: { entries: { msteams: { enabled: false } } },
        },
        env: {},
      });

      expect(result.config.plugins?.entries?.slack?.enabled).toBe(false);
      expect(result.config.plugins?.entries?.msteams?.enabled).toBe(false);
      expect(result.changes.join("\n")).not.toContain("msteams configured, not enabled yet.");
    });

    it("skips msteams when it is deny-listed", () => {
      const result = applyPluginAutoEnable({
        config: {
          channels: {
            slack: { botToken: "x" },
            msteams: { tenantId: "tenant-a" },
          },
          plugins: { deny: ["msteams"] },
        },
        env: {},
      });

      expect(result.config.plugins?.entries?.slack?.enabled).toBe(false);
      expect(result.config.plugins?.entries?.msteams?.enabled).toBeUndefined();
    });
  });
});
