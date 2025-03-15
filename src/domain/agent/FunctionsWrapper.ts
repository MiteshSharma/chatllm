/**
 * Wrapper for functions that can be used by agents
 */
export class FunctionsWrapper {
  functions: Array<{
    name: string;
    description: string;
    parameters: any;
  }>;

  constructor(functions: Array<{
    name: string;
    description: string;
    parameters: any;
  }>) {
    this.functions = functions;
  }
} 