/**
 * Wrapper for OpenAI function definitions used in tool calls
 */
export interface FunctionDefinition {
  name: string;
  description?: string;
  parameters?: Record<string, any>;
}

export class FunctionsWrapper {
  constructor(public readonly functions: FunctionDefinition[]) {}

  static create(functions: FunctionDefinition[]): FunctionsWrapper {
    return new FunctionsWrapper(functions);
  }
} 