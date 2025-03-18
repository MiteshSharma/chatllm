import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export interface MCPCapability {
  name: string;
  description: string;
}

export enum MCPServerType {
  STDIO = 'stdio',
  SSE = 'sse'
}

@Entity('mcp_servers')
export class MCPServer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({
    type: 'enum',
    enum: MCPServerType,
    default: MCPServerType.STDIO
  })
  type: MCPServerType;

  @Column({ nullable: true })
  command: string;

  @Column('text', { nullable: true })
  args: string[];

  @Column({ nullable: true })
  url: string;

  @Column({ default: true })
  enabled: boolean;

  @Column('jsonb', { nullable: true })
  env: Record<string, string>;
  
  @Column('jsonb', { default: [] })
  capabilities: MCPCapability[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 