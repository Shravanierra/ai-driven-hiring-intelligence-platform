import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ScoringService } from './scoring.service';
import { FitScore } from '../entities/fit-score.entity';
import { CandidateProfile } from '../entities/candidate-profile.entity';
import { ScreeningCriteria } from '../entities/screening-criteria.entity';
import { JobDescription } from '../entities/job-description.entity';
import { LlmClient } from '../llm/llm.client';

const mockJob = { id: 'job-1' };

const mockProfile: Partial<CandidateProfile> = {
  id: 'cand-1',
  jobId: 'job-1',
  name: 'Alice',
  summary: 'Experienced backend engineer',
  skills: [{ canonical_name: 'TypeScript', raw_aliases: ['TS'] }],
  workExperience: [
    {
      company: 'Acme',
      title: 'Engineer',
      start_date: '2020-01',
      end_date: null,
      description: 'Built APIs',
    },
  ],
  education: [],
};

const mockCriteria: Partial<ScreeningCriteria> = {
  id: 'crit-1',
  jobId: 'job-1',
  version: 2,
  requiredSkills: ['TypeScript', 'Node.js'],
  preferredSkills: ['Docker'],
  experienceLevel: 'mid',
  responsibilities: ['Build REST APIs'],
  customCriteria: [],
};

const makeEmbedding = (val: number) => Array(1536).fill(val);

describe('ScoringService', () => {
  let service: ScoringService;
  let fitScoreRepo: Record<string, jest.Mock>;
  let profileRepo: Record<string, jest.Mock>;
  let criteriaRepo: Record<string, jest.Mock>;
  let jobRepo: Record<string, jest.Mock>;
  let llmClient: { createEmbedding: jest.Mock };

  beforeEach(async () => {
    fitScoreRepo = {
      findOne: jest.fn(),
      create: jest.fn((data) => ({ ...data })),
      save: jest.fn((entity) => Promise.resolve({ id: 'score-1', ...entity })),
    };
    profileRepo = { findOne: jest.fn() };
    criteriaRepo = { findOne: jest.fn() };
    jobRepo = { findOne: jest.fn() };
    llmClient = { createEmbedding: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScoringService,
        { provide: getRepositoryToken(FitScore), useValue: fitScoreRepo },
        { provide: getRepositoryToken(CandidateProfile), useValue: profileRepo },
        { provide: getRepositoryToken(ScreeningCriteria), useValue: criteriaRepo },
        { provide: getRepositoryToken(JobDescription), useValue: jobRepo },
        { provide: LlmClient, useValue: llmClient },
      ],
    }).compile();

    service = module.get<ScoringService>(ScoringService);
  });

  describe('computeScore', () => {
    it('throws NotFoundException when job does not exist', async () => {
      jobRepo.findOne.mockResolvedValue(null);
      await expect(service.computeScore('job-1', 'cand-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when candidate does not exist', async () => {
      jobRepo.findOne.mockResolvedValue(mockJob);
      profileRepo.findOne.mockResolvedValue(null);
      await expect(service.computeScore('job-1', 'cand-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when candidate belongs to different job', async () => {
      jobRepo.findOne.mockResolvedValue(mockJob);
      profileRepo.findOne.mockResolvedValue({ ...mockProfile, jobId: 'other-job' });
      await expect(service.computeScore('job-1', 'cand-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when no screening criteria exist', async () => {
      jobRepo.findOne.mockResolvedValue(mockJob);
      profileRepo.findOne.mockResolvedValue(mockProfile);
      criteriaRepo.findOne.mockResolvedValue(null);
      await expect(service.computeScore('job-1', 'cand-1')).rejects.toThrow(NotFoundException);
    });

    it('computes and persists a FitScore with correct structure', async () => {
      jobRepo.findOne.mockResolvedValue(mockJob);
      profileRepo.findOne.mockResolvedValue(mockProfile);
      criteriaRepo.findOne.mockResolvedValue(mockCriteria);
      fitScoreRepo.findOne.mockResolvedValue(null);
      llmClient.createEmbedding.mockResolvedValue({ embedding: makeEmbedding(1) });

      const result = await service.computeScore('job-1', 'cand-1');

      expect(result.candidateId).toBe('cand-1');
      expect(result.jobId).toBe('job-1');
      expect(result.criteriaVersion).toBe(2);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(Array.isArray(result.breakdown)).toBe(true);
      expect(result.breakdown.length).toBeGreaterThan(0);
    });

    it('stores criteria_version from the ScreeningCriteria record', async () => {
      jobRepo.findOne.mockResolvedValue(mockJob);
      profileRepo.findOne.mockResolvedValue(mockProfile);
      criteriaRepo.findOne.mockResolvedValue({ ...mockCriteria, version: 5 });
      fitScoreRepo.findOne.mockResolvedValue(null);
      llmClient.createEmbedding.mockResolvedValue({ embedding: makeEmbedding(0.5) });

      const result = await service.computeScore('job-1', 'cand-1');
      expect(result.criteriaVersion).toBe(5);
    });

    it('updates existing FitScore instead of creating a new one', async () => {
      const existing = {
        id: 'score-existing',
        candidateId: 'cand-1',
        jobId: 'job-1',
        criteriaVersion: 1,
        score: 50,
        breakdown: [],
      };
      jobRepo.findOne.mockResolvedValue(mockJob);
      profileRepo.findOne.mockResolvedValue(mockProfile);
      criteriaRepo.findOne.mockResolvedValue(mockCriteria);
      fitScoreRepo.findOne.mockResolvedValue(existing);
      llmClient.createEmbedding.mockResolvedValue({ embedding: makeEmbedding(1) });

      await service.computeScore('job-1', 'cand-1');

      expect(fitScoreRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'score-existing', criteriaVersion: 2 }),
      );
      expect(fitScoreRepo.create).not.toHaveBeenCalled();
    });

    it('produces breakdown entries with valid status values', async () => {
      jobRepo.findOne.mockResolvedValue(mockJob);
      profileRepo.findOne.mockResolvedValue(mockProfile);
      criteriaRepo.findOne.mockResolvedValue(mockCriteria);
      fitScoreRepo.findOne.mockResolvedValue(null);
      llmClient.createEmbedding.mockResolvedValue({ embedding: makeEmbedding(0.3) });

      const result = await service.computeScore('job-1', 'cand-1');

      for (const item of result.breakdown) {
        expect(['met', 'partial', 'not_met']).toContain(item.status);
        expect(typeof item.criterion_label).toBe('string');
        expect(typeof item.explanation).toBe('string');
        expect(typeof item.contribution).toBe('number');
      }
    });

    it('breakdown has one entry per criterion', async () => {
      jobRepo.findOne.mockResolvedValue(mockJob);
      profileRepo.findOne.mockResolvedValue(mockProfile);
      criteriaRepo.findOne.mockResolvedValue({
        ...mockCriteria,
        customCriteria: [{ label: 'Leadership', weight: 0.8, description: 'Team lead experience' }],
      });
      fitScoreRepo.findOne.mockResolvedValue(null);
      llmClient.createEmbedding.mockResolvedValue({ embedding: makeEmbedding(0.7) });

      const result = await service.computeScore('job-1', 'cand-1');
      // 4 standard (required skills, preferred skills, experience level, responsibilities) + 1 custom
      expect(result.breakdown.length).toBe(5);
    });
  });

  describe('getScore', () => {
    it('throws NotFoundException when job does not exist', async () => {
      jobRepo.findOne.mockResolvedValue(null);
      await expect(service.getScore('job-1', 'cand-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when candidate does not exist', async () => {
      jobRepo.findOne.mockResolvedValue(mockJob);
      profileRepo.findOne.mockResolvedValue(null);
      await expect(service.getScore('job-1', 'cand-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when no score has been computed yet', async () => {
      jobRepo.findOne.mockResolvedValue(mockJob);
      profileRepo.findOne.mockResolvedValue(mockProfile);
      fitScoreRepo.findOne.mockResolvedValue(null);
      await expect(service.getScore('job-1', 'cand-1')).rejects.toThrow(NotFoundException);
    });

    it('returns the stored FitScore', async () => {
      const stored: Partial<FitScore> = {
        id: 'score-1',
        candidateId: 'cand-1',
        jobId: 'job-1',
        criteriaVersion: 2,
        score: 75,
        breakdown: [],
      };
      jobRepo.findOne.mockResolvedValue(mockJob);
      profileRepo.findOne.mockResolvedValue(mockProfile);
      fitScoreRepo.findOne.mockResolvedValue(stored);

      const result = await service.getScore('job-1', 'cand-1');
      expect(result).toEqual(stored);
    });
  });
});
