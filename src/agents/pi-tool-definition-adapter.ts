import type {
  AgentTool,
  AgentToolResult,
  AgentToolUpdateCallback,
} from "@mariozechner/pi-agent-core";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import type { ClientToolDefinition } from "./pi-embedded-runner/run/params.js";
import { logDebug, logError } from "../logger.js";
import { getGlobalHookRunner } from "../plugins/hook-runner-global.js";
import { isPlainObject } from "../utils.js";
import { runBeforeToolCallHook } from "./pi-tools.before-tool-call.js";
import { normalizeToolName } from "./tool-policy.js";
import {
  extractToolRuntimePolicyMetadata,
  invokeToolWithRuntime,
  type ToolRuntimeInvokeResult,
} from "./tool-runtime-adapter.js";
import { jsonResult } from "./tools/common.js";

// oxlint-disable-next-line typescript/no-explicit-any
type AnyAgentTool = AgentTool<any, unknown>;

type ToolExecuteArgsCurrent = [
  string,
  unknown,
  AgentToolUpdateCallback<unknown> | undefined,
  unknown,
  AbortSignal | undefined,
];
type ToolExecuteArgsLegacy = [
  string,
  unknown,
  AbortSignal | undefined,
  AgentToolUpdateCallback<unknown> | undefined,
  unknown,
];
type ToolExecuteArgs = ToolDefinition["execute"] extends (...args: infer P) => unknown
  ? P
  : ToolExecuteArgsCurrent;
type ToolExecuteArgsAny = ToolExecuteArgs | ToolExecuteArgsLegacy | ToolExecuteArgsCurrent;

function isAbortSignal(value: unknown): value is AbortSignal {
  return typeof value === "object" && value !== null && "aborted" in value;
}

function isLegacyToolExecuteArgs(args: ToolExecuteArgsAny): args is ToolExecuteArgsLegacy {
  const third = args[2];
  const fourth = args[3];
  return isAbortSignal(third) || typeof fourth === "function";
}

function describeToolExecutionError(err: unknown): {
  message: string;
  stack?: string;
} {
  if (err instanceof Error) {
    const message = err.message?.trim() ? err.message : String(err);
    return { message, stack: err.stack };
  }
  return { message: String(err) };
}

function splitToolExecuteArgs(args: ToolExecuteArgsAny): {
  toolCallId: string;
  params: unknown;
  onUpdate: AgentToolUpdateCallback<unknown> | undefined;
  signal: AbortSignal | undefined;
} {
  if (isLegacyToolExecuteArgs(args)) {
    const [toolCallId, params, signal, onUpdate] = args;
    return {
      toolCallId,
      params,
      onUpdate,
      signal,
    };
  }
  const [toolCallId, params, onUpdate, _ctx, signal] = args;
  return {
    toolCallId,
    params,
    onUpdate,
    signal,
  };
}

type RuntimePolicyMetadata = Pick<
  ToolRuntimeInvokeResult<unknown>,
  "tool" | "policy" | "policyDecisionTrace"
>;

function attachPolicyMetadataToToolResult(
  result: AgentToolResult<unknown>,
  metadata: RuntimePolicyMetadata | undefined,
): AgentToolResult<unknown> {
  if (!metadata) {
    return result;
  }

  const policyDecisionId = metadata.policy.decisionId;
  const nextDetails = isPlainObject(result.details)
    ? {
        ...result.details,
        policyDecisionId,
        decisionId: policyDecisionId,
        policyDecisionTrace: metadata.policyDecisionTrace,
        toolInvocation: metadata.tool,
        policy: metadata.policy,
      }
    : result.details;

  return {
    ...result,
    ...(nextDetails !== result.details ? { details: nextDetails } : {}),
    policyDecisionId,
    decisionId: policyDecisionId,
    policyDecisionTrace: metadata.policyDecisionTrace,
    toolInvocation: metadata.tool,
    policy: metadata.policy,
  } as AgentToolResult<unknown>;
}

export function toToolDefinitions(tools: AnyAgentTool[]): ToolDefinition[] {
  return tools.map((tool) => {
    const name = tool.name || "tool";
    const normalizedName = normalizeToolName(name);
    return {
      name,
      label: tool.label ?? name,
      description: tool.description ?? "",
      parameters: tool.parameters,
      execute: async (...args: ToolExecuteArgs): Promise<AgentToolResult<unknown>> => {
        const { toolCallId, params, onUpdate, signal } = splitToolExecuteArgs(args);
        let runtimePolicyMetadata: RuntimePolicyMetadata | undefined;
        try {
          // Call before_tool_call hook
          const hookOutcome = await runBeforeToolCallHook({
            toolName: name,
            params,
            toolCallId,
          });
          if (hookOutcome.blocked) {
            throw new Error(hookOutcome.reason);
          }
          const adjustedParams = hookOutcome.params;
          const invocation = await invokeToolWithRuntime<unknown, AgentToolResult<unknown>>({
            toolName: normalizedName,
            toolCallId,
            input: adjustedParams,
            invoke: async (input) => await tool.execute(toolCallId, input, signal, onUpdate),
            policy: {
              context: {
                subject: "agent:pi-tool-definition-adapter",
                resource: `tool:${normalizedName}`,
                action: "invoke",
                metadata: {
                  toolCallId,
                },
              },
              defaultAllowReason: "No denying policy configured in pi tool definition adapter.",
            },
            onPolicyDecision: (decision) => {
              logDebug(
                `tools: policy decision tool=${normalizedName} decisionId=${decision.decisionId} effect=${decision.effect} trace=${JSON.stringify(decision.trace)}`,
              );
            },
          });
          runtimePolicyMetadata = {
            tool: invocation.tool,
            policy: invocation.policy,
            policyDecisionTrace: invocation.policyDecisionTrace,
          };
          const result = attachPolicyMetadataToToolResult(invocation.result, runtimePolicyMetadata);

          // Call after_tool_call hook
          const hookRunner = getGlobalHookRunner();
          if (hookRunner?.hasHooks("after_tool_call")) {
            try {
              await hookRunner.runAfterToolCall(
                {
                  toolName: name,
                  params: isPlainObject(adjustedParams) ? adjustedParams : {},
                  result,
                },
                { toolName: name },
              );
            } catch (hookErr) {
              logDebug(
                `after_tool_call hook failed: tool=${normalizedName} error=${String(hookErr)}`,
              );
            }
          }

          return result;
        } catch (err) {
          const errorPolicyMetadata = extractToolRuntimePolicyMetadata(err);
          if (
            errorPolicyMetadata?.policy &&
            errorPolicyMetadata.tool &&
            errorPolicyMetadata.policyDecisionTrace
          ) {
            runtimePolicyMetadata = {
              tool: errorPolicyMetadata.tool,
              policy: errorPolicyMetadata.policy,
              policyDecisionTrace: errorPolicyMetadata.policyDecisionTrace,
            };
          }
          if (signal?.aborted) {
            throw err;
          }
          const name =
            err && typeof err === "object" && "name" in err
              ? String((err as { name?: unknown }).name)
              : "";
          if (name === "AbortError") {
            throw err;
          }
          const described = describeToolExecutionError(err);
          if (described.stack && described.stack !== described.message) {
            logDebug(`tools: ${normalizedName} failed stack:\n${described.stack}`);
          }
          logError(`[tools] ${normalizedName} failed: ${described.message}`);

          const errorResult = attachPolicyMetadataToToolResult(
            jsonResult({
              status: "error",
              tool: normalizedName,
              error: described.message,
            }),
            runtimePolicyMetadata,
          );

          // Call after_tool_call hook for errors too
          const hookRunner = getGlobalHookRunner();
          if (hookRunner?.hasHooks("after_tool_call")) {
            try {
              await hookRunner.runAfterToolCall(
                {
                  toolName: normalizedName,
                  params: isPlainObject(params) ? params : {},
                  error: described.message,
                },
                { toolName: normalizedName },
              );
            } catch (hookErr) {
              logDebug(
                `after_tool_call hook failed: tool=${normalizedName} error=${String(hookErr)}`,
              );
            }
          }

          return errorResult;
        }
      },
    } satisfies ToolDefinition;
  });
}

// Convert client tools (OpenResponses hosted tools) to ToolDefinition format
// These tools are intercepted to return a "pending" result instead of executing
export function toClientToolDefinitions(
  tools: ClientToolDefinition[],
  onClientToolCall?: (toolName: string, params: Record<string, unknown>) => void,
  hookContext?: { agentId?: string; sessionKey?: string },
): ToolDefinition[] {
  return tools.map((tool) => {
    const func = tool.function;
    return {
      name: func.name,
      label: func.name,
      description: func.description ?? "",
      // oxlint-disable-next-line typescript/no-explicit-any
      parameters: func.parameters as any,
      execute: async (...args: ToolExecuteArgs): Promise<AgentToolResult<unknown>> => {
        const { toolCallId, params } = splitToolExecuteArgs(args);
        const outcome = await runBeforeToolCallHook({
          toolName: func.name,
          params,
          toolCallId,
          ctx: hookContext,
        });
        if (outcome.blocked) {
          throw new Error(outcome.reason);
        }
        const adjustedParams = outcome.params;
        const paramsRecord = isPlainObject(adjustedParams) ? adjustedParams : {};
        // Notify handler that a client tool was called
        if (onClientToolCall) {
          onClientToolCall(func.name, paramsRecord);
        }
        // Return a pending result - the client will execute this tool
        return jsonResult({
          status: "pending",
          tool: func.name,
          message: "Tool execution delegated to client",
        });
      },
    } satisfies ToolDefinition;
  });
}
