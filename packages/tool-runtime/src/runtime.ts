import type {
  InvocationOptions,
  MaybePromise,
  RetryOptions,
  ToolInput,
  ToolMap,
  ToolOutput,
} from "./types";
import { ToolRegistry } from "./registry";

interface NormalizedRetryOptions {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
  shouldRetry?: (error: unknown, attempt: number) => MaybePromise<boolean>;
}

export class ToolNotFoundError extends Error {
  readonly toolName: string;

  constructor(toolName: string) {
    super(`Tool not found: ${toolName}`);
    this.name = "ToolNotFoundError";
    this.toolName = toolName;
  }
}

export class ToolTimeoutError extends Error {
  readonly toolName: string;
  readonly timeoutMs: number;

  constructor(toolName: string, timeoutMs: number) {
    super(`Tool '${toolName}' timed out after ${timeoutMs}ms`);
    this.name = "ToolTimeoutError";
    this.toolName = toolName;
    this.timeoutMs = timeoutMs;
  }
}

export class ToolRuntime<TContext = unknown, TTools extends ToolMap<TContext> = {}> {
  readonly #registry: ToolRegistry<TContext, TTools>;
  readonly #defaultOptions?: InvocationOptions;

  constructor(registry: ToolRegistry<TContext, TTools>, defaultOptions?: InvocationOptions) {
    this.#registry = registry;
    this.#defaultOptions = defaultOptions;
  }

  invoke<TKey extends keyof TTools & string>(
    name: TKey,
    input: ToolInput<TTools[TKey]>,
    context: TContext,
    options?: InvocationOptions,
  ): Promise<ToolOutput<TTools[TKey]>>;
  invoke<TInput = unknown, TOutput = unknown>(
    name: string,
    input: TInput,
    context: TContext,
    options?: InvocationOptions,
  ): Promise<TOutput>;
  async invoke(
    name: string,
    input: unknown,
    context: TContext,
    options?: InvocationOptions,
  ): Promise<unknown> {
    const tool = this.#registry.get(name);
    if (!tool) {
      throw new ToolNotFoundError(name);
    }

    const invokeOptions = mergeInvocationOptions(
      this.#defaultOptions,
      tool.defaultOptions,
      options,
    );
    const retryOptions = normalizeRetryOptions(invokeOptions.retry);

    let attempt = 1;
    while (attempt <= retryOptions.maxAttempts) {
      try {
        return await invokeWithTimeout(
          Promise.resolve(tool.handler(input, context, { attempt })),
          name,
          invokeOptions.timeoutMs,
        );
      } catch (error) {
        const canRetry =
          attempt < retryOptions.maxAttempts &&
          (!retryOptions.shouldRetry || (await retryOptions.shouldRetry(error, attempt)));

        if (!canRetry) {
          throw error;
        }

        await waitMs(calculateDelayMs(retryOptions, attempt));
        attempt += 1;
      }
    }

    throw new Error("Unreachable runtime state");
  }
}

function mergeInvocationOptions(
  ...optionsList: Array<InvocationOptions | undefined>
): InvocationOptions {
  const merged: InvocationOptions = {};

  for (const options of optionsList) {
    if (!options) {
      continue;
    }

    if (options.timeoutMs !== undefined) {
      merged.timeoutMs = options.timeoutMs;
    }

    if (options.retry !== undefined) {
      merged.retry = options.retry;
    }
  }

  return merged;
}

function normalizeRetryOptions(options?: RetryOptions): NormalizedRetryOptions {
  const maxAttempts = options?.maxAttempts ?? 1;
  const delayMs = options?.delayMs ?? 0;
  const backoffMultiplier = options?.backoffMultiplier ?? 1;

  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new Error("retry.maxAttempts must be an integer >= 1");
  }

  if (!Number.isFinite(delayMs) || delayMs < 0) {
    throw new Error("retry.delayMs must be a finite number >= 0");
  }

  if (!Number.isFinite(backoffMultiplier) || backoffMultiplier < 1) {
    throw new Error("retry.backoffMultiplier must be a finite number >= 1");
  }

  return {
    maxAttempts,
    delayMs,
    backoffMultiplier,
    shouldRetry: options?.shouldRetry,
  };
}

function calculateDelayMs(retryOptions: NormalizedRetryOptions, attempt: number): number {
  if (retryOptions.delayMs === 0) {
    return 0;
  }

  const delay =
    retryOptions.delayMs * Math.pow(retryOptions.backoffMultiplier, Math.max(0, attempt - 1));

  return Math.max(0, Math.round(delay));
}

function waitMs(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function invokeWithTimeout<T>(
  run: Promise<T>,
  toolName: string,
  timeoutMs?: number,
): Promise<T> {
  if (timeoutMs === undefined) {
    return run;
  }

  if (!Number.isFinite(timeoutMs) || timeoutMs < 0) {
    throw new Error("timeoutMs must be a finite number >= 0");
  }

  return await new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new ToolTimeoutError(toolName, timeoutMs));
    }, timeoutMs);

    run.then(
      (result) => {
        clearTimeout(timeoutId);
        resolve(result);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}
