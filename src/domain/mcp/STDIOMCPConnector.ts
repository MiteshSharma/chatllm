import { ChildProcess, spawn } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { MCPConnector } from './MCPConnector';
import { logger } from '../../utils/logger/winston-logger';

interface STDIOMCPOptions {
  command: string;
  args: string[];
  serverName: string;
  serverId: string;
  env?: Record<string, string>;
}

export class STDIOMCPConnector extends MCPConnector {
  private client: Client;
  private process: ChildProcess | null = null;
  private connected = false;
  private options: STDIOMCPOptions;
  
  constructor(options: STDIOMCPOptions) {
    super();
    this.options = options;
    
    // Initialize MCP client
    this.client = new Client(
      {
        name: 'mcp-client',
        version: '1.0.0',
      },
      {
        capabilities: {}, 
      }
    );
  }
  
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }
    
    try {
      logger.info(`[MCP] Connecting to MCP server: ${this.options.serverName}`);
      
      // Create the transport
      const transport = new StdioClientTransport({
        command: this.options.command,
        args: this.options.args,
        env: this.options.env || Object.fromEntries(
          Object.entries(process.env).filter(([_, v]) => v !== undefined)
        ) as Record<string, string>
      });
      
      // Access process safely using type assertion
      const childProcess = (transport as any).process as ChildProcess | undefined;
      
      // Store process for logging and cleanup
      if (childProcess) {
        this.process = childProcess;
        
        // Add logging for stderr
        if (this.process.stderr) {
          this.process.stderr.on('data', (data) => {
            logger.debug(`[MCP][${this.options.serverName}] STDERR: ${data.toString().trim()}`);
          });
        }
        
        // Log process ID
        logger.info(`[MCP][${this.options.serverName}] Process started with PID: ${this.process.pid}`);
      } else {
        logger.warn(`[MCP][${this.options.serverName}] Cannot access process directly`);
      }
      
      // Connect the client
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
      logger.info(`${JSON.stringify(args)}`);
      logger.debug(`[MCP][${this.options.serverName}] Calling tool: ${name} with args: ${JSON.stringify(args)}`);
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