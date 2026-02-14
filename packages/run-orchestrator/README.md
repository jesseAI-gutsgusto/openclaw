# @openclaw/run-orchestrator

Simple run-state primitives for OpenClaw flows.

## States

- `QUEUED`
- `RUNNING`
- `WAITING_APPROVAL`
- `COMPLETED`
- `FAILED`
- `CANCELLED`

## Exports

- `createQueuedRunState(...)`
- `canTransitionRunState(...)`
- `transitionRunState(...)` (pure transition function)
- `emitRunEvent(...)` (event emit helper)
- `RunOrchestrator` (small in-memory helper)

## Example

```ts
import { RunOrchestrator } from "@openclaw/run-orchestrator";

const orchestrator = new RunOrchestrator("run-1");

orchestrator.subscribe((event) => {
  console.log(event.from, "->", event.to);
});

orchestrator.start();
orchestrator.waitForApproval();
orchestrator.resume();
orchestrator.complete();
```
