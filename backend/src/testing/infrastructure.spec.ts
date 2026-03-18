/**
 * Infrastructure-level property-based tests for Task 1.
 * These tests validate the core data model invariants and serialization
 * without requiring a live database or LLM connection.
 */
import * as fc from 'fast-check';
import {
  arbitraryCandidateProfile,
  arbitraryScreeningCriteria,
  arbitraryFitScore,
  arbitraryShortlistEntry,
  arbitraryInterviewKit,
  arbitraryOrderedShortlist,
} from './arbitraries';
import {
  serializeCandidateProfile,
  deserializeCandidateProfile,
} from '../candidate-profile/candidate-profile.serializer';

// ─── Entity shape tests ───────────────────────────────────────────────────────

describe('CandidateProfile entity', () => {
  it('arbitrary always produces a valid profile shape', () => {
    fc.assert(
      fc.property(arbitraryCandidateProfile(), (profile) => {
        expect(profile.id).toBeTruthy();
        expect(profile.jobId).toBeTruthy();
        expect(profile.name).toBeTruthy();
        expect(profile.contact).toBeDefined();
        expect(Array.isArray(profile.workExperience)).toBe(true);
        expect(Array.isArray(profile.education)).toBe(true);
        expect(Array.isArray(profile.skills)).toBe(true);
        expect(['success', 'error']).toContain(profile.parseStatus);
        expect(profile.schemaVersion).toBe('1');
      }),
      { numRuns: 100 },
    );
  });
});

describe('ScreeningCriteria entity', () => {
  it('arbitrary always produces valid criteria shape', () => {
    fc.assert(
      fc.property(arbitraryScreeningCriteria(), (criteria) => {
        expect(criteria.jobId).toBeTruthy();
        expect(criteria.version).toBeGreaterThanOrEqual(1);
        expect(Array.isArray(criteria.requiredSkills)).toBe(true);
        expect(criteria.requiredSkills.length).toBeGreaterThanOrEqual(1);
        expect(['entry', 'mid', 'senior', 'lead']).toContain(criteria.experienceLevel);
        expect(Array.isArray(criteria.responsibilities)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});

describe('FitScore entity', () => {
  it('arbitrary always produces score in [0, 100]', () => {
    // Feature: ai-hiring-platform, Property 6: Fit Score Is Always in Range [0, 100]
    fc.assert(
      fc.property(arbitraryFitScore(), (fitScore) => {
        expect(fitScore.score).toBeGreaterThanOrEqual(0);
        expect(fitScore.score).toBeLessThanOrEqual(100);
      }),
      { numRuns: 100 },
    );
  });
});

describe('ShortlistEntry entity', () => {
  it('arbitrary always produces valid decision values', () => {
    fc.assert(
      fc.property(arbitraryShortlistEntry(), (entry) => {
        expect(['pending', 'accepted', 'rejected', 'deferred']).toContain(
          entry.decision,
        );
        expect(entry.fitScore).toBeGreaterThanOrEqual(0);
        expect(entry.fitScore).toBeLessThanOrEqual(100);
        expect(entry.reasoning.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });
});

describe('InterviewKit entity', () => {
  it('arbitrary always produces kit with 5-15 questions', () => {
    fc.assert(
      fc.property(arbitraryInterviewKit(), (kit) => {
        expect(kit.questions.length).toBeGreaterThanOrEqual(5);
        expect(kit.questions.length).toBeLessThanOrEqual(15);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Ordered shortlist ────────────────────────────────────────────────────────

describe('Ordered shortlist', () => {
  // Feature: ai-hiring-platform, Property 10: Shortlist Is Ordered by Fit Score Descending with Reasoning
  it('entries are ordered by fitScore descending and all have non-empty reasoning', () => {
    fc.assert(
      fc.property(arbitraryOrderedShortlist(50), (entries) => {
        for (let i = 0; i < entries.length - 1; i++) {
          expect(entries[i].fitScore).toBeGreaterThanOrEqual(entries[i + 1].fitScore);
        }
        for (const entry of entries) {
          expect(entry.reasoning.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Serialization round-trip ─────────────────────────────────────────────────

describe('CandidateProfile serialization', () => {
  // Feature: ai-hiring-platform, Property 22: Candidate Profile Serialization Round Trip
  it('round-trips CandidateProfile through JSON serialization', () => {
    fc.assert(
      fc.property(arbitraryCandidateProfile(), (profile) => {
        const serialized = serializeCandidateProfile(profile);
        const json = JSON.parse(JSON.stringify(serialized));
        const restored = deserializeCandidateProfile(json);

        expect(restored.id).toBe(profile.id);
        expect(restored.jobId).toBe(profile.jobId);
        expect(restored.name).toBe(profile.name);
        expect(restored.contact).toEqual(profile.contact);
        expect(restored.workExperience).toEqual(profile.workExperience);
        expect(restored.education).toEqual(profile.education);
        expect(restored.skills).toEqual(profile.skills);
        expect(restored.summary).toBe(profile.summary);
        expect(restored.parseStatus).toBe(profile.parseStatus);
        expect(restored.errorMessage).toBe(profile.errorMessage);
      }),
      { numRuns: 100 },
    );
  });

  it('throws schema_validation_failed for missing required fields', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.option(fc.uuid(), { nil: undefined }),
          name: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
        }),
        (partial) => {
          // Ensure at least one required field is missing
          const incomplete = { ...partial };
          delete (incomplete as any).job_id;

          expect(() => deserializeCandidateProfile(incomplete)).toThrow();
        },
      ),
      { numRuns: 100 },
    );
  });
});
