import { JobsService, UpdateCriteriaDto } from './jobs.service';
import { JobDescription } from '../entities/job-description.entity';
import { ScreeningCriteria } from '../entities/screening-criteria.entity';
export declare class JobsController {
    private readonly jobsService;
    constructor(jobsService: JobsService);
    createJob(file: Express.Multer.File, recruiterId: string, title: string): Promise<JobDescription>;
    getJob(id: string): Promise<JobDescription>;
    getCriteria(id: string): Promise<ScreeningCriteria>;
    saveCriteria(id: string, dto: UpdateCriteriaDto): Promise<ScreeningCriteria>;
}
