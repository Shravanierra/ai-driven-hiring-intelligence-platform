/**
 * Property-based tests for JobsService.
 *
 * Feature: ai-hiring-platform, Property 1: JD Parsing Produces Complete Screening Criteria
 * Validates: Requirements 1.2
 *
 * Feature: ai-hiring-platform, Property 2: Criteria Save-Retrieve Round Trip
 * Validates: Requirements 1.5
 */
import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { JobsService } from './jobs.service';
import { JobDescription } from '../entities/job-description.entity';
import { ScreeningCriteria } from '../entities/screening-criteria.entity';
import { LlmClient } from '../llm/llm.client';
import { ScoringService } from '../scoring/scoring.service';
import { arbitraryJobDescriptionText, arbitraryScreeningCriteria } from '../testing/arbitraries';

// Minimal mock for Minio.Client
jest.mock('minio', () => ({
  Client: jest.fn().mockImplementation(() => ({
    bucketExists: jest.fn().mockResolvedValue(true),
    makeBucket: jest.fn().mockResolvedValue(undefined),
    putObject: jest.fn().mockResolvedValue(undefined),
  })),
}));

const mockConfig = () => ({
  get: jest.fn((key: string, def?: unknown) => {
    const map: Record<string, unknown> = {
      MINIO_ENDPOINT: 'localhost',
      MINIO_PORT: 9000,
      MINIO_USE_SSL: 'false',
      MINIO_ACCESS_KEY: 'minioadmin',
      MINIO_SECRET_KEY: 'minioadmin_secret',
      MINIO_BUCKET: 'hiring-files',
    };
    return map[key] ?? def;
  }),
});

describe('JobsService PBT', () => {
  let service: JobsService;
  let criteriaRepo: {
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    findOne: jest.Mock;
    findOneOrFail: jest.Mock;
  };
  let jobRepo: {
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    findOne: jest.Mock;
    findOneOrFail: jest.Mock;
  };
  let llm: { createChatCompletion: jest.Mock };

  beforeEach(async () => {
    jobRepo = {
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
    };
    criteriaRepo = {
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
    };
    llm = { createChatCompletion: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: getRepositoryToken(JobDescription), useValue: jobRepo },
        { provide: getRepositoryToken(ScreeningCriteria), useValue: criteriaRepo },
        { provide: LlmClient, useValue: llm },
        { provide: ConfigService, useFactory: mockConfig },
        { provide: ScoringService, useValue: { rescoreAll: jest.fn().mockResolvedValue({ rescored: 0, failed: 0, errors: [] }) } },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
  });

  // Feature: ai-hiring-platform, Property 1: JD Parsing Produces Complete Screening Criteria
  it('generates complete screening criteria for any parsed job description', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryJobDescriptionText(), async (rawText) => {
        // Reset mocks for each iteration
        jobRepo.create.mockReset();
        jobRepo.save.mockReset();
        jobRepo.update.mockReset();
        jobRepo.findOneOrFail.mockReset();
        criteriaRepo.create.mockReset();
        criteriaRepo.save.mockReset();
        criteriaRepo.findOne.mockReset();
        llm.createChatCompletion.mockReset();

        const jobId = 'job-pbt-1';
        const pendingJob = { id: jobId, status: 'pending' } as JobDescription;
        const parsedJob = { id: jobId, status: 'parsed', rawText } as JobDescription;

        jobRepo.create.mockReturnValue(pendingJob);
        jobRepo.save.mockResolvedValue(pendingJob);
        jobRepo.update.mockResolvedValue(undefined);
        jobRepo.findOneOrFail.mockResolvedValue(parsedJob);
        criteriaRepo.findOne.mockResolvedValue(null);

        // LLM mock returns structurally valid ScreeningCriteria for any input
        llm.createChatCompletion.mockResolvedValue({
          content: JSON.stringify({
            required_skills: ['TypeScript', 'Node.js'],
            preferred_skills: ['Docker', 'Kubernetes'],
            experience_level: 'senior',
            responsibilities: ['Design APIs', 'Lead team', 'Code review'],
            custom_criteria: [],
          }),
          model: 'gpt-4o',
          usage: { prompt_tokens: 10, completion_tokens: 50, total_tokens: 60 },
        });

        // Capture what gets passed to criteriaRepo.create
        let capturedCriteria: Partial<ScreeningCriteria> | null = null;
        criteriaRepo.create.mockImplementation((data: Partial<ScreeningCriteria>) => {
          capturedCriteria = data;
          return data;
        });
        criteriaRepo.save.mockImplementation(async (c) => c);

        const file: Express.Multer.File = {
          fieldname: 'file',
          originalname: 'jd.txt',
          encoding: '7bit',
          mimetype: 'text/plain',
          buffer: Buffer.from(rawText),
          size: Buffer.byteLength(rawText),
          stream: null as any,
          destination: '',
          filename: '',
          path: '',
        };

        await service.uploadAndParse(file, 'recruiter-1', 'Engineer');

        // Assert: criteria must have been created with all required non-empty fields
        expect(capturedCriteria).not.toBeNull();
        const c = capturedCriteria!;

        // required_skills must be a non-empty array
        expect(Array.isArray(c.requiredSkills)).toBe(true);
        expect((c.requiredSkills as string[]).length).toBeGreaterThan(0);

        // preferred_skills must be a non-empty array
        expect(Array.isArray(c.preferredSkills)).toBe(true);
        expect((c.preferredSkills as string[]).length).toBeGreaterThan(0);

        // experience_level must be non-null/non-empty
        expect(c.experienceLevel).toBeTruthy();
        expect(['entry', 'mid', 'senior', 'lead']).toContain(c.experienceLevel);

        // responsibilities must be a non-empty array
        expect(Array.isArray(c.responsibilities)).toBe(true);
        expect((c.responsibilities as string[]).length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: ai-hiring-platform, Property 2: Criteria Save-Retrieve Round Trip
  it('retrieves screening criteria equivalent to what was saved', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryScreeningCriteria(), async (criteria) => {
        // Reset mocks for each iteration
        jobRepo.findOne.mockReset();
        criteriaRepo.findOne.mockReset();
        criteriaRepo.create.mockReset();
        criteriaRepo.save.mockReset();

        const jobId = criteria.jobId;

        // Job must exist for saveCriteria to proceed
        jobRepo.findOne.mockResolvedValue({ id: jobId } as JobDescription);

        // No existing criteria — fresh save path
        criteriaRepo.findOne.mockResolvedValue(null);

        // Capture what gets passed to criteriaRepo.create
        let savedCriteria: Partial<ScreeningCriteria> | null = null;
        criteriaRepo.create.mockImplementation((data: Partial<ScreeningCriteria>) => {
          savedCriteria = data;
          return data;
        });
        criteriaRepo.save.mockImplementation(async (c) => ({ ...c, id: 'saved-id' }));

        const dto = {
          required_skills: criteria.requiredSkills,
          preferred_skills: criteria.preferredSkills,
          experience_level: criteria.experienceLevel,
          responsibilities: criteria.responsibilities,
          custom_criteria: criteria.customCriteria,
        };

        const result = await service.saveCriteria(jobId, dto);

        // Now simulate retrieval: getCriteria returns the saved record
        criteriaRepo.findOne.mockResolvedValue(result);
        const retrieved = await service.getCriteria(jobId);

        // Property: retrieved criteria must equal what was saved
        expect(retrieved.requiredSkills).toEqual(result.requiredSkills);
        expect(retrieved.preferredSkills).toEqual(result.preferredSkills);
        expect(retrieved.experienceLevel).toEqual(result.experienceLevel);
        expect(retrieved.responsibilities).toEqual(result.responsibilities);
        expect(retrieved.customCriteria).toEqual(result.customCriteria);

        // Saved record must carry the input values unchanged
        expect(savedCriteria).not.toBeNull();
        expect(savedCriteria!.requiredSkills).toEqual(criteria.requiredSkills);
        expect(savedCriteria!.preferredSkills).toEqual(criteria.preferredSkills);
        expect(savedCriteria!.experienceLevel).toEqual(criteria.experienceLevel);
        expect(savedCriteria!.responsibilities).toEqual(criteria.responsibilities);
        expect(savedCriteria!.customCriteria).toEqual(criteria.customCriteria);
      }),
      { numRuns: 100 },
    );
  });
});
