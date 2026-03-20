import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import * as Minio from 'minio';
import { v4 as uuidv4 } from 'uuid';
import { CandidateProfile } from '../entities/candidate-profile.entity';
import { JobDescription } from '../entities/job-description.entity';
import { LlmClient } from '../llm/llm.client';
import { serializeCandidateProfile } from '../candidate-profile/candidate-profile.serializer';
import { SkillExtractorService } from './skill-extractor.service';
import { SummaryGeneratorService } from './summary-generator.service';

const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

const MAX_BATCH_SIZE = 500;

export interface ResumeUploadResult {
  profiles: string[];
  failures: FailureEntry[];
}

export interface FailureEntry {
  filename: string;
  error: string;
}

@Injectable()
export class ResumesService {
  private readonly logger = new Logger(ResumesService.name);
  private readonly minioClient: Minio.Client;
  private readonly bucket: string;

  constructor(
    @InjectRepository(CandidateProfile)
    private readonly profileRepo: Repository<CandidateProfile>,
    @InjectRepository(JobDescription)
    private readonly jobRepo: Repository<JobDescription>,
    private readonly llmClient: LlmClient,
    private readonly config: ConfigService,
    private readonly skillExtractor: SkillExtractorService,
    private readonly summaryGenerator: SummaryGeneratorService,
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

  async uploadBatch(
    jobId: string,
    files: Express.Multer.File[],
    recruiterId: string,
  ): Promise<ResumeUploadResult> {
    // Verify job exists and belongs to recruiter
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException(`Job description with id "${jobId}" not found`);
    }
    if (job.recruiterId !== recruiterId) {
      throw new ForbiddenException(`You do not have access to job "${jobId}"`);
    }

    const batch = files.slice(0, MAX_BATCH_SIZE);
    const profiles: string[] = [];
    const failures: FailureEntry[] = [];

    for (const file of batch) {
      try {
        const profile = await this.processResume(jobId, file);
        profiles.push(serializeCandidateProfile(profile));
      } catch (err) {
        this.logger.warn(
          `Failed to process resume "${file.originalname}": ${(err as Error).message}`,
        );
        failures.push({
          filename: file.originalname,
          error: (err as Error).message,
        });
      }
    }

    return { profiles, failures };
  }

  async listCandidates(jobId: string, recruiterId: string): Promise<string[]> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException(`Job description with id "${jobId}" not found`);
    }
    if (job.recruiterId !== recruiterId) {
      throw new ForbiddenException(`You do not have access to job "${jobId}"`);
    }

    const profiles = await this.profileRepo.find({
      where: { jobId },
      order: { createdAt: 'DESC' },
    });

    return profiles.map(serializeCandidateProfile);
  }

  async getCandidate(candidateId: string, recruiterId: string): Promise<string> {
    const profile = await this.profileRepo.findOne({ where: { id: candidateId } });
    if (!profile) {
      throw new NotFoundException(`Candidate with id "${candidateId}" not found`);
    }
    // Verify the parent job belongs to the recruiter
    const job = await this.jobRepo.findOne({ where: { id: profile.jobId } });
    if (!job || job.recruiterId !== recruiterId) {
      throw new ForbiddenException(`You do not have access to candidate "${candidateId}"`);
    }
    return serializeCandidateProfile(profile);
  }

  private async processResume(
    jobId: string,
    file: Express.Multer.File,
  ): Promise<CandidateProfile> {
    // Validate MIME type
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

    // Try to upload to MinIO (non-fatal)
    let fileUrl: string | null = null;
    try {
      fileUrl = await this.uploadToMinio(file);
    } catch (err) {
      this.logger.warn(
        `MinIO upload failed for "${file.originalname}": ${(err as Error).message}`,
      );
    }

    // Extract text
    let rawText: string;
    try {
      rawText = await this.extractText(file);
    } catch (err) {
      const profile = this.profileRepo.create({
        jobId,
        name: file.originalname,
        contact: { email: '', phone: null, location: null },
        workExperience: [],
        education: [],
        skills: [],
        summary: '',
        parseStatus: 'error',
        errorMessage: (err as Error).message,
        fileUrl,
      });
      return this.profileRepo.save(profile);
    }

    // Extract structured profile via LLM
    let parsed: Partial<CandidateProfile>;
    try {
      parsed = await this.extractProfileFromText(rawText);
    } catch (err) {
      const profile = this.profileRepo.create({
        jobId,
        name: file.originalname,
        contact: { email: '', phone: null, location: null },
        workExperience: [],
        education: [],
        skills: [],
        summary: '',
        parseStatus: 'error',
        errorMessage: `LLM extraction failed: ${(err as Error).message}`,
        fileUrl,
      });
      return this.profileRepo.save(profile);
    }

    // Extract and normalize skills via dedicated Skill_Extractor
    let skills = parsed.skills ?? [];
    try {
      const extractedSkills = await this.skillExtractor.extractSkills(rawText);
      if (extractedSkills.length > 0) {
        skills = extractedSkills;
      }
    } catch (err) {
      this.logger.warn(
        `SkillExtractor failed for "${file.originalname}", using profile-extracted skills: ${(err as Error).message}`,
      );
    }

    const name = parsed.name ?? file.originalname;
    const workExperience = parsed.workExperience ?? [];
    const education = parsed.education ?? [];

    // Generate human-readable summary via Summary_Generator
    let summary = parsed.summary ?? '';
    try {
      summary = await this.summaryGenerator.generateSummary({
        name,
        skills,
        workExperience,
        education,
      });
    } catch (err) {
      this.logger.warn(
        `SummaryGenerator failed for "${file.originalname}", using extracted summary: ${(err as Error).message}`,
      );
    }

    // Ensure summary is non-empty
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

  private async extractProfileFromText(
    rawText: string,
  ): Promise<Partial<CandidateProfile>> {
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

    const result = await this.llmClient.createChatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: rawText },
      ],
      { responseFormat: 'json_object', temperature: 0.1 },
    );

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(result.content);
    } catch {
      throw new Error('LLM returned invalid JSON for profile extraction');
    }

    return {
      name: (data.name as string) ?? '',
      contact: (data.contact as CandidateProfile['contact']) ?? {
        email: '',
        phone: null,
        location: null,
      },
      workExperience: Array.isArray(data.work_experience)
        ? (data.work_experience as CandidateProfile['workExperience'])
        : [],
      education: Array.isArray(data.education)
        ? (data.education as CandidateProfile['education'])
        : [],
      skills: Array.isArray(data.skills)
        ? (data.skills as CandidateProfile['skills'])
        : [],
      summary: (data.summary as string) ?? '',
    };
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
    const objectName = `resumes/${uuidv4()}-${file.originalname}`;
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
