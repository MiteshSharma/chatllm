import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from "typeorm";
import { Conversation } from "./Conversation";
import { MessageRole } from "./MessageRole";

@Entity("messages")
export class Message {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "conversation_id", type: "uuid" })
  conversationId: string;

  @ManyToOne(() => Conversation, conversation => conversation.messages)
  @JoinColumn({ name: "conversation_id" })
  conversation: Conversation;

  @Column({ name: "user_id", type: "uuid", nullable: true })
  userId: string | null;

  @Column({ name: "parent_message_id", type: "uuid", nullable: true })
  parentMessageId: string | null;

  @ManyToOne(() => Message)
  @JoinColumn({ name: "parent_message_id" })
  parentMessage: Message;

  @Column({ type: "enum", enum: MessageRole })
  role: MessageRole;

  @Column({ type: "text" })
  content: string;

  @Column({ name: "token_count", type: "integer", default: 0 })
  tokenCount: number;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any> | null;

  @Column("boolean", { default: false })
  agentMode: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
} 