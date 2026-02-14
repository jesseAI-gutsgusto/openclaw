export type MaybePromise<T> = T | Promise<T>;

export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: unknown, attempt: number) => MaybePromise<boolean>;
}

export interface InvocationOptions {
  timeoutMs?: number;
  retry?: RetryOptions;
}

export interface ToolInvokeMeta {
  attempt: number;
}

export type ToolHandler<TInput, TOutput, TContext> = (
  input: TInput,
  context: TContext,
  meta: ToolInvokeMeta,
) => MaybePromise<TOutput>;

export interface ToolDefinition<
  TName extends string = string,
  TInput = unknown,
  TOutput = unknown,
  TContext = unknown,
> {
  name: TName;
  handler: ToolHandler<TInput, TOutput, TContext>;
  description?: string;
  defaultOptions?: InvocationOptions;
}

export type AnyToolDefinition<TContext = unknown> = ToolDefinition<
  string,
  unknown,
  unknown,
  TContext
>;

export type ToolMap<TContext = unknown> = Record<string, AnyToolDefinition<TContext>>;

export type ToolInput<TTool extends AnyToolDefinition> =
  TTool extends ToolDefinition<string, infer TInput> ? TInput : never;

export type ToolOutput<TTool extends AnyToolDefinition> =
  TTool extends ToolDefinition<string, unknown, infer TOutput> ? TOutput : never;
