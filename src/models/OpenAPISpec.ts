import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from "typeorm";

@Entity("openapi_specs")
export class OpenAPISpec {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column("text")
  specContent: string; // Full OpenAPI spec as JSON string

  @Column({ nullable: true, type: "jsonb" })
  authConfig?: Record<string, any>; // Authentication config

  @Column({ default: true })
  isEnabled: boolean;

  @Column({ nullable: true })
  createdBy?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 