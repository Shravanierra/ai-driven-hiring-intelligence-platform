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
var ResumesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResumesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const config_1 = require("@nestjs/config");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const Minio = require("minio");
const uuid_1 = require("uuid");
const candidate_profile_entity_1 = require("../entities/candidate-profile.entity");
const job_description_entity_1 = require("../entities/job-description.entity");
const llm_client_1 = require("../llm/llm.client");
const candidate_profile_serializer_1 = require("../candidate-profile/candidate-profile.serializer");
const skill_extractor_service_1 = require("./skill-extractor.service");
const summary_generator_service_1 = require("./summary-generator.service");
const SUPPORTED_MIME_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
];
const MAX_BATCH_SIZE = 500;
let ResumesService = ResumesService_1 = class ResumesService {
    constructor(profileRepo, jobRepo, llmClient, config, skillExtractor, summaryGenerator) {
        this.profileRepo = profileRepo;
        this.jobRepo = jobRepo;
        this.llmClient = llmClient;
        this.config = config;
        this.skillExtractor = skillExtractor;
        this.summaryGenerator = summaryGenerator;
        this.logger = new common_1.Logger(ResumesService_1.name);
        this.minioClient = new Minio.Client({
            endPoint: this.config.get('MINIO_ENDPOINT', 'localhost'),
            port: Number(this.config.get('MINIO_PORT', '9000')),
            useSSL: this.config.get('MINIO_USE_SSL', 'false') === 'true',
            accessKey: this.config.get('MINIO_ACCESS_KEY', 'minioadmin'),
            secretKey: this.config.get('MINIO_SECRET_KEY', 'minioadmin_secret'),
        });
        this.bucket = this.config.get('MINIO_BUCKET', 'hiring-files');
    }
    async uploadBatch(jobId, files, recruiterId) {
        const job = await this.jobRepo.findOne({ where: { id: jobId } });
        if (!job) {
            throw new common_1.NotFoundException(`Job description with id "${jobId}" not found`);
        }
        if (job.recruiterId !== recruiterId) {
            throw new common_1.ForbiddenException(`You do not have access to job "${jobId}"`);
        }
        const batch = files.slice(0, MAX_BATCH_SIZE);
        const profiles = [];
        const failures = [];
        for (const file of batch) {
            try {
                const profile = await this.processResume(jobId, file);
                profiles.push((0, candidate_profile_serializer_1.serializeCandidateProfile)(profile));
            }
            catch (err) {
                this.logger.warn(`Failed to process resume "${file.originalname}": ${err.message}`);
                failures.push({
                    filename: file.originalname,
                    error: err.message,
                });
            }
        }
        return { profiles, failures };
    }
    async listCandidates(jobId, recruiterId) {
        const job = await this.jobRepo.findOne({ where: { id: jobId } });
        if (!job) {
            throw new common_1.NotFoundException(`Job description with id "${jobId}" not found`);
        }
        if (job.recruiterId !== recruiterId) {
            throw new common_1.ForbiddenException(`You do not have access to job "${jobId}"`);
        }
        const profiles = await this.profileRepo.find({
            where: { jobId },
            order: { createdAt: 'DESC' },
        });
        return profiles.map(candidate_profile_serializer_1.serializeCandidateProfile);
    }
    async getCandidate(candidateId, recruiterId) {
        const profile = await this.profileRepo.findOne({ where: { id: candidateId } });
        if (!profile) {
            throw new common_1.NotFoundException(`Candidate with id "${candidateId}" not found`);
        }
        const job = await this.jobRepo.findOne({ where: { id: profile.jobId } });
        if (!job || job.recruiterId !== recruiterId) {
            throw new common_1.ForbiddenException(`You do not have access to candidate "${candidateId}"`);
        }
        return (0, candidate_profile_serializer_1.serializeCandidateProfile)(profile);
    }
    async processResume(jobId, file) {
        if (!SUPPORTED_MIME_TYPES.includes(file.mimetype)) {
            const profile = this.profileRepo.create({
                jobId,
                name: file.originalname,
                contact: { email: '', phone: null, location: null },
                workExperience: [],
                education: [],
                skills: [],
                summary: '',
                parseStatus: 'error',
                errorMessage: `Unsupported file type: ${file.mimetype}`,
            });
            return this.profileRepo.save(profile);
        }
        let fileUrl = null;
        try {
            fileUrl = await this.uploadToMinio(file);
        }
        catch (err) {
            this.logger.warn(`MinIO upload failed for "${file.originalname}": ${err.message}`);
        }
        let rawText;
        try {
            rawText = await this.extractText(file);
        }
        catch (err) {
            const profile = this.profileRepo.create({
                jobId,
                name: file.originalname,
                contact: { email: '', phone: null, location: null },
                workExperience: [],
                education: [],
                skills: [],
                summary: '',
                parseStatus: 'error',
                errorMessage: err.message,
                fileUrl,
            });
            return this.profileRepo.save(profile);
        }
        let parsed;
        try {
            parsed = await this.extractProfileFromText(rawText);
        }
        catch (err) {
            const profile = this.profileRepo.create({
                jobId,
                name: file.originalname,
                contact: { email: '', phone: null, location: null },
                workExperience: [],
                education: [],
                skills: [],
                summary: '',
                parseStatus: 'error',
                errorMessage: `LLM extraction failed: ${err.message}`,
                fileUrl,
            });
            return this.profileRepo.save(profile);
        }
        let skills = parsed.skills ?? [];
        try {
            const extractedSkills = await this.skillExtractor.extractSkills(rawText);
            if (extractedSkills.length > 0) {
                skills = extractedSkills;
            }
        }
        catch (err) {
            this.logger.warn(`SkillExtractor failed for "${file.originalname}", using profile-extracted skills: ${err.message}`);
        }
        const name = parsed.name ?? file.originalname;
        const workExperience = parsed.workExperience ?? [];
        const education = parsed.education ?? [];
        let summary = parsed.summary ?? '';
        try {
            summary = await this.summaryGenerator.generateSummary({
                name,
                skills,
                workExperience,
                education,
            });
        }
        catch (err) {
            this.logger.warn(`SummaryGenerator failed for "${file.originalname}", using extracted summary: ${err.message}`);
        }
        if (!summary || summary.trim().length === 0) {
            summary = `${name} is a candidate with a professional background.`;
        }
        const profile = this.profileRepo.create({
            jobId,
            name,
            contact: parsed.contact ?? { email: '', phone: null, location: null },
            workExperience,
            education,
            skills,
            summary,
            parseStatus: 'success',
            errorMessage: null,
            fileUrl,
        });
        return this.profileRepo.save(profile);
    }
    async extractProfileFromText(rawText) {
        const systemPrompt = `You are an expert resume parser. Extract structured candidate profile data from the resume text provided. Return ONLY valid JSON with this exact shape:
{
  "name": "string",
  "contact": {
    "email": "string",
    "phone": "string | null",
    "location": "string | null"
  },
  "work_experience": [
    {
      "company": "string",
      "title": "string",
      "start_date": "YYYY-MM",
      "end_date": "YYYY-MM | null",
      "description": "string"
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string",
      "field": "string",
      "graduation_year": "integer | null"
    }
  ],
  "skills": [
    { "canonical_name": "string", "raw_aliases": ["string"] }
  ],
  "summary": "string"
}
Rules:
- name must be the candidate's full name
- contact.email must be a valid email or empty string if not found
- All arrays may be empty but must be present
- summary must be a concise 2-3 sentence professional summary
- For skills, normalize aliases to a canonical name (e.g. "K8s" -> canonical_name: "Kubernetes", raw_aliases: ["K8s"])
- Return only the JSON object, no markdown, no explanation`;
        const result = await this.llmClient.createChatCompletion([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: rawText },
        ], { responseFormat: 'json_object', temperature: 0.1 });
        let data;
        try {
            data = JSON.parse(result.content);
        }
        catch {
            throw new Error('LLM returned invalid JSON for profile extraction');
        }
        return {
            name: data.name ?? '',
            contact: data.contact ?? {
                email: '',
                phone: null,
                location: null,
            },
            workExperience: Array.isArray(data.work_experience)
                ? data.work_experience
                : [],
            education: Array.isArray(data.education)
                ? data.education
                : [],
            skills: Array.isArray(data.skills)
                ? data.skills
                : [],
            summary: data.summary ?? '',
        };
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
        const objectName = `resumes/${(0, uuid_1.v4)()}-${file.originalname}`;
        await this.minioClient.putObject(this.bucket, objectName, file.buffer, file.size, { 'Content-Type': file.mimetype });
        const endpoint = this.config.get('MINIO_ENDPOINT', 'localhost');
        const port = Number(this.config.get('MINIO_PORT', '9000'));
        return `http://${endpoint}:${port}/${this.bucket}/${objectName}`;
    }
    async ensureBucketExists() {
        const exists = await this.minioClient.bucketExists(this.bucket);
        if (!exists) {
            await this.minioClient.makeBucket(this.bucket, 'us-east-1');
        }
    }
};
exports.ResumesService = ResumesService;
exports.ResumesService = ResumesService = ResumesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(candidate_profile_entity_1.CandidateProfile)),
    __param(1, (0, typeorm_1.InjectRepository)(job_description_entity_1.JobDescription)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        llm_client_1.LlmClient,
        config_1.ConfigService,
        skill_extractor_service_1.SkillExtractorService,
        summary_generator_service_1.SummaryGeneratorService])
], ResumesService);
//# sourceMappingURL=resumes.service.js.map