import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from "typeorm";
import { ModelCapability } from "./ModelCapability";
import { ModelRequiredRole } from "./ModelRequiredRole";
import { ModelSupportedEndpoint } from "./ModelSupportedEndpoint";

@Entity("models")
export class Model {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ length: 100, unique: true })
  name!: string;

  @Column({ length: 100, nullable: true })
  displayName: string;

  @Column({ length: 50 })
  provider: string;

  @Column("decimal", { precision: 10, scale: 6, default: 0 })
  inputPerMillion: number;

  @Column("decimal", { precision: 10, scale: 6, default: 0 })
  outputPerMillion: number;

  @Column("integer")
  contextWindow: number;

  @Column("integer", { nullable: true })
  maxResponseTokens: number;

  @Column("boolean", { default: true })
  enabled: boolean;

  @Column("integer", { nullable: true })
  systemTokenLimit: number;

  @Column("integer", { nullable: true })
  displayOrder: number;

  @Column("text", { nullable: true })
  iconUrl: string;

  @Column("boolean", { default: false })
  deprecated: boolean;

  @Column("jsonb", { 
    default: {
      temperature: 0.7,
      top_p: 0.9,
      presence_penalty: 0,
      frequency_penalty: 0
    }
  })
  defaultParameters: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => ModelCapability, capability => capability.model)
  capabilities: ModelCapability[];

  @OneToMany(() => ModelRequiredRole, requiredRole => requiredRole.model)
  requiredRoles: ModelRequiredRole[];

  @OneToMany(() => ModelSupportedEndpoint, supportedEndpoint => supportedEndpoint.model)
  supportedEndpoints: ModelSupportedEndpoint[];
} 