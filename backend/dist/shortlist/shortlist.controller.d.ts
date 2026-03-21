import { ShortlistService, ShortlistFilters } from './shortlist.service';
import { ShortlistEntry, ShortlistDecision } from '../entities/shortlist-entry.entity';
import { AuthenticatedRecruiter } from '../auth/jwt.strategy';
declare class GenerateShortlistDto {
    size: number;
    filters?: ShortlistFilters;
}
declare class UpdateDecisionDto {
    decision: ShortlistDecision;
}
export declare class ShortlistController {
    private readonly shortlistService;
    constructor(shortlistService: ShortlistService);
    generateShortlist(jobId: string, body: GenerateShortlistDto, recruiter: AuthenticatedRecruiter): Promise<ShortlistEntry[]>;
    getShortlist(jobId: string, recruiter: AuthenticatedRecruiter): Promise<ShortlistEntry[]>;
    updateDecision(jobId: string, candidateId: string, body: UpdateDecisionDto, recruiter: AuthenticatedRecruiter): Promise<ShortlistEntry>;
}
export {};
