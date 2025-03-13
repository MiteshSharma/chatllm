import { Tool } from "@langchain/core/tools";
import { logger } from "../../utils/logger/winston-logger";

/**
 * Registry for managing agent tools
 */
export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools: Map<string, Tool> = new Map();
  
  private constructor() {}
  
  public static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }
  
  /**
   * Register a new tool
   */
  public registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool);
    logger.info(`Registered tool: ${tool.name}`);
  }
  
  /**
   * Get a tool by name
   */
  public getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }
  
  /**
   * Get all registered tools
   */
  public getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }
  
  /**
   * Get filtered tools by tags
   */
  public getToolsByTags(tags: string[]): Tool[] {
    return this.getAllTools().filter(tool => {
      if (!tool.metadata?.tags) return false;
      return tags.some(tag => (tool.metadata?.tags as string[]).includes(tag));
    });
  }
} 