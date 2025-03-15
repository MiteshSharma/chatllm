import { Request, Response, NextFunction } from "express";
import { OpenAPISpecRepository } from "../../repository/database/OpenAPISpecRepository";
import { OpenAPIToolsService } from "../../services/OpenAPIToolsService";
import { logger } from "../../utils/logger/winston-logger";

export class OpenAPISpecController {
  private repository: OpenAPISpecRepository;
  private service: OpenAPIToolsService;
  
  constructor() {
    this.repository = new OpenAPISpecRepository();
    this.service = new OpenAPIToolsService();
  }
  
  async getAllSpecs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const specs = await this.repository.findAll();
      res.json(specs);
    } catch (error) {
      next(error);
    }
  }
  
  async getSpecById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const spec = await this.repository.findById(req.params.id);
      
      if (!spec) {
        res.status(404).json({ message: "OpenAPI specification not found" });
        return;
      }
      
      res.json(spec);
    } catch (error) {
      next(error);
    }
  }
  
  async createSpec(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate that the spec is valid JSON
      try {
        JSON.parse(req.body.specContent);
      } catch (e) {
        res.status(400).json({ message: "Invalid OpenAPI specification: must be valid JSON" });
        return;
      }
      
      const spec = await this.repository.create({
        name: req.body.name,
        description: req.body.description,
        specContent: req.body.specContent,
        authConfig: req.body.authConfig,
        isEnabled: req.body.isEnabled !== false, // Default to true
        createdBy: req.body.createdBy
      });
      
      // Try to load the spec and register tools immediately
      await this.service.loadSpec(spec.id);
      
      res.status(201).json(spec);
    } catch (error) {
      logger.error("Error creating OpenAPI spec", { error: (error as Error).message });
      next(error);
    }
  }
  
  async updateSpec(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Check if specification exists
      const existingSpec = await this.repository.findById(req.params.id);
      if (!existingSpec) {
        res.status(404).json({ message: "OpenAPI specification not found" });
        return;
      }
      
      // If updating spec content, validate it's valid JSON
      if (req.body.specContent) {
        try {
          JSON.parse(req.body.specContent);
        } catch (e) {
          res.status(400).json({ message: "Invalid OpenAPI specification: must be valid JSON" });
          return;
        }
      }
      
      // Update the spec
      const updatedSpec = await this.repository.update(req.params.id, {
        name: req.body.name,
        description: req.body.description,
        specContent: req.body.specContent,
        authConfig: req.body.authConfig,
        isEnabled: req.body.isEnabled
      });
      
      // Reload the spec if it was updated
      if (updatedSpec) {
        await this.service.loadSpec(updatedSpec.id);
      }
      
      res.json(updatedSpec);
    } catch (error) {
      next(error);
    }
  }
  
  async deleteSpec(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.repository.delete(req.params.id);
      
      if (!result) {
        res.status(404).json({ message: "OpenAPI specification not found" });
        return;
      }
      
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
  
  async reloadSpec(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.service.loadSpec(req.params.id);
      
      if (!result) {
        res.status(404).json({ message: "Failed to reload OpenAPI specification" });
        return;
      }
      
      res.json({ message: "OpenAPI specification reloaded successfully" });
    } catch (error) {
      next(error);
    }
  }
} 