import { Response } from 'express';
import { InterviewKitService } from './interview-kit.service';
import { InterviewKit, InterviewQuestion } from '../entities/interview-kit.entity';
import { AuthenticatedRecruiter } from '../auth/jwt.strategy';
declare class UpdateInterviewKitDto {
    questions: InterviewQuestion[];
}
export declare class InterviewKitController {
    private readonly interviewKitService;
    constructor(interviewKitService: InterviewKitService);
    generateKit(jobId: string, candidateId: string, recruiter: AuthenticatedRecruiter): Promise<InterviewKit>;
    getKit(jobId: string, candidateId: string, recruiter: AuthenticatedRecruiter): Promise<InterviewKit>;
    updateKit(jobId: string, candidateId: string, body: UpdateInterviewKitDto, recruiter: AuthenticatedRecruiter): Promise<InterviewKit>;
    exportKit(jobId: string, candidateId: string, res: Response, recruiter: AuthenticatedRecruiter): Promise<void>;
}
export {};
