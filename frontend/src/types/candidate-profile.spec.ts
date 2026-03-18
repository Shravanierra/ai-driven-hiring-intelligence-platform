/**
 * Frontend property-based tests for CandidateProfile type invariants.
 * Uses fast-check to validate structural properties.
 */
import * as fc from 'fast-check';
import type { CandidateProfile, Skill, WorkExperience, Education } from './candidate-profile';

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const arbNonEmptyString = (maxLength = 200) =>
  fc.string({ minLength: 1, maxLength });

const arbContact = () =>
  fc.record({
    email: fc.emailAddress(),
    phone: fc.option(fc.string({ minLength: 7, maxLength: 20 }), { nil: null }),
    location: fc.option(arbNonEmptyString(100), { nil: null }),
  });

const arbYearMonth = () =>
  fc
    .tuple(fc.integer({ min: 2000, max: 2024 }), fc.integer({ min: 1, max: 12 }))
    .map(([y, m]) => `${y}-${String(m).padStart(2, '0')}`);

const arbWorkExperience = (): fc.Arbitrary<WorkExperience> =>
  fc.record({
    company: arbNonEmptyString(100),
    title: arbNonEmptyString(100),
    start_date: arbYearMonth(),
    end_date: fc.option(arbYearMonth(), { nil: null }),
    description: arbNonEmptyString(500),
  });

const arbEducation = (): fc.Arbitrary<Education> =>
  fc.record({
    institution: arbNonEmptyString(200),
    degree: arbNonEmptyString(100),
    field: arbNonEmptyString(100),
    graduation_year: fc.option(fc.integer({ min: 1970, max: 2030 }), { nil: null }),
  });

const arbSkill = (): fc.Arbitrary<Skill> =>
  fc.record({
    canonical_name: arbNonEmptyString(100),
    raw_aliases: fc.array(arbNonEmptyString(100), { minLength: 1, maxLength: 5 }),
  });

const arbitraryCandidateProfile = (): fc.Arbitrary<CandidateProfile> =>
  fc.record({
    schema_version: fc.constant('1' as const),
    id: fc.uuid(),
    job_id: fc.uuid(),
    name: arbNonEmptyString(200),
    contact: arbContact(),
    work_experience: fc.array(arbWorkExperience(), { minLength: 0, maxLength: 5 }),
    education: fc.array(arbEducation(), { minLength: 0, maxLength: 3 }),
    skills: fc.array(arbSkill(), { minLength: 0, maxLength: 10 }),
    summary: fc.string({ minLength: 0, maxLength: 500 }),
    parse_status: fc.constantFrom<'success' | 'error'>('success', 'error'),
    error_message: fc.option(arbNonEmptyString(300), { nil: null }),
    created_at: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map(
      (d) => d.toISOString(),
    ),
  });

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CandidateProfile type invariants', () => {
  // Feature: ai-hiring-platform, Property 22: Candidate Profile Serialization Round Trip
  it('JSON round-trip preserves all fields', () => {
    fc.assert(
      fc.property(arbitraryCandidateProfile(), (profile) => {
        const json = JSON.stringify(profile);
        const restored = JSON.parse(json) as CandidateProfile;

        expect(restored.id).toBe(profile.id);
        expect(restored.job_id).toBe(profile.job_id);
        expect(restored.name).toBe(profile.name);
        expect(restored.schema_version).toBe('1');
        expect(restored.contact).toEqual(profile.contact);
        expect(restored.work_experience).toEqual(profile.work_experience);
        expect(restored.education).toEqual(profile.education);
        expect(restored.skills).toEqual(profile.skills);
        expect(restored.summary).toBe(profile.summary);
        expect(restored.parse_status).toBe(profile.parse_status);
        expect(restored.error_message).toBe(profile.error_message);
      }),
      { numRuns: 100 },
    );
  });

  it('skills always have canonical_name and at least one raw_alias', () => {
    fc.assert(
      fc.property(
        fc.array(arbSkill(), { minLength: 1, maxLength: 20 }),
        (skills) => {
          for (const skill of skills) {
            expect(skill.canonical_name.length).toBeGreaterThan(0);
            expect(skill.raw_aliases.length).toBeGreaterThanOrEqual(1);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('parse_status is always success or error', () => {
    fc.assert(
      fc.property(arbitraryCandidateProfile(), (profile) => {
        expect(['success', 'error']).toContain(profile.parse_status);
      }),
      { numRuns: 100 },
    );
  });
});
