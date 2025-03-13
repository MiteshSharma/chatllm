import { ChatGPTClient } from "./ChatGPTClient";
import { LLMClient } from "./LLMClient";
import { TokenCalculator } from "./TokenCalculator";
import { logger } from "../../utils/logger/winston-logger";
import { SimpleTokenCalculator } from "./SimpleTokenCalculator";

/**
 * Factory for creating LLM clients based on the model name
 */
export class LLMClientFactory {
  /**
   * Create the appropriate LLM client based on the model name
   */
  static createClient(model: string): LLMClient {
    logger.debug(`Creating LLM client for model: ${model}`);
    
    // Get the appropriate token calculator for this model
    const tokenCalculator = this.getTokenCalculator(model);
    
    // OpenAI GPT models
    if (model.startsWith('gpt-')) {
      return new ChatGPTClient(model, tokenCalculator);
    }
    
    // Default to ChatGPT for unknown models
    logger.warn(`Unknown model requested: ${model}. Using ChatGPT as fallback.`);
    return new ChatGPTClient(model, tokenCalculator);
  }
  
  /**
   * Get the appropriate token calculator for a specific model
   */
  private static getTokenCalculator(model: string): TokenCalculator {
    // For now, always return SimpleTokenCalculator as a baseline implementation
    // In the future, we can add model-specific token calculators
    return new SimpleTokenCalculator();
  }
} 