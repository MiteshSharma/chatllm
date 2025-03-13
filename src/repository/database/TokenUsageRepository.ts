import { TokenUsage } from "../../models/TokenUsage";

export interface TokenUsageRepository {
  create(tokenUsage: Partial<TokenUsage>): Promise<TokenUsage>;
} 