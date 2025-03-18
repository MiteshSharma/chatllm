import { EventEmitter } from 'events';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { ResourceListChangedNotificationSchema } from '@modelcontextprotocol/sdk/types.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { logger } from '../../utils/logger/winston-logger';

// Connection states for state management
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

// Base options that all connections need
export interface MCPConnectionOptions {
  serverId: string;
  serverName: string;
  capabilities: string[];
  debug?: boolean;
}

export abstract class MCPConnection extends EventEmitter {
  protected client: Client;
  protected transport: Transport | null = null;
  protected connectionState: ConnectionState = 'disconnected';
  protected connectPromise: Promise<void> | null = null;
  protected lastError: Error | null = null;
  protected reconnectAttempts = 0;
  protected maxReconnectAttempts = 5;
  protected reconnectDelay = 2000; // ms
  protected serverId: string;
  protected serverName: string;
  protected capabilities: string[];
  protected debug: boolean;

  constructor(options: MCPConnectionOptions) {
    super();
    this.serverId = options.serverId;
    this.serverName = options.serverName;
    this.capabilities = options.capabilities;
    this.debug = options.debug || false;

    // Initialize client with basic info
    this.client = new Client(
      {
        name: 'mcp-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    // Set up reconnection logic
    this.on('connectionChange', (state: ConnectionState) => {
      if (state === 'error' && this.connectionState !== 'connecting') {
        this.handleReconnection();
      }
    });
  }

  // Abstract method to be implemented by specific protocols
  protected abstract constructTransport(): Transport;

  // Connect to the MCP server
  async connect(): Promise<void> {
    // Check if already connected
    if (this.connectionState === 'connected') {
      return;
    }

    // Handle pending connection
    if (this.connectPromise) {
      return this.connectPromise;
    }

    // Signal connection attempt
    this.emit('connectionChange', 'connecting');

    this.connectPromise = (async () => {
      try {
        // Clean up existing connection
        if (this.transport) {
          try {
            await this.client.close();
            this.transport = null;
          } catch (error: any) {
            logger.warn(`[MCP][${this.serverName}] Error closing connection:`, error);
          }
        }

        // Create transport using protocol-specific implementation
        this.transport = this.constructTransport();
        
        // Set up debug handlers
        this.setupTransportDebugHandlers();

        // Connect with timeout protection
        const connectTimeout = 10000;
        await Promise.race([
          this.client.connect(this.transport),
          new Promise((_resolve, reject) =>
            setTimeout(() => reject(new Error('Connection timeout')), connectTimeout),
          ),
        ]);

        // Subscribe to resource change notifications
        this.setupNotificationHandlers();

        // Update state
        this.connectionState = 'connected';
        this.emit('connectionChange', 'connected');
        this.reconnectAttempts = 0;
        
        logger.info(`[MCP][${this.serverName}] Connected successfully`);
      } catch (error: any) {
        // Handle connection error
        this.connectionState = 'error';
        this.emit('connectionChange', 'error');
        this.lastError = error instanceof Error ? error : new Error(String(error));
        
        logger.error(`[MCP][${this.serverName}] Connection error:`, error);
        throw error;
      } finally {
        this.connectPromise = null;
      }
    })();

    return this.connectPromise;
  }

  // Disconnect from the server
  async disconnect(): Promise<void> {
    if (this.connectionState === 'disconnected') {
      return;
    }

    try {
      if (this.client) {
        await this.client.close();
      }
    } catch (error: any) {
      logger.warn(`[MCP][${this.serverName}] Error during disconnect:`, error);
    } finally {
      this.transport = null;
      this.connectionState = 'disconnected';
      this.emit('connectionChange', 'disconnected');
    }
  }

  // Send a request to the MCP server
  async sendRequest<T = any>(method: string, params: any = {}): Promise<T> {
    if (this.connectionState !== 'connected') {
      throw new Error(`MCP server ${this.serverId} is not connected`);
    }

    try {
      if (this.debug) {
        logger.debug(`[MCP][${this.serverName}] Sending request:`, { method, params });
      }
      
      // Use type assertion to bypass TypeScript errors with SDK
      const anyClient = this.client as any;
      const result = await anyClient.request(method, params, { timeout: 180000 });
      
      if (this.debug) {
        logger.debug(`[MCP][${this.serverName}] Received response:`, result);
      }
      
      return result as T;
    } catch (error: any) {
      logger.error(`[MCP][${this.serverName}] Request error:`, error);
      this.emit('connectionChange', 'error');
      throw error;
    }
  }

  // Get server capabilities
  async getCapabilities(): Promise<any> {
    try {
      return this.client.getServerCapabilities();
    } catch (error: any) {
      logger.error(`[MCP][${this.serverName}] Error getting capabilities:`, error);
      return {};
    }
  }

  // Check if connected
  isConnected(): boolean {
    return this.connectionState === 'connected';
  }

  // Get server ID
  getServerId(): string {
    return this.serverId;
  }

  // Get the list of supported capabilities
  getSupportedCapabilities(): string[] {
    return this.capabilities;
  }

  // Set up handlers for resource change notifications
  private setupNotificationHandlers(): void {
    this.client.setNotificationHandler(ResourceListChangedNotificationSchema, () => {
      this.emit('resourcesChanged');
      if (this.debug) {
        logger.debug(`[MCP][${this.serverName}] Resources changed`);
      }
    });
  }

  // Set up debug handlers for transport events
  protected setupTransportDebugHandlers(): void {
    if (!this.transport) return;

    // Handle different transport types
    const transport = this.transport as any;
    
    if (typeof transport.on === 'function') {
      transport.on('error', (error: any) => {
        logger.error(`[MCP][${this.serverName}] Transport error:`, error);
        this.emit('error', error);
      });
    }

    if (typeof this.transport.onerror === 'function') {
      const originalHandler = this.transport.onerror;
      this.transport.onerror = (error: any) => {
        logger.error(`[MCP][${this.serverName}] Transport error:`, error);
        this.emit('error', error);
        if (originalHandler) originalHandler(error);
      };
    }
  }

  // Reconnection logic
  private async handleReconnection(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error(`[MCP][${this.serverName}] Max reconnection attempts reached`);
      return;
    }

    this.reconnectAttempts++;
    logger.info(`[MCP][${this.serverName}] Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

    // Exponential backoff
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      await this.connect();
      logger.info(`[MCP][${this.serverName}] Reconnected successfully`);
    } catch (error: any) {
      logger.error(`[MCP][${this.serverName}] Reconnection failed:`, error);
    }
  }
} 