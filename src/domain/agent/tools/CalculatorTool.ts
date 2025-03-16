import { Tool } from "@langchain/core/tools";
import { z } from "zod";
import { evaluate } from "mathjs";

export class CalculatorTool extends Tool {
  name = "calculator";
  description = "Performs mathematical calculations";
  
  // Update schema to match expected ZodEffects type
  schema = z.object({
    input: z.string().optional().describe("The mathematical expression to evaluate"),
  }).transform((val) => val.input);
  
  async _call(input: string): Promise<string> {
    try {
      // Evaluate the expression using mathjs
      const result = evaluate(input);
      return result.toString();
    } catch (error) {
      return `Error calculating result: ${(error as Error).message}`;
    }
  }

  metadata = {
    tags: ["math", "utility"]
  };
} 