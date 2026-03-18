export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'lead';
export interface CustomCriterion {
    label: string;
    weight: number;
    description: string;
}
export declare class ScreeningCriteria {
    id: string;
    jobId: string;
    version: number;
    requiredSkills: string[];
    preferredSkills: string[];
    experienceLevel: ExperienceLevel;
    responsibilities: string[];
    customCriteria: CustomCriterion[];
    updatedAt: Date;
}
