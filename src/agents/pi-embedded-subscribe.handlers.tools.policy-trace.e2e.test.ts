import { describe, expect, it } from "vitest";
import {
  POLICY_DECISION_TRACE_V1,
  onRunEvent,
  resetRunEventsForTest,
  type RunEventPolicyDecisionTraceV1,
} from "../infra/run-events.js";
import { subscribeEmbeddedPiSession } from "./pi-embedded-subscribe.js";

type StubSession = {
  subscribe: (fn: (evt: unknown) => void) => () => void;
};

describe("pi embedded subscribe tool run events", () => {
  it("includes policy decision trace on tool start and completion events", async () => {
    resetRunEventsForTest();

    let handler: ((evt: unknown) => void) | undefined;
    const session: StubSession = {
      subscribe: (fn) => {
        handler = fn;
        return () => {};
      },
    };

    subscribeEmbeddedPiSession({
      session: session as unknown as Parameters<typeof subscribeEmbeddedPiSession>[0]["session"],
      runId: "run-policy-trace",
    });

    const trace: RunEventPolicyDecisionTraceV1 = {
      version: POLICY_DECISION_TRACE_V1,
      decisionId: "decision-123",
      requestId: "request-123",
      outcome: "allow",
      evaluatedAt: "2026-02-14T00:00:00.000Z",
      ruleHits: [
        {
          ruleId: "rule-allow-read",
          effect: "allow",
          reason: "Read tool is permitted.",
        },
      ],
      notes: "trace should be forwarded",
    };

    const toolEvents: Array<{
      type: string;
      data?: Record<string, unknown>;
    }> = [];
    const stop = onRunEvent((event) => {
      if (event.runId !== "run-policy-trace") {
        return;
      }
      if (event.type !== "tool.started" && event.type !== "tool.completed") {
        return;
      }
      toolEvents.push({
        type: event.type,
        data: event.data,
      });
    });

    handler?.({
      type: "tool_execution_start",
      toolName: "read",
      toolCallId: "tool-1",
      args: { path: "/tmp/file.txt" },
      policyDecisionId: trace.decisionId,
      policyDecisionTrace: trace,
    });
    await Promise.resolve();

    handler?.({
      type: "tool_execution_end",
      toolName: "read",
      toolCallId: "tool-1",
      isError: false,
      result: { ok: true },
      policyDecisionId: trace.decisionId,
      policyDecisionTrace: trace,
    });
    await Promise.resolve();

    stop();

    expect(toolEvents).toHaveLength(2);
    expect(toolEvents[0]).toMatchObject({
      type: "tool.started",
      data: {
        policyDecisionId: trace.decisionId,
        policyDecisionTrace: trace,
      },
    });
    expect(toolEvents[1]).toMatchObject({
      type: "tool.completed",
      data: {
        policyDecisionId: trace.decisionId,
        policyDecisionTrace: trace,
        isError: false,
      },
    });

    resetRunEventsForTest();
  });
});
