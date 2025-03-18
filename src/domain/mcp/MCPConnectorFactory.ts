import { MCPConnector } from './MCPConnector';
import { STDIOMCPConnector } from './STDIOMCPConnector';
import { SSEMCPConnector } from './SSEMCPConnector';
import { logger } from '../../utils/logger/winston-logger';
import { MCPCapability } from '../../models/MCPServer';

export interface MCPServerOptions {
  type: 'stdio' | 'sse' | string;
  command?: string;
  args?: string[];
  serverName: string;
  serverId: string;
  url?: string;
  env?: Record<string, string>;
  capabilities?: MCPCapability[];
}

export class MCPConnectorFactory {
  /**
   * Create an appropriate MCPConnector based on type
   */
  static createConnector(options: MCPServerOptions): MCPConnector {
    logger.info(`Creating ${options.type} connector for ${options.serverName}`);
    
    switch (options.type) {
      case 'stdio':
        if (!options.command) {
          throw new Error('Command is required for STDIO connector');
        }
        return new STDIOMCPConnector({
          command: options.command,
          args: options.args || [],
          serverName: options.serverName,
          serverId: options.serverId,
          env: options.env
        });
        
      case 'sse':
        if (!options.url) {
          throw new Error('URL is required for SSE connector');
        }
        return new SSEMCPConnector({
          url: options.url,
          serverName: options.serverName,
          serverId: options.serverId
        });
        
      default:
        throw new Error(`Unsupported connector type: ${options.type}`);
    }
  }
} 