import { DataSource } from "typeorm";
import { config } from "../utils/config/index";
import { Conversation } from "../models/Conversation";
import { Message } from "../models/Message";
import { TokenUsage } from "../models/TokenUsage";
import { Model } from "../models/Model";
import { ModelCapability } from "../models/ModelCapability";
import { ModelRequiredRole } from "../models/ModelRequiredRole";
import { ModelSupportedEndpoint } from "../models/ModelSupportedEndpoint";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";
import { OpenAPISpec } from "../models/OpenAPISpec";
import { MCPServer } from "../models/MCPServer";


export const AppDataSource = new DataSource({
  type: "postgres",
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.database,
  synchronize: false, // Set to false in production
  logging: config.database.logging || false,
  entities: [
    Conversation, 
    Message, 
    TokenUsage, 
    Model,
    ModelCapability,
    ModelRequiredRole,
    ModelSupportedEndpoint,
    OpenAPISpec,
    MCPServer
  ],
  migrations: ["src/migrations/*.ts"],
  subscribers: [],
  namingStrategy: new SnakeNamingStrategy()
}); 