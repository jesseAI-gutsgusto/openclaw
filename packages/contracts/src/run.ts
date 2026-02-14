import { isToolInvocationV1, type ToolInvocationV1 } from "./tooling.js";

export const RUN_REQUEST_V2 = "run.request.v2" as const;
export const RUN_EVENT_V1 = "run.event.v1" as const;

export type RunActorTypeV1 = "user" | "agent" | "system";
export type RunEventTypeV1 =
  | "run.started"
  | "run.progress"
  | "run.completed"
  | "run.failed"
  | "tool.started"
  | "tool.completed"
  | "policy.blocked";

export interface RunActorV1 {
  id: string;
  type: RunActorTypeV1;
  displayName?: string;
}

export interface RunRequestV2 {
  version: typeof RUN_REQUEST_V2;
  runId: string;
  createdAt: string;
  actor: RunActorV1;
  prompt: string;
  tools?: ToolInvocationV1[];
  context?: Record<string, unknown>;
  metadata?: Record<string, string>;
}

export interface RunEventErrorV1 {
  code: string;
  message: string;
  retryable?: boolean;
}

export interface RunEventV1 {
  version: typeof RUN_EVENT_V1;
  eventId: string;
  runId: string;
  type: RunEventTypeV1;
  createdAt: string;
  message?: string;
  tool?: ToolInvocationV1;
  outputText?: string;
  error?: RunEventErrorV1;
  data?: Record<string, unknown>;
}

const RUN_ACTOR_TYPES = ["user", "agent", "system"] as const;
const RUN_EVENT_TYPES = [
  "run.started",
  "run.progress",
  "run.completed",
  "run.failed",
  "tool.started",
  "tool.completed",
  "policy.blocked",
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isIsoDate = (value: unknown): value is string => {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
};

const isStringRecord = (value: unknown): value is Record<string, string> => {
  if (!isRecord(value)) {
    return false;
  }

  return Object.values(value).every((entry) => typeof entry === "string");
};

const isRunActorV1 = (value: unknown): value is RunActorV1 => {
  if (!isRecord(value)) {
    return false;
  }

  const actorType = value["type"];

  if (!RUN_ACTOR_TYPES.includes(actorType as RunActorTypeV1)) {
    return false;
  }

  if (typeof value["id"] !== "string" || value["id"].length === 0) {
    return false;
  }

  if (
    "displayName" in value &&
    value["displayName"] !== undefined &&
    typeof value["displayName"] !== "string"
  ) {
    return false;
  }

  return true;
};

const isRunEventErrorV1 = (value: unknown): value is RunEventErrorV1 => {
  if (!isRecord(value)) {
    return false;
  }

  if (typeof value["code"] !== "string" || value["code"].length === 0) {
    return false;
  }

  if (typeof value["message"] !== "string" || value["message"].length === 0) {
    return false;
  }

  if (
    "retryable" in value &&
    value["retryable"] !== undefined &&
    typeof value["retryable"] !== "boolean"
  ) {
    return false;
  }

  return true;
};

export function isRunRequestV2(value: unknown): value is RunRequestV2 {
  if (!isRecord(value)) {
    return false;
  }

  if (value["version"] !== RUN_REQUEST_V2) {
    return false;
  }

  if (typeof value["runId"] !== "string" || value["runId"].length === 0) {
    return false;
  }

  if (!isIsoDate(value["createdAt"])) {
    return false;
  }

  if (!isRunActorV1(value["actor"])) {
    return false;
  }

  if (typeof value["prompt"] !== "string" || value["prompt"].length === 0) {
    return false;
  }

  if (
    "tools" in value &&
    value["tools"] !== undefined &&
    (!Array.isArray(value["tools"]) || !value["tools"].every((tool) => isToolInvocationV1(tool)))
  ) {
    return false;
  }

  if ("context" in value && value["context"] !== undefined && !isRecord(value["context"])) {
    return false;
  }

  if (
    "metadata" in value &&
    value["metadata"] !== undefined &&
    !isStringRecord(value["metadata"])
  ) {
    return false;
  }

  return true;
}

export function validateRunRequestV2(value: unknown): string[] {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return ["RunRequestV2 must be an object."];
  }

  if (value["version"] !== RUN_REQUEST_V2) {
    errors.push(`version must be "${RUN_REQUEST_V2}".`);
  }

  if (typeof value["runId"] !== "string" || value["runId"].length === 0) {
    errors.push("runId must be a non-empty string.");
  }

  if (!isIsoDate(value["createdAt"])) {
    errors.push("createdAt must be an ISO-8601 timestamp string.");
  }

  if (!isRunActorV1(value["actor"])) {
    errors.push("actor must be a valid RunActorV1 object.");
  }

  if (typeof value["prompt"] !== "string" || value["prompt"].length === 0) {
    errors.push("prompt must be a non-empty string.");
  }

  if ("tools" in value && value["tools"] !== undefined) {
    if (!Array.isArray(value["tools"])) {
      errors.push("tools must be an array when provided.");
    } else {
      const invalidToolIndex = value["tools"].findIndex((tool) => !isToolInvocationV1(tool));
      if (invalidToolIndex >= 0) {
        errors.push(`tools[${invalidToolIndex}] must be a valid ToolInvocationV1.`);
      }
    }
  }

  if ("context" in value && value["context"] !== undefined && !isRecord(value["context"])) {
    errors.push("context must be an object when provided.");
  }

  if (
    "metadata" in value &&
    value["metadata"] !== undefined &&
    !isStringRecord(value["metadata"])
  ) {
    errors.push("metadata must be a string-to-string record when provided.");
  }

  return errors;
}

export function isRunEventV1(value: unknown): value is RunEventV1 {
  if (!isRecord(value)) {
    return false;
  }

  const eventType = value["type"];

  if (value["version"] !== RUN_EVENT_V1) {
    return false;
  }

  if (typeof value["eventId"] !== "string" || value["eventId"].length === 0) {
    return false;
  }

  if (typeof value["runId"] !== "string" || value["runId"].length === 0) {
    return false;
  }

  if (!RUN_EVENT_TYPES.includes(eventType as RunEventTypeV1)) {
    return false;
  }

  if (!isIsoDate(value["createdAt"])) {
    return false;
  }

  if (
    "message" in value &&
    value["message"] !== undefined &&
    typeof value["message"] !== "string"
  ) {
    return false;
  }

  if ("tool" in value && value["tool"] !== undefined && !isToolInvocationV1(value["tool"])) {
    return false;
  }

  if (
    "outputText" in value &&
    value["outputText"] !== undefined &&
    typeof value["outputText"] !== "string"
  ) {
    return false;
  }

  if ("error" in value && value["error"] !== undefined && !isRunEventErrorV1(value["error"])) {
    return false;
  }

  if ("data" in value && value["data"] !== undefined && !isRecord(value["data"])) {
    return false;
  }

  return true;
}

export function validateRunEventV1(value: unknown): string[] {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return ["RunEventV1 must be an object."];
  }

  const eventType = value["type"];

  if (value["version"] !== RUN_EVENT_V1) {
    errors.push(`version must be "${RUN_EVENT_V1}".`);
  }

  if (typeof value["eventId"] !== "string" || value["eventId"].length === 0) {
    errors.push("eventId must be a non-empty string.");
  }

  if (typeof value["runId"] !== "string" || value["runId"].length === 0) {
    errors.push("runId must be a non-empty string.");
  }

  if (!RUN_EVENT_TYPES.includes(eventType as RunEventTypeV1)) {
    errors.push("type must be a known RunEventTypeV1 value.");
  }

  if (!isIsoDate(value["createdAt"])) {
    errors.push("createdAt must be an ISO-8601 timestamp string.");
  }

  if (
    "message" in value &&
    value["message"] !== undefined &&
    typeof value["message"] !== "string"
  ) {
    errors.push("message must be a string when provided.");
  }

  if ("tool" in value && value["tool"] !== undefined && !isToolInvocationV1(value["tool"])) {
    errors.push("tool must be a valid ToolInvocationV1 when provided.");
  }

  if (
    "outputText" in value &&
    value["outputText"] !== undefined &&
    typeof value["outputText"] !== "string"
  ) {
    errors.push("outputText must be a string when provided.");
  }

  if ("error" in value && value["error"] !== undefined && !isRunEventErrorV1(value["error"])) {
    errors.push("error must be a valid RunEventErrorV1 object when provided.");
  }

  if ("data" in value && value["data"] !== undefined && !isRecord(value["data"])) {
    errors.push("data must be an object when provided.");
  }

  return errors;
}
