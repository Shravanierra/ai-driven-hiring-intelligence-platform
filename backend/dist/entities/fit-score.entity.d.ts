export type CriterionStatus = 'met' | 'partial' | 'not_met';
export interface ScoreBreakdownItem {
    criterion_label: string;
    status: CriterionStatus;
    contribution: number;
    explanation: string;
}
export declare class FitScore {
    id: string;
    candidateId: string;
    jobId: string;
    criteriaVersion: number;
    score: number;
    breakdown: ScoreBreakdownItem[];
    computedAt: Date;
}
