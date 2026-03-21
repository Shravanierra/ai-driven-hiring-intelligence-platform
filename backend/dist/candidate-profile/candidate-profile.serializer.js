"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CANDIDATE_PROFILE_V1_SCHEMA = void 0;
exports.serializeCandidateProfile = serializeCandidateProfile;
exports.deserializeCandidateProfile = deserializeCandidateProfile;
const ajv_1 = require("ajv");
const ajv_formats_1 = require("ajv-formats");
const candidate_profile_entity_1 = require("../entities/candidate-profile.entity");
exports.CANDIDATE_PROFILE_V1_SCHEMA = {
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
};
const ajv = new ajv_1.default({ allErrors: true });
(0, ajv_formats_1.default)(ajv);
const validateSchema = ajv.compile(exports.CANDIDATE_PROFILE_V1_SCHEMA);
function serializeCandidateProfile(profile) {
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
function deserializeCandidateProfile(json) {
    let data;
    try {
        data = JSON.parse(json);
    }
    catch {
        throw { error: 'schema_validation_failed', fields: ['root'] };
    }
    const valid = validateSchema(data);
    if (!valid) {
        const fields = (validateSchema.errors ?? []).map((e) => {
            const path = e.instancePath ? e.instancePath.replace(/^\//, '').replace(/\//g, '.') : e.params?.missingProperty ?? 'unknown';
            return path;
        });
        throw { error: 'schema_validation_failed', fields };
    }
    const obj = data;
    const profile = new candidate_profile_entity_1.CandidateProfile();
    profile.schemaVersion = obj.schema_version ?? '1';
    profile.id = obj.id;
    profile.jobId = obj.job_id;
    profile.name = obj.name;
    profile.contact = obj.contact;
    profile.workExperience = obj.work_experience;
    profile.education = obj.education;
    profile.skills = obj.skills;
    profile.summary = obj.summary;
    profile.parseStatus = obj.parse_status;
    profile.errorMessage = obj.error_message ?? null;
    profile.createdAt = new Date(obj.created_at);
    return profile;
}
//# sourceMappingURL=candidate-profile.serializer.js.map