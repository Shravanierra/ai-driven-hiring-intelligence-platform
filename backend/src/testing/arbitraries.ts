import * as fc from 'fast-check';
import { CandidateProfile } from '../entities/candidate-profile.entity';
import { ScreeningCriteria, ExperienceLevel, CustomCriterion } from '../entities/screening-criteria.entity';
import { FitScore, ScoreBreakdownItem } from '../entities/fit-score.entity';
import { ShortlistEntry, ShortlistDecision } from '../entities/shortlist-entry.entity';
import { InterviewKit, InterviewQuestion, QuestionType } from '../entities/interview-kit.entity';

// ─── Primitive helpers ────────────────────────────────────────────────────────

export const arbUuid = (): fc.Arbitrary<string> =>
  fc.uuid();

export const arbNonEmptyString = (maxLength = 200): fc.Arbitrary<string> =>
  fc.string({ minLength: 1, maxLength });

export const arbIsoDate = (): fc.Arbitrary<string> =>
  fc.date({ min: new Date('2000-01-01'), max: new Date('2030-12-31') }).map(
    (d) => d.toISOString(),
  );

export const arbYearMonth = (): fc.Arbitrary<string> =>
  fc
    .tuple(
      fc.integer({ min: 2000, max: 2024 }),
      fc.integer({ min: 1, max: 12 }),
    )
    .map(([y, m]) => `${y}-${String(m).padStart(2, '0')}`);

// ─── Contact ─────────────────────────────────────────────────────────────────

export const arbContact = () =>
  fc.record({
    email: fc.emailAddress(),
    phone: fc.option(fc.string({ minLength: 7, maxLength: 20 }), { nil: null }),
    location: fc.option(arbNonEmptyString(100), { nil: null }),
  });

// ─── WorkExperience ───────────────────────────────────────────────────────────

export const arbWorkExperience = () =>
  fc.record({
    company: arbNonEmptyString(100),
    title: arbNonEmptyString(100),
    start_date: arbYearMonth(),
    end_date: fc.option(arbYearMonth(), { nil: null }),
    description: arbNonEmptyString(500),
  });

// ─── Education ────────────────────────────────────────────────────────────────

export const arbEducation = () =>
  fc.record({
    institution: arbNonEmptyString(200),
    degree: arbNonEmptyString(100),
    field: arbNonEmptyString(100),
    graduation_year: fc.option(fc.integer({ min: 1970, max: 2030 }), { nil: null }),
  });

// ─── Skill ────────────────────────────────────────────────────────────────────

export const arbSkill = () =>
  fc.record({
    canonical_name: arbNonEmptyString(100),
    raw_aliases: fc.array(arbNonEmptyString(100), { minLength: 1, maxLength: 5 }),
  });

// ─── CandidateProfile ─────────────────────────────────────────────────────────

export const arbitraryCandidateProfile = (): fc.Arbitrary<CandidateProfile> =>
  fc
    .record({
      id: arbUuid(),
      jobId: arbUuid(),
      name: arbNonEmptyString(200),
      contact: arbContact(),
      workExperience: fc.array(arbWorkExperience(), { minLength: 0, maxLength: 5 }),
      education: fc.array(arbEducation(), { minLength: 0, maxLength: 3 }),
      skills: fc.array(arbSkill(), { minLength: 0, maxLength: 10 }),
      summary: fc.string({ minLength: 0, maxLength: 500 }),
      parseStatus: fc.constantFrom<'success' | 'error'>('success', 'error'),
      errorMessage: fc.option(arbNonEmptyString(300), { nil: null }),
      createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
    })
    .map((rec) => {
      const profile = new CandidateProfile();
      profile.schemaVersion = '1';
      profile.id = rec.id;
      profile.jobId = rec.jobId;
      profile.name = rec.name;
      profile.contact = rec.contact;
      profile.workExperience = rec.workExperience;
      profile.education = rec.education;
      profile.skills = rec.skills;
      profile.summary = rec.summary;
      profile.parseStatus = rec.parseStatus;
      profile.errorMessage = rec.errorMessage;
      profile.createdAt = rec.createdAt;
      return profile;
    });

// ─── CustomCriterion ─────────────────────────────────────────────────────────

export const arbCustomCriterion = (): fc.Arbitrary<CustomCriterion> =>
  fc.record({
    label: arbNonEmptyString(100),
    weight: fc.float({ min: 0, max: 1, noNaN: true }),
    description: arbNonEmptyString(300),
  });

// ─── ScreeningCriteria ────────────────────────────────────────────────────────

export const arbitraryScreeningCriteria = (): fc.Arbitrary<ScreeningCriteria> =>
  fc
    .record({
      id: arbUuid(),
      jobId: arbUuid(),
      version: fc.integer({ min: 1, max: 100 }),
      requiredSkills: fc.array(arbNonEmptyString(100), { minLength: 1, maxLength: 10 }),
      preferredSkills: fc.array(arbNonEmptyString(100), { minLength: 0, maxLength: 10 }),
      experienceLevel: fc.constantFrom<ExperienceLevel>('entry', 'mid', 'senior', 'lead'),
      responsibilities: fc.array(arbNonEmptyString(200), { minLength: 1, maxLength: 10 }),
      customCriteria: fc.array(arbCustomCriterion(), { minLength: 0, maxLength: 5 }),
      updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
    })
    .map((rec) => {
      const criteria = new ScreeningCriteria();
      Object.assign(criteria, rec);
      return criteria;
    });

// ─── ScoreBreakdownItem ───────────────────────────────────────────────────────

export const arbBreakdownItem = (): fc.Arbitrary<ScoreBreakdownItem> =>
  fc.record({
    criterion_label: arbNonEmptyString(100),
    status: fc.constantFrom<'met' | 'partial' | 'not_met'>('met', 'partial', 'not_met'),
    contribution: fc.float({ min: 0, max: 100, noNaN: true }),
    explanation: arbNonEmptyString(300),
  });

// ─── FitScore ─────────────────────────────────────────────────────────────────

export const arbitraryFitScore = (): fc.Arbitrary<FitScore> =>
  fc
    .record({
      id: arbUuid(),
      candidateId: arbUuid(),
      jobId: arbUuid(),
      criteriaVersion: fc.integer({ min: 1, max: 100 }),
      score: fc.float({ min: 0, max: 100, noNaN: true }),
      breakdown: fc.array(arbBreakdownItem(), { minLength: 1, maxLength: 10 }),
      computedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
    })
    .map((rec) => {
      const fitScore = new FitScore();
      Object.assign(fitScore, rec);
      return fitScore;
    });

// ─── ShortlistEntry ───────────────────────────────────────────────────────────

export const arbitraryShortlistEntry = (): fc.Arbitrary<ShortlistEntry> =>
  fc
    .record({
      id: arbUuid(),
      jobId: arbUuid(),
      candidateId: arbUuid(),
      rank: fc.integer({ min: 1, max: 50 }),
      fitScore: fc.float({ min: 0, max: 100, noNaN: true }),
      reasoning: arbNonEmptyString(500),
      decision: fc.constantFrom<ShortlistDecision>('pending', 'accepted', 'rejected', 'deferred'),
      decidedAt: fc.option(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        { nil: null },
      ),
      createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
    })
    .map((rec) => {
      const entry = new ShortlistEntry();
      Object.assign(entry, rec);
      return entry;
    });

// ─── InterviewQuestion ────────────────────────────────────────────────────────

export const arbInterviewQuestion = (): fc.Arbitrary<InterviewQuestion> =>
  fc.record({
    id: arbUuid(),
    type: fc.constantFrom<QuestionType>('behavioral', 'technical', 'gap'),
    text: arbNonEmptyString(500),
    rubric: fc.record({
      strong: arbNonEmptyString(300),
      adequate: arbNonEmptyString(300),
      weak: arbNonEmptyString(300),
    }),
  });

// ─── InterviewKit ─────────────────────────────────────────────────────────────

export const arbitraryInterviewKit = (): fc.Arbitrary<InterviewKit> =>
  fc
    .record({
      id: arbUuid(),
      candidateId: arbUuid(),
      jobId: arbUuid(),
      questions: fc.array(arbInterviewQuestion(), { minLength: 5, maxLength: 15 }),
      generatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
      updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
    })
    .map((rec) => {
      const kit = new InterviewKit();
      Object.assign(kit, rec);
      return kit;
    });

// ─── JobDescription text ──────────────────────────────────────────────────────

/**
 * Generates arbitrary non-empty job description raw text strings.
 * Used for Property 1: JD Parsing Produces Complete Screening Criteria.
 */
export const arbitraryJobDescriptionText = (): fc.Arbitrary<string> =>
  fc.string({ minLength: 1, maxLength: 2000 });

// ─── Shortlist (ordered array) ────────────────────────────────────────────────

/**
 * Generates a list of shortlist entries ordered by fitScore descending,
 * all sharing the same jobId.
 */
export const arbitraryOrderedShortlist = (
  maxSize = 50,
): fc.Arbitrary<ShortlistEntry[]> =>
  fc
    .tuple(
      arbUuid(),
      fc.array(
        fc.record({
          candidateId: arbUuid(),
          fitScore: fc.float({ min: 0, max: 100, noNaN: true }),
          reasoning: arbNonEmptyString(300),
        }),
        { minLength: 1, maxLength: maxSize },
      ),
    )
    .map(([jobId, items]) => {
      const sorted = [...items].sort((a, b) => b.fitScore - a.fitScore);
      return sorted.map((item, idx) => {
        const entry = new ShortlistEntry();
        entry.id = `entry-${idx}`;
        entry.jobId = jobId;
        entry.candidateId = item.candidateId;
        entry.rank = idx + 1;
        entry.fitScore = item.fitScore;
        entry.reasoning = item.reasoning;
        entry.decision = 'pending';
        entry.decidedAt = null;
        entry.createdAt = new Date();
        return entry;
      });
    });
