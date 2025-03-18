import { logger } from '../../utils/logger/winston-logger';
import { MCPConnector } from './MCPConnector';
import { MCPService, MCPServerConfig } from '../../services/MCPService';

export class MCPConnectionManager {
  private static instance: MCPConnectionManager;
  private connections: Map<string, MCPConnector> = new Map();
  private mcpService: MCPService;
  
  private constructor() {
    this.mcpService = MCPService.getInstance();
  }
  
  public static getInstance(): MCPConnectionManager {
    if (!MCPConnectionManager.instance) {
      MCPConnectionManager.instance = new MCPConnectionManager();
    }
    return MCPConnectionManager.instance;
  }
  
  // Create a new MCP connection
  public createConnection(config: MCPServerConfig): string {
    const serverId = this.mcpService.registerServer(config);
    
    logger.info(`[MCP] Created connection for server ${config.serverName} (${serverId})`);
    return serverId;
  }
  
  // Get a connection by ID
  public async getConnection(serverId: string): Promise<MCPConnector> {
    try {
      const connector = await this.mcpService.getConnector(serverId);
      this.connections.set(serverId, connector);
      return connector;
    } catch (error: any) {
      logger.error(`[MCP] Failed to get connection for server ${serverId}:`, error);
      throw error;
    }
  }
  
  // Get all connections
  public getAllConnections(): MCPConnector[] {
    return Array.from(this.connections.values());
  }
  
  // Get all server IDs
  public getAllServerIds(): string[] {
    return Array.from(this.connections.keys());
  }
  
  // Connect all servers
  public async connectAll(): Promise<void> {
    const serverIds = this.getAllServerIds();
    
    for (const serverId of serverIds) {
      try {
        await this.getConnection(serverId);
        logger.info(`[MCP] Connected to server ${serverId}`);
      } catch (error: any) {
        logger.error(`[MCP] Failed to connect to server ${serverId}:`, error);
      }
    }
  }
  
  // Disconnect all servers
  public async disconnectAll(): Promise<void> {
    await this.mcpService.disconnectAll();
    logger.info(`[MCP] Disconnected from all MCP servers`);
  }
} 