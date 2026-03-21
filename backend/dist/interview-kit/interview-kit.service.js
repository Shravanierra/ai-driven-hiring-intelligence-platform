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
var InterviewKitService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterviewKitService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const uuid_1 = require("uuid");
const interview_kit_entity_1 = require("../entities/interview-kit.entity");
const candidate_profile_entity_1 = require("../entities/candidate-profile.entity");
const screening_criteria_entity_1 = require("../entities/screening-criteria.entity");
const job_description_entity_1 = require("../entities/job-description.entity");
const llm_client_1 = require("../llm/llm.client");
const llm_types_1 = require("../llm/llm.types");
const interview_kit_pdf_service_1 = require("./interview-kit-pdf.service");
let InterviewKitService = InterviewKitService_1 = class InterviewKitService {
    constructor(kitRepo, profileRepo, criteriaRepo, jobRepo, llmClient, pdfService) {
        this.kitRepo = kitRepo;
        this.profileRepo = profileRepo;
        this.criteriaRepo = criteriaRepo;
        this.jobRepo = jobRepo;
        this.llmClient = llmClient;
        this.pdfService = pdfService;
        this.logger = new common_1.Logger(InterviewKitService_1.name);
    }
    async generateKit(jobId, candidateId, recruiterId) {
        if (recruiterId) {
            const job = await this.jobRepo.findOne({ where: { id: jobId } });
            if (!job) {
                throw new common_1.NotFoundException(`Job description with id "${jobId}" not found`);
            }
            if (job.recruiterId !== recruiterId) {
                throw new common_1.ForbiddenException(`You do not have access to job "${jobId}"`);
            }
        }
        const profile = await this.profileRepo.findOne({
            where: { id: candidateId, jobId },
        });
        if (!profile) {
            throw new common_1.NotFoundException(`Candidate profile not found for candidate "${candidateId}" and job "${jobId}"`);
        }
        const criteria = await this.criteriaRepo.findOne({ where: { jobId } });
        if (!criteria) {
            throw new common_1.NotFoundException(`Screening criteria not found for job "${jobId}"`);
        }
        const questions = await this.callLlmForQuestions(profile, criteria);
        let kit = await this.kitRepo.findOne({ where: { candidateId, jobId } });
        if (kit) {
            kit.questions = questions;
        }
        else {
            kit = this.kitRepo.create({ candidateId, jobId, questions });
        }
        return this.kitRepo.save(kit);
    }
    async getKit(jobId, candidateId, recruiterId) {
        if (recruiterId) {
            const job = await this.jobRepo.findOne({ where: { id: jobId } });
            if (!job) {
                throw new common_1.NotFoundException(`Job description with id "${jobId}" not found`);
            }
            if (job.recruiterId !== recruiterId) {
                throw new common_1.ForbiddenException(`You do not have access to job "${jobId}"`);
            }
        }
        const kit = await this.kitRepo.findOne({ where: { candidateId, jobId } });
        if (!kit) {
            throw new common_1.NotFoundException(`Interview kit not found for candidate "${candidateId}" and job "${jobId}"`);
        }
        return kit;
    }
    async updateKit(jobId, candidateId, questions, recruiterId) {
        if (recruiterId) {
            const job = await this.jobRepo.findOne({ where: { id: jobId } });
            if (!job) {
                throw new common_1.NotFoundException(`Job description with id "${jobId}" not found`);
            }
            if (job.recruiterId !== recruiterId) {
                throw new common_1.ForbiddenException(`You do not have access to job "${jobId}"`);
            }
        }
        const kit = await this.kitRepo.findOne({ where: { candidateId, jobId } });
        if (!kit) {
            throw new common_1.NotFoundException(`Interview kit not found for candidate "${candidateId}" and job "${jobId}"`);
        }
        kit.questions = questions;
        return this.kitRepo.save(kit);
    }
    async exportKitPdf(jobId, candidateId, recruiterId) {
        if (recruiterId) {
            const job = await this.jobRepo.findOne({ where: { id: jobId } });
            if (!job) {
                throw new common_1.NotFoundException(`Job description with id "${jobId}" not found`);
            }
            if (job.recruiterId !== recruiterId) {
                throw new common_1.ForbiddenException(`You do not have access to job "${jobId}"`);
            }
        }
        const kit = await this.kitRepo.findOne({ where: { candidateId, jobId } });
        if (!kit) {
            throw new common_1.NotFoundException(`Interview kit not found for candidate "${candidateId}" and job "${jobId}"`);
        }
        const profile = await this.profileRepo.findOne({ where: { id: candidateId, jobId } });
        if (!profile) {
            throw new common_1.NotFoundException(`Candidate profile not found for candidate "${candidateId}" and job "${jobId}"`);
        }
        return this.pdfService.generatePdf(kit, profile);
    }
    async callLlmForQuestions(profile, criteria) {
        const systemPrompt = `You are an expert technical interviewer. Generate interview questions based on the candidate profile and job screening criteria provided. Return a JSON object with a "questions" array. Each question must have: "type" (one of: behavioral, technical, gap), "text" (the question), and "rubric" with "strong", "adequate", and "weak" fields describing what a strong/adequate/weak answer looks like. Generate between 5 and 15 questions. You MUST include at least one behavioral question, at least one technical question, and at least one gap question. All rubric fields must be non-empty.`;
        const userPrompt = `Candidate Profile:
Name: ${profile.name}
Summary: ${profile.summary}
Skills: ${profile.skills.map((s) => s.canonical_name).join(', ')}
Work Experience: ${profile.workExperience.map((w) => `${w.title} at ${w.company} (${w.start_date} - ${w.end_date ?? 'present'}): ${w.description}`).join('\n')}
Education: ${profile.education.map((e) => `${e.degree} in ${e.field} from ${e.institution}`).join(', ')}

Screening Criteria:
Required Skills: ${criteria.requiredSkills.join(', ')}
Preferred Skills: ${criteria.preferredSkills.join(', ')}
Experience Level: ${criteria.experienceLevel}
Responsibilities: ${criteria.responsibilities.join('; ')}
Custom Criteria: ${criteria.customCriteria.map((c) => `${c.label}: ${c.description}`).join('; ')}

Generate interview questions as a JSON object with a "questions" array.`;
        try {
            const result = await this.llmClient.createChatCompletion([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ], { responseFormat: 'json_object', temperature: 0.4, maxTokens: 3000 });
            return this.parseAndValidateQuestions(result.content);
        }
        catch (err) {
            if (err instanceof llm_types_1.AiServiceUnavailableError) {
                throw new common_1.ServiceUnavailableException('AI service is unavailable. Please try again later.');
            }
            this.logger.error(`LLM call failed: ${err.message}`);
            throw new common_1.ServiceUnavailableException('Failed to generate interview questions.');
        }
    }
    parseAndValidateQuestions(content) {
        let parsed;
        try {
            parsed = JSON.parse(content);
        }
        catch {
            throw new common_1.ServiceUnavailableException('Failed to parse LLM response as JSON.');
        }
        if (!Array.isArray(parsed.questions)) {
            throw new common_1.ServiceUnavailableException('LLM response missing "questions" array.');
        }
        const validTypes = ['behavioral', 'technical', 'gap'];
        const questions = parsed.questions
            .filter((q) => {
            return (validTypes.includes(q.type) &&
                typeof q.text === 'string' &&
                q.text.trim().length > 0 &&
                q.rubric &&
                typeof q.rubric.strong === 'string' && q.rubric.strong.trim().length > 0 &&
                typeof q.rubric.adequate === 'string' && q.rubric.adequate.trim().length > 0 &&
                typeof q.rubric.weak === 'string' && q.rubric.weak.trim().length > 0);
        })
            .map((q) => ({
            id: (0, uuid_1.v4)(),
            type: q.type,
            text: q.text.trim(),
            rubric: {
                strong: q.rubric.strong.trim(),
                adequate: q.rubric.adequate.trim(),
                weak: q.rubric.weak.trim(),
            },
        }));
        if (questions.length < 5 || questions.length > 15) {
            throw new common_1.ServiceUnavailableException(`LLM returned ${questions.length} valid questions; expected 5–15.`);
        }
        const types = new Set(questions.map((q) => q.type));
        for (const required of ['behavioral', 'technical', 'gap']) {
            if (!types.has(required)) {
                throw new common_1.ServiceUnavailableException(`LLM response missing at least one "${required}" question.`);
            }
        }
        return questions;
    }
};
exports.InterviewKitService = InterviewKitService;
exports.InterviewKitService = InterviewKitService = InterviewKitService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(interview_kit_entity_1.InterviewKit)),
    __param(1, (0, typeorm_1.InjectRepository)(candidate_profile_entity_1.CandidateProfile)),
    __param(2, (0, typeorm_1.InjectRepository)(screening_criteria_entity_1.ScreeningCriteria)),
    __param(3, (0, typeorm_1.InjectRepository)(job_description_entity_1.JobDescription)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        llm_client_1.LlmClient,
        interview_kit_pdf_service_1.InterviewKitPdfService])
], InterviewKitService);
//# sourceMappingURL=interview-kit.service.js.map