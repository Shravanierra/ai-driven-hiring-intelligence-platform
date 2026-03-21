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
var AssistantService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssistantService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const config_1 = require("@nestjs/config");
const redis_1 = require("redis");
const assistant_session_entity_1 = require("../entities/assistant-session.entity");
const job_description_entity_1 = require("../entities/job-description.entity");
const candidate_profile_entity_1 = require("../entities/candidate-profile.entity");
const fit_score_entity_1 = require("../entities/fit-score.entity");
const llm_client_1 = require("../llm/llm.client");
const SESSION_TTL_SECONDS = 60 * 60 * 2;
const QUERY_TIMEOUT_MS = 5000;
let AssistantService = AssistantService_1 = class AssistantService {
    constructor(sessionRepo, jobRepo, profileRepo, fitScoreRepo, llmClient, config) {
        this.sessionRepo = sessionRepo;
        this.jobRepo = jobRepo;
        this.profileRepo = profileRepo;
        this.fitScoreRepo = fitScoreRepo;
        this.llmClient = llmClient;
        this.config = config;
        this.logger = new common_1.Logger(AssistantService_1.name);
    }
    async onModuleInit() {
        const host = this.config.get('REDIS_HOST', 'localhost');
        const port = this.config.get('REDIS_PORT', 6379);
        this.redisClient = (0, redis_1.createClient)({
            socket: { host, port },
        });
        this.redisClient.on('error', (err) => {
            this.logger.warn(`Redis client error: ${err.message}`);
        });
        try {
            await this.redisClient.connect();
            this.logger.log('Redis connected for AssistantService');
        }
        catch (err) {
            this.logger.warn(`Redis connection failed, sessions will use DB only: ${err.message}`);
        }
    }
    async onModuleDestroy() {
        try {
            await this.redisClient?.disconnect();
        }
        catch {
        }
    }
    async createSession(recruiterId) {
        const session = this.sessionRepo.create({
            recruiterId,
            turns: [],
        });
        const saved = await this.sessionRepo.save(session);
        await this.cacheSession(saved);
        return saved;
    }
    async getSession(sessionId, recruiterId) {
        const session = await this.loadSession(sessionId);
        if (recruiterId && session.recruiterId !== recruiterId) {
            throw new common_1.ForbiddenException('Access to this session is not authorized');
        }
        return session;
    }
    async query(sessionId, recruiterId, queryText) {
        const session = await this.loadSession(sessionId);
        if (session.recruiterId !== recruiterId) {
            throw new common_1.ForbiddenException('Access to this session is not authorized');
        }
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Query timed out after 5 seconds')), QUERY_TIMEOUT_MS));
        return Promise.race([
            this.executeQuery(session, queryText),
            timeoutPromise,
        ]);
    }
    async executeQuery(session, queryText) {
        const authorizedJobs = await this.jobRepo.find({
            where: { recruiterId: session.recruiterId },
            select: ['id'],
        });
        if (authorizedJobs.length === 0) {
            return this.buildClarification('No job openings found for your account.', ['Try uploading a job description first', 'Check that you are using the correct account']);
        }
        const authorizedJobIds = authorizedJobs.map((j) => j.id);
        const conversationHistory = this.buildConversationHistory(session.turns);
        let interpreted;
        try {
            interpreted = await this.interpretQuery(queryText, conversationHistory);
        }
        catch (err) {
            this.logger.warn(`Query interpretation failed: ${err.message}`);
            return this.buildClarification('I could not understand your query. Please try rephrasing it.', [
                'Try "Show top backend engineers with Python experience"',
                'Try "Find senior candidates with Kubernetes skills"',
                'Try "List candidates with more than 5 years of experience"',
            ]);
        }
        const candidateResults = await this.searchCandidates(queryText, interpreted, authorizedJobIds);
        if (candidateResults.length === 0) {
            return this.buildClarification(`No candidates found matching "${queryText}". Try broadening your search criteria.`, [
                'Try removing specific skill requirements',
                'Try a more general query like "Show all candidates"',
                'Check that resumes have been uploaded for your job openings',
            ]);
        }
        const turn = {
            query: queryText,
            interpretation: interpreted.interpretation,
            candidate_ids: candidateResults.map((r) => r.candidateId),
            timestamp: new Date().toISOString(),
        };
        session.turns = [...session.turns, turn];
        const updatedSession = await this.sessionRepo.save(session);
        await this.cacheSession(updatedSession);
        return {
            query: queryText,
            interpretation: interpreted.interpretation,
            results: candidateResults,
        };
    }
    async interpretQuery(queryText, conversationHistory) {
        const systemPrompt = `You are a recruiting assistant that interprets natural language queries about candidates.
Given a query, extract the search intent and return a JSON object with:
- interpretation: a human-readable string describing what criteria you are using to find candidates
- skills: array of skill names mentioned or implied (e.g., ["Python", "Kubernetes"])
- experienceLevel: one of "entry", "mid", "senior", "lead", or null if not specified
- keywords: array of other relevant keywords for searching

Return ONLY valid JSON, no markdown.`;
        const messages = [
            { role: 'system', content: systemPrompt },
            ...conversationHistory,
            { role: 'user', content: `Interpret this recruiting query: "${queryText}"` },
        ];
        const result = await this.llmClient.createChatCompletion(messages, {
            temperature: 0.1,
            maxTokens: 300,
            responseFormat: 'json_object',
        });
        const parsed = JSON.parse(result.content);
        if (!parsed.interpretation || typeof parsed.interpretation !== 'string') {
            throw new Error('Invalid interpretation response from LLM');
        }
        return {
            interpretation: parsed.interpretation,
            skills: Array.isArray(parsed.skills) ? parsed.skills : [],
            experienceLevel: parsed.experienceLevel ?? null,
            keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
        };
    }
    async searchCandidates(queryText, interpreted, authorizedJobIds) {
        const searchText = [
            queryText,
            ...interpreted.skills,
            interpreted.experienceLevel ?? '',
            ...interpreted.keywords,
        ]
            .filter(Boolean)
            .join(' ');
        let queryEmbedding;
        try {
            const embeddingResult = await this.llmClient.createEmbedding(searchText);
            queryEmbedding = embeddingResult.embedding;
        }
        catch (err) {
            this.logger.warn(`Embedding generation failed, falling back to keyword search: ${err.message}`);
            return this.fallbackKeywordSearch(interpreted, authorizedJobIds);
        }
        const profiles = await this.profileRepo.find({
            where: { jobId: (0, typeorm_2.In)(authorizedJobIds) },
        });
        if (profiles.length === 0) {
            return [];
        }
        const candidateIds = profiles.map((p) => p.id);
        const fitScores = await this.fitScoreRepo.find({
            where: { candidateId: (0, typeorm_2.In)(candidateIds) },
        });
        const fitScoreMap = new Map(fitScores.map((fs) => [`${fs.candidateId}:${fs.jobId}`, fs]));
        const scoredCandidates = [];
        for (const profile of profiles) {
            const candidateText = this.buildCandidateSearchText(profile, interpreted);
            if (interpreted.experienceLevel) {
                const expMatch = this.matchesExperienceLevel(profile, interpreted.experienceLevel);
                if (!expMatch)
                    continue;
            }
            if (interpreted.skills.length > 0) {
                const hasSkill = this.hasAnySkill(profile, interpreted.skills);
                if (!hasSkill)
                    continue;
            }
            let bestFitScore = 0;
            for (const jobId of authorizedJobIds) {
                const fs = fitScoreMap.get(`${profile.id}:${jobId}`);
                if (fs && Number(fs.score) > bestFitScore) {
                    bestFitScore = Number(fs.score);
                }
            }
            const similarity = this.computeTextRelevance(candidateText, interpreted);
            scoredCandidates.push({
                profile,
                similarity,
                fitScore: bestFitScore,
            });
        }
        scoredCandidates.sort((a, b) => {
            if (b.fitScore !== a.fitScore)
                return b.fitScore - a.fitScore;
            return b.similarity - a.similarity;
        });
        return scoredCandidates.slice(0, 20).map((sc) => ({
            candidateId: sc.profile.id,
            name: sc.profile.name,
            fitScore: sc.fitScore,
            jobId: sc.profile.jobId,
        }));
    }
    async fallbackKeywordSearch(interpreted, authorizedJobIds) {
        const profiles = await this.profileRepo.find({
            where: { jobId: (0, typeorm_2.In)(authorizedJobIds) },
        });
        const candidateIds = profiles.map((p) => p.id);
        const fitScores = await this.fitScoreRepo.find({
            where: { candidateId: (0, typeorm_2.In)(candidateIds) },
        });
        const fitScoreMap = new Map(fitScores.map((fs) => [`${fs.candidateId}:${fs.jobId}`, fs]));
        const results = [];
        for (const profile of profiles) {
            if (interpreted.skills.length > 0 && !this.hasAnySkill(profile, interpreted.skills)) {
                continue;
            }
            let bestFitScore = 0;
            for (const jobId of authorizedJobIds) {
                const fs = fitScoreMap.get(`${profile.id}:${jobId}`);
                if (fs && Number(fs.score) > bestFitScore) {
                    bestFitScore = Number(fs.score);
                }
            }
            results.push({
                candidateId: profile.id,
                name: profile.name,
                fitScore: bestFitScore,
                jobId: profile.jobId,
            });
        }
        results.sort((a, b) => b.fitScore - a.fitScore);
        return results.slice(0, 20);
    }
    buildCandidateSearchText(profile, interpreted) {
        const parts = [profile.name, profile.summary];
        const skillNames = profile.skills.map((s) => s.canonical_name);
        parts.push(...skillNames);
        const titles = profile.workExperience.map((w) => `${w.title} ${w.company}`);
        parts.push(...titles);
        return parts.filter(Boolean).join(' ').toLowerCase();
    }
    computeTextRelevance(candidateText, interpreted) {
        let score = 0;
        const text = candidateText.toLowerCase();
        for (const skill of interpreted.skills) {
            if (text.includes(skill.toLowerCase()))
                score += 2;
        }
        for (const keyword of interpreted.keywords) {
            if (text.includes(keyword.toLowerCase()))
                score += 1;
        }
        return score;
    }
    hasAnySkill(profile, skills) {
        const profileSkills = profile.skills.map((s) => s.canonical_name.toLowerCase());
        const profileText = [
            profile.summary,
            ...profile.workExperience.map((w) => w.description),
        ].join(' ').toLowerCase();
        return skills.some((skill) => {
            const s = skill.toLowerCase();
            return profileSkills.some((ps) => ps.includes(s) || s.includes(ps)) ||
                profileText.includes(s);
        });
    }
    matchesExperienceLevel(profile, level) {
        const yearsOfExp = profile.workExperience.length;
        const summaryLower = profile.summary.toLowerCase();
        const levelLower = level.toLowerCase();
        if (summaryLower.includes(levelLower))
            return true;
        switch (levelLower) {
            case 'entry':
                return yearsOfExp <= 2;
            case 'mid':
                return yearsOfExp >= 2 && yearsOfExp <= 5;
            case 'senior':
                return yearsOfExp >= 4;
            case 'lead':
                return yearsOfExp >= 6;
            default:
                return true;
        }
    }
    buildConversationHistory(turns) {
        const messages = [];
        for (const turn of turns.slice(-5)) {
            messages.push({ role: 'user', content: turn.query });
            messages.push({
                role: 'assistant',
                content: `Found ${turn.candidate_ids.length} candidates. Interpretation: ${turn.interpretation}`,
            });
        }
        return messages;
    }
    buildClarification(clarification, suggestions) {
        return {
            results: [],
            clarification,
            suggestions,
        };
    }
    async cacheSession(session) {
        try {
            if (this.redisClient?.isReady) {
                const key = `assistant:session:${session.id}`;
                await this.redisClient.setEx(key, SESSION_TTL_SECONDS, JSON.stringify(session));
            }
        }
        catch (err) {
            this.logger.warn(`Failed to cache session ${session.id}: ${err.message}`);
        }
    }
    async loadSession(sessionId) {
        try {
            if (this.redisClient?.isReady) {
                const key = `assistant:session:${sessionId}`;
                const cached = await this.redisClient.get(key);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    await this.redisClient.expire(key, SESSION_TTL_SECONDS);
                    return parsed;
                }
            }
        }
        catch (err) {
            this.logger.warn(`Redis cache miss for session ${sessionId}: ${err.message}`);
        }
        const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
        if (!session) {
            throw new common_1.NotFoundException(`Session "${sessionId}" not found`);
        }
        await this.cacheSession(session);
        return session;
    }
};
exports.AssistantService = AssistantService;
exports.AssistantService = AssistantService = AssistantService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(assistant_session_entity_1.AssistantSession)),
    __param(1, (0, typeorm_1.InjectRepository)(job_description_entity_1.JobDescription)),
    __param(2, (0, typeorm_1.InjectRepository)(candidate_profile_entity_1.CandidateProfile)),
    __param(3, (0, typeorm_1.InjectRepository)(fit_score_entity_1.FitScore)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        llm_client_1.LlmClient,
        config_1.ConfigService])
], AssistantService);
//# sourceMappingURL=assistant.service.js.map