import { ResumesService, FailureEntry } from './resumes.service';
import { CandidateProfile } from '../entities/candidate-profile.entity';
import { AuthenticatedRecruiter } from '../auth/jwt.strategy';
export declare class ResumesController {
    private readonly resumesService;
    constructor(resumesService: ResumesService);
    uploadResumes(jobId: string, files: Express.Multer.File[], recruiter: AuthenticatedRecruiter): Promise<{
        profiles: CandidateProfile[];
        failures: FailureEntry[];
    }>;
    listCandidates(jobId: string, recruiter: AuthenticatedRecruiter): Promise<CandidateProfile[]>;
    getCandidate(candidateId: string, recruiter: AuthenticatedRecruiter): Promise<CandidateProfile>;
}
