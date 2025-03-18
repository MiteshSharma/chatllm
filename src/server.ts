import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import { config } from "dotenv";
import express, { 
  Express, 
  NextFunction, 
  Request, 
  Response 
} from "express";
import helmet from "helmet";
import morgan from "morgan";
import "reflect-metadata";
import { AppDataSource } from "./repository/config";

import { registerRoutes } from "./api";
import { errorHandler } from "./api/middleware/error-handler";
import { logger } from "./utils/logger/winston-logger";
import { ToolInitService } from "./services/ToolInitService";
import { OpenAPIToolsService } from "./services/OpenAPIToolsService";
import { ToolRegistry } from "./domain/agent/ToolRegistry";
import { MCPToolRegistry } from "./domain/agent/tools/MCPTool";
import { MCPStartupService } from "./services/MCPStartupService";

// Load environment variables
config();

// Create Express app
const app: Express = express();
const port: number = parseInt(process.env.PORT || "3000", 10);
const isProduction = process.env.NODE_ENV === "production";

// Security and utility middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging
app.use(morgan(isProduction ? "combined" : "dev"));

// Register API routes
registerRoutes(app);

// Basic health check
(app as any).get("/health", (req: Request, res: Response): void => {
  res.status(200).json({ status: "OK" });
});

// Error handling middleware - proper type assertion 
app.use(((err: any, req: Request, res: Response, next: NextFunction) => {
  errorHandler(err instanceof Error ? err : new Error(String(err)), req, res, next);
}) as express.ErrorRequestHandler);

// Add this before initializing AppDataSource
console.log("Database config:", {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD ? "***" : undefined,
  database: process.env.DB_NAME
});

async function startServer() {
  try {
    
    // Initialize DB connection
    await AppDataSource.initialize();
    logger.info("Database connection established");
    
    // Initialize agent tools
    const toolInitService = new ToolInitService();
    await toolInitService.initializeTools();
    
    // Load OpenAPI spec tools
    const openAPIToolsService = new OpenAPIToolsService();
    await openAPIToolsService.loadAllSpecs();

    const registry = MCPToolRegistry.getInstance();
    const mcpTools = await registry.createLangChainTools();

    // Register tools with the tool registry
    ToolRegistry.getInstance().registerTools(mcpTools);
    
    // Add after database initialization
    const mcpStartupService = new MCPStartupService();
    await mcpStartupService.initializeServers();

    // Start the server
    app.listen(port, () => {
      logger.info(`Server running on port ${port}`);
      app.emit('ready');
    });

  } catch (error) {
    logger.error("Error starting server", {
      error: (error as Error).message,
      stack: (error as Error).stack
    });
    process.exit(1);
  }
}

startServer();

export default app;
