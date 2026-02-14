export const PLUGIN_MANIFEST_V2 = "plugin.manifest.v2" as const;

export type PluginPermissionV1 =
  | "network"
  | "filesystem.read"
  | "filesystem.write"
  | "process.spawn"
  | "secrets.read";

export interface PluginRuntimeV1 {
  module: string;
  minOpenClawVersion?: string;
  minNodeVersion?: string;
}

export interface PluginToolDefinitionV1 {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

export interface PluginManifestV2 {
  version: typeof PLUGIN_MANIFEST_V2;
  id: string;
  name: string;
  description?: string;
  runtime: PluginRuntimeV1;
  tools?: PluginToolDefinitionV1[];
  permissions?: PluginPermissionV1[];
  homepage?: string;
  repository?: string;
  keywords?: string[];
}

const PLUGIN_PERMISSIONS = [
  "network",
  "filesystem.read",
  "filesystem.write",
  "process.spawn",
  "secrets.read",
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.length > 0;
};

const isStringArray = (value: unknown): value is string[] => {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
};

const isPluginPermission = (value: unknown): value is PluginPermissionV1 => {
  return PLUGIN_PERMISSIONS.includes(value as PluginPermissionV1);
};

const isPluginRuntimeV1 = (value: unknown): value is PluginRuntimeV1 => {
  if (!isRecord(value)) {
    return false;
  }

  if (!isNonEmptyString(value["module"])) {
    return false;
  }

  if (
    "minOpenClawVersion" in value &&
    value["minOpenClawVersion"] !== undefined &&
    !isNonEmptyString(value["minOpenClawVersion"])
  ) {
    return false;
  }

  if (
    "minNodeVersion" in value &&
    value["minNodeVersion"] !== undefined &&
    !isNonEmptyString(value["minNodeVersion"])
  ) {
    return false;
  }

  return true;
};

const isPluginToolDefinitionV1 = (value: unknown): value is PluginToolDefinitionV1 => {
  if (!isRecord(value)) {
    return false;
  }

  if (!isNonEmptyString(value["name"])) {
    return false;
  }

  if (!isNonEmptyString(value["description"])) {
    return false;
  }

  if (
    "inputSchema" in value &&
    value["inputSchema"] !== undefined &&
    !isRecord(value["inputSchema"])
  ) {
    return false;
  }

  if (
    "outputSchema" in value &&
    value["outputSchema"] !== undefined &&
    !isRecord(value["outputSchema"])
  ) {
    return false;
  }

  return true;
};

export function isPluginManifestV2(value: unknown): value is PluginManifestV2 {
  if (!isRecord(value)) {
    return false;
  }

  if (value["version"] !== PLUGIN_MANIFEST_V2) {
    return false;
  }

  if (!isNonEmptyString(value["id"])) {
    return false;
  }

  if (!isNonEmptyString(value["name"])) {
    return false;
  }

  if (
    "description" in value &&
    value["description"] !== undefined &&
    !isNonEmptyString(value["description"])
  ) {
    return false;
  }

  if (!isPluginRuntimeV1(value["runtime"])) {
    return false;
  }

  if (
    "tools" in value &&
    value["tools"] !== undefined &&
    (!Array.isArray(value["tools"]) ||
      !value["tools"].every((tool) => isPluginToolDefinitionV1(tool)))
  ) {
    return false;
  }

  if ("permissions" in value && value["permissions"] !== undefined) {
    if (!Array.isArray(value["permissions"])) {
      return false;
    }

    if (!value["permissions"].every((permission) => isPluginPermission(permission))) {
      return false;
    }
  }

  if (
    "homepage" in value &&
    value["homepage"] !== undefined &&
    !isNonEmptyString(value["homepage"])
  ) {
    return false;
  }

  if (
    "repository" in value &&
    value["repository"] !== undefined &&
    !isNonEmptyString(value["repository"])
  ) {
    return false;
  }

  if ("keywords" in value && value["keywords"] !== undefined && !isStringArray(value["keywords"])) {
    return false;
  }

  return true;
}

export function validatePluginManifestV2(value: unknown): string[] {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return ["PluginManifestV2 must be an object."];
  }

  if (value["version"] !== PLUGIN_MANIFEST_V2) {
    errors.push(`version must be "${PLUGIN_MANIFEST_V2}".`);
  }

  if (!isNonEmptyString(value["id"])) {
    errors.push("id must be a non-empty string.");
  }

  if (!isNonEmptyString(value["name"])) {
    errors.push("name must be a non-empty string.");
  }

  if (
    "description" in value &&
    value["description"] !== undefined &&
    !isNonEmptyString(value["description"])
  ) {
    errors.push("description must be a non-empty string when provided.");
  }

  if (!isPluginRuntimeV1(value["runtime"])) {
    errors.push("runtime must be a valid PluginRuntimeV1 object.");
  }

  if ("tools" in value && value["tools"] !== undefined) {
    if (!Array.isArray(value["tools"])) {
      errors.push("tools must be an array when provided.");
    } else {
      const invalidToolIndex = value["tools"].findIndex((tool) => !isPluginToolDefinitionV1(tool));
      if (invalidToolIndex >= 0) {
        errors.push(`tools[${invalidToolIndex}] must be a valid PluginToolDefinitionV1.`);
      }
    }
  }

  if ("permissions" in value && value["permissions"] !== undefined) {
    if (!Array.isArray(value["permissions"])) {
      errors.push("permissions must be an array when provided.");
    } else {
      const invalidPermissionIndex = value["permissions"].findIndex(
        (permission) => !isPluginPermission(permission),
      );
      if (invalidPermissionIndex >= 0) {
        errors.push(`permissions[${invalidPermissionIndex}] must be a known PluginPermissionV1.`);
      }
    }
  }

  if (
    "homepage" in value &&
    value["homepage"] !== undefined &&
    !isNonEmptyString(value["homepage"])
  ) {
    errors.push("homepage must be a non-empty string when provided.");
  }

  if (
    "repository" in value &&
    value["repository"] !== undefined &&
    !isNonEmptyString(value["repository"])
  ) {
    errors.push("repository must be a non-empty string when provided.");
  }

  if ("keywords" in value && value["keywords"] !== undefined && !isStringArray(value["keywords"])) {
    errors.push("keywords must be an array of strings when provided.");
  }

  return errors;
}
