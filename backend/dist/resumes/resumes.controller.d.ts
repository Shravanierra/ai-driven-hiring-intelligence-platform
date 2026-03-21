import { ResumesService, ResumeUploadResult } from './resumes.service';
import { AuthenticatedRecruiter } from '../auth/jwt.strategy';
export declare class ResumesController {
    private readonly resumesService;
    constructor(resumesService: ResumesService);
    uploadResumes(jobId: string, files: Express.Multer.File[], recruiter: AuthenticatedRecruiter): Promise<ResumeUploadResult>;
    listCandidates(jobId: string, recruiter: AuthenticatedRecruiter): Promise<string[]>;
    getCandidate(candidateId: string, recruiter: AuthenticatedRecruiter): Promise<string>;
}
