import { ToolRegistry } from "../domain/agent/ToolRegistry";
import { CalculatorTool } from "../domain/agent/tools/CalculatorTool";
import { EchoTool } from "../domain/agent/tools/EchoTool";
import { logger } from "../utils/logger/winston-logger";
import { adaptTool } from "../domain/agent/ToolAdapter";

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
    
    // Add more built-in tools here as needed
    // this.toolRegistry.registerTool(adaptTool(new WeatherTool()));
  }
} 