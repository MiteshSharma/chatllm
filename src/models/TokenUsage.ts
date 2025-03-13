import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn
} from "typeorm";
import { Conversation } from "./Conversation";
import { Message } from "./Message";
import { RequestType } from "./RequestType";

@Entity("token_usage")
export class TokenUsage {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id", type: "uuid" })
  userId: string;

  @CreateDateColumn({ name: "timestamp" })
  timestamp: Date;

  @Column({ name: "conversation_id", type: "uuid", nullable: true })
  conversationId: string;

  @ManyToOne(() => Conversation, { nullable: true })
  @JoinColumn({ name: "conversation_id" })
  conversation: Conversation;

  @Column({ name: "message_id", type: "uuid", nullable: true })
  messageId: string;

  @ManyToOne(() => Message, { nullable: true })
  @JoinColumn({ name: "message_id" })
  message: Message;

  @Column({ type: "varchar", length: 100 })
  model: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  endpoint: string;

  @Column({ name: "prompt_tokens", type: "integer", default: 0 })
  promptTokens: number;

  @Column({ name: "completion_tokens", type: "integer", default: 0 })
  completionTokens: number;

  @Column({ name: "total_tokens", type: "integer", default: 0 })
  totalTokens: number;

  @Column({ name: "prompt_cost", type: "decimal", precision: 10, scale: 6, default: 0 })
  promptCost: number;

  @Column({ name: "completion_cost", type: "decimal", precision: 10, scale: 6, default: 0 })
  completionCost: number;

  @Column({ name: "total_cost", type: "decimal", precision: 10, scale: 6, default: 0 })
  totalCost: number;

  @Column({ name: "request_type", type: "enum", enum: RequestType, default: RequestType.MESSAGE })
  requestType: RequestType;
} 