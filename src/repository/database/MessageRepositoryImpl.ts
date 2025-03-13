import { Repository } from "typeorm";
import { Message } from "../../models/Message";
import { MessageRepository } from "./MessageRepository";
import { AppDataSource } from "../config";

export class MessageRepositoryImpl implements MessageRepository {
  private repository: Repository<Message>;
  
  constructor() {
    this.repository = AppDataSource.getRepository(Message);
  }
  
  async findById(id: string): Promise<Message | null> {
    return this.repository.findOneBy({ id });
  }
  
  async findByConversationId(conversationId: string): Promise<Message[]> {
    return this.repository.find({ 
      where: { conversationId },
      order: { createdAt: "ASC" } 
    });
  }
  
  async create(message: Partial<Message>): Promise<Message> {
    const newMessage = this.repository.create(message);
    return this.repository.save(newMessage);
  }
  
  async update(id: string, message: Partial<Message>): Promise<Message> {
    await this.repository.update(id, message);
    const updated = await this.repository.findOneBy({ id });
    if (!updated) {
      throw new Error(`Message with id ${id} not found`);
    }
    return updated;
  }
} 