# Adding a New LLM Provider

This document outlines the steps required to add a new language model provider to the system.

## Implementation Steps

### 1. Install Provider SDK

```bash
npm install @provider/sdk
```

### 2. Update Configuration

Add the new provider's configuration to `src/utils/config.ts`:

```typescript
export const config = {
  // Add your new provider configuration
  newProvider: {
    apiKey: process.env.NEW_PROVIDER_API_KEY
  },
  // Existing configurations
};
```

### 3. Create Repository Implementation

Create a new repository implementation that handles API interactions:

```typescript
// src/repository/external/NewProviderRepositoryImpl.ts
import { NewProvider } from "@provider/sdk";
import { config } from "../../utils/config";

export interface NewProviderRepository {
  createChatCompletion(model: string, messages: any, options: any): Promise<any>;
  streamChatCompletion(model: string, messages: any, options: any, onChunk: (chunk: string) => void): Promise<any>;
}

export class NewProviderRepositoryImpl implements NewProviderRepository {
  private client: any;
  
  constructor() {
    this.client = new NewProvider({
      apiKey: config.newProvider.apiKey
    });
  }
  
  async createChatCompletion(model: string, messages: any, options: any) {
    // Implement API call to new provider
    // Transform responses to match the expected format
    // Handle provider-specific error cases
  }
  
  async streamChatCompletion(model: string, messages: any, options: any, onChunk: (chunk: string) => void) {
    // Implement streaming API call
    // Call onChunk for each piece of the response
    // Return final complete response
  }
}
```

### 4. Implement LLMClient Interface

Create a client that implements the `LLMClient` interface:

```typescript
// src/domain/llm/NewProviderClient.ts
import { LLMClient, LLMMessage, LLMRequestOptions, LLMResponse } from "./LLMClient";
import { TokenCalculator } from "./TokenCalculator";
import { NewProviderRepository, NewProviderRepositoryImpl } from "../../repository/external/NewProviderRepositoryImpl";
import { config } from "../../utils/config";

export class NewProviderClient implements LLMClient {
  private readonly model: string;
  protected tokenCalculator: TokenCalculator;
  private readonly repository: NewProviderRepository;
  
  constructor(model: string, tokenCalculator?: TokenCalculator) {
    this.model = model;
    this.tokenCalculator = tokenCalculator || new DefaultTokenCalculator();
    this.repository = new NewProviderRepositoryImpl();
  }
  
  async generateResponse(messages: LLMMessage[], options: LLMRequestOptions): Promise<LLMResponse> {
    // Implement using repository
  }
  
  async generateTextCompletion(prompt: string, options: LLMRequestOptions): Promise<LLMResponse> {
    // Implement using repository
  }
  
  async streamChatResponse(messages: LLMMessage[], options: LLMRequestOptions, onChunk: (chunk: string) => void): Promise<LLMResponse> {
    // Implement using repository
  }
  
  // Implement remaining methods from the interface
}
```

### 5. Update LLMClientFactory

Modify the factory to support the new provider:

```typescript
// src/domain/llm/LLMClientFactory.ts
import { NewProviderClient } from "./NewProviderClient";

export enum LLMProviderType {
  OPENAI = "openai",
  NEW_PROVIDER = "new_provider" // Add your provider
}

export class LLMClientFactory {
  static createClient(modelName: string): LLMClient {
    if (modelName.startsWith("new-provider-prefix")) {
      return new NewProviderClient(modelName);
    }
    // Existing model handling
    return new ChatGPTClient(modelName);
  }
}
```

### 6. Add Support for Tool/Function Calling (if applicable)

If the provider supports tool calling, implement the `generateResponseWithTools` method:

```typescript
async generateResponseWithTools(
  messages: LLMMessage[],
  toolsConfig: any,
  options?: LLMRequestOptions
): Promise<{
  content: string;
  toolCalls?: Array<{
    name: string;
    arguments: any;
  }>;
}> {
  // Provider-specific implementation
}
```

### 7. Test Implementation

Create tests for your new provider:

```typescript
// tests/integration/llm/newprovider.test.ts
describe('New Provider Integration', () => {
  test('generates a basic response', async () => {
    // Test implementation
  });
  
  test('streams response correctly', async () => {
    // Test implementation
  });
  
  test('handles tool calling if supported', async () => {
    // Test implementation
  });
});
```

## Provider-Specific Considerations

### Response Format Mapping

Different providers return responses in different formats. Ensure your repository implementation transforms these responses to match the expected format in the rest of the system.

### Error Handling

Implement provider-specific error handling to ensure errors are captured and logged in a standardized way.

### Token Counting

If the provider uses a different tokenization method, implement a custom TokenCalculator for accurate token counts.

### Tool/Function Calling

Different providers may have different approaches to tool calling. Adapt your implementation to support the provider's specific approach while maintaining a consistent interface for the rest of the system.

## Adding New Models to Existing Providers

To add a new model for an existing provider:

1. Update the model registry if you're using one
2. Test the new model with existing functionality
3. Update documentation to reflect the new model's capabilities 