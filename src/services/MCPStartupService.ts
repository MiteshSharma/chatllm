import { MCPServerRepository } from '../repository/database/MCPServerRepository';
import { MCPService } from './MCPService';
import { logger } from '../utils/logger/winston-logger';

export class MCPStartupService {
  private repository: MCPServerRepository;
  private mcpService: MCPService;
  
  constructor() {
    this.repository = new MCPServerRepository();
    this.mcpService = MCPService.getInstance();
  }
  
  async initializeServers(): Promise<void> {
    try {
      logger.info('Initializing MCP servers from database...');
      
      // Get all enabled servers from the database
      const servers = await this.repository.findEnabled();
      
      // Register each server with the MCP service
      for (const server of servers) {
        try {
          logger.info(`Registering MCP server: ${server.name} (${server.id})`);
          
          await this.mcpService.registerServer({
            type: server.type,
            command: server.command,
            args: server.args,
            url: server.url,
            serverName: server.name,
            serverId: server.id,
            capabilities: server.capabilities
          });
          
          logger.info(`MCP server registered: ${server.name}`);
        } catch (error: any) {
          logger.error(`Failed to register MCP server ${server.name}: ${error.message}`);
        }
      }
      
      logger.info(`MCP initialization complete. ${servers.length} servers registered.`);
    } catch (error: any) {
      logger.error(`Error initializing MCP servers: ${error.message}`);
    }
  }
} 