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
var JobsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const config_1 = require("@nestjs/config");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const Minio = require("minio");
const uuid_1 = require("uuid");
const job_description_entity_1 = require("../entities/job-description.entity");
const screening_criteria_entity_1 = require("../entities/screening-criteria.entity");
const llm_client_1 = require("../llm/llm.client");
const SUPPORTED_MIME_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
];
let JobsService = JobsService_1 = class JobsService {
    constructor(jobRepo, criteriaRepo, llmClient, config) {
        this.jobRepo = jobRepo;
        this.criteriaRepo = criteriaRepo;
        this.llmClient = llmClient;
        this.config = config;
        this.logger = new common_1.Logger(JobsService_1.name);
        this.minioClient = new Minio.Client({
            endPoint: this.config.get('MINIO_ENDPOINT', 'localhost'),
            port: this.config.get('MINIO_PORT', 9000),
            useSSL: this.config.get('MINIO_USE_SSL', 'false') === 'true',
            accessKey: this.config.get('MINIO_ACCESS_KEY', 'minioadmin'),
            secretKey: this.config.get('MINIO_SECRET_KEY', 'minioadmin_secret'),
        });
        this.bucket = this.config.get('MINIO_BUCKET', 'hiring-files');
    }
    async uploadAndParse(file, recruiterId, title) {
        if (!SUPPORTED_MIME_TYPES.includes(file.mimetype)) {
            throw new common_1.UnprocessableEntityException({
                error: 'unsupported_format',
                detail: `File type "${file.mimetype}" is not supported. Accepted types: PDF, DOCX, plain text.`,
            });
        }
        const job = this.jobRepo.create({
            recruiterId,
            title,
            status: 'pending',
        });
        await this.jobRepo.save(job);
        let fileUrl = null;
        let rawText = null;
        try {
            fileUrl = await this.uploadToMinio(file);
        }
        catch (err) {
            this.logger.warn(`MinIO upload failed for job ${job.id}: ${err.message}`);
        }
        try {
            rawText = await this.extractText(file);
        }
        catch (err) {
            await this.jobRepo.update(job.id, {
                status: 'error',
                errorMessage: err.message,
                fileUrl,
            });
            throw new common_1.UnprocessableEntityException({
                error: 'parse_failure',
                detail: err.message,
            });
        }
        await this.jobRepo.update(job.id, {
            status: 'parsed',
            rawText,
            fileUrl,
            parsedAt: new Date(),
        });
        try {
            await this.generateCriteria(job.id, rawText);
        }
        catch (err) {
            this.logger.warn(`Criteria generation failed for job ${job.id}: ${err.message}`);
        }
        return this.jobRepo.findOneOrFail({ where: { id: job.id } });
    }
    async findById(id) {
        const job = await this.jobRepo.findOne({ where: { id } });
        if (!job) {
            throw new common_1.NotFoundException(`Job description with id "${id}" not found`);
        }
        return job;
    }
    async getCriteria(jobId) {
        await this.findById(jobId);
        const criteria = await this.criteriaRepo.findOne({
            where: { jobId },
            order: { version: 'DESC' },
        });
        if (!criteria) {
            throw new common_1.NotFoundException(`Screening criteria for job "${jobId}" not found`);
        }
        return criteria;
    }
    async saveCriteria(jobId, dto) {
        await this.findById(jobId);
        const existing = await this.criteriaRepo.findOne({
            where: { jobId },
            order: { version: 'DESC' },
        });
        if (existing) {
            existing.version = existing.version + 1;
            if (dto.required_skills !== undefined)
                existing.requiredSkills = dto.required_skills;
            if (dto.preferred_skills !== undefined)
                existing.preferredSkills = dto.preferred_skills;
            if (dto.experience_level !== undefined)
                existing.experienceLevel = dto.experience_level;
            if (dto.responsibilities !== undefined)
                existing.responsibilities = dto.responsibilities;
            if (dto.custom_criteria !== undefined)
                existing.customCriteria = dto.custom_criteria;
            return this.criteriaRepo.save(existing);
        }
        const criteria = this.criteriaRepo.create({
            jobId,
            version: 1,
            requiredSkills: dto.required_skills ?? [],
            preferredSkills: dto.preferred_skills ?? [],
            experienceLevel: dto.experience_level ?? 'mid',
            responsibilities: dto.responsibilities ?? [],
            customCriteria: dto.custom_criteria ?? [],
        });
        return this.criteriaRepo.save(criteria);
    }
    async generateCriteria(jobId, rawText) {
        const systemPrompt = `You are an expert recruiter assistant. Extract structured screening criteria from the job description text provided. Return ONLY valid JSON with this exact shape:
{
  "required_skills": ["string"],
  "preferred_skills": ["string"],
  "experience_level": "entry" | "mid" | "senior" | "lead",
  "responsibilities": ["string"],
  "custom_criteria": [{ "label": "string", "weight": number, "description": "string" }]
}
Rules:
- experience_level must be exactly one of: entry, mid, senior, lead
- weight values must be between 0 and 1
- All arrays may be empty but must be present
- Return only the JSON object, no markdown, no explanation`;
        const result = await this.llmClient.createChatCompletion([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: rawText },
        ], { responseFormat: 'json_object', temperature: 0.1 });
        let parsed;
        try {
            parsed = JSON.parse(result.content);
        }
        catch {
            throw new Error(`LLM returned invalid JSON for criteria generation`);
        }
        const VALID_LEVELS = ['entry', 'mid', 'senior', 'lead'];
        const experienceLevel = VALID_LEVELS.includes(parsed.experience_level)
            ? parsed.experience_level
            : 'mid';
        const criteria = this.criteriaRepo.create({
            jobId,
            version: 1,
            requiredSkills: Array.isArray(parsed.required_skills)
                ? parsed.required_skills
                : [],
            preferredSkills: Array.isArray(parsed.preferred_skills)
                ? parsed.preferred_skills
                : [],
            experienceLevel,
            responsibilities: Array.isArray(parsed.responsibilities)
                ? parsed.responsibilities
                : [],
            customCriteria: Array.isArray(parsed.custom_criteria)
                ? parsed.custom_criteria
                : [],
        });
        await this.criteriaRepo.save(criteria);
        this.logger.log(`Screening criteria generated for job ${jobId}`);
    }
    async extractText(file) {
        const { mimetype, buffer } = file;
        if (mimetype === 'application/pdf') {
            try {
                const result = await pdfParse(buffer);
                return result.text;
            }
            catch (err) {
                throw new Error(`Failed to parse PDF: ${err.message}`);
            }
        }
        if (mimetype ===
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            try {
                const result = await mammoth.extractRawText({ buffer });
                return result.value;
            }
            catch (err) {
                throw new Error(`Failed to parse DOCX: ${err.message}`);
            }
        }
        return buffer.toString('utf-8');
    }
    async uploadToMinio(file) {
        await this.ensureBucketExists();
        const objectName = `jobs/${(0, uuid_1.v4)()}-${file.originalname}`;
        await this.minioClient.putObject(this.bucket, objectName, file.buffer, file.size, { 'Content-Type': file.mimetype });
        const endpoint = this.config.get('MINIO_ENDPOINT', 'localhost');
        const port = this.config.get('MINIO_PORT', 9000);
        return `http://${endpoint}:${port}/${this.bucket}/${objectName}`;
    }
    async ensureBucketExists() {
        const exists = await this.minioClient.bucketExists(this.bucket);
        if (!exists) {
            await this.minioClient.makeBucket(this.bucket, 'us-east-1');
        }
    }
};
exports.JobsService = JobsService;
exports.JobsService = JobsService = JobsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(job_description_entity_1.JobDescription)),
    __param(1, (0, typeorm_1.InjectRepository)(screening_criteria_entity_1.ScreeningCriteria)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        llm_client_1.LlmClient,
        config_1.ConfigService])
], JobsService);
//# sourceMappingURL=jobs.service.js.map