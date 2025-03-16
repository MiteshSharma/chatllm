import { Tool } from "@langchain/core/tools";
import { z } from "zod";
import { logger } from "../../../utils/logger/winston-logger";

export class EchoTool extends Tool {
  name = "echo";
  description = "Echoes back the input text";
  
  // Update schema to match expected ZodEffects type
  schema = z.object({
    input: z.string().optional().describe("The text to echo back"),
  }).transform((val) => val.input);
  
  async _call(input: string): Promise<string> {
    logger.info("EchoTool called", { input: input });
    return input;
  }

  metadata = {
    tags: ["utility", "debugging"]
  };
} 