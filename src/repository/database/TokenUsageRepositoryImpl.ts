import { Repository } from "typeorm";
import { TokenUsage } from "../../models/TokenUsage";
import { TokenUsageRepository } from "./TokenUsageRepository";
import { AppDataSource } from "../config";

export class TokenUsageRepositoryImpl implements TokenUsageRepository {
  private repository: Repository<TokenUsage>;
  
  constructor() {
    this.repository = AppDataSource.getRepository(TokenUsage);
  }
  
  async create(tokenUsage: Partial<TokenUsage>): Promise<TokenUsage> {
    const newTokenUsage = this.repository.create(tokenUsage);
    return this.repository.save(newTokenUsage);
  }
} 