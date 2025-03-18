import { Repository } from 'typeorm';
import { AppDataSource } from '../config';
import { MCPServer } from '../../models/MCPServer';

export class MCPServerRepository {
  private repository: Repository<MCPServer>;

  constructor() {
    this.repository = AppDataSource.getRepository(MCPServer);
  }

  async findAll(): Promise<MCPServer[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<MCPServer | null> {
    return this.repository.findOneBy({ id });
  }

  async findEnabled(): Promise<MCPServer[]> {
    return this.repository.findBy({ enabled: true });
  }

  async create(mcpServer: Partial<MCPServer>): Promise<MCPServer> {
    const newServer = this.repository.create(mcpServer);
    return this.repository.save(newServer);
  }

  async update(id: string, mcpServer: Partial<MCPServer>): Promise<MCPServer | null> {
    await this.repository.update(id, mcpServer);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected !== 0;
  }
} 