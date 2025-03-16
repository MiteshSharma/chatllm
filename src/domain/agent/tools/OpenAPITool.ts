import { Tool } from "@langchain/core/tools";
import { z } from "zod";
import { logger } from "../../../utils/logger/winston-logger";
import axios, { AxiosRequestConfig } from "axios";

/**
 * Tool for executing OpenAPI operations
 */
export class OpenAPITool extends Tool {
  private specId: string;
  private operationId: string;
  private operation: {
    path: string;
    method: string;
    operation: any;
  };
  
  constructor(specId: string, operationId: string, operation: {
    path: string;
    method: string;
    operation: any;
  }) {
    super();
    this.specId = specId;
    this.operationId = operationId;
    this.operation = operation;
    
    // Update metadata in constructor after specId is initialized
    this.metadata.tags.push(this.specId);
  }
  
  get name(): string {
    return `openapi_${this.specId}_${this.operationId}`;
  }
  
  get description(): string {
    return this.operation.operation.summary || 
      `Execute the ${this.operationId} operation on ${this.specId} API`;
  }
  
  // Create schema from OpenAPI parameters
  schema = z.object({
    input: z.string().optional().describe("JSON string containing parameters for the API call"),
  }).transform((val) => val.input);
  
  async _call(input: string): Promise<string> {
    try {
      logger.info(`Executing OpenAPI operation: ${this.operationId}`, { 
        specId: this.specId,
        input
      });
      
      // Parse input as JSON if provided
      let params = {};
      if (input && input.trim()) {
        try {
          params = JSON.parse(input);
        } catch (e: any) {
          return `Error parsing input as JSON: ${e.message}`;
        }
      }
      
      // This is a simplified implementation
      // In a real implementation, you would:
      // 1. Get the full OpenAPI spec
      // 2. Resolve the server URL
      // 3. Process path, query, and body parameters
      // 4. Handle auth
      // 5. Make the request
      
      // Dummy implementation for now
      const response = await this.executeApiCall(params);
      
      return JSON.stringify(response);
    } catch (error: any) {
      logger.error(`Error executing OpenAPI operation: ${this.operationId}`, {
        error: error.message || String(error)
      });
      return `Error: ${error.message || "Unknown error"}`;
    }
  }
  
  private async executeApiCall(params: any): Promise<any> {
    // This is a placeholder implementation
    // In reality, you would use the OpenAPI spec to build and execute the request
    
    // Mock response for now
    return {
      success: true,
      message: `Executed ${this.operationId} (${this.operation.method.toUpperCase()} ${this.operation.path})`,
      params
    };
  }
  
  metadata = {
    tags: ["api"]
  };
} 