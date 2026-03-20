import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import * as Minio from 'minio';
import { v4 as uuidv4 } from 'uuid';
import { JobDescription } from '../entities/job-description.entity';
import {
  CustomCriterion,
  ExperienceLevel,
  ScreeningCriteria,
} from '../entities/screening-criteria.entity';
import { LlmClient } from '../llm/llm.client';
import { ScoringService } from '../scoring/scoring.service';

const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

export interface UpdateCriteriaDto {
  required_skills?: string[];
  preferred_skills?: string[];
  experience_level?: ExperienceLevel;
  responsibilities?: string[];
  custom_criteria?: CustomCriterion[];
}

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private readonly minioClient: Minio.Client;
  private readonly bucket: string;

  constructor(
    @InjectRepository(JobDescription)
    private readonly jobRepo: Repository<JobDescription>,
    @InjectRepository(ScreeningCriteria)
    private readonly criteriaRepo: Repository<ScreeningCriteria>,
    private readonly llmClient: LlmClient,
    private readonly config: ConfigService,
    private readonly scoringService: ScoringService,
  ) {
    this.minioClient = new Minio.Client({
      endPoint: this.config.get<string>('MINIO_ENDPOINT', 'localhost'),
      port: Number(this.config.get<string>('MINIO_PORT', '9000')),
      useSSL: this.config.get<string>('MINIO_USE_SSL', 'false') === 'true',
      accessKey: this.config.get<string>('MINIO_ACCESS_KEY', 'minioadmin'),
      secretKey: this.config.get<string>('MINIO_SECRET_KEY', 'minioadmin_secret'),
    });
    this.bucket = this.config.get<string>('MINIO_BUCKET', 'hiring-files');
  }

  async uploadAndParse(
    file: Express.Multer.File,
    recruiterId: string,
    title: string,
  ): Promise<JobDescription> {
    // Validate MIME type
    if (!SUPPORTED_MIME_TYPES.includes(file.mimetype)) {
      throw new UnprocessableEntityException({
        error: 'unsupported_format',
        detail: `File type "${file.mimetype}" is not supported. Accepted types: PDF, DOCX, plain text.`,
      });
    }

    // Create record with pending status
    const job = this.jobRepo.create({
      recruiterId,
      title,
      status: 'pending',
    });
    await this.jobRepo.save(job);

    // Upload to MinIO and parse
    let fileUrl: string | null = null;
    let rawText: string | null = null;

    try {
      fileUrl = await this.uploadToMinio(file);
    } catch (err) {
      this.logger.warn(`MinIO upload failed for job ${job.id}: ${(err as Error).message}`);
      // Continue without file URL — parsing can still proceed from buffer
    }

    try {
      rawText = await this.extractText(file);
    } catch (err) {
      await this.jobRepo.update(job.id, {
        status: 'error',
        errorMessage: (err as Error).message,
        fileUrl,
      });
      throw new UnprocessableEntityException({
        error: 'parse_failure',
        detail: (err as Error).message,
      });
    }

    // Mark as parsed
    await this.jobRepo.update(job.id, {
      status: 'parsed',
      rawText,
      fileUrl,
      parsedAt: new Date(),
    });

    // Generate screening criteria from the parsed JD text
    try {
      await this.generateCriteria(job.id, rawText);
    } catch (err) {
      this.logger.warn(
        `Criteria generation failed for job ${job.id}: ${(err as Error).message}`,
      );
      // Non-fatal — JD is still parsed successfully
    }

    return this.jobRepo.findOneOrFail({ where: { id: job.id } });
  }

  async findById(id: string): Promise<JobDescription> {
    const job = await this.jobRepo.findOne({ where: { id } });
    if (!job) {
      throw new NotFoundException(`Job description with id "${id}" not found`);
    }
    return job;
  }

  async findByIdForRecruiter(id: string, recruiterId: string): Promise<JobDescription> {
    const job = await this.findById(id);
    if (job.recruiterId !== recruiterId) {
      throw new ForbiddenException(`You do not have access to job "${id}"`);
    }
    return job;
  }

  async getCriteria(jobId: string): Promise<ScreeningCriteria> {
    // Verify the job exists
    await this.findById(jobId);

    const criteria = await this.criteriaRepo.findOne({
      where: { jobId },
      order: { version: 'DESC' },
    });
    if (!criteria) {
      throw new NotFoundException(
        `Screening criteria for job "${jobId}" not found`,
      );
    }
    return criteria;
  }

  async saveCriteria(
    jobId: string,
    dto: UpdateCriteriaDto,
  ): Promise<ScreeningCriteria> {
    // Verify the job exists
    await this.findById(jobId);

    // Find existing criteria to determine next version
    const existing = await this.criteriaRepo.findOne({
      where: { jobId },
      order: { version: 'DESC' },
    });

    let saved: ScreeningCriteria;

    if (existing) {
      // Update in place with incremented version
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
      saved = await this.criteriaRepo.save(existing);
    } else {
      // No existing criteria — create fresh
      const criteria = this.criteriaRepo.create({
        jobId,
        version: 1,
        requiredSkills: dto.required_skills ?? [],
        preferredSkills: dto.preferred_skills ?? [],
        experienceLevel: dto.experience_level ?? 'mid',
        responsibilities: dto.responsibilities ?? [],
        customCriteria: dto.custom_criteria ?? [],
      });
      saved = await this.criteriaRepo.save(criteria);
    }

    // Fire-and-forget rescore for all candidates under this job
    this.scoringService
      .rescoreAll(jobId)
      .catch((err: Error) =>
        this.logger.error(`Auto-rescore failed for job ${jobId}: ${err.message}`),
      );

    return saved;
  }

  private async generateCriteria(
    jobId: string,
    rawText: string,
  ): Promise<void> {
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

    const result = await this.llmClient.createChatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: rawText },
      ],
      { responseFormat: 'json_object', temperature: 0.1 },
    );

    let parsed: {
      required_skills?: string[];
      preferred_skills?: string[];
      experience_level?: ExperienceLevel;
      responsibilities?: string[];
      custom_criteria?: CustomCriterion[];
    };

    try {
      parsed = JSON.parse(result.content);
    } catch {
      throw new Error(`LLM returned invalid JSON for criteria generation`);
    }

    const VALID_LEVELS: ExperienceLevel[] = ['entry', 'mid', 'senior', 'lead'];
    const experienceLevel: ExperienceLevel = VALID_LEVELS.includes(
      parsed.experience_level as ExperienceLevel,
    )
      ? (parsed.experience_level as ExperienceLevel)
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

  private async extractText(file: Express.Multer.File): Promise<string> {
    const { mimetype, buffer } = file;

    if (mimetype === 'application/pdf') {
      try {
        const result = await pdfParse(buffer);
        return result.text;
      } catch (err) {
        throw new Error(`Failed to parse PDF: ${(err as Error).message}`);
      }
    }

    if (
      mimetype ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      try {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
      } catch (err) {
        throw new Error(`Failed to parse DOCX: ${(err as Error).message}`);
      }
    }

    // text/plain
    return buffer.toString('utf-8');
  }

  private async uploadToMinio(file: Express.Multer.File): Promise<string> {
    await this.ensureBucketExists();
    const objectName = `jobs/${uuidv4()}-${file.originalname}`;
    await this.minioClient.putObject(
      this.bucket,
      objectName,
      file.buffer,
      file.size,
      { 'Content-Type': file.mimetype },
    );
    const endpoint = this.config.get<string>('MINIO_ENDPOINT', 'localhost');
    const port = Number(this.config.get<string>('MINIO_PORT', '9000'));
    return `http://${endpoint}:${port}/${this.bucket}/${objectName}`;
  }

  private async ensureBucketExists(): Promise<void> {
    const exists = await this.minioClient.bucketExists(this.bucket);
    if (!exists) {
      await this.minioClient.makeBucket(this.bucket, 'us-east-1');
    }
  }
}
