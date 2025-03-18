import { Request, Response } from 'express';
import { MCPServerRepository } from '../../repository/database/MCPServerRepository';
import { MCPService } from '../../services/MCPService';
import { logger } from '../../utils/logger/winston-logger';
import { MCPServer } from '@/models/MCPServer';

export class MCPServerController {
  private repository: MCPServerRepository;
  private mcpService: MCPService;

  constructor() {
    this.repository = new MCPServerRepository();
    this.mcpService = MCPService.getInstance();
  }

  async getAllServers(req: Request, res: Response): Promise<void> {
    try {
      const servers = await this.repository.findAll();
      res.status(200).json(servers);
    } catch (error: any) {
      logger.error(`Error getting MCP servers: ${error.message}`);
      res.status(500).json({ error: 'Failed to get MCP servers' });
    }
  }

  async getServerById(req: Request, res: Response): Promise<void> {
    try {
      const server = await this.repository.findById(req.params.id);
      if (!server) {
        res.status(404).json({ error: 'MCP server not found' });
        return;
      }
      res.status(200).json(server);
    } catch (error: any) {
      logger.error(`Error getting MCP server: ${error.message}`);
      res.status(500).json({ error: 'Failed to get MCP server' });
    }
  }

  async createServer(req: Request, res: Response): Promise<void> {
    try {
      const { name, type, command, args, url, capabilities } = req.body;
      
      // Validate capabilities format if provided
      if (capabilities && !Array.isArray(capabilities)) {
        res.status(400).json({ error: 'Capabilities must be an array' });
        return;
      }
      
      if (capabilities) {
        const validCapabilities = capabilities.every(
          (cap: any) => typeof cap.name === 'string' && typeof cap.description === 'string'
        );
        
        if (!validCapabilities) {
          res.status(400).json({ 
            error: 'Each capability must have a name and description as strings' 
          });
          return;
        }
      }
      
      if (!name) {
        res.status(400).json({ error: 'Name is required' });
        return;
      }
      
      if (type === 'stdio' && (!command)) {
        res.status(400).json({ error: 'Command is required for STDIO MCP server' });
        return;
      }
      
      if (type === 'sse' && (!url)) {
        res.status(400).json({ error: 'URL is required for SSE MCP server' });
        return;
      }
      
      const newServer = await this.repository.create(req.body);
      
      // Register with MCP service if enabled
      if (newServer.enabled) {
        await this.registerServerWithMCP(newServer);
      }
      
      res.status(201).json(newServer);
    } catch (error: any) {
      logger.error(`Error creating MCP server: ${error.message}`);
      res.status(500).json({ error: 'Failed to create MCP server' });
    }
  }

  async updateServer(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const server = await this.repository.findById(id);
      
      if (!server) {
        res.status(404).json({ error: 'MCP server not found' });
        return;
      }
      
      const wasEnabled = server.enabled;
      const updatedServer = await this.repository.update(id, req.body);
      
      if (!updatedServer) {
        res.status(500).json({ error: 'Failed to update MCP server' });
        return;
      }
      
      // Handle enabled status change
      if (!wasEnabled && updatedServer.enabled) {
        // Server was re-enabled, register it
        await this.registerServerWithMCP(updatedServer);
      } else if (wasEnabled && !updatedServer.enabled) {
        // Server was disabled, disconnect it
        try {
          await this.mcpService.disconnectServer(id);
        } catch (error) {
          logger.warn(`Could not disconnect server ${id}: ${error}`);
        }
      } else if (wasEnabled && updatedServer.enabled) {
        // Server remained enabled but config might have changed, reconnect
        try {
          await this.mcpService.disconnectServer(id);
        } catch (error) {
          logger.warn(`Could not disconnect server ${id} for reconnection: ${error}`);
        }
        await this.registerServerWithMCP(updatedServer);
      }
      
      res.status(200).json(updatedServer);
    } catch (error: any) {
      logger.error(`Error updating MCP server: ${error.message}`);
      res.status(500).json({ error: 'Failed to update MCP server' });
    }
  }

  async deleteServer(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const server = await this.repository.findById(id);
      
      if (!server) {
        res.status(404).json({ error: 'MCP server not found' });
        return;
      }
      
      // Disconnect if enabled
      if (server.enabled) {
        try {
          await this.mcpService.disconnectServer(id);
        } catch (error) {
          logger.warn(`Could not disconnect server ${id} before deletion: ${error}`);
        }
      }
      
      const deleted = await this.repository.delete(id);
      
      if (!deleted) {
        res.status(500).json({ error: 'Failed to delete MCP server' });
        return;
      }
      
      res.status(204).send();
    } catch (error: any) {
      logger.error(`Error deleting MCP server: ${error.message}`);
      res.status(500).json({ error: 'Failed to delete MCP server' });
    }
  }

  private async registerServerWithMCP(server: MCPServer): Promise<void> {
    try {
      await this.mcpService.registerServer({
        type: server.type,
        command: server.command,
        args: server.args,
        url: server.url,
        serverName: server.name,
        serverId: server.id,
        capabilities: server.capabilities
      });
    } catch (error: any) {
      logger.error(`Failed to register MCP server with service: ${error.message}`);
      throw error;
    }
  }
} 