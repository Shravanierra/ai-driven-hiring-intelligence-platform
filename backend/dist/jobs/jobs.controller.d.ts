import { JobsService, UpdateCriteriaDto } from './jobs.service';
import { JobDescription } from '../entities/job-description.entity';
import { ScreeningCriteria } from '../entities/screening-criteria.entity';
import { AuthenticatedRecruiter } from '../auth/jwt.strategy';
export declare class JobsController {
    private readonly jobsService;
    constructor(jobsService: JobsService);
    createJob(file: Express.Multer.File, title: string, recruiter: AuthenticatedRecruiter): Promise<JobDescription>;
    getJob(id: string, recruiter: AuthenticatedRecruiter): Promise<JobDescription>;
    getCriteria(id: string, recruiter: AuthenticatedRecruiter): Promise<ScreeningCriteria>;
    saveCriteria(id: string, dto: UpdateCriteriaDto, recruiter: AuthenticatedRecruiter): Promise<ScreeningCriteria>;
}
