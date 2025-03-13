import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { evaluate } from "mathjs";

export class CalculatorTool extends DynamicStructuredTool {
  constructor() {
    super({
      name: "calculator",
      description: "Performs mathematical calculations",
      schema: z.object({
        expression: z.string().describe("The mathematical expression to evaluate")
      }),
      func: async ({ expression }: { expression: string }): Promise<string> => {
        try {
          // Evaluate the expression using mathjs
          const result = evaluate(expression);
          return result.toString();
        } catch (error) {
          return `Error calculating result: ${(error as Error).message}`;
        }
      },
      metadata: {
        tags: ["math", "utility"]
      }
    });
  }
} 