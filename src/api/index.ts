import express, { Express, Router } from "express";
// Import routers when available
// import userRouter from './routes/user.routes';
import { registerHealthRoutes } from "./routes/health.routes";
import { registerMessageRoutes } from "./routes/message.routes";

// Function type for route registration
export type RegisterRoutesFunction = (router: Router) => void;

export function registerRoutes(app: Express): void {
  // Register routes when available
  // app.use('/api/users', userRouter);

  // API routes
  const apiRouter = Router();
  
  registerHealthRoutes(apiRouter);
  registerMessageRoutes(apiRouter);
  
  // Mount the API router
  app.use("/api", apiRouter);
}
