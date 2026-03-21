import { Repository } from 'typeorm';
import { ShortlistEntry, ShortlistDecision } from '../entities/shortlist-entry.entity';
import { FitScore } from '../entities/fit-score.entity';
import { CandidateProfile } from '../entities/candidate-profile.entity';
import { JobDescription } from '../entities/job-description.entity';
import { LlmClient } from '../llm/llm.client';
export interface ShortlistFilters {
    minExperience?: number;
    requiredSkill?: string;
}
export declare class ShortlistService {
    private readonly shortlistRepo;
    private readonly fitScoreRepo;
    private readonly profileRepo;
    private readonly jobRepo;
    private readonly llmClient;
    private readonly logger;
    constructor(shortlistRepo: Repository<ShortlistEntry>, fitScoreRepo: Repository<FitScore>, profileRepo: Repository<CandidateProfile>, jobRepo: Repository<JobDescription>, llmClient: LlmClient);
    generateShortlist(jobId: string, size: number, filters?: ShortlistFilters, recruiterId?: string): Promise<ShortlistEntry[]>;
    getShortlist(jobId: string, recruiterId?: string): Promise<ShortlistEntry[]>;
    updateDecision(jobId: string, candidateId: string, decision: ShortlistDecision, recruiterId?: string): Promise<ShortlistEntry>;
    private generateReasoning;
}
