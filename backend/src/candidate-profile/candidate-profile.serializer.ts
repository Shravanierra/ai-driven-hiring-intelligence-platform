import Ajv, { JSONSchemaType } from 'ajv';
import addFormats from 'ajv-formats';
import { CandidateProfile } from '../entities/candidate-profile.entity';

// ─── v1 JSON Schema ───────────────────────────────────────────────────────────

export const CANDIDATE_PROFILE_V1_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'CandidateProfile',
  description: 'v1 schema for a serialized CandidateProfile',
  type: 'object',
  required: [
    'schema_version',
    'id',
    'job_id',
    'name',
    'contact',
    'work_experience',
    'education',
    'skills',
    'summary',
    'parse_status',
    'created_at',
  ],
  properties: {
    schema_version: { type: 'string', const: '1' },
    id: { type: 'string', format: 'uuid' },
    job_id: { type: 'string', format: 'uuid' },
    name: { type: 'string', minLength: 1 },
    contact: {
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string' },
        phone: { type: ['string', 'null'] },
        location: { type: ['string', 'null'] },
      },
      additionalProperties: false,
    },
    work_experience: {
      type: 'array',
      items: {
        type: 'object',
        required: ['company', 'title', 'start_date', 'description'],
        properties: {
          company: { type: 'string' },
          title: { type: 'string' },
          start_date: { type: 'string' },
          end_date: { type: ['string', 'null'] },
          description: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
    education: {
      type: 'array',
      items: {
        type: 'object',
        required: ['institution', 'degree', 'field'],
        properties: {
          institution: { type: 'string' },
          degree: { type: 'string' },
          field: { type: 'string' },
          graduation_year: { type: ['integer', 'null'] },
        },
        additionalProperties: false,
      },
    },
    skills: {
      type: 'array',
      items: {
        type: 'object',
        required: ['canonical_name', 'raw_aliases'],
        properties: {
          canonical_name: { type: 'string' },
          raw_aliases: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    },
    summary: { type: 'string' },
    parse_status: { type: 'string', enum: ['success', 'error'] },
    error_message: { type: ['string', 'null'] },
    created_at: { type: 'string' },
  },
  additionalProperties: false,
} as const;

// ─── AJV instance ─────────────────────────────────────────────────────────────

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validateSchema = ajv.compile(CANDIDATE_PROFILE_V1_SCHEMA);

// ─── Error type ───────────────────────────────────────────────────────────────

export interface SchemaValidationError {
  error: 'schema_validation_failed';
  fields: string[];
}

// ─── Serializer ───────────────────────────────────────────────────────────────

/**
 * Serializes a CandidateProfile entity to a JSON string conforming to the v1 schema.
 */
export function serializeCandidateProfile(profile: CandidateProfile): string {
  const obj = {
    schema_version: profile.schemaVersion ?? '1',
    id: profile.id,
    job_id: profile.jobId,
    name: profile.name,
    contact: profile.contact,
    work_experience: profile.workExperience,
    education: profile.education,
    skills: profile.skills,
    summary: profile.summary,
    parse_status: profile.parseStatus,
    error_message: profile.errorMessage ?? null,
    created_at: profile.createdAt instanceof Date
      ? profile.createdAt.toISOString()
      : (profile.createdAt ?? new Date().toISOString()),
  };
  return JSON.stringify(obj);
}

/**
 * Deserializes a JSON string into a CandidateProfile entity.
 * Throws a SchemaValidationError if the JSON fails v1 schema validation.
 */
export function deserializeCandidateProfile(json: string): CandidateProfile {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw { error: 'schema_validation_failed', fields: ['root'] } as SchemaValidationError;
  }

  const valid = validateSchema(data);
  if (!valid) {
    const fields = (validateSchema.errors ?? []).map((e) => {
      // instancePath is like "/contact/email"; strip leading slash
      const path = e.instancePath ? e.instancePath.replace(/^\//, '').replace(/\//g, '.') : (e.params as any)?.missingProperty ?? 'unknown';
      return path;
    });
    throw { error: 'schema_validation_failed', fields } as SchemaValidationError;
  }

  const obj = data as Record<string, unknown>;
  const profile = new CandidateProfile();
  profile.schemaVersion = (obj.schema_version as string) ?? '1';
  profile.id = obj.id as string;
  profile.jobId = obj.job_id as string;
  profile.name = obj.name as string;
  profile.contact = obj.contact as CandidateProfile['contact'];
  profile.workExperience = obj.work_experience as CandidateProfile['workExperience'];
  profile.education = obj.education as CandidateProfile['education'];
  profile.skills = obj.skills as CandidateProfile['skills'];
  profile.summary = obj.summary as string;
  profile.parseStatus = obj.parse_status as CandidateProfile['parseStatus'];
  profile.errorMessage = (obj.error_message as string | null) ?? null;
  profile.createdAt = new Date(obj.created_at as string);

  return profile;
}
