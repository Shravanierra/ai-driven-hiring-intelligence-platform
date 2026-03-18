import { CandidateProfile } from '../entities/candidate-profile.entity';
export declare function serializeCandidateProfile(profile: CandidateProfile): object;
export interface SchemaValidationError {
    error: 'schema_validation_failed';
    fields: string[];
}
export declare function deserializeCandidateProfile(data: unknown): CandidateProfile;
