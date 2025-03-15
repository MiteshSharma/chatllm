import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { logger } from "../../../utils/logger/winston-logger";

export class EchoTool extends DynamicStructuredTool {
  constructor() {
    super({
      name: "echo",
      description: "Echoes back the input text",
      schema: z.object({
        text: z.string().describe("The text to echo back")
      }),
      func: async ({ text }: { text: string }): Promise<string> => {
        logger.info("EchoTool called", { input: text });
        return text;
      },
      metadata: {
        tags: ["utility", "debug"]
      }
    });
  }
} 