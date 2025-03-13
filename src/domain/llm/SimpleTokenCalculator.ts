import { LLMMessage } from "../../domain/llm/LLMClientInterface";
import { TokenCalculator } from "../../domain/llm/TokenCalculator";

export class SimpleTokenCalculator implements TokenCalculator {
  /**
   * Simple approximation of token counting
   */
  countTokens(messages: LLMMessage[]): number {
    let totalTokens = 0;
    
    for (const message of messages) {
      // Very rough estimate: ~4 chars per token + overhead for role
      totalTokens += this.estimateTokenCount(message.content) + 3;
    }
    
    return totalTokens;
  }
  
  /**
   * Estimate tokens using a simple character-based method
   */
  estimateTokenCount(text: string): number {
    // Simple approximation - about 4 characters per token
    return Math.ceil(text.length / 4);
  }
  
  /**
   * Get the tokenizer name
   */
  getTokenizerName(): string {
    return "simple-char-estimate";
  }
} 