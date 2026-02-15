import type { AnyToolDefinition, ToolDefinition, ToolMap } from "./types.js";

export class ToolRegistry<TContext = unknown, TTools extends ToolMap<TContext> = {}> {
  readonly #tools = new Map<string, AnyToolDefinition<TContext>>();

  register<const TName extends string, TInput, TOutput>(
    tool: ToolDefinition<TName, TInput, TOutput, TContext>,
  ): ToolRegistry<
    TContext,
    TTools & Record<TName, ToolDefinition<TName, TInput, TOutput, TContext>>
  > {
    if (this.#tools.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }

    this.#tools.set(tool.name, tool as AnyToolDefinition<TContext>);
    return this as unknown as ToolRegistry<
      TContext,
      TTools & Record<TName, ToolDefinition<TName, TInput, TOutput, TContext>>
    >;
  }

  get<TKey extends keyof TTools & string>(name: TKey): TTools[TKey] | undefined;
  get(name: string): AnyToolDefinition<TContext> | undefined;
  get(name: string): AnyToolDefinition<TContext> | undefined {
    return this.#tools.get(name);
  }

  list(): Array<keyof TTools & string> {
    return [...this.#tools.keys()] as Array<keyof TTools & string>;
  }
}
