import { ToolRegistry } from "../domain/agent/ToolRegistry";
import { CalculatorTool } from "../domain/agent/tools/CalculatorTool";
import { EchoTool } from "../domain/agent/tools/EchoTool";
import { logger } from "../utils/logger/winston-logger";
import { adaptTool } from "../domain/agent/ToolAdapter";
import { MCPToolRegistry, MCPTool } from '../domain/agent/tools/MCPTool';

/**
 * Service for initializing tools during app startup
 */
export class ToolInitService {
  private toolRegistry: ToolRegistry;
  
  constructor() {
    this.toolRegistry = ToolRegistry.getInstance();
  }
  
  /**
   * Initialize all tools
   */
  async initializeTools(): Promise<void> {
    logger.info("Initializing agent tools");
    
    // Register built-in tools
    this.registerBuiltInTools();
    
    // Register MCP tools
    await this.registerMCPTools();
    
    logger.info(`Tool initialization complete. ${this.toolRegistry.getAllTools().length} tools available.`);
  }
  
  /**
   * Register built-in tools
   */
  private registerBuiltInTools(): void {
    // Register calculator tool
    this.toolRegistry.registerTool(adaptTool(new CalculatorTool()));
    
    // Register echo tool
    this.toolRegistry.registerTool(adaptTool(new EchoTool()));
  }
  
  private async registerMCPTools(): Promise<void> {
    // Get MCPToolRegistry singleton
    const mcpToolRegistry = MCPToolRegistry.getInstance();
    
    // Create LangChain tool instances from registered MCP tools
    const mcpTools = await mcpToolRegistry.createLangChainTools();
    
    // Register each tool with your tool registry
    for (const tool of mcpTools) {
      logger.info(`[ToolInitService] Registering MCP tool: ${tool.name}`);
      this.toolRegistry.registerTool(tool);
    }
    
    console.log(`Registered ${mcpTools.length} MCP tools with the agent`);
  }
} 