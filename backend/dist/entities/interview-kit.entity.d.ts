export type QuestionType = 'behavioral' | 'technical' | 'gap';
export interface QuestionRubric {
    strong: string;
    adequate: string;
    weak: string;
}
export interface InterviewQuestion {
    id: string;
    type: QuestionType;
    text: string;
    rubric: QuestionRubric;
}
export declare class InterviewKit {
    id: string;
    candidateId: string;
    jobId: string;
    questions: InterviewQuestion[];
    generatedAt: Date;
    updatedAt: Date;
}
