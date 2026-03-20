import { CandidateProfile } from '../entities/candidate-profile.entity';
import {
  serializeCandidateProfile,
  deserializeCandidateProfile,
  SchemaValidationError,
  CANDIDATE_PROFILE_V1_SCHEMA,
} from './candidate-profile.serializer';

function makeProfile(overrides: Partial<CandidateProfile> = {}): CandidateProfile {
  const p = new CandidateProfile();
  p.id = '00000000-0000-0000-0000-000000000001';
  p.schemaVersion = '1';
  p.jobId = '00000000-0000-0000-0000-000000000002';
  p.name = 'Jane Doe';
  p.contact = { email: 'jane@example.com', phone: null, location: 'NYC' };
  p.workExperience = [
    { company: 'Acme', title: 'Engineer', start_date: '2020-01', end_date: null, description: 'Built things' },
  ];
  p.education = [
    { institution: 'MIT', degree: 'BSc', field: 'CS', graduation_year: 2019 },
  ];
  p.skills = [{ canonical_name: 'TypeScript', raw_aliases: ['TS'] }];
  p.summary = 'Experienced engineer';
  p.parseStatus = 'success';
  p.errorMessage = null;
  p.createdAt = new Date('2024-01-01T00:00:00.000Z');
  Object.assign(p, overrides);
  return p;
}

describe('serializeCandidateProfile', () => {
  it('returns a JSON string', () => {
    const json = serializeCandidateProfile(makeProfile());
    expect(typeof json).toBe('string');
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('includes all required v1 fields', () => {
    const obj = JSON.parse(serializeCandidateProfile(makeProfile()));
    expect(obj.schema_version).toBe('1');
    expect(obj.id).toBe('00000000-0000-0000-0000-000000000001');
    expect(obj.job_id).toBe('00000000-0000-0000-0000-000000000002');
    expect(obj.name).toBe('Jane Doe');
    expect(obj.contact).toEqual({ email: 'jane@example.com', phone: null, location: 'NYC' });
    expect(obj.parse_status).toBe('success');
    expect(obj.error_message).toBeNull();
    expect(obj.created_at).toBe('2024-01-01T00:00:00.000Z');
  });
});

describe('deserializeCandidateProfile', () => {
  it('round-trips a valid profile', () => {
    const original = makeProfile();
    const json = serializeCandidateProfile(original);
    const restored = deserializeCandidateProfile(json);

    expect(restored.id).toBe(original.id);
    expect(restored.jobId).toBe(original.jobId);
    expect(restored.name).toBe(original.name);
    expect(restored.contact).toEqual(original.contact);
    expect(restored.workExperience).toEqual(original.workExperience);
    expect(restored.education).toEqual(original.education);
    expect(restored.skills).toEqual(original.skills);
    expect(restored.summary).toBe(original.summary);
    expect(restored.parseStatus).toBe(original.parseStatus);
    expect(restored.errorMessage).toBe(original.errorMessage);
    expect(restored.createdAt.toISOString()).toBe(original.createdAt.toISOString());
  });

  it('throws SchemaValidationError for invalid JSON string', () => {
    expect(() => deserializeCandidateProfile('not-json')).toThrow();
    try {
      deserializeCandidateProfile('not-json');
    } catch (e) {
      expect((e as SchemaValidationError).error).toBe('schema_validation_failed');
      expect((e as SchemaValidationError).fields).toContain('root');
    }
  });

  it('throws SchemaValidationError listing missing required fields', () => {
    const bad = JSON.stringify({ schema_version: '1' });
    try {
      deserializeCandidateProfile(bad);
      fail('should have thrown');
    } catch (e) {
      const err = e as SchemaValidationError;
      expect(err.error).toBe('schema_validation_failed');
      expect(err.fields.length).toBeGreaterThan(0);
    }
  });

  it('throws SchemaValidationError for wrong parse_status value', () => {
    const profile = makeProfile();
    const obj = JSON.parse(serializeCandidateProfile(profile));
    obj.parse_status = 'unknown';
    try {
      deserializeCandidateProfile(JSON.stringify(obj));
      fail('should have thrown');
    } catch (e) {
      const err = e as SchemaValidationError;
      expect(err.error).toBe('schema_validation_failed');
      expect(err.fields).toContain('parse_status');
    }
  });
});

describe('CANDIDATE_PROFILE_V1_SCHEMA', () => {
  it('is a valid JSON schema object with required fields listed', () => {
    expect(CANDIDATE_PROFILE_V1_SCHEMA.type).toBe('object');
    expect(CANDIDATE_PROFILE_V1_SCHEMA.required).toContain('id');
    expect(CANDIDATE_PROFILE_V1_SCHEMA.required).toContain('job_id');
    expect(CANDIDATE_PROFILE_V1_SCHEMA.required).toContain('name');
    expect(CANDIDATE_PROFILE_V1_SCHEMA.required).toContain('contact');
    expect(CANDIDATE_PROFILE_V1_SCHEMA.required).toContain('parse_status');
  });
});
