import { CandidateProfile } from '../entities/candidate-profile.entity';

/**
 * Serializes a CandidateProfile entity to a plain JSON-compatible object
 * conforming to the v1 schema.
 */
export function serializeCandidateProfile(profile: CandidateProfile): object {
  return {
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
    created_at: profile.createdAt?.toISOString() ?? new Date().toISOString(),
  };
}

export interface SchemaValidationError {
  error: 'schema_validation_failed';
  fields: string[];
}

/**
 * Deserializes a plain JSON object back into a CandidateProfile-shaped object.
 * Throws SchemaValidationError if required fields are missing or invalid.
 */
export function deserializeCandidateProfile(
  data: unknown,
): CandidateProfile {
  const errors: string[] = [];

  if (typeof data !== 'object' || data === null) {
    throw { error: 'schema_validation_failed', fields: ['root'] } as SchemaValidationError;
  }

  const obj = data as Record<string, unknown>;

  if (!obj.id || typeof obj.id !== 'string') errors.push('id');
  if (!obj.job_id || typeof obj.job_id !== 'string') errors.push('job_id');
  if (!obj.name || typeof obj.name !== 'string') errors.push('name');
  if (!obj.contact || typeof obj.contact !== 'object') errors.push('contact');
  if (!Array.isArray(obj.work_experience)) errors.push('work_experience');
  if (!Array.isArray(obj.education)) errors.push('education');
  if (!Array.isArray(obj.skills)) errors.push('skills');
  if (typeof obj.summary !== 'string') errors.push('summary');
  if (obj.parse_status !== 'success' && obj.parse_status !== 'error') {
    errors.push('parse_status');
  }

  if (errors.length > 0) {
    throw { error: 'schema_validation_failed', fields: errors } as SchemaValidationError;
  }

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
  profile.createdAt = obj.created_at
    ? new Date(obj.created_at as string)
    : new Date();

  return profile;
}
