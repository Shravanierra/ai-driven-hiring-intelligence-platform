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
var ShortlistService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShortlistService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const shortlist_entry_entity_1 = require("../entities/shortlist-entry.entity");
const fit_score_entity_1 = require("../entities/fit-score.entity");
const candidate_profile_entity_1 = require("../entities/candidate-profile.entity");
const job_description_entity_1 = require("../entities/job-description.entity");
const llm_client_1 = require("../llm/llm.client");
let ShortlistService = ShortlistService_1 = class ShortlistService {
    constructor(shortlistRepo, fitScoreRepo, profileRepo, jobRepo, llmClient) {
        this.shortlistRepo = shortlistRepo;
        this.fitScoreRepo = fitScoreRepo;
        this.profileRepo = profileRepo;
        this.jobRepo = jobRepo;
        this.llmClient = llmClient;
        this.logger = new common_1.Logger(ShortlistService_1.name);
    }
    async generateShortlist(jobId, size, filters, recruiterId) {
        if (recruiterId) {
            const job = await this.jobRepo.findOne({ where: { id: jobId } });
            if (!job) {
                throw new common_1.NotFoundException(`Job description with id "${jobId}" not found`);
            }
            if (job.recruiterId !== recruiterId) {
                throw new common_1.ForbiddenException(`You do not have access to job "${jobId}"`);
            }
        }
        if (size < 1 || size > 50) {
            throw new common_1.BadRequestException('size must be between 1 and 50');
        }
        const fitScores = await this.fitScoreRepo.find({ where: { jobId } });
        if (fitScores.length === 0) {
            throw new common_1.NotFoundException(`No fit scores found for job "${jobId}"`);
        }
        const candidateIds = fitScores.map((fs) => fs.candidateId);
        const profiles = await this.profileRepo.findByIds(candidateIds);
        const profileMap = new Map(profiles.map((p) => [p.id, p]));
        let filtered = fitScores.filter((fs) => {
            const profile = profileMap.get(fs.candidateId);
            if (!profile)
                return false;
            if (filters?.minExperience !== undefined) {
                if (profile.workExperience.length < filters.minExperience)
                    return false;
            }
            if (filters?.requiredSkill) {
                const skill = filters.requiredSkill.toLowerCase();
                const hasSkill = profile.skills.some((s) => s.canonical_name.toLowerCase() === skill);
                if (!hasSkill)
                    return false;
            }
            return true;
        });
        filtered.sort((a, b) => Number(b.score) - Number(a.score));
        const topN = filtered.slice(0, size);
        const entries = [];
        for (let i = 0; i < topN.length; i++) {
            const fs = topN[i];
            const rank = i + 1;
            const reasoning = await this.generateReasoning(fs, rank);
            let entry = await this.shortlistRepo.findOne({
                where: { jobId, candidateId: fs.candidateId },
            });
            if (entry) {
                entry.rank = rank;
                entry.fitScore = Number(fs.score);
                entry.reasoning = reasoning;
                entry.decision = 'pending';
            }
            else {
                entry = this.shortlistRepo.create({
                    jobId,
                    candidateId: fs.candidateId,
                    rank,
                    fitScore: Number(fs.score),
                    reasoning,
                    decision: 'pending',
                });
            }
            entries.push(await this.shortlistRepo.save(entry));
        }
        return entries.sort((a, b) => a.rank - b.rank);
    }
    async getShortlist(jobId, recruiterId) {
        if (recruiterId) {
            const job = await this.jobRepo.findOne({ where: { id: jobId } });
            if (!job) {
                throw new common_1.NotFoundException(`Job description with id "${jobId}" not found`);
            }
            if (job.recruiterId !== recruiterId) {
                throw new common_1.ForbiddenException(`You do not have access to job "${jobId}"`);
            }
        }
        return this.shortlistRepo.find({
            where: { jobId },
            order: { rank: 'ASC' },
        });
    }
    async updateDecision(jobId, candidateId, decision, recruiterId) {
        if (recruiterId) {
            const job = await this.jobRepo.findOne({ where: { id: jobId } });
            if (!job) {
                throw new common_1.NotFoundException(`Job description with id "${jobId}" not found`);
            }
            if (job.recruiterId !== recruiterId) {
                throw new common_1.ForbiddenException(`You do not have access to job "${jobId}"`);
            }
        }
        const entry = await this.shortlistRepo.findOne({ where: { jobId, candidateId } });
        if (!entry) {
            throw new common_1.NotFoundException(`Shortlist entry not found for job "${jobId}" and candidate "${candidateId}"`);
        }
        entry.decision = decision;
        entry.decidedAt = new Date();
        return this.shortlistRepo.save(entry);
    }
    async generateReasoning(fs, rank) {
        const breakdownSummary = fs.breakdown
            .map((b) => `${b.criterion_label}: ${b.status} (${b.contribution.toFixed(1)} pts)`)
            .join(', ');
        const prompt = `Given this candidate's fit score of ${Number(fs.score).toFixed(1)} and breakdown (${breakdownSummary}), explain in 1-2 sentences why they rank at position ${rank} for this job.`;
        try {
            const result = await this.llmClient.createChatCompletion([
                { role: 'system', content: 'You are a hiring assistant. Be concise and factual.' },
                { role: 'user', content: prompt },
            ], { maxTokens: 100, temperature: 0.3 });
            return result.content.trim();
        }
        catch (err) {
            this.logger.warn(`LLM reasoning failed for candidate ${fs.candidateId}: ${err.message}`);
            return `Ranked based on fit score of ${Number(fs.score).toFixed(1)}`;
        }
    }
};
exports.ShortlistService = ShortlistService;
exports.ShortlistService = ShortlistService = ShortlistService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(shortlist_entry_entity_1.ShortlistEntry)),
    __param(1, (0, typeorm_1.InjectRepository)(fit_score_entity_1.FitScore)),
    __param(2, (0, typeorm_1.InjectRepository)(candidate_profile_entity_1.CandidateProfile)),
    __param(3, (0, typeorm_1.InjectRepository)(job_description_entity_1.JobDescription)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        llm_client_1.LlmClient])
], ShortlistService);
//# sourceMappingURL=shortlist.service.js.map