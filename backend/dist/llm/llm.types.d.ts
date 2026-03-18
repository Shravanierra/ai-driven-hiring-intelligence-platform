export interface EmbeddingResult {
    embedding: number[];
    model: string;
    usage: {
        prompt_tokens: number;
        total_tokens: number;
    };
}
export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}
export interface ChatCompletionResult {
    content: string;
    model: string;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}
export interface ChatCompletionOptions {
    temperature?: number;
    maxTokens?: number;
    responseFormat?: 'text' | 'json_object';
}
export declare class AiServiceUnavailableError extends Error {
    readonly statusCode = 503;
    readonly errorCode = "ai_service_unavailable";
    constructor(message?: string);
}
