import { Tool } from "@langchain/core/tools";
import { logger } from "../../utils/logger/winston-logger";
import { OpenAPIService } from '../../services/OpenAPIService';
import { CalculatorTool } from './tools/CalculatorTool';
import { EchoTool } from './tools/EchoTool';
import { OpenAPISpecRepository } from '../../repository/database/OpenAPISpecRepository';

/**
 * Registry for managing agent tools
 */
export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools: Map<string, Tool> = new Map();
  private openAPIService: OpenAPIService;
  
  private constructor() {
    this.openAPIService = new OpenAPIService(new OpenAPISpecRepository());
    this.registerDefaultTools();
    this.registerOpenAPITools().catch(error => {
      logger.error("Failed to register OpenAPI tools", { error: error.message });
    });
  }
  
  public static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }
  
  private registerDefaultTools(): void {
    this.registerTool(new CalculatorTool());
    this.registerTool(new EchoTool());
  }
  
  private async registerOpenAPITools(): Promise<void> {
    const openAPISpecs = await this.openAPIService.getAllOpenAPISpecs();
    
    for (const spec of openAPISpecs) {
      const tools = this.openAPIService.createToolsFromSpec(spec);
      for (const tool of tools) {
        this.registerTool(tool);
      }
    }
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
    logger.info(`[ToolRegistry] Get tool ${name}: ${JSON.stringify(this.tools.get(name))}`);
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
  
  // Method to register a new OpenAPI spec and create tools from it
  async registerOpenAPISpec(spec: any): Promise<Tool[]> {
    const openAPISpec = await this.openAPIService.registerOpenAPISpec(spec);
    const tools = this.openAPIService.createToolsFromSpec(openAPISpec);
    
    for (const tool of tools) {
      this.registerTool(tool);
    }
    
    return tools;
  }

  public registerTools(tools: Tool[]): void {
    for (const tool of tools) {
      this.registerTool(tool);
    }
  }
} 