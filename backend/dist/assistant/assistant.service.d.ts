import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AssistantSession } from '../entities/assistant-session.entity';
import { JobDescription } from '../entities/job-description.entity';
import { CandidateProfile } from '../entities/candidate-profile.entity';
import { FitScore } from '../entities/fit-score.entity';
import { LlmClient } from '../llm/llm.client';
export interface QueryResult {
    query: string;
    interpretation: string;
    results: CandidateResult[];
}
export interface ClarificationResult {
    results: [];
    clarification: string;
    suggestions: string[];
}
export interface CandidateResult {
    candidateId: string;
    name: string;
    fitScore: number;
    jobId: string;
}
export declare class AssistantService implements OnModuleInit, OnModuleDestroy {
    private readonly sessionRepo;
    private readonly jobRepo;
    private readonly profileRepo;
    private readonly fitScoreRepo;
    private readonly llmClient;
    private readonly config;
    private readonly logger;
    private redisClient;
    constructor(sessionRepo: Repository<AssistantSession>, jobRepo: Repository<JobDescription>, profileRepo: Repository<CandidateProfile>, fitScoreRepo: Repository<FitScore>, llmClient: LlmClient, config: ConfigService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    createSession(recruiterId: string): Promise<AssistantSession>;
    getSession(sessionId: string, recruiterId?: string): Promise<AssistantSession>;
    query(sessionId: string, recruiterId: string, queryText: string): Promise<QueryResult | ClarificationResult>;
    private executeQuery;
    private interpretQuery;
    private searchCandidates;
    private fallbackKeywordSearch;
    private buildCandidateSearchText;
    private computeTextRelevance;
    private hasAnySkill;
    private matchesExperienceLevel;
    private buildConversationHistory;
    private buildClarification;
    private cacheSession;
    private loadSession;
}
