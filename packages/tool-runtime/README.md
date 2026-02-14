# @openclaw/tool-runtime

Minimal, typed tool runtime for small in-process tool registries.

## API

- `ToolRegistry`: `register`, `get`, `list`
- `ToolRuntime`: `invoke` with optional timeout and retry behavior

## Example

```ts
import { ToolRegistry, ToolRuntime } from "@openclaw/tool-runtime";

const registry = new ToolRegistry<{ requestId: string }>()
  .register({
    name: "sum",
    handler: (input: { a: number; b: number }) => input.a + input.b,
  })
  .register({
    name: "echo",
    handler: (input: string, context) => `${context.requestId}:${input}`,
  });

const runtime = new ToolRuntime(registry, {
  retry: { maxAttempts: 2, delayMs: 25 },
  timeoutMs: 1_000,
});

const result = await runtime.invoke("sum", { a: 1, b: 2 }, { requestId: "req-1" });
```
