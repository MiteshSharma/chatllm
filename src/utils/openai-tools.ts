/**
 * Utility to convert tool definitions to OpenAI-compatible format
 */
export function formatToolsForOpenAI(tools: any[]) {
  return tools.map(tool => {
    // Extract name and description
    const { name, description } = tool;
    
    // Create proper JSON schema for parameters
    const parameters = {
      type: "object",
      properties: {},
      required: []
    };
    
    // If there are actual parameters in the tool definition, extract them
    if (tool.parameters?._def?.shape) {
      const shape = tool.parameters._def.shape;
      for (const [key, schema] of Object.entries(shape)) {
        parameters.properties[key] = {
          type: getSchemaType(schema),
          description: schema.description || `Parameter ${key}`
        };
        
        // Add to required array if the parameter is required
        if (!schema.isOptional) {
          parameters.required.push(key);
        }
      }
    }
    
    return {
      name,
      description,
      parameters
    };
  });
}

function getSchemaType(schema: any): string {
  // Default to string if we can't determine the type
  if (!schema || !schema._def) return "string";
  
  // Map Zod types to JSON Schema types
  switch (schema._def.typeName) {
    case "ZodString": return "string";
    case "ZodNumber": return "number";
    case "ZodBoolean": return "boolean";
    case "ZodArray": return "array";
    case "ZodObject": return "object";
    default: return "string";
  }
} 