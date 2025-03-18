import { MCPConnector } from './MCPConnector';
import { logger } from '../../utils/logger/winston-logger';

interface SSEMCPOptions {
  url: string;
  serverName: string;
  serverId: string;
}

export class SSEMCPConnector extends MCPConnector {
  private options: SSEMCPOptions;
  private client: any;
  private connected = false;
  
  constructor(options: SSEMCPOptions) {
    super();
    this.options = options;
  }
  
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }
    
    try {
      logger.info(`[MCP] Connecting to SSE MCP server: ${this.options.serverName}`);
      
      // Dynamic imports
      const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
      const { SSEClientTransport } = await import('@modelcontextprotocol/sdk/client/sse.js');
      
      // Initialize client here
      this.client = new Client(
        { name: 'mcp-client', version: '1.0.0' },
        { capabilities: {} }
      );
      
      const transport = new SSEClientTransport(new URL(this.options.url));
      
      await this.client.connect(transport);
      this.connected = true;
      logger.info(`[MCP][${this.options.serverName}] Connected successfully`);
      
      // Try to discover tools
      try {
        const tools = await this.client.listTools();
        logger.info(`[MCP][${this.options.serverName}] Available tools: ${JSON.stringify(tools)}`);
      } catch (error) {
        logger.debug(`[MCP][${this.options.serverName}] Server does not support listTools()`);
      }
    } catch (error: any) {
      logger.error(`[MCP][${this.options.serverName}] Connection error: ${error.message}`);
      throw error;
    }
  }
  
  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }
    
    try {
      await this.client.close();
      this.connected = false;
      logger.info(`[MCP][${this.options.serverName}] Disconnected`);
    } catch (error: any) {
      logger.error(`[MCP][${this.options.serverName}] Error disconnecting: ${error.message}`);
      throw error;
    }
  }
  
  async callTool(name: string, args: any): Promise<any> {
    if (!this.connected) {
      throw new Error('Not connected to MCP server');
    }
    
    try {
      logger.debug(`[MCP][${this.options.serverName}] Calling tool: ${name} with args: ${JSON.stringify(args)}`);
      const { CallToolResultSchema } = await import('@modelcontextprotocol/sdk/types.js');
      const result = await this.client.callTool(
        { name, arguments: args },
        CallToolResultSchema
      );
      return result.content;
    } catch (error: any) {
      logger.error(`[MCP][${this.options.serverName}] Error calling tool ${name}: ${error.message}`);
      throw error;
    }
  }
  
  async request(method: string, params: any): Promise<any> {
    // For backward compatibility, map old request() to callTool()
    return this.callTool(method, params);
  }
  
  getServerId(): string {
    return this.options.serverId;
  }
  
  isConnected(): boolean {
    return this.connected;
  }
} 