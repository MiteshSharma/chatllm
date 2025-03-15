import { LLMClient, LLMMessage, LLMRequestOptions, LLMResponse } from "./LLMClient";
import { TokenCalculator } from "./TokenCalculator";
import { logger } from "../../utils/logger/winston-logger";
import { Message } from "../../models/Message";
import { Conversation } from "../../models/Conversation";
import { OpenAIRepository, OpenAIRepositoryImpl } from "../../repository/external";
import { config } from "../../utils/config";
import { SimpleTokenCalculator } from "./SimpleTokenCalculator";
import { FunctionsWrapper } from "../../models/FunctionsWrapper";

export class ChatGPTClient implements LLMClient {
  private readonly apiKey: string;
  private readonly model: string;
  protected tokenCalculator: TokenCalculator;
  private readonly openAIRepository: OpenAIRepository;
  
  constructor(model: string, tokenCalculator?: TokenCalculator) {
    if (!config.openai.apiKey) {
      throw new Error("OpenAI API Key is not set in environment variables");
    }
    this.apiKey = config.openai.apiKey;
    this.model = model;
    this.tokenCalculator = tokenCalculator || new SimpleTokenCalculator();
    this.openAIRepository = new OpenAIRepositoryImpl();
  }
  
  async generateResponse(
    messages: LLMMessage[],
    options: LLMRequestOptions
  ): Promise<LLMResponse> {
    try {
      const response = await this.openAIRepository.createChatCompletion(
        this.model,
        messages,
        options
      );
      
      // Use the raw token usage if available, otherwise estimate
      let tokenUsage;
      if (response.rawUsage) {
        tokenUsage = {
          promptTokens: response.rawUsage.prompt_tokens,
          completionTokens: response.rawUsage.completion_tokens,
          totalTokens: response.rawUsage.total_tokens
        };
      } else {
        const promptTokens = this.countTokens(messages);
        const completionTokens = this.tokenCalculator.estimateTokenCount(response.content);
        tokenUsage = {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens
        };
      }
      
      return {
        content: response.content,
        tokenUsage,
        model: this.model,
        finishReason: response.finishReason
      };
    } catch (error) {
      throw this.processApiError(error);
    }
  }
  
  async generateTextCompletion(
    prompt: string, 
    options: LLMRequestOptions
  ): Promise<LLMResponse> {
    try {
      const response = await this.openAIRepository.createTextCompletion(
        this.model,
        prompt,
        options
      );
      
      const promptTokens = this.tokenCalculator.estimateTokenCount(prompt);
      const completionTokens = this.tokenCalculator.estimateTokenCount(response.content);
      
      return {
        content: response.content,
        tokenUsage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens
        },
        model: this.model,
        finishReason: response.finishReason
      };
    } catch (error) {
      throw this.processApiError(error);
    }
  }
  
  async streamChatResponse(
    messages: LLMMessage[],
    options: LLMRequestOptions,
    onChunk: (chunk: string) => void
  ): Promise<LLMResponse> {
    try {
      const response = await this.openAIRepository.streamChatCompletion(
        this.model,
        messages,
        options,
        onChunk
      );
      
      const promptTokens = this.countTokens(messages);
      const completionTokens = this.tokenCalculator.estimateTokenCount(response.content);
      
      return {
        content: response.content,
        tokenUsage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens
        },
        model: this.model,
        finishReason: response.finishReason
      };
    } catch (error) {
      throw this.processApiError(error);
    }
  }
  
  countTokens(messages: LLMMessage[]): number {
    return this.tokenCalculator.countTokens(messages);
  }
  
  prepareConversationHistory(
    conversation: Conversation,
    messages: Message[],
    currentMessage: Message
  ): LLMMessage[] {
    const result: LLMMessage[] = [];
    
    // Add system message if present
    if (conversation.systemMessage) {
      result.push({
        role: 'system',
        content: conversation.systemMessage
      });
    }
    
    // Add conversation history
    for (const message of messages) {
      // Skip the current message as we're building context before it
      if (message.id === currentMessage.id) continue;
      
      result.push({
        role: message.role.toLowerCase(),
        content: message.content
      });
    }
    
    // Add the current message
    result.push({
      role: currentMessage.role.toLowerCase(),
      content: currentMessage.content
    });
    
    logger.debug(`Prepared ${result.length} messages for LLM`, {
      conversationId: conversation.id,
      messageCount: result.length
    });
    
    return result;
  }
  
  /**
   * Process API errors in a standardized way
   */
  protected processApiError(error: any): Error {
    // Log the error
    logger.error(`LLM API error with ${this.model}`, {
      modelName: this.model,
      errorMessage: error.message,
      errorDetails: error.response?.data || error
    });
    
    // Transform various errors into standard format
    if (error.response) {
      // API responded with an error
      return new Error(`LLM API Error (${error.response.status}): ${error.response.data?.error?.message || 'Unknown API error'}`);
    } else if (error.request) {
      // Request was made but no response received
      return new Error(`LLM Network Error: No response received from API`);
    } else {
      // Error in setting up the request
      return new Error(`LLM Client Error: ${error.message}`);
    }
  }
  
  getModelName(): string {
    return this.model;
  }

  /**
   * Generate a response that can include tool calls
   */
  async generateResponseWithTools(
    messages: LLMMessage[],
    functionsWrapper: FunctionsWrapper,
    options?: LLMRequestOptions
  ): Promise<{
    content: string;
    toolCalls?: Array<{
      name: string;
      arguments: any;
    }>;
  }> {
    // Add detailed logging at the beginning of the method
    logger.info(`Generating response with ${functionsWrapper.functions.length} tools available`, {
      toolNames: functionsWrapper.functions.map((f: { name: string }) => f.name),
      toolDetails: functionsWrapper.functions.map((f: { name: string, description?: string }) => ({
        name: f.name,
        description: f.description?.substring(0, 50) + (f.description?.length ?? 0 > 50 ? '...' : '')
      }))
    });

    try {
      const requestOptions = {
        ...options,
        functions: functionsWrapper.functions,
        returnFunctionCalls: true
      };
      
      const response = await this.openAIRepository.createChatCompletion(
        this.model,
        messages,
        requestOptions
      );

      // Check if the API response contains a function call
      const functionCall = this.extractFunctionCall(response);
      
      if (functionCall) {
        logger.info(`Function call detected: ${functionCall.name}`, {
          name: functionCall.name,
          arguments: functionCall.arguments
        });
        
        return {
          content: response.content || "",
          toolCalls: [{
            name: functionCall.name,
            arguments: functionCall.arguments
          }]
        };
      }
      
      // If no function call, just return the content
      return {
        content: response.content || ""
      };
    } catch (error) {
      // Log errors with tool execution
      logger.error(`Error generating response with tools: ${(error as Error).message}`, {
        error: error,
        availableTools: functionsWrapper.functions.map((f: { name: string }) => f.name)
      });
      throw new Error(`Failed to generate response with tools: ${(error as Error).message}`);
    }
  }

  // Helper method to extract function calls from OpenAI response
  private extractFunctionCall(response: any): { name: string; arguments: any } | null {
    // Check raw response data if available
    if (response.rawResponse && 
        response.rawResponse.choices && 
        response.rawResponse.choices[0] && 
        response.rawResponse.choices[0].message && 
        response.rawResponse.choices[0].message.function_call) {
      
      const functionCall = response.rawResponse.choices[0].message.function_call;
      return {
        name: functionCall.name,
        arguments: JSON.parse(functionCall.arguments || '{}')
      };
    }
    
    return null;
  }
} 