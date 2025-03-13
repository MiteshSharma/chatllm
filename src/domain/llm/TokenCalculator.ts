import { LLMMessage } from "./LLMClient";

/**
 * Interface for token calculation across different LLM models
 */
export interface TokenCalculator {
  /**
   * Calculate the number of tokens in a list of messages
   * @param messages Array of messages to calculate tokens for
   * @returns Total token count
   */
  countTokens(messages: LLMMessage[]): number;
  
  /**
   * Estimate the number of tokens in a text string
   * @param text Text to calculate tokens for
   * @returns Estimated token count
   */
  estimateTokenCount(text: string): number;
  
  /**
   * Get the name of the tokenizer being used
   * @returns Tokenizer name
   */
  getTokenizerName(): string;
} 