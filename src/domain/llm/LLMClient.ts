import { Message } from "../../models/Message";
import { Conversation } from "../../models/Conversation";

export interface LLMTokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface LLMMessage {
  role: string;
  content: string;
}

export interface LLMRequestOptions {
  temperature?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface LLMResponse {
  content: string;
  tokenUsage: LLMTokenUsage;
  model: string;
  finishReason: string;
}

export interface LLMClient {
  generateResponse(messages: LLMMessage[], options: LLMRequestOptions): Promise<LLMResponse>;
  generateTextCompletion(prompt: string, options: LLMRequestOptions): Promise<LLMResponse>;
  streamChatResponse(messages: LLMMessage[], options: LLMRequestOptions, onChunk: (chunk: string) => void): Promise<LLMResponse>;
  countTokens(messages: LLMMessage[]): number;
  prepareConversationHistory(conversation: Conversation, messages: Message[], currentMessage: Message): LLMMessage[];
  getModelName(): string;
  generateResponseWithTools(
    messages: LLMMessage[],
    toolsConfig: any,
    options?: LLMRequestOptions
  ): Promise<{
    content: string;
    toolCalls?: Array<{
      name: string;
      arguments: any;
    }>;
  }>;
} 