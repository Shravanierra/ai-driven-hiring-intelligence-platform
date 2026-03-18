import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  AiServiceUnavailableError,
  ChatCompletionOptions,
  ChatCompletionResult,
  ChatMessage,
  EmbeddingResult,
} from './llm.types';

const EMBEDDING_MODEL = 'text-embedding-ada-002';
const CHAT_MODEL = 'gpt-4o';
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

@Injectable()
export class LlmClient {
  private readonly logger = new Logger(LlmClient.name);
  private readonly openai: OpenAI;

  constructor(private readonly config: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.config.get<string>('OPENAI_API_KEY'),
    });
  }

  /**
   * Generate an embedding vector for the given text using text-embedding-ada-002.
   * Retries up to 3 times with exponential backoff before throwing AiServiceUnavailableError.
   */
  async createEmbedding(text: string): Promise<EmbeddingResult> {
    return this.withRetry(async () => {
      const response = await this.openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: text,
      });

      return {
        embedding: response.data[0].embedding,
        model: response.model,
        usage: {
          prompt_tokens: response.usage.prompt_tokens,
          total_tokens: response.usage.total_tokens,
        },
      };
    });
  }

  /**
   * Create a chat completion using GPT-4o.
   * Retries up to 3 times with exponential backoff before throwing AiServiceUnavailableError.
   */
  async createChatCompletion(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {},
  ): Promise<ChatCompletionResult> {
    return this.withRetry(async () => {
      const response = await this.openai.chat.completions.create({
        model: CHAT_MODEL,
        messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens,
        response_format:
          options.responseFormat === 'json_object'
            ? { type: 'json_object' }
            : { type: 'text' },
      });

      const choice = response.choices[0];
      return {
        content: choice.message.content ?? '',
        model: response.model,
        usage: {
          prompt_tokens: response.usage?.prompt_tokens ?? 0,
          completion_tokens: response.usage?.completion_tokens ?? 0,
          total_tokens: response.usage?.total_tokens ?? 0,
        },
      };
    });
  }

  /**
   * Wraps an async operation with retry logic:
   * - 3 attempts total
   * - Exponential backoff: 500ms, 1000ms, 2000ms
   * - Throws AiServiceUnavailableError (maps to HTTP 503) on exhaustion
   */
  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `LLM call failed (attempt ${attempt}/${MAX_RETRIES}): ${lastError.message}`,
        );

        if (attempt < MAX_RETRIES) {
          const delayMs = BASE_DELAY_MS * Math.pow(2, attempt - 1);
          await this.sleep(delayMs);
        }
      }
    }

    this.logger.error(
      `LLM call exhausted all ${MAX_RETRIES} retries. Last error: ${lastError?.message}`,
    );
    throw new AiServiceUnavailableError();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
