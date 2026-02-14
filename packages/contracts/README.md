# @openclaw/contracts

Minimal v1 contract definitions for shared OpenClaw boundaries.

## Included contracts

- `RunRequestV2` and `RunEventV1`
- `ToolInvocationV1`
- `PolicyDecisionTraceV1`
- `PluginManifestV2`

Each module exports lightweight runtime checks:

- `is...(...)` typeguards
- `validate...(...)` validators returning an array of error strings

## Usage

```ts
import {
  isRunRequestV2,
  validatePluginManifestV2,
  type RunRequestV2,
  type PluginManifestV2,
} from "@openclaw/contracts";

const request: unknown = {
  version: "run.request.v2",
  runId: "run_123",
  createdAt: new Date().toISOString(),
  actor: { id: "user_1", type: "user" },
  prompt: "Summarize this thread",
};

if (isRunRequestV2(request)) {
  const typedRequest: RunRequestV2 = request;
  console.log(typedRequest.runId);
}

const manifestErrors = validatePluginManifestV2({
  version: "plugin.manifest.v2",
  id: "example.plugin",
  name: "Example Plugin",
  runtime: { module: "./dist/index.js" },
});

if (manifestErrors.length > 0) {
  console.error(manifestErrors.join("\n"));
}
```
