import { Repository } from "typeorm";
import { Conversation } from "../../models/Conversation";
import { ConversationRepository } from "./ConversationRepository";
import { AppDataSource } from "../config";

export class ConversationRepositoryImpl implements ConversationRepository {
  private repository: Repository<Conversation>;
  
  constructor() {
    this.repository = AppDataSource.getRepository(Conversation);
  }
  
  async findById(id: string): Promise<Conversation | null> {
    return this.repository.findOneBy({ id });
  }
  
  async create(conversation: Partial<Conversation>): Promise<Conversation> {
    const newConversation = this.repository.create(conversation);
    return this.repository.save(newConversation);
  }
  
  async update(id: string, conversation: Partial<Conversation>): Promise<Conversation> {
    await this.repository.update(id, conversation);
    const updated = await this.repository.findOneBy({ id });
    if (!updated) {
      throw new Error(`Conversation with id ${id} not found`);
    }
    return updated;
  }
  
  async incrementMessageCount(id: string, tokenCount: number): Promise<void> {
    await this.repository.increment({ id }, "messageCount", 1);
    await this.repository.increment({ id }, "tokenCount", tokenCount);
  }
} 