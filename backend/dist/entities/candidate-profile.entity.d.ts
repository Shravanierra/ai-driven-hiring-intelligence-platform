export type ParseStatus = 'success' | 'error';
export interface ContactInfo {
    email: string;
    phone: string | null;
    location: string | null;
}
export interface WorkExperience {
    company: string;
    title: string;
    start_date: string;
    end_date: string | null;
    description: string;
}
export interface Education {
    institution: string;
    degree: string;
    field: string;
    graduation_year: number | null;
}
export interface Skill {
    canonical_name: string;
    raw_aliases: string[];
}
export declare class CandidateProfile {
    id: string;
    schemaVersion: string;
    jobId: string;
    name: string;
    contact: ContactInfo;
    workExperience: WorkExperience[];
    education: Education[];
    skills: Skill[];
    summary: string;
    parseStatus: ParseStatus;
    errorMessage: string | null;
    fileUrl: string | null;
    createdAt: Date;
}
