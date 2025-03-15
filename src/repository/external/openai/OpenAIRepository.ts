import { LLMMessage, LLMRequestOptions, LLMResponse } from "../../../domain/llm/LLMClient";

export interface OpenAIRawResponse {
  content: string;
  finishReason: string;
  model: string;
  rawUsage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  rawResponse?: any;
}

export interface OpenAIRepository {
  /**
   * Send a chat completion request to OpenAI
   */
  createChatCompletion(
    model: string, 
    messages: LLMMessage[], 
    options: LLMRequestOptions
  ): Promise<OpenAIRawResponse>;
  
  /**
   * Stream a chat completion from OpenAI
   */
  streamChatCompletion(
    model: string,
    messages: LLMMessage[],
    options: LLMRequestOptions,
    onChunk: (chunk: string) => void
  ): Promise<OpenAIRawResponse>;
  
  /**
   * Create a text completion
   */
  createTextCompletion(
    model: string,
    prompt: string,
    options: LLMRequestOptions
  ): Promise<OpenAIRawResponse>;
} 