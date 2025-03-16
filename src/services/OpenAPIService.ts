import { OpenAPISpec } from '../models/OpenAPISpec';
import { Tool } from '@langchain/core/tools';
import { OpenAPITool } from '../domain/agent/tools/OpenAPITool';
import { OpenAPIRepository } from '../repository/OpenAPIRepository';

export class OpenAPIService {
  private repository: OpenAPIRepository;
  
  constructor(repository: OpenAPIRepository) {
    this.repository = repository;
  }
  
  async getAllOpenAPISpecs(): Promise<OpenAPISpec[]> {
    return this.repository.getAllSpecs();
  }
  
  async getOpenAPISpec(id: string): Promise<OpenAPISpec | null> {
    return this.repository.getSpecById(id);
  }
  
  async registerOpenAPISpec(specData: any): Promise<OpenAPISpec> {
    // Validate the OpenAPI spec
    this.validateOpenAPISpec(specData);
    
    // Save to repository
    return this.repository.saveSpec(specData);
  }
  
  createToolsFromSpec(spec: OpenAPISpec): Tool[] {
    // Parse the spec content
    const parsedSpec = JSON.parse(spec.specContent);
    const tools: Tool[] = [];
    
    // Extract paths and operations from the spec
    const paths = parsedSpec.paths || {};
    
    for (const path in paths) {
      const operations = paths[path];
      
      for (const method in operations) {
        const operation = operations[method];
        
        // Use operationId if available, or generate a name
        const operationId = operation.operationId || 
          `${method}_${path.replace(/\//g, '_').replace(/[{}]/g, '')}`;
        
        tools.push(new OpenAPITool(spec.id, operationId, {
          path,
          method,
          operation
        }));
      }
    }
    
    return tools;
  }
  
  private validateOpenAPISpec(spec: any): void {
    // Implement validation logic here
    if (!spec || typeof spec !== 'object') {
      throw new Error('Invalid OpenAPI specification');
    }
    
    // Additional validation...
  }
} 