import { z } from "zod";

// Options schema
export const MessageOptionsSchema = z.object({
  temperature: z.number().min(0).max(2).optional().default(0.7),
  top_p: z.number().min(0).max(1).optional().default(0.9),
  presence_penalty: z.number().min(0).max(2).optional().default(0),
  frequency_penalty: z.number().min(0).max(2).optional().default(0),
  max_tokens: z.number().positive().optional().default(1024),
});

// Plugin schema
export const PluginSchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean().optional().default(true),
  config: z.record(z.any()).optional(),
});

// Base message request schema
const BaseMessageRequestSchema = z.object({
  message: z.string().min(1).max(100000),
  model: z.string().min(1),
  options: MessageOptionsSchema.optional().default({}),
  stream: z.boolean().optional().default(false),
  plugins: z.array(PluginSchema).optional().default([]),
  agentMode: z.boolean().optional().default(false),
});

// Initial message request (no conversationId)
export const InitialMessageRequestSchema = BaseMessageRequestSchema.extend({
  conversationId: z.null(),
  parentMessageId: z.null(),
  systemMessage: z.string().optional(),
});

// Follow-up message request (has conversationId)
export const FollowUpMessageRequestSchema = BaseMessageRequestSchema.extend({
  conversationId: z.string().uuid(),
  parentMessageId: z.string().uuid(),
  systemMessage: z.undefined().optional(),
});

// Combined schema that accepts either type
export const MessageRequestSchema = z.union([
  InitialMessageRequestSchema,
  FollowUpMessageRequestSchema
]);

export type MessageOptions = z.infer<typeof MessageOptionsSchema>;
export type Plugin = z.infer<typeof PluginSchema>;
export type InitialMessageRequest = z.infer<typeof InitialMessageRequestSchema>;
export type FollowUpMessageRequest = z.infer<typeof FollowUpMessageRequestSchema>;
export type MessageRequest = z.infer<typeof MessageRequestSchema>; 