"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ScoringService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScoringService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const fit_score_entity_1 = require("../entities/fit-score.entity");
const candidate_profile_entity_1 = require("../entities/candidate-profile.entity");
const screening_criteria_entity_1 = require("../entities/screening-criteria.entity");
const job_description_entity_1 = require("../entities/job-description.entity");
const llm_client_1 = require("../llm/llm.client");
let ScoringService = ScoringService_1 = class ScoringService {
    constructor(fitScoreRepo, profileRepo, criteriaRepo, jobRepo, llmClient) {
        this.fitScoreRepo = fitScoreRepo;
        this.profileRepo = profileRepo;
        this.criteriaRepo = criteriaRepo;
        this.jobRepo = jobRepo;
        this.llmClient = llmClient;
        this.logger = new common_1.Logger(ScoringService_1.name);
    }
    async computeScore(jobId, candidateId, recruiterId) {
        const job = await this.jobRepo.findOne({ where: { id: jobId } });
        if (!job) {
            throw new common_1.NotFoundException(`Job description with id "${jobId}" not found`);
        }
        if (recruiterId && job.recruiterId !== recruiterId) {
            throw new common_1.ForbiddenException(`You do not have access to job "${jobId}"`);
        }
        const profile = await this.profileRepo.findOne({ where: { id: candidateId } });
        if (!profile) {
            throw new common_1.NotFoundException(`Candidate with id "${candidateId}" not found`);
        }
        if (profile.jobId !== jobId) {
            throw new common_1.NotFoundException(`Candidate "${candidateId}" does not belong to job "${jobId}"`);
        }
        const criteria = await this.criteriaRepo.findOne({
            where: { jobId },
            order: { version: 'DESC' },
        });
        if (!criteria) {
            throw new common_1.NotFoundException(`Screening criteria for job "${jobId}" not found`);
        }
        const candidateText = this.buildCandidateText(profile);
        const criterionDescriptors = this.buildCriterionDescriptors(criteria);
        const candidateEmbeddingResult = await this.llmClient.createEmbedding(candidateText);
        const candidateEmbedding = candidateEmbeddingResult.embedding;
        const breakdown = [];
        const totalWeight = criterionDescriptors.reduce((sum, c) => sum + c.weight, 0);
        for (const criterion of criterionDescriptors) {
            const criterionEmbeddingResult = await this.llmClient.createEmbedding(criterion.text);
            const similarity = this.cosineSimilarity(candidateEmbedding, criterionEmbeddingResult.embedding);
            const status = this.similarityToStatus(similarity);
            const normalizedWeight = totalWeight > 0 ? criterion.weight / totalWeight : 1 / criterionDescriptors.length;
            const contribution = similarity * normalizedWeight * 100;
            breakdown.push({
                criterion_label: criterion.label,
                status,
                contribution: Math.round(contribution * 100) / 100,
                explanation: this.buildExplanation(criterion.label, status, similarity),
            });
        }
        const rawScore = breakdown.reduce((sum, item) => sum + item.contribution, 0);
        const score = Math.min(100, Math.max(0, Math.round(rawScore * 100) / 100));
        const existing = await this.fitScoreRepo.findOne({
            where: { candidateId, jobId },
        });
        if (existing) {
            existing.criteriaVersion = criteria.version;
            existing.score = score;
            existing.breakdown = breakdown;
            existing.status = 'ok';
            return this.fitScoreRepo.save(existing);
        }
        const fitScore = this.fitScoreRepo.create({
            candidateId,
            jobId,
            criteriaVersion: criteria.version,
            score,
            breakdown,
            status: 'ok',
        });
        return this.fitScoreRepo.save(fitScore);
    }
    async getScore(jobId, candidateId, recruiterId) {
        const job = await this.jobRepo.findOne({ where: { id: jobId } });
        if (!job) {
            throw new common_1.NotFoundException(`Job description with id "${jobId}" not found`);
        }
        if (recruiterId && job.recruiterId !== recruiterId) {
            throw new common_1.ForbiddenException(`You do not have access to job "${jobId}"`);
        }
        const profile = await this.profileRepo.findOne({ where: { id: candidateId } });
        if (!profile) {
            throw new common_1.NotFoundException(`Candidate with id "${candidateId}" not found`);
        }
        if (profile.jobId !== jobId) {
            throw new common_1.NotFoundException(`Candidate "${candidateId}" does not belong to job "${jobId}"`);
        }
        const fitScore = await this.fitScoreRepo.findOne({
            where: { candidateId, jobId },
        });
        if (!fitScore) {
            throw new common_1.NotFoundException(`No fit score found for candidate "${candidateId}" and job "${jobId}". Trigger scoring first via POST.`);
        }
        return fitScore;
    }
    async rescoreAll(jobId, recruiterId) {
        if (recruiterId) {
            const job = await this.jobRepo.findOne({ where: { id: jobId } });
            if (!job) {
                throw new common_1.NotFoundException(`Job description with id "${jobId}" not found`);
            }
            if (job.recruiterId !== recruiterId) {
                throw new common_1.ForbiddenException(`You do not have access to job "${jobId}"`);
            }
        }
        const profiles = await this.profileRepo.find({ where: { jobId } });
        const results = await Promise.allSettled(profiles.map((profile) => this.computeScore(jobId, profile.id)));
        let rescored = 0;
        let failed = 0;
        const errors = [];
        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const profile = profiles[i];
            if (result.status === 'fulfilled') {
                rescored++;
            }
            else {
                failed++;
                const errorMessage = result.reason instanceof Error ? result.reason.message : String(result.reason);
                errors.push({ candidateId: profile.id, error: errorMessage });
                try {
                    const existing = await this.fitScoreRepo.findOne({
                        where: { candidateId: profile.id, jobId },
                    });
                    if (existing) {
                        existing.status = 'error';
                        await this.fitScoreRepo.save(existing);
                    }
                    else {
                        const errRecord = this.fitScoreRepo.create({
                            candidateId: profile.id,
                            jobId,
                            criteriaVersion: 0,
                            score: 0,
                            breakdown: [],
                            status: 'error',
                        });
                        await this.fitScoreRepo.save(errRecord);
                    }
                }
                catch (saveErr) {
                    this.logger.error(`Failed to persist error status for candidate ${profile.id}: ${saveErr.message}`);
                }
            }
        }
        this.logger.log(`rescoreAll for job ${jobId}: rescored=${rescored}, failed=${failed}`);
        return { rescored, failed, errors };
    }
    buildCandidateText(profile) {
        const parts = [];
        if (profile.summary) {
            parts.push(`Summary: ${profile.summary}`);
        }
        if (profile.skills.length > 0) {
            const skillNames = profile.skills.map((s) => s.canonical_name).join(', ');
            parts.push(`Skills: ${skillNames}`);
        }
        if (profile.workExperience.length > 0) {
            const expParts = profile.workExperience.map((w) => `${w.title} at ${w.company} (${w.start_date} - ${w.end_date ?? 'present'}): ${w.description}`);
            parts.push(`Work Experience: ${expParts.join('; ')}`);
        }
        if (profile.education.length > 0) {
            const eduParts = profile.education.map((e) => `${e.degree} in ${e.field} from ${e.institution}`);
            parts.push(`Education: ${eduParts.join('; ')}`);
        }
        return parts.join('\n') || profile.name;
    }
    buildCriterionDescriptors(criteria) {
        const descriptors = [];
        if (criteria.requiredSkills.length > 0) {
            descriptors.push({
                label: 'Required Skills',
                text: `Required skills: ${criteria.requiredSkills.join(', ')}`,
                weight: 1.0,
            });
        }
        if (criteria.preferredSkills.length > 0) {
            descriptors.push({
                label: 'Preferred Skills',
                text: `Preferred skills: ${criteria.preferredSkills.join(', ')}`,
                weight: 0.5,
            });
        }
        if (criteria.experienceLevel) {
            descriptors.push({
                label: 'Experience Level',
                text: `Experience level required: ${criteria.experienceLevel}`,
                weight: 0.75,
            });
        }
        if (criteria.responsibilities.length > 0) {
            descriptors.push({
                label: 'Responsibilities',
                text: `Role responsibilities: ${criteria.responsibilities.join('; ')}`,
                weight: 0.75,
            });
        }
        for (const custom of criteria.customCriteria) {
            descriptors.push({
                label: custom.label,
                text: `${custom.label}: ${custom.description}`,
                weight: custom.weight > 0 ? custom.weight : 0.5,
            });
        }
        if (descriptors.length === 0) {
            descriptors.push({
                label: 'General Fit',
                text: 'General candidate fit for the role',
                weight: 1.0,
            });
        }
        return descriptors;
    }
    cosineSimilarity(a, b) {
        if (a.length !== b.length || a.length === 0)
            return 0;
        let dot = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        const denom = Math.sqrt(normA) * Math.sqrt(normB);
        if (denom === 0)
            return 0;
        return dot / denom;
    }
    similarityToStatus(similarity) {
        if (similarity >= 0.8)
            return 'met';
        if (similarity >= 0.5)
            return 'partial';
        return 'not_met';
    }
    buildExplanation(label, status, similarity) {
        const pct = Math.round(similarity * 100);
        switch (status) {
            case 'met':
                return `Candidate strongly matches "${label}" (${pct}% semantic similarity).`;
            case 'partial':
                return `Candidate partially matches "${label}" (${pct}% semantic similarity).`;
            case 'not_met':
                return `Candidate does not sufficiently match "${label}" (${pct}% semantic similarity).`;
        }
    }
};
exports.ScoringService = ScoringService;
exports.ScoringService = ScoringService = ScoringService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(fit_score_entity_1.FitScore)),
    __param(1, (0, typeorm_1.InjectRepository)(candidate_profile_entity_1.CandidateProfile)),
    __param(2, (0, typeorm_1.InjectRepository)(screening_criteria_entity_1.ScreeningCriteria)),
    __param(3, (0, typeorm_1.InjectRepository)(job_description_entity_1.JobDescription)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        llm_client_1.LlmClient])
], ScoringService);
//# sourceMappingURL=scoring.service.js.map