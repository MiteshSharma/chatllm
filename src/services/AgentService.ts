import { ToolRegistry } from "../domain/agent/ToolRegistry";
import { Tool } from "@langchain/core/tools";
import { logger } from "../utils/logger/winston-logger";
import { Message } from "../models/Message";
import { Conversation } from "../models/Conversation";
import { MessageRole } from "../models/MessageRole";
import { MessageRepository } from "../repository/database/MessageRepository";
import { MessageRepositoryImpl } from "../repository/database/MessageRepositoryImpl";
import { LLMClientFactory } from "../domain/llm/LLMClientFactory";
import { LLMClient, LLMRequestOptions } from "../domain/llm/LLMClient";
import { FunctionsWrapper } from "../domain/agent/FunctionsWrapper";
import { ConversationRepository } from "../repository/database/ConversationRepository";
import { ConversationRepositoryImpl } from "../repository/database/ConversationRepositoryImpl";

export interface AgentOptions {
  temperature?: number;
  modelName?: string;
  stream?: boolean;
}

export class AgentService {
  private toolRegistry: ToolRegistry;
  private messageRepository: MessageRepository;
  private conversationRepository: ConversationRepository;
  
  constructor() {
    this.toolRegistry = ToolRegistry.getInstance();
    this.messageRepository = new MessageRepositoryImpl();
    this.conversationRepository = new ConversationRepositoryImpl();
  }
  
  async processAgentMessage(message: Message): Promise<Message> {
    try {
      logger.info(`Processing agent message with agent mode: ${message.agentMode}`, {
        conversationId: message.conversationId,
        messageId: message.id,
        agentMode: message.agentMode
      });

      // Create a placeholder assistant message
      const response = await this.createPlaceholderResponse(message);
      
      // Get conversation history
      const conversation = await this.conversationRepository.findById(message.conversationId);
      if (!conversation) {
        throw new Error(`Conversation not found: ${message.conversationId}`);
      }
      
      const messages = await this.messageRepository.findByConversationId(conversation.id);

      // Initialize LLM client
      const model = this.getModelForConversation(conversation);
      const llmClient = LLMClientFactory.createClient(model);

      // Prepare functions/tools for the agent
      const availableTools = this.toolRegistry.getAllTools();
      
      logger.info(`Agent has ${availableTools.length} tools available`, {
        toolNames: availableTools.map(t => t.name)
      });
      
      // Convert tools to functions format
      const functions = availableTools.map(tool => {
        // Extract the tool schema if it exists
        let parameters = {};
        if ('schema' in tool) {
          // For structured tools that have a schema
          parameters = tool.schema;
        }

        return {
          name: tool.name,
          description: tool.description,
          parameters
        };
      });
      
      // Wrap functions
      const functionsWrapper = new FunctionsWrapper(functions);
      
      // Process with tools recursively until we get a final response
      const finalResponse = await this.processWithToolsRecursively(
        llmClient,
        messages,
        message,
        conversation,
        functionsWrapper
      );
      
      // Update the response with the final content
      response.content = finalResponse;
      const savedResponse = await this.messageRepository.create(response);
      return savedResponse;
    } catch (error) {
      logger.error(`Error processing agent message`, {
        error: (error as Error).message,
        conversationId: message.conversationId,
        messageId: message.id
      });
      throw new Error(`Agent error: ${(error as Error).message}`);
    }
  }
  
  private async processWithToolsRecursively(
    llmClient: LLMClient,
    messages: Message[],
    currentMessage: Message,
    conversation: Conversation,
    functionsWrapper: FunctionsWrapper,
    toolResults: Array<{toolName: string, result: string}> = []
  ): Promise<string> {
    // Prepare conversation history for LLM
    const llmMessages = llmClient.prepareConversationHistory(
      conversation, 
      messages, 
      currentMessage
    );
    
    // Add tool results if any
    for (const toolResult of toolResults) {
      llmMessages.push({
        role: 'function',
        content: toolResult.result,
        name: toolResult.toolName
      });
    }
    
    // Get conversation settings or default options
    const options = this.getConversationOptions(conversation);
    
    // Call LLM with tools
    const response = await llmClient.generateResponseWithTools(
      llmMessages,
      functionsWrapper,
      options
    );
    
    // Check if there are tool calls in the response
    if (response.toolCalls && response.toolCalls.length > 0) {
      const toolCall = response.toolCalls[0]; // Handle first tool call for now
      
      logger.info(`Executing tool: ${toolCall.name}`, {
        toolName: toolCall.name,
        arguments: toolCall.arguments
      });
      
      // Find the tool in registry
      const toolRegistry = ToolRegistry.getInstance();
      const tool = toolRegistry.getTool(toolCall.name);
      
      if (!tool) {
        logger.error(`Tool not found: ${toolCall.name}`);
        return Promise.resolve(`I tried to use ${toolCall.name} but couldn't find that tool. ${response.content || ''}`);
      }
      
      try {
        // Execute the tool
        const result = await tool.call(toolCall.arguments);
        
        logger.info(`Tool execution result`, {
          toolName: toolCall.name,
          resultPreview: typeof result === 'string' 
            ? result.substring(0, 100) 
            : JSON.stringify(result).substring(0, 100)
        });
        
        // Add this result to tool results
        const newToolResults = [
          ...toolResults,
          { toolName: toolCall.name, result: JSON.stringify(result) }
        ];
        
        // Recursive call with updated tool results
        return this.processWithToolsRecursively(
          llmClient,
          messages,
          currentMessage,
          conversation,
          functionsWrapper,
          newToolResults
        );
      } catch (error) {
        logger.error(`Tool execution error: ${(error as Error).message}`, {
          toolName: toolCall.name,
          error
        });
        
        return Promise.resolve(`I tried to use ${toolCall.name} but encountered an error: ${(error as Error).message}. ${response.content || ''}`);
      }
    }
    
    // If no tool calls, return the content as the final response
    return Promise.resolve(response.content || "I processed your request but couldn't generate a response.");
  }
  
  private createPlaceholderResponse(message: Message): Promise<Message> {
    const response = new Message();
    response.conversationId = message.conversationId;
    response.parentMessageId = message.id;
    response.role = MessageRole.ASSISTANT;
    response.content = ""; // Empty content initially
    response.metadata = {
      isAgentResponse: true,
      toolCallIds: []
    };
    
    return this.messageRepository.create(response);
  }
  
  private getConversationOptions(conversation: Conversation): LLMRequestOptions {
    const settings = conversation.settings || {};
    
    return {
      temperature: settings.temperature ?? 0.7,
      topP: settings.topP ?? 1.0,
      presencePenalty: settings.presencePenalty ?? 0,
      frequencyPenalty: settings.frequencyPenalty ?? 0,
      maxTokens: settings.maxTokens ?? 1024
    };
  }
  
  private getModelForConversation(conversation: Conversation): string {
    // Implement the logic to determine the appropriate model for a conversation
    // This is a placeholder and should be replaced with the actual implementation
    return "gpt-4";
  }
} 