import { Tool as LangChainTool } from "@langchain/core/tools";

/**
 * Adapter function to ensure type compatibility 
 * between tools and tool registry
 */
export function adaptTool(tool: any): LangChainTool {
  // This ensures TypeScript treats any LangChain tool as compatible
  return tool as LangChainTool;
} 