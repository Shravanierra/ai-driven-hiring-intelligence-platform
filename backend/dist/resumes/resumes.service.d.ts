import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { CandidateProfile } from '../entities/candidate-profile.entity';
import { JobDescription } from '../entities/job-description.entity';
import { LlmClient } from '../llm/llm.client';
import { SkillExtractorService } from './skill-extractor.service';
import { SummaryGeneratorService } from './summary-generator.service';
export interface ResumeUploadResult {
    profiles: string[];
    failures: FailureEntry[];
}
export interface FailureEntry {
    filename: string;
    error: string;
}
export declare class ResumesService {
    private readonly profileRepo;
    private readonly jobRepo;
    private readonly llmClient;
    private readonly config;
    private readonly skillExtractor;
    private readonly summaryGenerator;
    private readonly logger;
    private readonly minioClient;
    private readonly bucket;
    constructor(profileRepo: Repository<CandidateProfile>, jobRepo: Repository<JobDescription>, llmClient: LlmClient, config: ConfigService, skillExtractor: SkillExtractorService, summaryGenerator: SummaryGeneratorService);
    uploadBatch(jobId: string, files: Express.Multer.File[], recruiterId: string): Promise<ResumeUploadResult>;
    listCandidates(jobId: string, recruiterId: string): Promise<string[]>;
    getCandidate(candidateId: string, recruiterId: string): Promise<string>;
    private processResume;
    private extractProfileFromText;
    private extractText;
    private uploadToMinio;
    private ensureBucketExists;
}
