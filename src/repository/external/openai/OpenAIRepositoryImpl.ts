import axios, { AxiosError } from "axios";
import { OpenAIRepository, OpenAIRawResponse } from "./OpenAIRepository";
import { LLMMessage, LLMRequestOptions } from "../../../domain/llm/LLMClient";
import { config } from "../../../utils/config";
import { logger } from "../../../utils/logger/winston-logger";
import { OpenAI } from "openai";

export class OpenAIRepositoryImpl implements OpenAIRepository {
  private client: OpenAI;
  private apiKey: string;
  
  constructor() {
    if (!config.openai.apiKey) {
      throw new Error("OpenAI API Key is not set in environment variables");
    }
    this.apiKey = config.openai.apiKey;
    this.client = new OpenAI({
      apiKey: this.apiKey,
      baseURL: config.openai.endpoint // Use custom endpoint if provided
    });
  }
  
  async createChatCompletion(
    model: string,
    messages: LLMMessage[],
    options: LLMRequestOptions
  ): Promise<OpenAIRawResponse> {
    try {
      logger.info("Sending chat completion request to OpenAI", {
        model,
        messagesCount: messages.length,
        options
      });

      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model,
          messages,
          temperature: options.temperature || 0.7,
          top_p: options.topP || 1.0,
          presence_penalty: options.presencePenalty || 0,
          frequency_penalty: options.frequencyPenalty || 0,
          max_tokens: options.maxTokens || 2048,
          stream: false
        },
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.apiKey}`
          }
        }
      );

      const result = response.data;
      
      return {
        content: result.choices[0].message.content,
        finishReason: result.choices[0].finish_reason,
        model,
        rawUsage: result.usage
      };
    } catch (error: unknown) {
      const err = error as Error;
      
      logger.error("Error in OpenAI chat completion request", {
        error: err.message,
        model
      });
      
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          logger.error("OpenAI API error", {
            status: axiosError.response.status,
            data: axiosError.response.data
          });
        }
      }
      
      throw new Error(`Failed to generate chat completion: ${err.message}`);
    }
  }
  
  async streamChatCompletion(
    model: string,
    messages: LLMMessage[],
    options: LLMRequestOptions,
    onChunk: (chunk: string) => void
  ): Promise<OpenAIRawResponse> {
    logger.info("Streaming chat completion from OpenAI", {
      model,
      messagesCount: messages.length,
      options
    });
    
    let fullResponse = '';
    
    try {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model,
          messages,
          temperature: options.temperature || 0.7,
          top_p: options.topP || 1.0,
          presence_penalty: options.presencePenalty || 0,
          frequency_penalty: options.frequencyPenalty || 0,
          max_tokens: options.maxTokens || 2048,
          stream: true
        },
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.apiKey}`
          },
          responseType: 'stream'
        }
      );

      return new Promise((resolve, reject) => {
        response.data.on('data', (chunk: Buffer) => {
          const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
          
          for (const line of lines) {
            if (line === 'data: [DONE]') continue;
            
            const dataMatch = line.match(/^data: (.*)$/);
            if (!dataMatch) continue;
            
            try {
              const data = JSON.parse(dataMatch[1]);
              
              if (data.choices && 
                  data.choices[0].delta && 
                  data.choices[0].delta.content) {
                const content = data.choices[0].delta.content;
                fullResponse += content;
                onChunk(content);
              }
            } catch (error) {
              logger.error("Error parsing streaming response", {
                error: (error as Error).message,
                line
              });
            }
          }
        });
        
        response.data.on('end', () => {
          resolve({
            content: fullResponse,
            finishReason: "stop",
            model
          });
        });
        
        response.data.on('error', (error: Error) => {
          logger.error("Stream error", { error: error.message });
          reject(new Error(`Stream error: ${error.message}`));
        });
      });
    } catch (error: unknown) {
      const err = error as Error;
      
      logger.error("Error starting stream from OpenAI", {
        error: err.message,
        model
      });
      
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          logger.error("OpenAI API streaming error", {
            status: axiosError.response.status,
            data: axiosError.response.data
          });
        }
      }
      
      throw new Error(`Failed to stream chat completion: ${err.message}`);
    }
  }
  
  async createTextCompletion(
    model: string,
    prompt: string,
    options: LLMRequestOptions
  ): Promise<OpenAIRawResponse> {
    // This is a placeholder implementation
    return {
      content: "This is a placeholder text completion.",
      finishReason: "stop",
      model
    };
  }
} 