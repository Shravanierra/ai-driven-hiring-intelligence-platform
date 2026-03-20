import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ShortlistService } from './shortlist.service';
import { ShortlistEntry } from '../entities/shortlist-entry.entity';
import { FitScore } from '../entities/fit-score.entity';
import { CandidateProfile } from '../entities/candidate-profile.entity';
import { JobDescription } from '../entities/job-description.entity';
import { LlmClient } from '../llm/llm.client';

const mockFitScoreRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

const mockProfileRepo = () => ({
  findByIds: jest.fn(),
});

const mockShortlistRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

const mockLlmClient = () => ({
  createChatCompletion: jest.fn(),
});

function makeFitScore(candidateId: string, score: number): FitScore {
  return {
    id: `fs-${candidateId}`,
    candidateId,
    jobId: 'job-1',
    criteriaVersion: 1,
    score,
    breakdown: [{ criterion_label: 'Skills', status: 'met', contribution: score, explanation: 'ok' }],
    status: 'ok',
    computedAt: new Date(),
  } as unknown as FitScore;
}

function makeProfile(id: string, skills: string[] = [], workExpCount = 2): CandidateProfile {
  return {
    id,
    jobId: 'job-1',
    name: `Candidate ${id}`,
    skills: skills.map((s) => ({ canonical_name: s, raw_aliases: [] })),
    workExperience: Array.from({ length: workExpCount }, (_, i) => ({
      company: `Co${i}`,
      title: 'Dev',
      start_date: '2020-01',
      end_date: null,
      description: '',
    })),
    education: [],
    contact: { email: 'a@b.com', phone: null, location: null },
    summary: '',
    parseStatus: 'success',
    errorMessage: null,
    fileUrl: null,
    createdAt: new Date(),
    schemaVersion: '1',
  } as unknown as CandidateProfile;
}

describe('ShortlistService', () => {
  let service: ShortlistService;
  let fitScoreRepo: ReturnType<typeof mockFitScoreRepo>;
  let profileRepo: ReturnType<typeof mockProfileRepo>;
  let shortlistRepo: ReturnType<typeof mockShortlistRepo>;
  let llmClient: ReturnType<typeof mockLlmClient>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShortlistService,
        { provide: getRepositoryToken(FitScore), useFactory: mockFitScoreRepo },
        { provide: getRepositoryToken(CandidateProfile), useFactory: mockProfileRepo },
        { provide: getRepositoryToken(ShortlistEntry), useFactory: mockShortlistRepo },
        { provide: getRepositoryToken(JobDescription), useValue: { findOne: jest.fn() } },
        { provide: LlmClient, useFactory: mockLlmClient },
      ],
    }).compile();

    service = module.get(ShortlistService);
    fitScoreRepo = module.get(getRepositoryToken(FitScore));
    profileRepo = module.get(getRepositoryToken(CandidateProfile));
    shortlistRepo = module.get(getRepositoryToken(ShortlistEntry));
    llmClient = module.get(LlmClient);
  });

  describe('generateShortlist', () => {
    it('throws BadRequestException when size < 1', async () => {
      await expect(service.generateShortlist('job-1', 0)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when size > 50', async () => {
      await expect(service.generateShortlist('job-1', 51)).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when no fit scores exist', async () => {
      fitScoreRepo.find.mockResolvedValue([]);
      await expect(service.generateShortlist('job-1', 5)).rejects.toThrow(NotFoundException);
    });

    it('ranks candidates by score descending', async () => {
      const scores = [
        makeFitScore('c1', 60),
        makeFitScore('c2', 90),
        makeFitScore('c3', 75),
      ];
      fitScoreRepo.find.mockResolvedValue(scores);
      profileRepo.findByIds.mockResolvedValue([
        makeProfile('c1'),
        makeProfile('c2'),
        makeProfile('c3'),
      ]);
      shortlistRepo.findOne.mockResolvedValue(null);
      shortlistRepo.create.mockImplementation((data) => data);
      shortlistRepo.save.mockImplementation((entry) => Promise.resolve({ ...entry, id: 'new-id' }));
      llmClient.createChatCompletion.mockResolvedValue({ content: 'Good fit.', model: 'gpt-4o', usage: {} });

      const result = await service.generateShortlist('job-1', 3);

      expect(result[0].candidateId).toBe('c2');
      expect(result[0].rank).toBe(1);
      expect(result[1].candidateId).toBe('c3');
      expect(result[1].rank).toBe(2);
      expect(result[2].candidateId).toBe('c1');
      expect(result[2].rank).toBe(3);
    });

    it('returns at most N entries', async () => {
      const scores = [makeFitScore('c1', 80), makeFitScore('c2', 70), makeFitScore('c3', 60)];
      fitScoreRepo.find.mockResolvedValue(scores);
      profileRepo.findByIds.mockResolvedValue([makeProfile('c1'), makeProfile('c2'), makeProfile('c3')]);
      shortlistRepo.findOne.mockResolvedValue(null);
      shortlistRepo.create.mockImplementation((data) => data);
      shortlistRepo.save.mockImplementation((entry) => Promise.resolve({ ...entry, id: 'new-id' }));
      llmClient.createChatCompletion.mockResolvedValue({ content: 'Good fit.', model: 'gpt-4o', usage: {} });

      const result = await service.generateShortlist('job-1', 2);
      expect(result).toHaveLength(2);
    });

    it('filters by minExperience', async () => {
      const scores = [makeFitScore('c1', 90), makeFitScore('c2', 80)];
      fitScoreRepo.find.mockResolvedValue(scores);
      profileRepo.findByIds.mockResolvedValue([
        makeProfile('c1', [], 1), // only 1 experience entry
        makeProfile('c2', [], 3), // 3 experience entries
      ]);
      shortlistRepo.findOne.mockResolvedValue(null);
      shortlistRepo.create.mockImplementation((data) => data);
      shortlistRepo.save.mockImplementation((entry) => Promise.resolve({ ...entry, id: 'new-id' }));
      llmClient.createChatCompletion.mockResolvedValue({ content: 'Good fit.', model: 'gpt-4o', usage: {} });

      const result = await service.generateShortlist('job-1', 5, { minExperience: 2 });
      expect(result).toHaveLength(1);
      expect(result[0].candidateId).toBe('c2');
    });

    it('filters by requiredSkill', async () => {
      const scores = [makeFitScore('c1', 90), makeFitScore('c2', 80)];
      fitScoreRepo.find.mockResolvedValue(scores);
      profileRepo.findByIds.mockResolvedValue([
        makeProfile('c1', ['Python', 'TypeScript']),
        makeProfile('c2', ['Java']),
      ]);
      shortlistRepo.findOne.mockResolvedValue(null);
      shortlistRepo.create.mockImplementation((data) => data);
      shortlistRepo.save.mockImplementation((entry) => Promise.resolve({ ...entry, id: 'new-id' }));
      llmClient.createChatCompletion.mockResolvedValue({ content: 'Good fit.', model: 'gpt-4o', usage: {} });

      const result = await service.generateShortlist('job-1', 5, { requiredSkill: 'Python' });
      expect(result).toHaveLength(1);
      expect(result[0].candidateId).toBe('c1');
    });

    it('uses fallback reasoning when LLM fails', async () => {
      const scores = [makeFitScore('c1', 75)];
      fitScoreRepo.find.mockResolvedValue(scores);
      profileRepo.findByIds.mockResolvedValue([makeProfile('c1')]);
      shortlistRepo.findOne.mockResolvedValue(null);
      shortlistRepo.create.mockImplementation((data) => data);
      shortlistRepo.save.mockImplementation((entry) => Promise.resolve({ ...entry, id: 'new-id' }));
      llmClient.createChatCompletion.mockRejectedValue(new Error('LLM unavailable'));

      const result = await service.generateShortlist('job-1', 1);
      expect(result[0].reasoning).toContain('75');
    });

    it('upserts existing shortlist entries', async () => {
      const scores = [makeFitScore('c1', 80)];
      fitScoreRepo.find.mockResolvedValue(scores);
      profileRepo.findByIds.mockResolvedValue([makeProfile('c1')]);

      const existingEntry = { id: 'existing-id', jobId: 'job-1', candidateId: 'c1', rank: 5, fitScore: 50, reasoning: 'old', decision: 'pending' };
      shortlistRepo.findOne.mockResolvedValue(existingEntry);
      shortlistRepo.save.mockImplementation((entry) => Promise.resolve(entry));
      llmClient.createChatCompletion.mockResolvedValue({ content: 'Updated reasoning.', model: 'gpt-4o', usage: {} });

      const result = await service.generateShortlist('job-1', 1);
      expect(result[0].rank).toBe(1);
      expect(result[0].reasoning).toBe('Updated reasoning.');
      expect(shortlistRepo.create).not.toHaveBeenCalled();
    });

    it('sets decision to pending on new entries', async () => {
      const scores = [makeFitScore('c1', 80)];
      fitScoreRepo.find.mockResolvedValue(scores);
      profileRepo.findByIds.mockResolvedValue([makeProfile('c1')]);
      shortlistRepo.findOne.mockResolvedValue(null);
      shortlistRepo.create.mockImplementation((data) => data);
      shortlistRepo.save.mockImplementation((entry) => Promise.resolve({ ...entry, id: 'new-id' }));
      llmClient.createChatCompletion.mockResolvedValue({ content: 'Good fit.', model: 'gpt-4o', usage: {} });

      const result = await service.generateShortlist('job-1', 1);
      expect(result[0].decision).toBe('pending');
    });
  });

  describe('getShortlist', () => {
    it('returns entries ordered by rank ascending', async () => {
      const entries = [
        { id: '1', rank: 2, candidateId: 'c2' },
        { id: '2', rank: 1, candidateId: 'c1' },
      ];
      shortlistRepo.find.mockResolvedValue(entries);

      const result = await service.getShortlist('job-1');
      expect(shortlistRepo.find).toHaveBeenCalledWith({
        where: { jobId: 'job-1' },
        order: { rank: 'ASC' },
      });
      expect(result).toEqual(entries);
    });

    it('returns empty array when no shortlist exists', async () => {
      shortlistRepo.find.mockResolvedValue([]);
      const result = await service.getShortlist('job-1');
      expect(result).toEqual([]);
    });
  });

  describe('updateDecision', () => {
    it('throws NotFoundException when entry not found', async () => {
      shortlistRepo.findOne.mockResolvedValue(null);
      await expect(
        service.updateDecision('job-1', 'candidate-1', 'accepted'),
      ).rejects.toThrow(NotFoundException);
    });

    it('persists decision and decidedAt', async () => {
      const entry = { id: 'e1', jobId: 'job-1', candidateId: 'c1', decision: 'pending', decidedAt: null };
      shortlistRepo.findOne.mockResolvedValue(entry);
      shortlistRepo.save.mockImplementation((e) => Promise.resolve(e));

      const before = new Date();
      await service.updateDecision('job-1', 'c1', 'accepted');
      const after = new Date();

      expect(entry.decision).toBe('accepted');
      expect(entry.decidedAt).toBeInstanceOf(Date);
      expect((entry.decidedAt as unknown as Date).getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect((entry.decidedAt as unknown as Date).getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('returns the updated entry', async () => {
      const entry = { id: 'e1', jobId: 'job-1', candidateId: 'c1', decision: 'pending', decidedAt: null };
      shortlistRepo.findOne.mockResolvedValue(entry);
      shortlistRepo.save.mockImplementation((e) => Promise.resolve(e));

      const result = await service.updateDecision('job-1', 'c1', 'rejected');
      expect(result.decision).toBe('rejected');
      expect(result.decidedAt).toBeInstanceOf(Date);
    });
  });
});
