import { Message } from "../../models/Message";

export interface MessageRepository {
  findById(id: string): Promise<Message | null>;
  findByConversationId(conversationId: string): Promise<Message[]>;
  create(message: Partial<Message>): Promise<Message>;
  update(id: string, message: Partial<Message>): Promise<Message>;
} 