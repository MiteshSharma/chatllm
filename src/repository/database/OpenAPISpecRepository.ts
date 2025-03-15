import { Repository } from "typeorm";
import { AppDataSource } from "../config";
import { OpenAPISpec } from "../../models/OpenAPISpec";

export interface OpenAPISpecData {
  id?: string;
  name: string;
  description?: string;
  specContent: string;
  authConfig?: Record<string, any>;
  isEnabled?: boolean;
  createdBy?: string;
}

export class OpenAPISpecRepository {
  private repository: Repository<OpenAPISpec>;

  constructor() {
    this.repository = AppDataSource.getRepository(OpenAPISpec);
  }

  async create(data: OpenAPISpecData): Promise<OpenAPISpec> {
    const spec = this.repository.create(data);
    return this.repository.save(spec);
  }

  async findById(id: string): Promise<OpenAPISpec | null> {
    return this.repository.findOneBy({ id });
  }

  async findAll(): Promise<OpenAPISpec[]> {
    return this.repository.find({
      where: { isEnabled: true },
      order: { createdAt: "DESC" }
    });
  }

  async update(id: string, data: Partial<OpenAPISpecData>): Promise<OpenAPISpec | null> {
    await this.repository.update(id, data);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected !== 0;
  }
} 