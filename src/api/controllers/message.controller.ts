import { NextFunction, Request, Response } from "express";
import { fromZodError } from "zod-validation-error";
import { MessageRequestSchema } from "../dto/message.dto";
import { MessageService } from "../../services/MessageService";
import { AgentService } from "../../services/AgentService";
import { Message } from "../../models/Message";
import { Conversation } from "../../models/Conversation";

export class MessageController {
  private messageService: MessageService;
  private agentService: AgentService;
  
  constructor() {
    this.messageService = new MessageService();
    this.agentService = new AgentService();
  }
  
  /**
   * Process a new message
   */
  async processMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request body against schema
      const result = MessageRequestSchema.safeParse(req.body);
      
      if (!result.success) {
        const validationError = fromZodError(result.error);
        res.status(400).json({
          error: {
            message: "Invalid message request",
            details: validationError.details
          }
        });
        return;
      }

      const messageRequest = result.data;
      
      // Use a temporary user ID - in a real app, this would come from authentication
      const userId = "temp-user-id";
      
      // Handle streaming responses differently
      if (messageRequest.stream) {
        // Set appropriate headers for streaming
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        // Check if agent mode is requested
        if (messageRequest.agentMode) {
          // Process agent streaming
          const { conversation, isNewConversation, userMessage } = 
            await this.messageService.saveUserMessage(messageRequest, userId);
          
          // Process streaming agent
          this.agentService.processAgentMessage(userMessage).then(finalResponse => {
            // Send final message with complete response data
            res.write(`data: ${JSON.stringify({ 
              ...this.formatAgentResponse(finalResponse, conversation),
              done: true 
            })}\n\n`);
            res.end();
          }).catch(error => {
            res.write(`data: ${JSON.stringify({ 
              error: error.message,
              done: true 
            })}\n\n`);
            res.end();
          });
        } else {
          // Process streaming response
          const { conversation, isNewConversation } = 
            await this.messageService.processStreamingMessage(
              messageRequest, 
              userId,
              (chunk: string) => {
                res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
              },
              (finalResponse: any) => {
                // Send final message with complete response data
                res.write(`data: ${JSON.stringify({ 
                  ...finalResponse,
                  done: true 
                })}\n\n`);
                res.end();
              }
            );
        }
        
        return;
      }
      
      // Handle non-streaming responses
      if (messageRequest.agentMode) {
        const { conversation, isNewConversation, userMessage } = 
          await this.messageService.saveUserMessage(messageRequest, userId);
        
        const agentResponse = await this.agentService.processAgentMessage(userMessage);
        
        res.status(200).json(this.formatAgentResponse(agentResponse, conversation));
      } else {
        // Handle non-streaming responses as before
        const { response, conversation, isNewConversation } = 
          await this.messageService.processMessage(messageRequest, userId);
        
        // Return response with the required format
        res.status(200).json({
          messageId: response.id,
          conversationId: conversation.id,
          text: response.content,
          role: response.role,
          tokenCount: response.tokenCount || 0,
          parentMessageId: response.parentMessageId,
          tokenUsage: {
            promptTokens: 35, // Placeholder - would be from actual usage
            completionTokens: response.tokenCount || 0,
            totalTokens: 35 + (response.tokenCount || 0)
          },
          finish_reason: "stop",
          createdAt: response.createdAt
        });
      }
      
    } catch (error) {
      next(error);
    }
  }

  private formatAgentResponse(response: Message, conversation: Conversation) {
    return {
      messageId: response.id,
      conversationId: conversation.id,
      text: response.content,
      role: response.role,
      tokenCount: response.tokenCount || 0,
      parentMessageId: response.parentMessageId,
      tokenUsage: {
        promptTokens: 0, // This would need proper calculation
        completionTokens: response.tokenCount || 0,
        totalTokens: response.tokenCount || 0
      },
      isAgentResponse: response.metadata?.isAgentResponse === true,
      finish_reason: "stop",
      createdAt: response.createdAt
    };
  }
} 