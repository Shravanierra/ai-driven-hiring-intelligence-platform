import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JobDescription } from '../entities/job-description.entity';
import { CustomCriterion, ExperienceLevel, ScreeningCriteria } from '../entities/screening-criteria.entity';
import { LlmClient } from '../llm/llm.client';
import { ScoringService } from '../scoring/scoring.service';
export interface UpdateCriteriaDto {
    required_skills?: string[];
    preferred_skills?: string[];
    experience_level?: ExperienceLevel;
    responsibilities?: string[];
    custom_criteria?: CustomCriterion[];
}
export declare class JobsService {
    private readonly jobRepo;
    private readonly criteriaRepo;
    private readonly llmClient;
    private readonly config;
    private readonly scoringService;
    private readonly logger;
    private readonly minioClient;
    private readonly bucket;
    constructor(jobRepo: Repository<JobDescription>, criteriaRepo: Repository<ScreeningCriteria>, llmClient: LlmClient, config: ConfigService, scoringService: ScoringService);
    uploadAndParse(file: Express.Multer.File, recruiterId: string, title: string): Promise<JobDescription>;
    findAllForRecruiter(recruiterId: string): Promise<JobDescription[]>;
    findById(id: string): Promise<JobDescription>;
    findByIdForRecruiter(id: string, recruiterId: string): Promise<JobDescription>;
    getCriteria(jobId: string): Promise<ScreeningCriteria>;
    saveCriteria(jobId: string, dto: UpdateCriteriaDto): Promise<ScreeningCriteria>;
    private extractTitle;
    private generateCriteria;
    private extractText;
    private uploadToMinio;
    private ensureBucketExists;
}
