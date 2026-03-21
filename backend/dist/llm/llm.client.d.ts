import { ConfigService } from '@nestjs/config';
import { ChatCompletionOptions, ChatCompletionResult, ChatMessage, EmbeddingResult } from './llm.types';
export declare class LlmClient {
    private readonly config;
    private readonly logger;
    private readonly openai;
    private readonly chatDeployment;
    private readonly embeddingDeployment;
    constructor(config: ConfigService);
    createEmbedding(text: string): Promise<EmbeddingResult>;
    createChatCompletion(messages: ChatMessage[], options?: ChatCompletionOptions): Promise<ChatCompletionResult>;
    private withRetry;
    private sleep;
}
