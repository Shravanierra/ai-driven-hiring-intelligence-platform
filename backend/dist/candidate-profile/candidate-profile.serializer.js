"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeCandidateProfile = serializeCandidateProfile;
exports.deserializeCandidateProfile = deserializeCandidateProfile;
const candidate_profile_entity_1 = require("../entities/candidate-profile.entity");
function serializeCandidateProfile(profile) {
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
function deserializeCandidateProfile(data) {
    const errors = [];
    if (typeof data !== 'object' || data === null) {
        throw { error: 'schema_validation_failed', fields: ['root'] };
    }
    const obj = data;
    if (!obj.id || typeof obj.id !== 'string')
        errors.push('id');
    if (!obj.job_id || typeof obj.job_id !== 'string')
        errors.push('job_id');
    if (!obj.name || typeof obj.name !== 'string')
        errors.push('name');
    if (!obj.contact || typeof obj.contact !== 'object')
        errors.push('contact');
    if (!Array.isArray(obj.work_experience))
        errors.push('work_experience');
    if (!Array.isArray(obj.education))
        errors.push('education');
    if (!Array.isArray(obj.skills))
        errors.push('skills');
    if (typeof obj.summary !== 'string')
        errors.push('summary');
    if (obj.parse_status !== 'success' && obj.parse_status !== 'error') {
        errors.push('parse_status');
    }
    if (errors.length > 0) {
        throw { error: 'schema_validation_failed', fields: errors };
    }
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
    profile.createdAt = obj.created_at
        ? new Date(obj.created_at)
        : new Date();
    return profile;
}
//# sourceMappingURL=candidate-profile.serializer.js.map