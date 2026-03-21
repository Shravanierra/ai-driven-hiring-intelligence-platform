import { ScoringService } from './scoring.service';
import { FitScore } from '../entities/fit-score.entity';
import { AuthenticatedRecruiter } from '../auth/jwt.strategy';
export declare class ScoringController {
    private readonly scoringService;
    constructor(scoringService: ScoringService);
    computeScore(jobId: string, candidateId: string, recruiter: AuthenticatedRecruiter): Promise<FitScore>;
    getScore(jobId: string, candidateId: string, recruiter: AuthenticatedRecruiter): Promise<FitScore>;
    rescoreAll(jobId: string, recruiter: AuthenticatedRecruiter): Promise<{
        rescored: number;
        failed: number;
        errors: Array<{
            candidateId: string;
            error: string;
        }>;
    }>;
}
