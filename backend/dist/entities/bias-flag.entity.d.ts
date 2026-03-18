export type BiasSeverity = 'low' | 'medium' | 'high';
export declare class BiasFlag {
    id: string;
    candidateId: string;
    jobId: string;
    signalType: string;
    description: string;
    affectedCriterion: string | null;
    severity: BiasSeverity;
    createdAt: Date;
}
