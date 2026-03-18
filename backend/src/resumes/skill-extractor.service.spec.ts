import { Test, TestingModule } from '@nestjs/testing';
import { SkillExtractorService } from './skill-extractor.service';
import { LlmClient } from '../llm/llm.client';

function makeLlmResponse(skills: Array<{ canonical_name: string; raw_aliases: string[] }>) {
  return {
    content: JSON.stringify({ skills }),
    model: 'gpt-4o',
    usage: { prompt_tokens: 10, completion_tokens: 50, total_tokens: 60 },
  };
}

describe('SkillExtractorService', () => {
  let service: SkillExtractorService;
  let llmClient: { createChatCompletion: jest.Mock };

  beforeEach(async () => {
    llmClient = { createChatCompletion: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkillExtractorService,
        { provide: LlmClient, useValue: llmClient },
      ],
    }).compile();

    service = module.get<SkillExtractorService>(SkillExtractorService);
  });

  describe('extractSkills', () => {
    it('returns skills with canonical names and raw aliases', async () => {
      llmClient.createChatCompletion.mockResolvedValue(
        makeLlmResponse([
          { canonical_name: 'Kubernetes', raw_aliases: ['K8s', 'Kubernetes'] },
          { canonical_name: 'JavaScript', raw_aliases: ['JS', 'JavaScript'] },
        ]),
      );

      const skills = await service.extractSkills('Experience with K8s and JS');

      expect(skills).toHaveLength(2);
      expect(skills[0].canonical_name).toBe('Kubernetes');
      expect(skills[0].raw_aliases).toContain('K8s');
      expect(skills[1].canonical_name).toBe('JavaScript');
      expect(skills[1].raw_aliases).toContain('JS');
    });

    it('maps K8s alias to Kubernetes canonical name', async () => {
      llmClient.createChatCompletion.mockResolvedValue(
        makeLlmResponse([
          { canonical_name: 'Kubernetes', raw_aliases: ['K8s'] },
        ]),
      );

      const skills = await service.extractSkills('Deployed services using K8s');

      expect(skills).toHaveLength(1);
      expect(skills[0].canonical_name).toBe('Kubernetes');
      expect(skills[0].raw_aliases).toEqual(['K8s']);
    });

    it('returns empty array when LLM returns invalid JSON', async () => {
      llmClient.createChatCompletion.mockResolvedValue({
        content: 'not valid json',
        model: 'gpt-4o',
        usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
      });

      const skills = await service.extractSkills('some resume text');
      expect(skills).toEqual([]);
    });

    it('returns empty array when LLM response has no skills array', async () => {
      llmClient.createChatCompletion.mockResolvedValue({
        content: JSON.stringify({ result: 'no skills key' }),
        model: 'gpt-4o',
        usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
      });

      const skills = await service.extractSkills('some resume text');
      expect(skills).toEqual([]);
    });

    it('filters out skills with empty canonical names', async () => {
      llmClient.createChatCompletion.mockResolvedValue(
        makeLlmResponse([
          { canonical_name: '', raw_aliases: ['something'] },
          { canonical_name: 'Python', raw_aliases: ['Python'] },
        ]),
      );

      const skills = await service.extractSkills('Python developer');
      expect(skills).toHaveLength(1);
      expect(skills[0].canonical_name).toBe('Python');
    });

    it('calls LLM with json_object response format and low temperature', async () => {
      llmClient.createChatCompletion.mockResolvedValue(makeLlmResponse([]));

      await service.extractSkills('resume text');

      expect(llmClient.createChatCompletion).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user', content: 'resume text' }),
        ]),
        expect.objectContaining({ responseFormat: 'json_object', temperature: 0.1 }),
      );
    });

    it('returns empty array when skills array is empty', async () => {
      llmClient.createChatCompletion.mockResolvedValue(makeLlmResponse([]));

      const skills = await service.extractSkills('resume with no skills');
      expect(skills).toEqual([]);
    });

    it('handles multiple aliases for the same canonical skill', async () => {
      llmClient.createChatCompletion.mockResolvedValue(
        makeLlmResponse([
          {
            canonical_name: 'TypeScript',
            raw_aliases: ['TS', 'Typescript', 'TypeScript'],
          },
        ]),
      );

      const skills = await service.extractSkills('TS and Typescript experience');
      expect(skills[0].canonical_name).toBe('TypeScript');
      expect(skills[0].raw_aliases).toHaveLength(3);
    });
  });
});
