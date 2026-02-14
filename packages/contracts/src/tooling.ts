export const TOOL_INVOCATION_V1 = "tool.invocation.v1" as const;

export interface ToolInvocationV1 {
  version: typeof TOOL_INVOCATION_V1;
  id: string;
  name: string;
  args?: Record<string, unknown>;
  timeoutMs?: number;
  dryRun?: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isPositiveInteger = (value: unknown): value is number => {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
};

export function isToolInvocationV1(value: unknown): value is ToolInvocationV1 {
  if (!isRecord(value)) {
    return false;
  }

  if (value["version"] !== TOOL_INVOCATION_V1) {
    return false;
  }

  if (typeof value["id"] !== "string" || value["id"].length === 0) {
    return false;
  }

  if (typeof value["name"] !== "string" || value["name"].length === 0) {
    return false;
  }

  if ("args" in value && value["args"] !== undefined && !isRecord(value["args"])) {
    return false;
  }

  if (
    "timeoutMs" in value &&
    value["timeoutMs"] !== undefined &&
    !isPositiveInteger(value["timeoutMs"])
  ) {
    return false;
  }

  if ("dryRun" in value && value["dryRun"] !== undefined && typeof value["dryRun"] !== "boolean") {
    return false;
  }

  return true;
}

export function validateToolInvocationV1(value: unknown): string[] {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return ["ToolInvocationV1 must be an object."];
  }

  if (value["version"] !== TOOL_INVOCATION_V1) {
    errors.push(`version must be "${TOOL_INVOCATION_V1}".`);
  }

  if (typeof value["id"] !== "string" || value["id"].length === 0) {
    errors.push("id must be a non-empty string.");
  }

  if (typeof value["name"] !== "string" || value["name"].length === 0) {
    errors.push("name must be a non-empty string.");
  }

  if ("args" in value && value["args"] !== undefined && !isRecord(value["args"])) {
    errors.push("args must be an object when provided.");
  }

  if (
    "timeoutMs" in value &&
    value["timeoutMs"] !== undefined &&
    !isPositiveInteger(value["timeoutMs"])
  ) {
    errors.push("timeoutMs must be a positive integer when provided.");
  }

  if ("dryRun" in value && value["dryRun"] !== undefined && typeof value["dryRun"] !== "boolean") {
    errors.push("dryRun must be a boolean when provided.");
  }

  return errors;
}
