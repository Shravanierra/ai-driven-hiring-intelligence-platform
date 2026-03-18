export type ShortlistDecision = 'pending' | 'accepted' | 'rejected' | 'deferred';
export declare class ShortlistEntry {
    id: string;
    jobId: string;
    candidateId: string;
    rank: number;
    fitScore: number;
    reasoning: string;
    decision: ShortlistDecision;
    decidedAt: Date | null;
    createdAt: Date;
}
