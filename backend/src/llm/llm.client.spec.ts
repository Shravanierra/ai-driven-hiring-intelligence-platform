import * as fc from 'fast-check';
import { LlmClient } from './llm.client';
import { AiServiceUnavailableError } from './llm.types';
import { ConfigService } from '@nestjs/config';

// Minimal ConfigService stub
function makeConfig(overrides: Record<string, string> = {}): ConfigService {
  return {
    get: (key: string, defaultVal?: unknown) =>
      overrides[key] ?? defaultVal ?? '',
  } as unknown as ConfigService;
}

describe('LlmClient', () => {
  describe('AiServiceUnavailableError', () => {
    it('has statusCode 503 and errorCode ai_service_unavailable', () => {
      const err = new AiServiceUnavailableError();
      expect(err.statusCode).toBe(503);
      expect(err.errorCode).toBe('ai_service_unavailable');
      expect(err).toBeInstanceOf(Error);
    });
  });

  describe('withRetry (via createEmbedding)', () => {
    it('throws AiServiceUnavailableError after 3 failed attempts', async () => {
      const client = new LlmClient(makeConfig({ OPENAI_API_KEY: 'test-key' }));

      // Replace the internal openai instance with a failing stub
      (client as any).openai = {
        embeddings: {
          create: jest.fn().mockRejectedValue(new Error('network error')),
        },
      };
      // Speed up retries in tests
      (client as any).sleep = () => Promise.resolve();

      await expect(client.createEmbedding('hello')).rejects.toBeInstanceOf(
        AiServiceUnavailableError,
      );

      expect((client as any).openai.embeddings.create).toHaveBeenCalledTimes(3);
    });

    it('succeeds on second attempt after one failure', async () => {
      const client = new LlmClient(makeConfig({ OPENAI_API_KEY: 'test-key' }));
      (client as any).sleep = () => Promise.resolve();

      const mockEmbedding = new Array(1536).fill(0.1);
      const createMock = jest
        .fn()
        .mockRejectedValueOnce(new Error('transient'))
        .mockResolvedValueOnce({
          data: [{ embedding: mockEmbedding }],
          model: EMBEDDING_MODEL,
          usage: { prompt_tokens: 5, total_tokens: 5 },
        });

      (client as any).openai = { embeddings: { create: createMock } };

      const result = await client.createEmbedding('hello');
      expect(result.embedding).toEqual(mockEmbedding);
      expect(createMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('createChatCompletion', () => {
    it('returns content from the first choice', async () => {
      const client = new LlmClient(makeConfig({ OPENAI_API_KEY: 'test-key' }));
      (client as any).sleep = () => Promise.resolve();

      (client as any).openai = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{ message: { content: 'Hello world' } }],
              model: 'gpt-4o',
              usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
            }),
          },
        },
      };

      const result = await client.createChatCompletion([
        { role: 'user', content: 'Hi' },
      ]);
      expect(result.content).toBe('Hello world');
      expect(result.usage.total_tokens).toBe(15);
    });
  });

  // Feature: ai-hiring-platform, Property N: LLM retry exhaustion always produces AiServiceUnavailableError
  describe('property: retry exhaustion always throws AiServiceUnavailableError', () => {
    it('always throws AiServiceUnavailableError regardless of underlying error message', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 200 }), async (errorMsg) => {
          const client = new LlmClient(makeConfig({ OPENAI_API_KEY: 'test-key' }));
          (client as any).sleep = () => Promise.resolve();
          (client as any).openai = {
            embeddings: {
              create: jest.fn().mockRejectedValue(new Error(errorMsg)),
            },
          };

          await expect(client.createEmbedding('test')).rejects.toBeInstanceOf(
            AiServiceUnavailableError,
          );
        }),
        { numRuns: 100 },
      );
    });
  });
});

const EMBEDDING_MODEL = 'text-embedding-ada-002';
