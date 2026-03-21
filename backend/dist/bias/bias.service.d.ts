import { Repository } from 'typeorm';
import { BiasFlag, BiasSeverity } from '../entities/bias-flag.entity';
import { FitScore, ScoreBreakdownItem } from '../entities/fit-score.entity';
import { CandidateProfile } from '../entities/candidate-profile.entity';
import { JobDescription } from '../entities/job-description.entity';
export interface BiasReport {
    jobId: string;
    candidateCount: number;
    scoreDistribution: {
        min: number;
        max: number;
        mean: number;
        median: number;
        stddev: number;
    };
    flaggedSignals: Array<{
        signal_type: string;
        count: number;
        severity: BiasSeverity;
        affected_criteria: string[];
    }>;
    totalFlags: number;
}
interface DetectedSignal {
    signal_type: string;
    description: string;
    affected_criterion: string | null;
    severity: BiasSeverity;
}
export declare class BiasService {
    private readonly biasFlagRepo;
    private readonly fitScoreRepo;
    private readonly profileRepo;
    private readonly jobRepo;
    private readonly logger;
    constructor(biasFlagRepo: Repository<BiasFlag>, fitScoreRepo: Repository<FitScore>, profileRepo: Repository<CandidateProfile>, jobRepo: Repository<JobDescription>);
    getBiasFlags(jobId: string, candidateId: string, recruiterId?: string): Promise<BiasFlag[]>;
    getBiasReport(jobId: string, recruiterId?: string): Promise<BiasReport>;
    detectSignals(breakdown: ScoreBreakdownItem[], profile: CandidateProfile): DetectedSignal[];
    private findAffectedCriterion;
    private deduplicateSignals;
    private computeDistribution;
    private aggregateFlags;
    private severityRank;
    private validateJobAndCandidate;
}
export {};
