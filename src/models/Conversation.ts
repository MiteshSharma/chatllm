import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from "typeorm";
import { Message } from "./Message";
import { Model } from "./Model";

@Entity("conversations")
export class Conversation {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id", type: "uuid", nullable: true })
  userId: string;

  @Column({ name: "model_id", type: "uuid", nullable: true })
  modelId: string;

  @ManyToOne(() => Model)
  @JoinColumn({ name: "model_id" })
  model: Model;

  @Column({ name: "endpoint_id", type: "varchar", length: 100, nullable: true })
  endpointId: string;

  @Column({ name: "title", type: "varchar", length: 255, default: "New Conversation" })
  title: string;

  @Column({ name: "system_message", type: "text", nullable: true })
  systemMessage: string;

  @Column({ name: "message_count", type: "integer", default: 0 })
  messageCount: number;

  @Column({ name: "token_count", type: "integer", default: 0 })
  tokenCount: number;

  @Column("jsonb", {
    default: {
      temperature: 0.7,
      top_p: 0.9,
      presence_penalty: 0,
      frequency_penalty: 0,
      max_tokens: 2048
    }
  })
  settings: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Message, message => message.conversation)
  messages: Message[];
} 