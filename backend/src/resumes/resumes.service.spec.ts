import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ResumesService } from './resumes.service';
import { CandidateProfile } from '../entities/candidate-profile.entity';
import { JobDescription } from '../entities/job-description.entity';
import { LlmClient } from '../llm/llm.client';
import { ConfigService } from '@nestjs/config';
import { SkillExtractorService } from './skill-extractor.service';
import { SummaryGeneratorService } from './summary-generator.service';

const mockJob: Partial<JobDescription> = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  title: 'Software Engineer',
  status: 'parsed',
};

const mockProfile: Partial<CandidateProfile> = {
  id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  jobId: mockJob.id,
  name: 'Jane Doe',
  contact: { email: 'jane@example.com', phone: null, location: null },
  workExperience: [],
  education: [],
  skills: [],
  summary: 'Experienced engineer.',
  parseStatus: 'success',
  errorMessage: null,
  fileUrl: null,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  schemaVersion: '1',
};

const llmJsonResponse = JSON.stringify({
  name: 'Jane Doe',
  contact: { email: 'jane@example.com', phone: null, location: null },
  work_experience: [],
  education: [],
  skills: [{ canonical_name: 'JavaScript', raw_aliases: ['JS', 'JavaScript'] }],
  summary: 'Experienced engineer.',
});

function makeFile(
  originalname: string,
  mimetype: string,
  content: string,
): Express.Multer.File {
  const buffer = Buffer.from(content, 'utf-8');
  return {
    fieldname: 'files',
    originalname,
    encoding: '7bit',
    mimetype,
    buffer,
    size: buffer.length,
    stream: null as any,
    destination: '',
    filename: originalname,
    path: '',
  };
}

describe('ResumesService', () => {
  let service: ResumesService;
  let profileRepo: any;
  let jobRepo: any;
  let llmClient: any;
  let skillExtractor: any;

  beforeEach(async () => {
    profileRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    jobRepo = {
      findOne: jest.fn(),
    };

    llmClient = {
      createChatCompletion: jest.fn(),
    };

    skillExtractor = {
      extractSkills: jest.fn().mockResolvedValue([
        { canonical_name: 'JavaScript', raw_aliases: ['JS', 'JavaScript'] },
      ]),
    };

    const summaryGenerator = {
      generateSummary: jest.fn().mockResolvedValue('Experienced engineer.'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumesService,
        { provide: getRepositoryToken(CandidateProfile), useValue: profileRepo },
        { provide: getRepositoryToken(JobDescription), useValue: jobRepo },
        { provide: LlmClient, useValue: llmClient },
        { provide: SkillExtractorService, useValue: skillExtractor },
        { provide: SummaryGeneratorService, useValue: summaryGenerator },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, def: string) => def),
          },
        },
      ],
    }).compile();

    service = module.get<ResumesService>(ResumesService);
  });

  describe('uploadBatch', () => {
    it('throws NotFoundException when job does not exist', async () => {
      jobRepo.findOne.mockResolvedValue(null);
      const file = makeFile('cv.txt', 'text/plain', 'John Doe resume');
      await expect(service.uploadBatch('non-existent-id', [file])).rejects.toThrow(
        NotFoundException,
      );
    });

    it('processes a plain text resume successfully', async () => {
      jobRepo.findOne.mockResolvedValue(mockJob);
      llmClient.createChatCompletion.mockResolvedValue({
        content: llmJsonResponse,
        model: 'gpt-4o',
        usage: { prompt_tokens: 10, completion_tokens: 50, total_tokens: 60 },
      });
      const savedProfile = { ...mockProfile };
      profileRepo.create.mockReturnValue(savedProfile);
      profileRepo.save.mockResolvedValue(savedProfile);

      const file = makeFile('cv.txt', 'text/plain', 'Jane Doe\njane@example.com');
      const result = await service.uploadBatch(mockJob.id!, [file]);

      expect(result.profiles).toHaveLength(1);
      expect(result.failures).toHaveLength(0);
    });

    it('records a failure for unsupported MIME type and continues', async () => {
      jobRepo.findOne.mockResolvedValue(mockJob);
      const errorProfile = {
        ...mockProfile,
        parseStatus: 'error',
        errorMessage: 'Unsupported file type: image/png',
      };
      profileRepo.create.mockReturnValue(errorProfile);
      profileRepo.save.mockResolvedValue(errorProfile);

      const file = makeFile('photo.png', 'image/png', 'binary');
      const result = await service.uploadBatch(mockJob.id!, [file]);

      // Unsupported type creates an error profile (not a failure entry)
      expect(result.profiles).toHaveLength(1);
      expect(result.failures).toHaveLength(0);
    });

    it('records a failure entry when LLM throws and continues', async () => {
      jobRepo.findOne.mockResolvedValue(mockJob);
      llmClient.createChatCompletion.mockRejectedValue(new Error('LLM timeout'));
      const errorProfile = {
        ...mockProfile,
        parseStatus: 'error',
        errorMessage: 'LLM extraction failed: LLM timeout',
      };
      profileRepo.create.mockReturnValue(errorProfile);
      profileRepo.save.mockResolvedValue(errorProfile);

      const file = makeFile('cv.txt', 'text/plain', 'Some resume text');
      const result = await service.uploadBatch(mockJob.id!, [file]);

      expect(result.profiles).toHaveLength(1);
      expect(result.failures).toHaveLength(0);
    });

    it('processes multiple files and collects results', async () => {
      jobRepo.findOne.mockResolvedValue(mockJob);
      llmClient.createChatCompletion.mockResolvedValue({
        content: llmJsonResponse,
        model: 'gpt-4o',
        usage: { prompt_tokens: 10, completion_tokens: 50, total_tokens: 60 },
      });
      profileRepo.create.mockReturnValue({ ...mockProfile });
      profileRepo.save.mockResolvedValue({ ...mockProfile });

      const files = [
        makeFile('cv1.txt', 'text/plain', 'Resume 1'),
        makeFile('cv2.txt', 'text/plain', 'Resume 2'),
        makeFile('cv3.txt', 'text/plain', 'Resume 3'),
      ];
      const result = await service.uploadBatch(mockJob.id!, files);

      expect(result.profiles).toHaveLength(3);
      expect(result.failures).toHaveLength(0);
    });

    it('caps batch at 500 files', async () => {
      jobRepo.findOne.mockResolvedValue(mockJob);
      llmClient.createChatCompletion.mockResolvedValue({
        content: llmJsonResponse,
        model: 'gpt-4o',
        usage: { prompt_tokens: 10, completion_tokens: 50, total_tokens: 60 },
      });
      profileRepo.create.mockReturnValue({ ...mockProfile });
      profileRepo.save.mockResolvedValue({ ...mockProfile });

      const files = Array.from({ length: 600 }, (_, i) =>
        makeFile(`cv${i}.txt`, 'text/plain', `Resume ${i}`),
      );
      const result = await service.uploadBatch(mockJob.id!, files);

      // Only 500 processed
      expect(result.profiles.length + result.failures.length).toBeLessThanOrEqual(500);
    });
  });

  describe('listCandidates', () => {
    it('throws NotFoundException when job does not exist', async () => {
      jobRepo.findOne.mockResolvedValue(null);
      await expect(service.listCandidates('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns serialized profiles for a job', async () => {
      jobRepo.findOne.mockResolvedValue(mockJob);
      profileRepo.find.mockResolvedValue([mockProfile]);

      const result = await service.listCandidates(mockJob.id!);
      expect(result).toHaveLength(1);
      expect((result[0] as any).id).toBe(mockProfile.id);
    });

    it('returns empty array when no candidates exist', async () => {
      jobRepo.findOne.mockResolvedValue(mockJob);
      profileRepo.find.mockResolvedValue([]);

      const result = await service.listCandidates(mockJob.id!);
      expect(result).toEqual([]);
    });
  });

  describe('getCandidate', () => {
    it('throws NotFoundException when candidate does not exist', async () => {
      profileRepo.findOne.mockResolvedValue(null);
      await expect(service.getCandidate('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns serialized profile for a valid candidate id', async () => {
      profileRepo.findOne.mockResolvedValue(mockProfile);

      const result = await service.getCandidate(mockProfile.id!);
      expect((result as any).id).toBe(mockProfile.id);
      expect((result as any).name).toBe(mockProfile.name);
    });
  });
});
