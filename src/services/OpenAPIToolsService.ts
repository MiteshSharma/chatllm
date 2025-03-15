import { OpenAPISpecRepository } from "../repository/database/OpenAPISpecRepository";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import axios, { AxiosRequestConfig } from "axios";
import { logger } from "../utils/logger/winston-logger";
import { ToolRegistry } from "../domain/agent/ToolRegistry";
import { adaptTool } from "../domain/agent/ToolAdapter";
import { OpenAPIObject, OperationObject } from "openapi3-ts/oas31";

export class OpenAPIToolsService {
  private repository: OpenAPISpecRepository;
  private toolRegistry: ToolRegistry;
  
  constructor() {
    this.repository = new OpenAPISpecRepository();
    this.toolRegistry = ToolRegistry.getInstance();
  }
  
  /**
   * Load all OpenAPI specs and register their tools
   */
  async loadAllSpecs(): Promise<void> {
    try {
      const specs = await this.repository.findAll();
      logger.info(`Loading ${specs.length} OpenAPI specifications`);
      
      for (const spec of specs) {
        await this.loadSpec(spec.id);
      }
    } catch (error) {
      logger.error("Error loading OpenAPI specs", { error: (error as Error).message });
      throw new Error(`Failed to load OpenAPI specs: ${(error as Error).message}`);
    }
  }
  
  /**
   * Load a single OpenAPI spec and register its tools
   */
  async loadSpec(specId: string): Promise<boolean> {
    try {
      const spec = await this.repository.findById(specId);
      if (!spec) {
        logger.warn(`OpenAPI spec with ID ${specId} not found`);
        return false;
      }
      
      if (!spec.isEnabled) {
        logger.info(`OpenAPI spec ${spec.name} is disabled, skipping`);
        return false;
      }
      
      logger.info(`Loading OpenAPI spec: ${spec.name}`);
      
      // Parse the OpenAPI spec
      const openApiSpec = JSON.parse(spec.specContent) as OpenAPIObject;
      
      // Create tools for each endpoint
      await this.createToolsFromSpec(openApiSpec, spec.name, spec.authConfig);
      
      return true;
    } catch (error) {
      logger.error(`Error loading OpenAPI spec ${specId}`, {
        error: (error as Error).message
      });
      return false;
    }
  }
  
  /**
   * Create tools from an OpenAPI spec
   */
  private async createToolsFromSpec(
    openApiSpec: OpenAPIObject,
    specName: string,
    authConfig?: Record<string, any>
  ): Promise<void> {
    if (!openApiSpec.paths) {
      logger.warn(`OpenAPI spec ${specName} has no paths defined`);
      return;
    }
    
    const baseUrl = this.extractBaseUrl(openApiSpec);
    
    // Process each path and method in the spec
    for (const [path, pathItem] of Object.entries(openApiSpec.paths)) {
      for (const [method, operation] of Object.entries(pathItem as Record<string, unknown>)) {
        // Skip non-HTTP methods
        if (!['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) {
          continue;
        }
        
        // Create a tool for this endpoint
        this.createToolForEndpoint(
          path,
          method.toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch',
          operation as OperationObject,
          baseUrl,
          specName,
          authConfig
        );
      }
    }
  }
  
  /**
   * Create a tool for a specific API endpoint
   */
  private createToolForEndpoint(
    path: string,
    method: 'get' | 'post' | 'put' | 'delete' | 'patch',
    operation: OperationObject,
    baseUrl: string,
    specName: string,
    authConfig?: Record<string, any>
  ): void {
    const operationId = operation.operationId || `${method}_${path.replace(/[^\w\s]/g, '_')}`;
    const toolName = `${specName.replace(/\s+/g, '_').toLowerCase()}_${operationId}`.toLowerCase();
    
    logger.debug(`Creating tool: ${toolName} for ${method.toUpperCase()} ${path}`);
    
    // Build parameter schema from OpenAPI parameters
    const paramSchema = this.buildZodSchemaFromOperation(operation);
    
    // Create the tool
    const tool = new DynamicStructuredTool({
      name: toolName,
      description: this.buildToolDescription(operation, path, method),
      schema: paramSchema,
      func: async (params: Record<string, any>) => {
        return this.executeApiCall(method, baseUrl, path, params, authConfig, operation);
      },
      metadata: {
        tags: ['api', specName.toLowerCase().replace(/\s+/g, '_')],
        apiInfo: {
          method,
          path,
          baseUrl,
          specName
        }
      }
    });
    
    // Register the tool
    this.toolRegistry.registerTool(adaptTool(tool));
  }
  
  /**
   * Build a Zod schema from OpenAPI operation parameters and request body
   */
  private buildZodSchemaFromOperation(operation: OperationObject): z.ZodType {
    const properties: Record<string, z.ZodType> = {};
    
    // Process path, query and header parameters
    if (operation.parameters) {
      for (const param of operation.parameters) {
        if ('name' in param && 'in' in param) {
          // Initialize with a default value
          let zodType: z.ZodType = z.any();
          
          // Check if it's a ReferenceObject (has $ref) or a SchemaObject (has type)
          if (!this.isRefObject(param.schema)) {
            // Now TypeScript knows this is a SchemaObject
            switch (param.schema?.type) {
              case 'string':
                zodType = z.string();
                break;
              case 'integer':
              case 'number':
                zodType = z.number();
                break;
              case 'boolean':
                zodType = z.boolean();
                break;
              case 'array':
                zodType = z.array(z.any());
                break;
              default:
                zodType = z.any();
            }
          } else {
            // Handle reference objects
            // You might want to resolve the reference here
            zodType = z.any().describe(`Reference to ${param.schema.$ref}`);
          }
          
          // Now zodType is guaranteed to be defined
          if (!param.required) {
            zodType = zodType.optional();
          }
          
          // Add description
          if (param.description) {
            zodType = zodType.describe(param.description);
          }
          
          properties[param.name] = zodType;
        }
      }
    }
    
    // Process request body if present
    if (operation.requestBody && 'content' in operation.requestBody) {
      const content = operation.requestBody.content;
      
      if (content['application/json'] && content['application/json'].schema) {
        // Add a generic "body" parameter for the request body
        properties['body'] = z.record(z.any()).describe('Request body payload');
      }
    }
    
    // Create schema object
    return z.preprocess(
      (input) => input,
      z.object(properties)
    );
  }
  
  /**
   * Build a description for the tool
   */
  private buildToolDescription(operation: OperationObject, path: string, method: string): string {
    let description = operation.summary || `${method.toUpperCase()} ${path}`;
    
    if (operation.description) {
      description += `\n${operation.description}`;
    }
    
    // Add parameter information to description
    if (operation.parameters && operation.parameters.length > 0) {
      description += '\n\nParameters:';
      
      for (const param of operation.parameters) {
        if ('name' in param && 'in' in param) {
          const required = param.required ? ' (required)' : '';
          description += `\n- ${param.name}${required}: ${param.description || 'No description'} (${param.in})`;
        }
      }
    }
    
    return description;
  }
  
  /**
   * Execute an API call based on tool parameters
   */
  private async executeApiCall(
    method: string,
    baseUrl: string,
    path: string,
    params: Record<string, any>,
    authConfig?: Record<string, any>,
    operation?: OperationObject
  ): Promise<string> {
    try {
      const url = this.buildUrl(baseUrl, path, params);
      
      const config: AxiosRequestConfig = {
        method: method as any,
        url,
        headers: {}
      };
      
      // Handle different parameter types
      if (params) {
        // Extract query parameters
        const queryParams: Record<string, any> = {};
        const pathParams: Record<string, any> = {};
        const headerParams: Record<string, any> = {};
        let bodyParams: any;
        
        if (operation?.parameters) {
          for (const param of operation.parameters) {
            if ('name' in param && 'in' in param && params[param.name] !== undefined) {
              switch (param.in) {
                case 'query':
                  queryParams[param.name] = params[param.name];
                  break;
                case 'path':
                  pathParams[param.name] = params[param.name];
                  break;
                case 'header':
                  headerParams[param.name] = params[param.name];
                  break;
              }
            }
          }
        }
        
        // Set body if present
        if (params.body) {
          bodyParams = params.body;
        }
        
        // Apply parameters
        if (Object.keys(queryParams).length > 0) {
          config.params = queryParams;
        }
        
        if (Object.keys(headerParams).length > 0) {
          config.headers = {
            ...config.headers,
            ...headerParams
          };
        }
        
        if (bodyParams && ['post', 'put', 'patch'].includes(method)) {
          config.data = bodyParams;
        }
      }
      
      // Apply authentication if configured
      if (authConfig) {
        this.applyAuthentication(config, authConfig);
      }
      
      // Make the request
      logger.debug(`Executing API call: ${method.toUpperCase()} ${url}`);
      const response = await axios(config);
      
      // Process and return response
      let result: string;
      
      if (typeof response.data === 'object') {
        result = JSON.stringify(response.data, null, 2);
      } else {
        result = String(response.data);
      }
      
      return result;
    } catch (error) {
      logger.error(`API call error: ${(error as Error).message}`);
      
      if (axios.isAxiosError(error) && error.response) {
        // Return structured error with status code and response
        return JSON.stringify({
          error: true,
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        }, null, 2);
      }
      
      return `Error: ${(error as Error).message}`;
    }
  }
  
  /**
   * Apply authentication to the request
   */
  private applyAuthentication(
    config: AxiosRequestConfig,
    authConfig: Record<string, any>
  ): void {
    const { type, ...credentials } = authConfig;
    
    switch (type) {
      case 'basic':
        if (credentials.username && credentials.password) {
          config.auth = {
            username: credentials.username,
            password: credentials.password
          };
        }
        break;
        
      case 'bearer':
        if (credentials.token) {
          config.headers = {
            ...config.headers,
            'Authorization': `Bearer ${credentials.token}`
          };
        }
        break;
        
      case 'apiKey':
        if (credentials.key) {
          const placement = credentials.in || 'header';
          const name = credentials.name || 'X-API-Key';
          
          if (placement === 'header') {
            config.headers = {
              ...config.headers,
              [name]: credentials.key
            };
          } else if (placement === 'query') {
            config.params = {
              ...config.params,
              [name]: credentials.key
            };
          }
        }
        break;
        
      case 'oauth2':
        // For OAuth we just use the token like bearer auth
        if (credentials.accessToken) {
          config.headers = {
            ...config.headers,
            'Authorization': `Bearer ${credentials.accessToken}`
          };
        }
        break;
        
      default:
        logger.warn(`Unknown authentication type: ${type}`);
    }
  }
  
  /**
   * Extract base URL from OpenAPI spec
   */
  private extractBaseUrl(openApiSpec: OpenAPIObject): string {
    let baseUrl = '';
    
    if (openApiSpec.servers && openApiSpec.servers.length > 0) {
      baseUrl = openApiSpec.servers[0].url;
    }
    
    return baseUrl;
  }
  
  /**
   * Build URL with path parameters
   */
  private buildUrl(baseUrl: string, path: string, params: Record<string, any>): string {
    let url = `${baseUrl}${path}`;
    
    // Replace path parameters
    const pathParams = path.match(/\{([^}]+)\}/g);
    if (pathParams) {
      for (const param of pathParams) {
        const paramName = param.slice(1, -1); // Remove { and }
        if (params[paramName]) {
          url = url.replace(param, encodeURIComponent(params[paramName]));
        }
      }
    }
    
    return url;
  }

  // Add this helper method to the class
  private isRefObject(obj: any): obj is { $ref: string } {
    return obj && '$ref' in obj;
  }
} 