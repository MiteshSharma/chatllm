import { Conversation } from "../../models/Conversation";

export interface ConversationRepository {
  findById(id: string): Promise<Conversation | null>;
  create(conversation: Partial<Conversation>): Promise<Conversation>;
  update(id: string, conversation: Partial<Conversation>): Promise<Conversation>;
  incrementMessageCount(id: string, tokenCount: number): Promise<void>;
} 