/**
 * Property-based tests for InterviewKitService.
 *
 * Feature: ai-hiring-platform, Property 20: Interview Kit Structure Completeness
 * Validates: Requirements 7.1, 7.2, 7.3
 */
import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ServiceUnavailableException } from '@nestjs/common';
import { InterviewKitService } from './interview-kit.service';
import { InterviewKitPdfService } from './interview-kit-pdf.service';
import { InterviewKit, InterviewQuestion, QuestionType } from '../entities/interview-kit.entity';
import { CandidateProfile } from '../entities/candidate-profile.entity';
import { ScreeningCriteria } from '../entities/screening-criteria.entity';
import { LlmClient } from '../llm/llm.client';
import { arbitraryInterviewKit } from '../testing/arbitraries';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generates a structurally valid LLM JSON response containing the given questions.
 */
function makeLlmResponse(questions: Omit<InterviewQuestion, 'id'>[]): string {
  return JSON.stringify({ questions });
}

/**
 * Builds a random array of LLM questions (no id field — the service assigns UUIDs)
 * that satisfies the 5–15 count constraint and includes at least one of each type.
 */
const arbValidLlmQuestions = (): fc.Arbitrary<Omit<InterviewQuestion, 'id'>[]> => {
  const arbQuestion = (type: QuestionType) =>
    fc.record({
      type: fc.constant(type),
      text: fc.string({ minLength: 1, maxLength: 200 }),
      rubric: fc.record({
        strong: fc.string({ minLength: 1, maxLength: 200 }),
        adequate: fc.string({ minLength: 1, maxLength: 200 }),
        weak: fc.string({ minLength: 1, maxLength: 200 }),
      }),
    });

  // Guarantee at least one of each required type, then pad to a random total in [5, 15]
  return fc
    .tuple(
      arbQuestion('behavioral'),
      arbQuestion('technical'),
      arbQuestion('gap'),
      fc.integer({ min: 2, max: 12 }), // extra questions to reach 5–15 total
      fc.array(
        fc.record({
          type: fc.constantFrom<QuestionType>('behavioral', 'technical', 'gap'),
          text: fc.string({ minLength: 1, maxLength: 200 }),
          rubric: fc.record({
            strong: fc.string({ minLength: 1, maxLength: 200 }),
            adequate: fc.string({ minLength: 1, maxLength: 200 }),
            weak: fc.string({ minLength: 1, maxLength: 200 }),
          }),
        }),
        { minLength: 2, maxLength: 12 },
      ),
    )
    .map(([behavioral, technical, gap, _extra, extras]) => {
      const base = [behavioral, technical, gap, ...extras];
      // Clamp to [5, 15]
      return base.slice(0, Math.min(15, Math.max(5, base.length)));
    });
};

// ─── Test setup ───────────────────────────────────────────────────────────────

function makeRepo(overrides: Record<string, jest.Mock> = {}) {
  return {
    findOne: jest.fn(),
    create: jest.fn((data) => ({ ...data })),
    save: jest.fn((entity) =>
      Promise.resolve({ id: 'kit-uuid', ...entity, generatedAt: new Date(), updatedAt: new Date() }),
    ),
    ...overrides,
  };
}

const mockProfile: CandidateProfile = {
  id: 'cand-pbt',
  jobId: 'job-pbt',
  schemaVersion: '1',
  name: 'PBT Candidate',
  contact: { email: 'pbt@example.com', phone: null, location: null },
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
  id: 'crit-pbt',
  jobId: 'job-pbt',
  version: 1,
  requiredSkills: ['TypeScript'],
  preferredSkills: ['React'],
  experienceLevel: 'mid',
  responsibilities: ['Build APIs'],
  customCriteria: [],
  updatedAt: new Date(),
};

describe('InterviewKitService PBT', () => {
  let service: InterviewKitService;
  let kitRepo: ReturnType<typeof makeRepo>;
  let profileRepo: ReturnType<typeof makeRepo>;
  let criteriaRepo: ReturnType<typeof makeRepo>;
  let llmClient: { createChatCompletion: jest.Mock };

  beforeEach(async () => {
    kitRepo = makeRepo();
    profileRepo = makeRepo();
    criteriaRepo = makeRepo();
    llmClient = { createChatCompletion: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
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

  // Feature: ai-hiring-platform, Property 20: Interview Kit Structure Completeness
  // Validates: Requirements 7.1, 7.2, 7.3
  it('generated kit always contains 5–15 questions, one of each type, and non-empty rubric fields', async () => {
    await fc.assert(
      fc.asyncProperty(arbValidLlmQuestions(), async (llmQuestions) => {
        profileRepo.findOne.mockResolvedValue(mockProfile);
        criteriaRepo.findOne.mockResolvedValue(mockCriteria);
        kitRepo.findOne.mockResolvedValue(null);
        llmClient.createChatCompletion.mockResolvedValue({
          content: makeLlmResponse(llmQuestions),
          model: 'gpt-4o',
          usage: {},
        });

        const kit = await service.generateKit('job-pbt', 'cand-pbt');

        // Requirement 7.1: between 5 and 15 questions
        expect(kit.questions.length).toBeGreaterThanOrEqual(5);
        expect(kit.questions.length).toBeLessThanOrEqual(15);

        const types = kit.questions.map((q) => q.type);

        // Requirement 7.2: at least one of each type
        expect(types).toContain('behavioral');
        expect(types).toContain('technical');
        expect(types).toContain('gap');

        // Requirement 7.3: every question has a rubric with non-empty strong/adequate/weak
        for (const q of kit.questions) {
          expect(q.rubric).toBeDefined();
          expect(q.rubric.strong.trim().length).toBeGreaterThan(0);
          expect(q.rubric.adequate.trim().length).toBeGreaterThan(0);
          expect(q.rubric.weak.trim().length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 },
    );
  });

  // Property 20 — structural validation against the data model directly
  // Validates that the arbitraryInterviewKit generator always produces structurally complete kits
  it('arbitraryInterviewKit always produces structurally complete kits', () => {
    fc.assert(
      fc.property(arbitraryInterviewKit(), (kit) => {
        // Requirement 7.1: between 5 and 15 questions
        expect(kit.questions.length).toBeGreaterThanOrEqual(5);
        expect(kit.questions.length).toBeLessThanOrEqual(15);

        const types = kit.questions.map((q) => q.type);

        // Requirement 7.2: all question types are valid (behavioral | technical | gap)
        // Note: the arbitrary generates random types so we only assert validity here;
        // the service-level test above validates the type coverage enforced by the service.
        expect(types.every((t) => ['behavioral', 'technical', 'gap'].includes(t))).toBe(true);

        // Requirement 7.3: every question has a rubric with all three fields present and non-null
        for (const q of kit.questions) {
          expect(q.rubric).toBeDefined();
          expect(typeof q.rubric.strong).toBe('string');
          expect(typeof q.rubric.adequate).toBe('string');
          expect(typeof q.rubric.weak).toBe('string');
          // The arbitrary uses arbNonEmptyString (minLength: 1), so length >= 1
          expect(q.rubric.strong.length).toBeGreaterThanOrEqual(1);
          expect(q.rubric.adequate.length).toBeGreaterThanOrEqual(1);
          expect(q.rubric.weak.length).toBeGreaterThanOrEqual(1);
        }
      }),
      { numRuns: 100 },
    );
  });
});
