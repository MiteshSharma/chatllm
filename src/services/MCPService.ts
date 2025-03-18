import { MCPRegistry } from '../domain/mcp/MCPRegistry';
import { MCPConnector } from '../domain/mcp/MCPConnector';
import { logger } from '../utils/logger/winston-logger';
import { v4 as uuidv4 } from 'uuid';
import { MCPServerOptions } from '../domain/mcp/MCPConnectorFactory';
import { MCPCapability } from '../models/MCPServer';

export interface MCPServerConfig {
  type?: 'stdio' | 'sse' | string;
  command?: string;
  args?: string[];
  url?: string;
  serverName: string;
  serverId?: string;
  capabilities?: MCPCapability[];
}

export class MCPService {
  private static instance: MCPService;
  private registry: MCPRegistry;

  private constructor() {
    this.registry = MCPRegistry.getInstance();
  }

  public static getInstance(): MCPService {
    if (!MCPService.instance) {
      MCPService.instance = new MCPService();
    }
    return MCPService.instance;
  }

  /**
   * Register a new MCP server with the service
   */
  public registerServer(config: MCPServerConfig): string {
    // Use provided serverId or generate a new one
    const serverId = config.serverId || `mcp-${uuidv4()}`;
    
    try {
      // Parse args if it's a string
      let args = config.args;
      if (args && typeof args === 'string') {
        try {
          // Try parsing as JSON
          args = JSON.parse(args);
        } catch (e) {
          // If not valid JSON, try parsing from PostgreSQL array format
          if (typeof args === 'string' && (args as string).startsWith('{') && (args as string).endsWith('}')) {
            args = (args as string)
              .substring(1, (args as string).length - 1)
              .split(',')
              .map(arg => {
                const trimmed = arg.trim();
                return trimmed.startsWith('"') && trimmed.endsWith('"') 
                  ? trimmed.substring(1, trimmed.length - 1) 
                  : trimmed;
              });
          }
        }
      }
      
      // Create connector options
      const connectorOptions: MCPServerOptions = {
        type: config.type || 'stdio',
        command: config.command,
        args: Array.isArray(args) ? args : [],  // Ensure args is an array
        serverName: config.serverName,
        serverId: serverId,
        url: config.url,
        capabilities: config.capabilities,
        env: Object.fromEntries(
          Object.entries(process.env).filter(([_, v]) => v !== undefined)
        ) as Record<string, string>
      };
      
      // Register the server
      this.registry.registerServer(serverId, connectorOptions);
      
      logger.info(`[MCPService] Registered ${config.type} server: ${config.serverName} with ID: ${serverId}`);
      return serverId;
    } catch (error: any) {
      logger.error(`[MCPService] Failed to register server: ${error.message}`);
      throw new Error(`Failed to register MCP server: ${error.message}`);
    }
  }

  /**
   * Get a connector for a registered server by ID
   */
  public async getConnector(serverId: string): Promise<MCPConnector> {
    try {
      return await this.registry.getConnector(serverId);
    } catch (error: any) {
      logger.error(`[MCPService] Failed to get connector for server ${serverId}: ${error.message}`);
      throw new Error(`Failed to get MCP connector: ${error.message}`);
    }
  }

  /**
   * Disconnect all MCP servers
   */
  public async disconnectAll(): Promise<void> {
    try {
      await this.registry.disconnectAll();
      logger.info('[MCPService] Disconnected all MCP servers');
    } catch (error: any) {
      logger.error(`[MCPService] Error disconnecting servers: ${error.message}`);
    }
  }

  /**
   * Get all registered MCP server IDs
   */
  public getAllMCPServers(): string[] {
    return this.registry.getServerIds();
  }

  /**
   * Process an MCP request
   */
  public async processMCPRequest(serverId: string, method: string, params: any): Promise<any> {
    try {
      const connector = await this.getConnector(serverId);
      return await connector.callTool(method, params);
    } catch (error: any) {
      logger.error(`[MCPService] Failed to process request: ${error.message}`);
      throw new Error(`Failed to process MCP request: ${error.message}`);
    }
  }

  /**
   * Disconnect a specific MCP server
   */
  public async disconnectServer(serverId: string): Promise<void> {
    try {
      await this.registry.disconnectServer(serverId);
      logger.info(`[MCPService] Disconnected MCP server: ${serverId}`);
    } catch (error: any) {
      logger.error(`[MCPService] Error disconnecting server ${serverId}: ${error.message}`);
      throw new Error(`Failed to disconnect MCP server: ${error.message}`);
    }
  }
} 