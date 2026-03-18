import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import {
  UnprocessableEntityException,
  NotFoundException,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobDescription } from '../entities/job-description.entity';
import { ScreeningCriteria } from '../entities/screening-criteria.entity';
import { LlmClient } from '../llm/llm.client';

// Minimal mock for Minio.Client
jest.mock('minio', () => ({
  Client: jest.fn().mockImplementation(() => ({
    bucketExists: jest.fn().mockResolvedValue(true),
    makeBucket: jest.fn().mockResolvedValue(undefined),
    putObject: jest.fn().mockResolvedValue(undefined),
  })),
}));

const mockRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  findOne: jest.fn(),
  findOneOrFail: jest.fn(),
});

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

const mockLlmClient = () => ({
  createChatCompletion: jest.fn(),
});

function makeFile(
  mimetype: string,
  content: string | Buffer = 'hello',
): Express.Multer.File {
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
  return {
    fieldname: 'file',
    originalname: 'test.txt',
    encoding: '7bit',
    mimetype,
    buffer,
    size: buffer.length,
    stream: null as any,
    destination: '',
    filename: '',
    path: '',
  };
}

describe('JobsService', () => {
  let service: JobsService;
  let repo: ReturnType<typeof mockRepo>;
  let criteriaRepo: ReturnType<typeof mockRepo>;
  let llm: ReturnType<typeof mockLlmClient>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: getRepositoryToken(JobDescription), useFactory: mockRepo },
        {
          provide: getRepositoryToken(ScreeningCriteria),
          useFactory: mockRepo,
        },
        { provide: LlmClient, useFactory: mockLlmClient },
        { provide: ConfigService, useFactory: mockConfig },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
    repo = module.get(getRepositoryToken(JobDescription));
    criteriaRepo = module.get(getRepositoryToken(ScreeningCriteria));
    llm = module.get(LlmClient);
  });

  describe('uploadAndParse - unsupported format', () => {
    it('throws 422 with unsupported_format for image/png', async () => {
      const file = makeFile('image/png');
      await expect(
        service.uploadAndParse(file, 'recruiter-1', 'Engineer'),
      ).rejects.toThrow(UnprocessableEntityException);

      try {
        await service.uploadAndParse(file, 'recruiter-1', 'Engineer');
      } catch (e: any) {
        expect(e.response.error).toBe('unsupported_format');
      }
    });
  });

  describe('uploadAndParse - plain text', () => {
    it('parses plain text and returns parsed job', async () => {
      const file = makeFile('text/plain', 'We are hiring a senior engineer.');
      const pendingJob = { id: 'job-1', status: 'pending' } as JobDescription;
      const parsedJob = {
        id: 'job-1',
        status: 'parsed',
        rawText: 'We are hiring a senior engineer.',
      } as JobDescription;

      repo.create.mockReturnValue(pendingJob);
      repo.save.mockResolvedValue(pendingJob);
      repo.update.mockResolvedValue(undefined);
      repo.findOneOrFail.mockResolvedValue(parsedJob);

      // LLM returns valid criteria JSON
      llm.createChatCompletion.mockResolvedValue({
        content: JSON.stringify({
          required_skills: ['TypeScript'],
          preferred_skills: ['NestJS'],
          experience_level: 'senior',
          responsibilities: ['Build APIs'],
          custom_criteria: [],
        }),
        model: 'gpt-4o',
        usage: { prompt_tokens: 10, completion_tokens: 50, total_tokens: 60 },
      });
      criteriaRepo.create.mockReturnValue({});
      criteriaRepo.save.mockResolvedValue({});
      criteriaRepo.findOne.mockResolvedValue(null);

      const result = await service.uploadAndParse(
        file,
        'recruiter-1',
        'Engineer',
      );
      expect(result.status).toBe('parsed');
      expect(repo.update).toHaveBeenCalledWith(
        'job-1',
        expect.objectContaining({
          status: 'parsed',
          rawText: 'We are hiring a senior engineer.',
        }),
      );
    });

    it('still returns parsed job even when LLM criteria generation fails', async () => {
      const file = makeFile('text/plain', 'We are hiring a senior engineer.');
      const pendingJob = { id: 'job-1', status: 'pending' } as JobDescription;
      const parsedJob = {
        id: 'job-1',
        status: 'parsed',
        rawText: 'We are hiring a senior engineer.',
      } as JobDescription;

      repo.create.mockReturnValue(pendingJob);
      repo.save.mockResolvedValue(pendingJob);
      repo.update.mockResolvedValue(undefined);
      repo.findOneOrFail.mockResolvedValue(parsedJob);

      // LLM fails
      llm.createChatCompletion.mockRejectedValue(new Error('LLM unavailable'));

      const result = await service.uploadAndParse(
        file,
        'recruiter-1',
        'Engineer',
      );
      expect(result.status).toBe('parsed');
    });
  });

  describe('findById', () => {
    it('returns job when found', async () => {
      const job = { id: 'job-1', status: 'parsed' } as JobDescription;
      repo.findOne.mockResolvedValue(job);
      const result = await service.findById('job-1');
      expect(result).toBe(job);
    });

    it('throws NotFoundException when not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findById('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('uploadAndParse - parse failure', () => {
    it('throws 422 with parse_failure for corrupted PDF', async () => {
      // Provide a buffer that is not a valid PDF
      const file = makeFile('application/pdf', 'not a real pdf');
      const pendingJob = { id: 'job-2', status: 'pending' } as JobDescription;

      repo.create.mockReturnValue(pendingJob);
      repo.save.mockResolvedValue(pendingJob);
      repo.update.mockResolvedValue(undefined);

      await expect(
        service.uploadAndParse(file, 'recruiter-1', 'Engineer'),
      ).rejects.toThrow(UnprocessableEntityException);

      try {
        await service.uploadAndParse(file, 'recruiter-1', 'Engineer');
      } catch (e: any) {
        expect(e.response.error).toBe('parse_failure');
      }
    });
  });

  describe('getCriteria', () => {
    it('returns criteria when found', async () => {
      const job = { id: 'job-1', status: 'parsed' } as JobDescription;
      const criteria = {
        id: 'crit-1',
        jobId: 'job-1',
        version: 1,
        requiredSkills: ['TypeScript'],
        preferredSkills: [],
        experienceLevel: 'senior',
        responsibilities: ['Build APIs'],
        customCriteria: [],
      } as unknown as ScreeningCriteria;

      repo.findOne.mockResolvedValue(job);
      criteriaRepo.findOne.mockResolvedValue(criteria);

      const result = await service.getCriteria('job-1');
      expect(result).toBe(criteria);
    });

    it('throws NotFoundException when job does not exist', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.getCriteria('missing-job')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when criteria do not exist', async () => {
      const job = { id: 'job-1', status: 'parsed' } as JobDescription;
      repo.findOne.mockResolvedValue(job);
      criteriaRepo.findOne.mockResolvedValue(null);

      await expect(service.getCriteria('job-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('saveCriteria', () => {
    it('creates new criteria with version=1 when none exist', async () => {
      const job = { id: 'job-1', status: 'parsed' } as JobDescription;
      const saved = {
        id: 'crit-1',
        jobId: 'job-1',
        version: 1,
        requiredSkills: ['Go'],
        preferredSkills: ['Docker'],
        experienceLevel: 'mid',
        responsibilities: ['Write services'],
        customCriteria: [],
      } as unknown as ScreeningCriteria;

      repo.findOne.mockResolvedValue(job);
      criteriaRepo.findOne.mockResolvedValue(null);
      criteriaRepo.create.mockReturnValue(saved);
      criteriaRepo.save.mockResolvedValue(saved);

      const result = await service.saveCriteria('job-1', {
        required_skills: ['Go'],
        preferred_skills: ['Docker'],
        experience_level: 'mid',
        responsibilities: ['Write services'],
        custom_criteria: [],
      });

      expect(result.version).toBe(1);
      expect(criteriaRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ jobId: 'job-1', version: 1 }),
      );
    });

    it('increments version when criteria already exist', async () => {
      const job = { id: 'job-1', status: 'parsed' } as JobDescription;
      const existing = {
        id: 'crit-1',
        jobId: 'job-1',
        version: 1,
        requiredSkills: ['TypeScript'],
        preferredSkills: [],
        experienceLevel: 'senior',
        responsibilities: [],
        customCriteria: [],
      } as unknown as ScreeningCriteria;

      repo.findOne.mockResolvedValue(job);
      criteriaRepo.findOne.mockResolvedValue(existing);
      criteriaRepo.save.mockImplementation(async (c) => c);

      const result = await service.saveCriteria('job-1', {
        required_skills: ['TypeScript', 'NestJS'],
      });

      expect(result.version).toBe(2);
      expect(result.requiredSkills).toEqual(['TypeScript', 'NestJS']);
    });

    it('throws NotFoundException when job does not exist', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(
        service.saveCriteria('missing-job', { required_skills: ['Go'] }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
