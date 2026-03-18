export type JobStatus = 'pending' | 'parsed' | 'error';
export declare class JobDescription {
    id: string;
    recruiterId: string;
    title: string;
    rawText: string | null;
    fileUrl: string | null;
    parsedAt: Date | null;
    status: JobStatus;
    errorMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
}
