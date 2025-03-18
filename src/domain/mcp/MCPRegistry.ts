import { MCPConnector } from './MCPConnector';
import { logger } from '../../utils/logger/winston-logger';
import { MCPConnectorFactory } from './MCPConnectorFactory';
import { MCPServerOptions } from './MCPConnectorFactory';

export interface MCPServerConfig {
  command?: string;
  args?: string[];
  url?: string;
  serverName: string;
  env?: Record<string, string>;
  type?: 'stdio' | 'sse' | string;
}

export class MCPRegistry {
  private static instance: MCPRegistry;
  private connectors: Map<string, MCPConnector> = new Map();
  private servers: Map<string, MCPServerConfig> = new Map();
  
  private constructor() {}
  
  public static getInstance(): MCPRegistry {
    if (!MCPRegistry.instance) {
      MCPRegistry.instance = new MCPRegistry();
    }
    return MCPRegistry.instance;
  }
  
  public registerServer(serverId: string, config: MCPServerConfig): void {
    logger.info(`[MCP] Registering server: ${serverId} (${config.serverName})`);
    
    this.servers.set(serverId, config);
  }
  
  public async getConnector(serverId: string): Promise<MCPConnector> {
    if (this.connectors.has(serverId)) {
      return this.connectors.get(serverId)!;
    }
    
    const options = this.servers.get(serverId);
    if (!options) {
      throw new Error(`Server not registered: ${serverId}`);
    }
    
    // Convert MCPServerConfig to MCPServerOptions
    const connectorOptions: MCPServerOptions = {
      ...options,
      type: options.type || 'stdio',
      serverId: serverId
    };
    
    // Create connector using factory with proper options
    const connector = MCPConnectorFactory.createConnector(connectorOptions);
    
    // Connect to the server
    await connector.connect();
    
    // Store connector
    this.connectors.set(serverId, connector);
    
    return connector;
  }
  
  public getServerIds(): string[] {
    return Array.from(this.connectors.keys());
  }
  
  public async disconnectAll(): Promise<void> {
    logger.info('[MCP] Disconnecting all servers');
    
    const promises = Array.from(this.connectors.values())
      .filter(connector => connector.isConnected())
      .map(connector => connector.disconnect());
    
    await Promise.all(promises);
  }

  /**
   * Disconnect a specific server and remove it from the registry
   */
  public async disconnectServer(serverId: string): Promise<void> {
    const connector = this.connectors.get(serverId);
    
    if (!connector) {
      throw new Error(`Server not found: ${serverId}`);
    }
    
    if (connector.isConnected()) {
      await connector.disconnect();
    }
    
    this.connectors.delete(serverId);
    logger.info(`[MCP] Disconnected server: ${serverId}`);
  }
} 