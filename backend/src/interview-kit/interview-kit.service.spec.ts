import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { InterviewKitService } from './interview-kit.service';
import { InterviewKitPdfService } from './interview-kit-pdf.service';
import { InterviewKit } from '../entities/interview-kit.entity';
import { CandidateProfile } from '../entities/candidate-profile.entity';
import { ScreeningCriteria } from '../entities/screening-criteria.entity';
import { LlmClient } from '../llm/llm.client';
import { AiServiceUnavailableError } from '../llm/llm.types';

const mockProfile: CandidateProfile = {
  id: 'cand-uuid',
  jobId: 'job-uuid',
  schemaVersion: '1',
  name: 'Jane Doe',
  contact: { email: 'jane@example.com', phone: null, location: null },
  workExperience: [
    { company: 'Acme', title: 'Engineer', start_date: '2020-01', end_date: null, description: 'Built things' },
  ],
  education: [{ institution: 'MIT', degree: 'BS', field: 'CS', graduation_year: 2019 }],
  skills: [{ canonical_name: 'TypeScript', raw_aliases: ['ts'] }],
  summary: 'Experienced engineer',
  parseStatus: 'success',
  errorMessage: null,
  fileUrl: null,
  createdAt: new Date(),
};

const mockCriteria: ScreeningCriteria = {
  id: 'crit-uuid',
  jobId: 'job-uuid',
  version: 1,
  requiredSkills: ['TypeScript'],
  preferredSkills: ['React'],
  experienceLevel: 'mid',
  responsibilities: ['Build APIs'],
  customCriteria: [],
  updatedAt: new Date(),
};

const validLlmResponse = JSON.stringify({
  questions: [
    { type: 'behavioral', text: 'Tell me about a challenge', rubric: { strong: 'S1', adequate: 'A1', weak: 'W1' } },
    { type: 'technical', text: 'Explain async/await', rubric: { strong: 'S2', adequate: 'A2', weak: 'W2' } },
    { type: 'gap', text: 'You lack React experience, how would you ramp up?', rubric: { strong: 'S3', adequate: 'A3', weak: 'W3' } },
    { type: 'behavioral', text: 'Describe teamwork', rubric: { strong: 'S4', adequate: 'A4', weak: 'W4' } },
    { type: 'technical', text: 'What is TypeScript generics?', rubric: { strong: 'S5', adequate: 'A5', weak: 'W5' } },
  ],
});

function makeRepo(overrides: Record<string, jest.Mock> = {}) {
  return {
    findOne: jest.fn(),
    create: jest.fn((data) => ({ ...data })),
    save: jest.fn((entity) => Promise.resolve({ id: 'kit-uuid', ...entity, generatedAt: new Date(), updatedAt: new Date() })),
    ...overrides,
  };
}

describe('InterviewKitService', () => {
  let service: InterviewKitService;
  let module: TestingModule;
  let kitRepo: ReturnType<typeof makeRepo>;
  let profileRepo: ReturnType<typeof makeRepo>;
  let criteriaRepo: ReturnType<typeof makeRepo>;
  let llmClient: { createChatCompletion: jest.Mock };

  beforeEach(async () => {
    kitRepo = makeRepo();
    profileRepo = makeRepo();
    criteriaRepo = makeRepo();
    llmClient = { createChatCompletion: jest.fn() };

    module = await Test.createTestingModule({
      providers: [
        InterviewKitService,
        { provide: getRepositoryToken(InterviewKit), useValue: kitRepo },
        { provide: getRepositoryToken(CandidateProfile), useValue: profileRepo },
        { provide: getRepositoryToken(ScreeningCriteria), useValue: criteriaRepo },
        { provide: LlmClient, useValue: llmClient },
        { provide: InterviewKitPdfService, useValue: { generatePdf: jest.fn() } },
      ],
    }).compile();

    service = module.get<InterviewKitService>(InterviewKitService);
  });

  describe('generateKit', () => {
    it('throws 404 when candidate profile not found', async () => {
      profileRepo.findOne.mockResolvedValue(null);
      await expect(service.generateKit('job-uuid', 'cand-uuid')).rejects.toThrow(NotFoundException);
    });

    it('throws 404 when screening criteria not found', async () => {
      profileRepo.findOne.mockResolvedValue(mockProfile);
      criteriaRepo.findOne.mockResolvedValue(null);
      await expect(service.generateKit('job-uuid', 'cand-uuid')).rejects.toThrow(NotFoundException);
    });

    it('throws 503 when LLM is unavailable', async () => {
      profileRepo.findOne.mockResolvedValue(mockProfile);
      criteriaRepo.findOne.mockResolvedValue(mockCriteria);
      llmClient.createChatCompletion.mockRejectedValue(new AiServiceUnavailableError());
      await expect(service.generateKit('job-uuid', 'cand-uuid')).rejects.toThrow(ServiceUnavailableException);
    });

    it('generates and persists a kit with valid LLM response', async () => {
      profileRepo.findOne.mockResolvedValue(mockProfile);
      criteriaRepo.findOne.mockResolvedValue(mockCriteria);
      kitRepo.findOne.mockResolvedValue(null);
      llmClient.createChatCompletion.mockResolvedValue({ content: validLlmResponse, model: 'gpt-4o', usage: {} });

      const kit = await service.generateKit('job-uuid', 'cand-uuid');

      expect(kitRepo.save).toHaveBeenCalled();
      expect(kit.questions).toHaveLength(5);
      const types = kit.questions.map((q) => q.type);
      expect(types).toContain('behavioral');
      expect(types).toContain('technical');
      expect(types).toContain('gap');
    });

    it('assigns a UUID to each question', async () => {
      profileRepo.findOne.mockResolvedValue(mockProfile);
      criteriaRepo.findOne.mockResolvedValue(mockCriteria);
      kitRepo.findOne.mockResolvedValue(null);
      llmClient.createChatCompletion.mockResolvedValue({ content: validLlmResponse, model: 'gpt-4o', usage: {} });

      const kit = await service.generateKit('job-uuid', 'cand-uuid');
      for (const q of kit.questions) {
        expect(q.id).toMatch(/^[0-9a-f-]{36}$/);
      }
    });

    it('upserts kit when one already exists', async () => {
      const existingKit = { id: 'existing-kit', candidateId: 'cand-uuid', jobId: 'job-uuid', questions: [] };
      profileRepo.findOne.mockResolvedValue(mockProfile);
      criteriaRepo.findOne.mockResolvedValue(mockCriteria);
      kitRepo.findOne.mockResolvedValue(existingKit);
      llmClient.createChatCompletion.mockResolvedValue({ content: validLlmResponse, model: 'gpt-4o', usage: {} });

      await service.generateKit('job-uuid', 'cand-uuid');

      expect(kitRepo.create).not.toHaveBeenCalled();
      expect(kitRepo.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'existing-kit' }));
    });

    it('throws 503 when LLM returns fewer than 5 valid questions', async () => {
      profileRepo.findOne.mockResolvedValue(mockProfile);
      criteriaRepo.findOne.mockResolvedValue(mockCriteria);
      kitRepo.findOne.mockResolvedValue(null);
      const tooFew = JSON.stringify({
        questions: [
          { type: 'behavioral', text: 'Q1', rubric: { strong: 'S', adequate: 'A', weak: 'W' } },
          { type: 'technical', text: 'Q2', rubric: { strong: 'S', adequate: 'A', weak: 'W' } },
        ],
      });
      llmClient.createChatCompletion.mockResolvedValue({ content: tooFew, model: 'gpt-4o', usage: {} });
      await expect(service.generateKit('job-uuid', 'cand-uuid')).rejects.toThrow(ServiceUnavailableException);
    });

    it('throws 503 when a required question type is missing', async () => {
      profileRepo.findOne.mockResolvedValue(mockProfile);
      criteriaRepo.findOne.mockResolvedValue(mockCriteria);
      kitRepo.findOne.mockResolvedValue(null);
      const missingGap = JSON.stringify({
        questions: Array.from({ length: 5 }, (_, i) => ({
          type: i % 2 === 0 ? 'behavioral' : 'technical',
          text: `Q${i}`,
          rubric: { strong: 'S', adequate: 'A', weak: 'W' },
        })),
      });
      llmClient.createChatCompletion.mockResolvedValue({ content: missingGap, model: 'gpt-4o', usage: {} });
      await expect(service.generateKit('job-uuid', 'cand-uuid')).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('getKit', () => {
    it('returns the kit when found', async () => {
      const kit = { id: 'kit-uuid', candidateId: 'cand-uuid', jobId: 'job-uuid', questions: [] };
      kitRepo.findOne.mockResolvedValue(kit);
      const result = await service.getKit('job-uuid', 'cand-uuid');
      expect(result).toEqual(kit);
    });

    it('throws 404 when kit not found', async () => {
      kitRepo.findOne.mockResolvedValue(null);
      await expect(service.getKit('job-uuid', 'cand-uuid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateKit', () => {
    it('updates questions and saves', async () => {
      const kit = { id: 'kit-uuid', candidateId: 'cand-uuid', jobId: 'job-uuid', questions: [] };
      kitRepo.findOne.mockResolvedValue(kit);
      const newQuestions = [
        { id: 'q1', type: 'behavioral' as const, text: 'New Q', rubric: { strong: 'S', adequate: 'A', weak: 'W' } },
      ];
      const result = await service.updateKit('job-uuid', 'cand-uuid', newQuestions);
      expect(kitRepo.save).toHaveBeenCalledWith(expect.objectContaining({ questions: newQuestions }));
      expect(result).toBeDefined();
    });

    it('throws 404 when kit not found', async () => {
      kitRepo.findOne.mockResolvedValue(null);
      await expect(service.updateKit('job-uuid', 'cand-uuid', [])).rejects.toThrow(NotFoundException);
    });
  });

  describe('exportKitPdf', () => {
    it('throws 404 when kit not found', async () => {
      kitRepo.findOne.mockResolvedValue(null);
      await expect(service.exportKitPdf('job-uuid', 'cand-uuid')).rejects.toThrow(NotFoundException);
    });

    it('throws 404 when candidate profile not found', async () => {
      const kit = { id: 'kit-uuid', candidateId: 'cand-uuid', jobId: 'job-uuid', questions: [] };
      kitRepo.findOne.mockResolvedValue(kit);
      profileRepo.findOne.mockResolvedValue(null);
      await expect(service.exportKitPdf('job-uuid', 'cand-uuid')).rejects.toThrow(NotFoundException);
    });

    it('returns a Buffer from the pdf service', async () => {
      const kit = { id: 'kit-uuid', candidateId: 'cand-uuid', jobId: 'job-uuid', questions: [] };
      kitRepo.findOne.mockResolvedValue(kit);
      profileRepo.findOne.mockResolvedValue(mockProfile);
      const fakeBuffer = Buffer.from('%PDF-fake');
      const pdfService = module.get<InterviewKitPdfService>(InterviewKitPdfService);
      (pdfService.generatePdf as jest.Mock).mockResolvedValue(fakeBuffer);

      const result = await service.exportKitPdf('job-uuid', 'cand-uuid');
      expect(result).toBe(fakeBuffer);
      expect(pdfService.generatePdf).toHaveBeenCalledWith(kit, mockProfile);
    });
  });
});
