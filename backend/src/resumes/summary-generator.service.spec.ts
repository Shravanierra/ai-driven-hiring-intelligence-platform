import { Test, TestingModule } from '@nestjs/testing';
import { SummaryGeneratorService } from './summary-generator.service';
import { LlmClient } from '../llm/llm.client';
import { WorkExperience, Education, Skill } from '../entities/candidate-profile.entity';

function makeLlmResponse(content: string) {
  return {
    content,
    model: 'gpt-4o',
    usage: { prompt_tokens: 20, completion_tokens: 60, total_tokens: 80 },
  };
}

const sampleSkills: Skill[] = [
  { canonical_name: 'TypeScript', raw_aliases: ['TS', 'TypeScript'] },
  { canonical_name: 'Node.js', raw_aliases: ['Node', 'NodeJS'] },
];

const sampleWorkExperience: WorkExperience[] = [
  {
    company: 'Acme Corp',
    title: 'Senior Engineer',
    start_date: '2020-01',
    end_date: null,
    description: 'Led backend development.',
  },
];

const sampleEducation: Education[] = [
  {
    institution: 'MIT',
    degree: 'B.Sc.',
    field: 'Computer Science',
    graduation_year: 2019,
  },
];

describe('SummaryGeneratorService', () => {
  let service: SummaryGeneratorService;
  let llmClient: { createChatCompletion: jest.Mock };

  beforeEach(async () => {
    llmClient = { createChatCompletion: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SummaryGeneratorService,
        { provide: LlmClient, useValue: llmClient },
      ],
    }).compile();

    service = module.get<SummaryGeneratorService>(SummaryGeneratorService);
  });

  describe('generateSummary', () => {
    it('returns the LLM-generated summary when non-empty', async () => {
      const expected = 'Jane is a Senior Engineer with 5 years of TypeScript experience.';
      llmClient.createChatCompletion.mockResolvedValue(makeLlmResponse(expected));

      const summary = await service.generateSummary({
        name: 'Jane Doe',
        skills: sampleSkills,
        workExperience: sampleWorkExperience,
        education: sampleEducation,
      });

      expect(summary).toBe(expected);
    });

    it('returns a non-empty fallback when LLM returns empty string', async () => {
      llmClient.createChatCompletion.mockResolvedValue(makeLlmResponse(''));

      const summary = await service.generateSummary({
        name: 'John Smith',
        skills: sampleSkills,
        workExperience: sampleWorkExperience,
        education: sampleEducation,
      });

      expect(summary.trim().length).toBeGreaterThan(0);
    });

    it('returns a non-empty fallback when LLM throws an error', async () => {
      llmClient.createChatCompletion.mockRejectedValue(new Error('LLM unavailable'));

      const summary = await service.generateSummary({
        name: 'Alice Brown',
        skills: sampleSkills,
        workExperience: sampleWorkExperience,
        education: sampleEducation,
      });

      expect(summary.trim().length).toBeGreaterThan(0);
    });

    it('fallback summary includes candidate name', async () => {
      llmClient.createChatCompletion.mockRejectedValue(new Error('timeout'));

      const summary = await service.generateSummary({
        name: 'Bob Jones',
        skills: [],
        workExperience: [],
        education: [],
      });

      expect(summary).toContain('Bob Jones');
    });

    it('fallback summary includes latest job title when work experience is present', async () => {
      llmClient.createChatCompletion.mockResolvedValue(makeLlmResponse('   '));

      const summary = await service.generateSummary({
        name: 'Carol White',
        skills: [],
        workExperience: sampleWorkExperience,
        education: [],
      });

      expect(summary).toContain('Senior Engineer');
    });

    it('calls LLM with system and user messages', async () => {
      llmClient.createChatCompletion.mockResolvedValue(
        makeLlmResponse('A great candidate.'),
      );

      await service.generateSummary({
        name: 'Dave Green',
        skills: sampleSkills,
        workExperience: sampleWorkExperience,
        education: sampleEducation,
      });

      expect(llmClient.createChatCompletion).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user' }),
        ]),
        expect.objectContaining({ temperature: 0.3 }),
      );
    });

    it('includes skill names in the profile text sent to LLM', async () => {
      llmClient.createChatCompletion.mockResolvedValue(
        makeLlmResponse('Skilled engineer.'),
      );

      await service.generateSummary({
        name: 'Eve Black',
        skills: sampleSkills,
        workExperience: [],
        education: [],
      });

      const callArgs = llmClient.createChatCompletion.mock.calls[0];
      const userMessage = callArgs[0].find((m: { role: string }) => m.role === 'user');
      expect(userMessage.content).toContain('TypeScript');
      expect(userMessage.content).toContain('Node.js');
    });

    it('summary is always a non-empty string regardless of input', async () => {
      llmClient.createChatCompletion.mockResolvedValue(makeLlmResponse(''));

      const summary = await service.generateSummary({
        name: 'Frank Lee',
        skills: [],
        workExperience: [],
        education: [],
      });

      expect(typeof summary).toBe('string');
      expect(summary.trim().length).toBeGreaterThan(0);
    });
  });
});
