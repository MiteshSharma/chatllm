// Import dotenv and configure it at the top of the file
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ 
  path: path.resolve(process.cwd(), '.env') 
});

// Log environment loading
console.log('Environment variables loaded from:', path.resolve(process.cwd(), '.env'));
console.log('NODE_ENV:', process.env.NODE_ENV);

// Configuration management with proper typing
interface ServerConfig {
  port: number;
  env: string;
}

interface LoggingConfig {
  level: string;
}

interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  logging?: boolean;
}

interface OpenAIConfig {
  apiKey: string | undefined;
  endpoint: string;
}

interface MCPServerConfig {
  name: string;
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
}

interface MCPConfig {
  servers: MCPServerConfig[];
  defaultTimeout?: number;
}

interface AppConfig {
  server: ServerConfig;
  logging: LoggingConfig;
  database: DatabaseConfig;
  openai: OpenAIConfig;
  mcp?: MCPConfig;
}

export const config: AppConfig = {
  logging: {
    level: process.env.LOG_LEVEL || "info",
  },
  server: {
    env: process.env.NODE_ENV || "development",
    port: parseInt(process.env.PORT || "3000", 10),
  },
  database: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    username: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "chat_llm",
    logging: process.env.DB_LOGGING === "true",
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    endpoint: process.env.OPENAI_ENDPOINT || "https://api.openai.com/v1"
  },
  mcp: {
    servers: [
      // Configure MCP servers here
    ],
    defaultTimeout: 5000
  }
  // Add more configuration as needed
};
