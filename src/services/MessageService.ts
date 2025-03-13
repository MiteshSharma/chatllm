import { v4 as uuidv4 } from "uuid";
import { Conversation } from "../models/Conversation";
import { Message } from "../models/Message";
import { MessageRole } from "../models/MessageRole";
import { RequestType } from "../models/RequestType";
import { ConversationRepository } from "../repository/database/ConversationRepository";
import { MessageRepository } from "../repository/database/MessageRepository";
import { TokenUsageRepository } from "../repository/database/TokenUsageRepository";
import { ConversationRepositoryImpl } from "../repository/database/ConversationRepositoryImpl";
import { MessageRepositoryImpl } from "../repository/database/MessageRepositoryImpl";
import { TokenUsageRepositoryImpl } from "../repository/database/TokenUsageRepositoryImpl";
import { FollowUpMessageRequest, InitialMessageRequest, MessageRequest } from "../api/dto/message.dto";
import { logger } from "../utils/logger/winston-logger";
import { LLMClientFactory } from "../domain/llm/LLMClientFactory";
import { LLMRequestOptions, LLMMessage } from "../domain/llm/LLMClient";

export class MessageService {
  private conversationRepository: ConversationRepository;
  private messageRepository: MessageRepository;
  private tokenUsageRepository: TokenUsageRepository;
  
  constructor() {
    this.conversationRepository = new ConversationRepositoryImpl();
    this.messageRepository = new MessageRepositoryImpl();
    this.tokenUsageRepository = new TokenUsageRepositoryImpl();
  }
  
  async processMessage(messageRequest: MessageRequest, userId: string = "default-user-id"): Promise<{
    response: Message;
    conversation: Conversation;
    isNewConversation: boolean;
  }> {
    let conversation: Conversation;
    let isNewConversation = false;
    
    // Handle either new conversation or existing one
    if (!messageRequest.conversationId) {
      // Create new conversation
      const initialRequest = messageRequest as InitialMessageRequest;
      conversation = await this.createNewConversation(initialRequest, userId);
      isNewConversation = true;
    } else {
      // Get existing conversation
      const followUpRequest = messageRequest as FollowUpMessageRequest;
      const existingConversation = await this.conversationRepository.findById(followUpRequest.conversationId);
      
      if (!existingConversation) {
        throw new Error(`Conversation with ID ${followUpRequest.conversationId} not found`);
      }
      
      conversation = existingConversation;
    }
    
    // Save user message
    const userMessage = await this.messageRepository.create({
      conversationId: conversation.id,
      userId: null,
      role: MessageRole.USER,
      content: messageRequest.message,
      parentMessageId: messageRequest.parentMessageId || null
    });
    
    // Get conversation history
    const messages = await this.messageRepository.findByConversationId(conversation.id);
    
    // Build prompt for LLM
    const llmMessages = this.buildLLMPrompt(conversation, messages, userMessage);
    
    // Get LLM client and generate response
    const llmClient = LLMClientFactory.createClient(messageRequest.model);
    const llmOptions: LLMRequestOptions = {
      temperature: messageRequest.options?.temperature,
      topP: messageRequest.options?.top_p,
      presencePenalty: messageRequest.options?.presence_penalty,
      frequencyPenalty: messageRequest.options?.frequency_penalty,
      maxTokens: messageRequest.options?.max_tokens,
      stream: messageRequest.stream
    };
    
    // Generate response from LLM
    const llmResponse = await llmClient.generateResponse(llmMessages, llmOptions);
    
    // Save assistant message
    const assistantMessage = await this.messageRepository.create({
      conversationId: conversation.id,
      role: MessageRole.ASSISTANT,
      content: llmResponse.content,
      parentMessageId: userMessage.id,
      tokenCount: llmResponse.tokenUsage.completionTokens
    });
    
    // Update conversation token count and message count
    await this.conversationRepository.incrementMessageCount(
      conversation.id, 
      llmResponse.tokenUsage.promptTokens + llmResponse.tokenUsage.completionTokens
    );
    
    // Track token usage
    await this.tokenUsageRepository.create({
      userId: uuidv4(),
      conversationId: conversation.id,
      messageId: assistantMessage.id,
      model: messageRequest.model,
      promptTokens: llmResponse.tokenUsage.promptTokens,
      completionTokens: llmResponse.tokenUsage.completionTokens,
      totalTokens: llmResponse.tokenUsage.totalTokens,
      // Placeholder for actual costs - would be calculated based on model pricing
      promptCost: llmResponse.tokenUsage.promptTokens * 0.00001,
      completionCost: llmResponse.tokenUsage.completionTokens * 0.00002,
      totalCost: (llmResponse.tokenUsage.promptTokens * 0.00001) + 
                 (llmResponse.tokenUsage.completionTokens * 0.00002),
      requestType: RequestType.MESSAGE
    });
    
    return {
      response: assistantMessage,
      conversation,
      isNewConversation
    };
  }
  
  async processStreamingMessage(
    messageRequest: MessageRequest, 
    userId: string = "default-user-id",
    onChunk: (chunk: string) => void,
    onComplete: (finalResponse: any) => void
  ): Promise<{
    conversation: Conversation;
    isNewConversation: boolean;
  }> {
    let conversation: Conversation;
    let isNewConversation = false;
    
    // Handle either new conversation or existing one
    if (!messageRequest.conversationId) {
      // Create new conversation
      const initialRequest = messageRequest as InitialMessageRequest;
      conversation = await this.createNewConversation(initialRequest, userId);
      isNewConversation = true;
    } else {
      // Get existing conversation
      const followUpRequest = messageRequest as FollowUpMessageRequest;
      const existingConversation = await this.conversationRepository.findById(followUpRequest.conversationId);
      
      if (!existingConversation) {
        throw new Error(`Conversation with ID ${followUpRequest.conversationId} not found`);
      }
      
      conversation = existingConversation;
    }
    
    // Save user message
    const userMessage = await this.messageRepository.create({
      conversationId: conversation.id,
      userId: null,
      role: MessageRole.USER,
      content: messageRequest.message,
      parentMessageId: messageRequest.parentMessageId || null
    });
    
    // Get conversation history
    const messages = await this.messageRepository.findByConversationId(conversation.id);
    
    // Build prompt for LLM
    const llmMessages = this.buildLLMPrompt(conversation, messages, userMessage);
    
    // Get LLM client and generate response
    const llmClient = LLMClientFactory.createClient(messageRequest.model);
    const llmOptions: LLMRequestOptions = {
      temperature: messageRequest.options?.temperature,
      topP: messageRequest.options?.top_p,
      presencePenalty: messageRequest.options?.presence_penalty,
      frequencyPenalty: messageRequest.options?.frequency_penalty,
      maxTokens: messageRequest.options?.max_tokens,
      stream: true
    };
    
    // Create a placeholder for the assistant message
    const assistantMessage = await this.messageRepository.create({
      conversationId: conversation.id,
      role: MessageRole.ASSISTANT,
      content: "", // Start with empty content
      parentMessageId: userMessage.id,
      tokenCount: 0
    });
    
    // Stream the response and collect content
    let fullContent = '';
    
    try {
      const llmResponse = await llmClient.streamChatResponse(
        llmMessages, 
        llmOptions,
        (chunk: string) => {
          fullContent += chunk;
          onChunk(chunk);
        }
      );
      
      // Update assistant message with complete content and token count
      await this.messageRepository.update(assistantMessage.id, {
        content: llmResponse.content,
        tokenCount: llmResponse.tokenUsage.completionTokens
      });
      
      // Update conversation token count and message count
      await this.conversationRepository.incrementMessageCount(
        conversation.id, 
        llmResponse.tokenUsage.promptTokens + llmResponse.tokenUsage.completionTokens
      );
      
      // Track token usage
      await this.tokenUsageRepository.create({
        userId: uuidv4(),
        conversationId: conversation.id,
        messageId: assistantMessage.id,
        model: messageRequest.model,
        promptTokens: llmResponse.tokenUsage.promptTokens,
        completionTokens: llmResponse.tokenUsage.completionTokens,
        totalTokens: llmResponse.tokenUsage.totalTokens,
        promptCost: llmResponse.tokenUsage.promptTokens * 0.00001,
        completionCost: llmResponse.tokenUsage.completionTokens * 0.00002,
        totalCost: (llmResponse.tokenUsage.promptTokens * 0.00001) + 
                  (llmResponse.tokenUsage.completionTokens * 0.00002),
        requestType: RequestType.MESSAGE
      });
      
      // Send final response information
      const finalResponse = {
        messageId: assistantMessage.id,
        conversationId: conversation.id,
        text: llmResponse.content,
        role: MessageRole.ASSISTANT,
        tokenCount: llmResponse.tokenUsage.completionTokens,
        parentMessageId: userMessage.id,
        tokenUsage: {
          promptTokens: llmResponse.tokenUsage.promptTokens,
          completionTokens: llmResponse.tokenUsage.completionTokens,
          totalTokens: llmResponse.tokenUsage.totalTokens
        },
        finish_reason: llmResponse.finishReason,
        createdAt: assistantMessage.createdAt
      };
      
      onComplete(finalResponse);
      
    } catch (error) {
      logger.error("Error in streaming response", {
        error: (error as Error).message,
        conversationId: conversation.id,
        messageId: assistantMessage.id
      });
      
      // Update message to indicate error
      await this.messageRepository.update(assistantMessage.id, {
        content: "Error generating response. Please try again.",
      });
      
      throw error;
    }
    
    return { conversation, isNewConversation };
  }
  
  private async createNewConversation(
    initialRequest: InitialMessageRequest, 
    userId: string
  ): Promise<Conversation> {
    // Create a new conversation
    const conversation = new Conversation();
    conversation.title = "New Conversation"; // Default title
    conversation.settings = {
      temperature: initialRequest.options?.temperature,
      top_p: initialRequest.options?.top_p,
      presence_penalty: initialRequest.options?.presence_penalty,
      frequency_penalty: initialRequest.options?.frequency_penalty,
      max_tokens: initialRequest.options?.max_tokens
    };
    conversation.messageCount = 0;
    conversation.tokenCount = 0;
    
    return this.conversationRepository.create(conversation);
  }
  
  private buildLLMPrompt(
    conversation: Conversation, 
    messages: Message[], 
    currentMessage: Message
  ): LLMMessage[] {
    const llmMessages: LLMMessage[] = [];
    
    // Add system message if it exists
    if (conversation.systemMessage) {
      llmMessages.push({
        role: "system",
        content: conversation.systemMessage
      });
    }
    
    // Add conversation history
    for (const message of messages) {
      if (message.id !== currentMessage.id) { // Skip the current message as we add it last
        llmMessages.push({
          role: message.role.toLowerCase(),
          content: message.content
        });
      }
    }
    
    // Add current message
    llmMessages.push({
      role: currentMessage.role.toLowerCase(),
      content: currentMessage.content
    });
    
    logger.debug("Built LLM prompt", { 
      messagesCount: llmMessages.length, 
      systemMessageIncluded: !!conversation.systemMessage 
    });
    
    return llmMessages;
  }
  
  async saveUserMessage(
    messageRequest: MessageRequest, 
    userId: string = "default-user-id"
  ): Promise<{
    conversation: Conversation;
    isNewConversation: boolean;
    userMessage: Message;
  }> {
    let conversation: Conversation;
    let isNewConversation = false;
    
    // Handle either new conversation or existing one
    if (!messageRequest.conversationId) {
      // Create new conversation
      const initialRequest = messageRequest as InitialMessageRequest;
      conversation = await this.createNewConversation(initialRequest, userId);
      isNewConversation = true;
    } else {
      // Get existing conversation
      const followUpRequest = messageRequest as FollowUpMessageRequest;
      const existingConversation = await this.conversationRepository.findById(followUpRequest.conversationId);
      
      if (!existingConversation) {
        throw new Error(`Conversation with ID ${followUpRequest.conversationId} not found`);
      }
      
      conversation = existingConversation;
    }
    
    // Save user message
    const userMessage = await this.messageRepository.create({
      conversationId: conversation.id,
      userId: null,
      role: MessageRole.USER,
      content: messageRequest.message,
      parentMessageId: messageRequest.parentMessageId || null
    });
    
    return { conversation, isNewConversation, userMessage };
  }
} 