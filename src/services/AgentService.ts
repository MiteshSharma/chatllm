import { ToolRegistry } from "../domain/agent/ToolRegistry";
import { Tool } from "@langchain/core/tools";
import { logger } from "../utils/logger/winston-logger";
import { Message } from "../models/Message";
import { Conversation } from "../models/Conversation";
import { MessageRole } from "../models/MessageRole";
import { MessageRepository } from "../repository/database/MessageRepository";
import { MessageRepositoryImpl } from "../repository/database/MessageRepositoryImpl";
import { LLMClientFactory } from "../domain/llm/LLMClientFactory";
import { LLMRequestOptions } from "../domain/llm/LLMClient";

export interface AgentOptions {
  temperature?: number;
  modelName?: string;
  stream?: boolean;
}

export class AgentService {
  private toolRegistry: ToolRegistry;
  private messageRepository: MessageRepository;
  
  constructor() {
    this.toolRegistry = ToolRegistry.getInstance();
    this.messageRepository = new MessageRepositoryImpl();
  }
  
  async processAgentMessage(
    conversation: Conversation,
    userMessage: Message,
    options: AgentOptions,
    onChunk?: (chunk: string) => void,
    onToolExecution?: (tool: string, input: any, output: string) => void
  ): Promise<Message> {
    try {
      logger.info("Processing agent message", {
        conversationId: conversation.id,
        messageId: userMessage.id
      });
      
      // Select tools based on options
      const tools = this.getToolsForAgent();
      
      if (tools.length === 0) {
        logger.warn("No tools available for agent", { options });
      }
      
      // Create empty agent result message
      const agentMessage = await this.messageRepository.create({
        conversationId: conversation.id,
        role: MessageRole.ASSISTANT,
        content: "",
        parentMessageId: userMessage.id,
        metadata: {
          isAgentResponse: true,
          toolCallIds: []  // Will be populated as tools are called
        }
      });
      
      // Get conversation history for LLM prompt
      const messages = await this.messageRepository.findByConversationId(conversation.id);
      
      // Get LLM client
      const llmClient = LLMClientFactory.createClient(options.modelName || "gpt-4");
      
      // Configure LLM options
      const llmOptions: LLMRequestOptions = {
        temperature: options.temperature,
        stream: options.stream
      };
      
      // Create tools wrapper for LLM
      const functionsWrapper = {
        functions: tools.map(t => ({
          name: t.name,
          description: t.description,
          parameters: t.schema
        }))
      };
      
      // Build conversation history
      const history = this.buildConversationHistory(messages, userMessage);
      
      // Initialize prompt
      const systemPrompt = "You are a helpful AI assistant that can use tools to answer questions.";
      const fullPrompt = [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: userMessage.content }
      ];
      
      // Execute the request with tools
      const result = await llmClient.generateResponseWithTools(
        fullPrompt, 
        functionsWrapper, 
        llmOptions
      );
      
      // Process tool calls and build response
      const toolCallIds: string[] = [];
      
      // Handle tool executions
      for (const toolCall of result.toolCalls || []) {
        // Create tool call message
        const toolCallMessage = await this.messageRepository.create({
          conversationId: conversation.id,
          role: MessageRole.ASSISTANT,
          content: `Calling tool: ${toolCall.name}`,
          parentMessageId: agentMessage.id,
          metadata: {
            isToolCall: true,
            toolName: toolCall.name,
            toolInput: toolCall.arguments
          }
        });
        
        // Add to the list of tool call IDs
        toolCallIds.push(toolCallMessage.id);
        
        // Execute tool and get result
        const tool = this.toolRegistry.getTool(toolCall.name);
        let toolResult = "";
        
        if (tool) {
          try {
            toolResult = await tool.invoke(toolCall.arguments);
          } catch (error) {
            toolResult = `Error executing tool: ${(error as Error).message}`;
          }
        } else {
          toolResult = `Tool '${toolCall.name}' not found`;
        }
        
        // Create tool result message
        await this.messageRepository.create({
          conversationId: conversation.id,
          role: MessageRole.TOOL,
          content: toolResult,
          parentMessageId: toolCallMessage.id,
          metadata: {
            toolName: toolCall.name,
            toolInput: toolCall.arguments
          }
        });
        
        if (onToolExecution) {
          onToolExecution(toolCall.name, toolCall.arguments, toolResult);
        }
      }
      
      // Update the assistant message with the final result and metadata
      await this.messageRepository.update(agentMessage.id, {
        content: result.content,
        metadata: {
          isAgentResponse: true,
          toolCallIds
        }
      });
      
      // Refresh the message to get the updated content
      const updatedAgentMessage = await this.messageRepository.findById(agentMessage.id);
      
      if (!updatedAgentMessage) {
        throw new Error("Failed to retrieve updated agent message");
      }
      
      return updatedAgentMessage;
      
    } catch (error) {
      logger.error("Error processing agent message", {
        error: (error as Error).message,
        conversationId: conversation.id,
        messageId: userMessage.id
      });
      
      throw new Error(`Agent error: ${(error as Error).message}`);
    }
  }
  
  private getToolsForAgent(): Tool[] {
    // Return all available tools
    return this.toolRegistry.getAllTools();
  }
  
  private buildConversationHistory(
    messages: Message[],
    currentMessage: Message
  ): { role: string, content: string }[] {
    // Filter out current message
    const filteredMessages = messages.filter(msg => msg.id !== currentMessage.id);
    
    // Convert to LangChain format
    return filteredMessages.map(msg => ({
      role: msg.role.toLowerCase(),
      content: msg.content
    }));
  }
} 