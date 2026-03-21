import { Repository } from 'typeorm';
import { FitScore } from '../entities/fit-score.entity';
import { CandidateProfile } from '../entities/candidate-profile.entity';
import { ScreeningCriteria } from '../entities/screening-criteria.entity';
import { JobDescription } from '../entities/job-description.entity';
import { LlmClient } from '../llm/llm.client';
export declare class ScoringService {
    private readonly fitScoreRepo;
    private readonly profileRepo;
    private readonly criteriaRepo;
    private readonly jobRepo;
    private readonly llmClient;
    private readonly logger;
    constructor(fitScoreRepo: Repository<FitScore>, profileRepo: Repository<CandidateProfile>, criteriaRepo: Repository<ScreeningCriteria>, jobRepo: Repository<JobDescription>, llmClient: LlmClient);
    computeScore(jobId: string, candidateId: string, recruiterId?: string): Promise<FitScore>;
    getScore(jobId: string, candidateId: string, recruiterId?: string): Promise<FitScore>;
    rescoreAll(jobId: string, recruiterId?: string): Promise<{
        rescored: number;
        failed: number;
        errors: Array<{
            candidateId: string;
            error: string;
        }>;
    }>;
    private buildCandidateText;
    private buildCriterionDescriptors;
    private cosineSimilarity;
    private similarityToStatus;
    private buildExplanation;
}
