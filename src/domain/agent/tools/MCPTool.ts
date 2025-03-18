import { Tool } from "@langchain/core/tools";
import { logger } from '../../../utils/logger/winston-logger';
import { MCPConnectionManager } from '../../mcp/MCPConnectionManager';
import { z } from 'zod';
import { MCPService } from '../../../services/MCPService';
import { MCPServer, MCPCapability } from '../../../models/MCPServer';
import { MCPServerRepository } from '../../../repository/database/MCPServerRepository';

interface MCPToolDescription {
  name: string;
  description: string;
  serverId: string;
  parameters?: any; // JSON Schema for parameters
}

interface MCPToolOptions {
  name: string;
  description: string;
  mcpServerId: string;
  capability: string;
}

// Main registry class for MCP tools
export class MCPToolRegistry {
  private static instance: MCPToolRegistry;
  private tools: Map<string, MCPToolDescription> = new Map();
  private connectionManager: MCPConnectionManager;
  private repository: MCPServerRepository;
  
  private constructor() {
    this.connectionManager = MCPConnectionManager.getInstance();
    this.repository = new MCPServerRepository();
  }
  
  public static getInstance(): MCPToolRegistry {
    if (!MCPToolRegistry.instance) {
      MCPToolRegistry.instance = new MCPToolRegistry();
    }
    return MCPToolRegistry.instance;
  }
  
  // Register a new MCP tool
  public registerTool(tool: MCPToolDescription): void {
    this.tools.set(tool.name, tool);
    logger.info(`[MCPTool] Registered tool: ${tool.name} for server ${tool.serverId}`);
  }
  
  // Get a tool by name
  public getTool(name: string): MCPToolDescription | undefined {
    logger.info(`[MCPTool] Get tool ${name}: ${JSON.stringify(this.tools.get(name))}`);
    return this.tools.get(name);
  }
  
  // Get all registered tools
  public getAllTools(): MCPToolDescription[] {
    return Array.from(this.tools.values());
  }
  
  // Execute a tool
  public async executeTool(name: string, args: any): Promise<any> {
    const tool = this.tools.get(name);

    logger.info(`[MCPTool] Executing tool: ${name} with args: ${JSON.stringify(args)}`);
    
    if (!tool) {
      logger.error(`[MCPTool] Tool not found: ${name}`);
      throw new Error(`Tool not found: ${name}`);
    }
    
    try {
      const connector = await this.connectionManager.getConnection(tool.serverId);
      logger.info(`[MCPTool] Executing tool: ${name} with args: ${JSON.stringify(args)}`);

      logger.info(`${JSON.stringify(args)}`);
      
      return await connector.callTool(name, args);
    } catch (error: any) {
      logger.error(`[MCPTool] Error executing tool ${name}:`, error);
      throw error;
    }
  }
  
  // Get tool descriptions for agent
  public getToolDescriptionsForAgent(): any[] {
    return this.getAllTools().map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters || {
          type: 'object',
          properties: {},
          required: []
        }
      }
    }));
  }
  
  // Create LangChain Tool instances
  public async createLangChainTools(): Promise<Tool[]> {
    const tools: Tool[] = [];
    
    try {
      // Get all enabled MCP servers
      const servers = await this.repository.findEnabled();
      logger.info(`[MCPTool] Found ${servers.length} enabled MCP servers`);
      
      for (const server of servers) {
        logger.info(`[MCPTool] Found ${server.capabilities.length} enabled MCP servers`);
        // Create a tool for each capability
        if (server.capabilities && server.capabilities.length > 0) {
          for (const capability of server.capabilities) {
            logger.info(`[MCPTool] Creating tool for ${capability.name} capability (server: ${server.name})`);
            const tool = new MCPTool({
              name: `${server.name}-${capability.name}`,  // Full tool name for LLM to use
              description: capability.description,
              mcpServerId: server.id,
              capability: capability.name  // Just the capability name for MCP API calls
            });
            
            tools.push(tool);
            logger.info(`Created MCP tool: ${tool.name} for server ${server.name}`);
          }
        } else {
          // Default capability if none specified
          const tool = new MCPTool({
            name: `${server.name}-default`,
            description: `Interact with ${server.name} MCP server`,
            mcpServerId: server.id,
            capability: 'default'
          });
          
          tools.push(tool);
          logger.info(`Created default MCP tool for server ${server.name}`);
        }
      }
    } catch (error: any) {
      logger.error(`Error creating MCP tools: ${error.message}`);
    }
    
    return tools;
  }
}

// LangChain Tool implementation
export class MCPTool extends Tool {
  private mcpServerId: string;
  private capability: string;
  private mcpService: MCPService;
  public name: string;
  public description: string;
  
  constructor(options: MCPToolOptions) {
    super();
    this.name = options.name;
    this.description = options.description;
    this.mcpServerId = options.mcpServerId;
    this.capability = options.capability;
    this.mcpService = MCPService.getInstance();
  }
  
  // Override the invoke method to correctly pass arguments
  async invoke(input: any, options?: any): Promise<string> {
    logger.info(`[MCPTool] invoke called with input: ${JSON.stringify(input)}`);
    
    // Don't call super.invoke - directly call _call with our input
    return this._call(input);
  }
  
  async _call(input: any): Promise<string> {
    try {
      // Important: Use the capability name as the method name for the MCP server
      // NOT the tool name (which includes server name prefix)
      const result = await this.mcpService.processMCPRequest(
        this.mcpServerId, 
        this.capability,  // This is the specific capability name like "readFile"
        input
      );
      return JSON.stringify(result);
    } catch (error: any) {
      logger.error(`Error calling MCP tool ${this.name}: ${error.message}`);
      return `Error: ${error.message}`;
    }
  }
}

// For backward compatibility - expose the singleton instance as MCPTool
export const MCPToolInstance = MCPToolRegistry; 