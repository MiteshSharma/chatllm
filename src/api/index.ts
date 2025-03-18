import express, { Express, Router } from "express";
// Import routers when available
// import userRouter from './routes/user.routes';
import { registerHealthRoutes } from "./routes/health.routes";
import { registerMessageRoutes } from "./routes/message.routes";
import { registerOpenAPISpecRoutes } from "./routes/openapi-spec.routes";
import { registerMagicRoutes } from "./routes/magic.routes";
import { registerMCPServerRoutes } from "./routes/mcp-server.routes";

// Function type for route registration
export type RegisterRoutesFunction = (router: Router) => void;

export function registerRoutes(app: Express): void {
  // Register routes when available
  // app.use('/api/users', userRouter);

  // API routes
  const apiRouter = Router();
  
  // Register function-based routes to apiRouter
  registerHealthRoutes(apiRouter);
  registerMessageRoutes(apiRouter);
  registerOpenAPISpecRoutes(apiRouter);
  registerMagicRoutes(apiRouter);
  registerMCPServerRoutes(apiRouter);
  
  // Mount the API router with all function-based routes
  app.use("/api", apiRouter);
}
